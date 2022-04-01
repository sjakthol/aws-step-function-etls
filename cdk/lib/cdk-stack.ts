import { Duration, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import { RedshiftSqlStep, EmrJob } from "cdklib/lib/index"


export class CdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const fail = new sfn.Fail(this, "Fail");

    // const sql1 = new RedshiftSqlStep(this, "Sql1", {
    //   clusterIdentifier: "en1-stepfn-etl-test-redshift-cluster",
    //   database: "dev",
    //   dbUser: "admin",
    //   sqls: ["SELECT 1", "SELECT 2"],
    // }).onError(fail);

    // const sql2 = new RedshiftSqlStep(this, "Sql2", {
    //   clusterIdentifier: "en1-stepfn-etl-test-redshift-cluster",
    //   database: "dev",
    //   dbUser: "admin",
    //   sqls: ["SELECT 1", "SELCT 2"],
    // }).onError(fail);

    // const definition = sql1.prefixStates().next(sql2.prefixStates());

    const emr1 = new EmrJob(this, "EMR", {
      leaderFleetInstanceTypeConfigs: [
        { instanceType: 'm5.xlarge', weightedCapacity: 1 },
      ],
      leaderFleetOnDemandCapacity: 1,
      leaderFleetSpotCapacity: 0,

      coreFleetInstanceTypeConfigs: [
        { instanceType: 'm5.xlarge', weightedCapacity: 1 },
        { instanceType: 'm5.2xlarge', weightedCapacity: 2 },
      ],
      coreFleetOnDemandCapacity: 1,
      coreFleetSpotCapacity: 0,

      releaseLabel: 'emr-6.4.0'
    })

    const sm = new sfn.StateMachine(this, "StateMachine", {
      definition: emr1,
      timeout: Duration.minutes(5),
    });
  }
}
