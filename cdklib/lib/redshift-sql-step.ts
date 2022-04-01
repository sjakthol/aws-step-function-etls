import { Arn, ArnFormat, Duration, Stack } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as tasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import * as iam from "aws-cdk-lib/aws-iam";

interface RedshiftSqlStepProps {
  clusterIdentifier: string;
  database: string;
  dbUser: string;
  sqls: string[];
}

export class RedshiftSqlStep extends sfn.StateMachineFragment {
  public readonly startState: sfn.State;
  public readonly endStates: sfn.INextable[];
  private readonly failState: sfn.INextable;

  constructor(parent: Construct, id: string, props: RedshiftSqlStepProps) {
    super(parent, id);

    const execute = new tasks.CallAwsService(this, "BatchExecuteStatement", {
      service: "redshiftdata",
      action: "batchExecuteStatement",
      parameters: {
        ClusterIdentifier: props.clusterIdentifier,
        Database: props.database,
        DbUser: props.dbUser,
        Sqls: props.sqls,
      },
      iamResources: ["*"],
      iamAction: "redshift-data:BatchExecuteStatement",
    }).addRetry({ errors: [sfn.Errors.ALL], maxAttempts: 3 });

    execute["taskPolicies"]?.push(this.getIamPolicyStatement(props));

    const describe = new tasks.CallAwsService(this, "DescribeStatement", {
      service: "redshiftdata",
      action: "describeStatement",
      parameters: {
        Id: sfn.JsonPath.stringAt("$.Id"),
      },
      iamResources: ["*"],
      iamAction: "redshift-data:DescribeStatement",
    }).addRetry({ errors: [sfn.Errors.ALL], maxAttempts: 3 });

    const wait = new sfn.Wait(this, "Wait", {
      time: sfn.WaitTime.duration(Duration.seconds(5)),
    });

    const fail = new sfn.Pass(this, "Fail");
    const succeed = new sfn.Pass(this, "Succeed");

    execute
      .next(wait)
      .next(describe)
      .next(
        new sfn.Choice(this, "Choice")
          .when(
            sfn.Condition.or(sfn.Condition.stringEquals("$.Status", "ABORTED")),
            fail
          )
          .when(
            sfn.Condition.or(
              sfn.Condition.stringEquals("$.Status", "FINISHED")
            ),
            succeed
          )
          .when(
            sfn.Condition.or(
              ...["PICKED", "STARTED", "SUBMITTED"].map((s) =>
                sfn.Condition.stringEquals("$.Status", s)
              )
            ),
            wait
          )
          .otherwise(fail)
      );

    this.startState = execute;
    this.endStates = [succeed];
    this.failState = fail;
  }

  public onError(state: sfn.IChainable): RedshiftSqlStep {
    this.failState.next(state);
    return this;
  }

  private getIamPolicyStatement(props: RedshiftSqlStepProps) {
    return new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["redshift:GetClusterCredentials"],
      resources: [
        Arn.format(
          {
            service: "redshift",
            resource: "cluster",
            resourceName: props.clusterIdentifier,
            arnFormat: ArnFormat.COLON_RESOURCE_NAME,
          },
          Stack.of(this)
        ),
        Arn.format(
          {
            service: "redshift",
            resource: "dbuser",
            resourceName: `${props.clusterIdentifier}/${props.dbUser}`,
            arnFormat: ArnFormat.COLON_RESOURCE_NAME,
          },
          Stack.of(this)
        ),
        Arn.format(
          {
            service: "redshift",
            resource: "dbname",
            resourceName: `${props.clusterIdentifier}/${props.database}`,
            arnFormat: ArnFormat.COLON_RESOURCE_NAME,
          },
          Stack.of(this)
        ),
      ],
    });
  }
}
