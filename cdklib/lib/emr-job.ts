import { Fn } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as tasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import * as iam from "aws-cdk-lib/aws-iam";

interface EmrJobProps {
  leaderFleetInstanceTypeConfigs: tasks.EmrCreateCluster.InstanceTypeConfigProperty[];
  leaderFleetOnDemandCapacity?: number;
  leaderFleetSpotCapacity?: number;

  coreFleetInstanceTypeConfigs: tasks.EmrCreateCluster.InstanceTypeConfigProperty[];
  coreFleetOnDemandCapacity?: number;
  coreFleetSpotCapacity?: number;

  releaseLabel: string;
}

export class EmrJob extends sfn.StateMachineFragment {
  public readonly startState: sfn.State;
  public readonly endStates: sfn.INextable[];
  private readonly failState: sfn.INextable;

  constructor(parent: Construct, id: string, props: EmrJobProps) {
    super(parent, id);

    const serviceRole = new iam.Role(this, "ServiceRole", {
      assumedBy: new iam.ServicePrincipal("elasticmapreduce.amazonaws.com"),
    });

    const createCluster = new tasks.EmrCreateCluster(this, "CreateCluster", {
      resultPath: "$.Cluster",
      applications: [{ name: "Spark" }],
      instances: {
        ec2SubnetIds: [
          Fn.importValue("infra-vpc-sn-public-a").toString(),
          Fn.importValue("infra-vpc-sn-public-b").toString(),
        ],
        instanceFleets: [
          {
            instanceFleetType: tasks.EmrCreateCluster.InstanceRoleType.MASTER,
            name: "Leader",
            instanceTypeConfigs: props.leaderFleetInstanceTypeConfigs,
            launchSpecifications: props.leaderFleetSpotCapacity
              ? {
                  spotSpecification: {
                    allocationStrategy:
                      tasks.EmrCreateCluster.SpotAllocationStrategy
                        .CAPACITY_OPTIMIZED,
                    timeoutAction:
                      tasks.EmrCreateCluster.SpotTimeoutAction
                        .SWITCH_TO_ON_DEMAND,
                    timeoutDurationMinutes: 5,
                  },
                }
              : undefined,
            targetOnDemandCapacity: props.leaderFleetOnDemandCapacity ?? 0,
            targetSpotCapacity: props.leaderFleetSpotCapacity ?? 1,
          },
          {
            instanceFleetType: tasks.EmrCreateCluster.InstanceRoleType.CORE,
            name: "Core",
            instanceTypeConfigs: props.coreFleetInstanceTypeConfigs,
            launchSpecifications: props.coreFleetSpotCapacity
              ? {
                  spotSpecification: {
                    allocationStrategy:
                      tasks.EmrCreateCluster.SpotAllocationStrategy
                        .CAPACITY_OPTIMIZED,
                    timeoutAction:
                      tasks.EmrCreateCluster.SpotTimeoutAction
                        .SWITCH_TO_ON_DEMAND,
                    timeoutDurationMinutes: 5,
                  },
                }
              : undefined,
            targetOnDemandCapacity: props.coreFleetOnDemandCapacity ?? 0,
            targetSpotCapacity: props.coreFleetSpotCapacity ?? 1,
          },
        ],
      },
      name: "test",
      releaseLabel: props.releaseLabel,
      serviceRole,
    });


    const terminateCluster = new tasks.EmrTerminateCluster(
      this,
      "TerminateCluster",
      {
        clusterId: sfn.JsonPath.stringAt("$.Cluster.ClusterId"),
      }
    ).addRetry({ errors: [sfn.Errors.ALL], maxAttempts: 3 });

    createCluster.next(terminateCluster)

    this.startState = createCluster
    this.endStates = [terminateCluster]
  }
}
