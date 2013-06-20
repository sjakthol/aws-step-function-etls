# AWS Step Function ETLs

Extract Transform Load (ETL) workflows implemented with AWS Step Functions.

## Features

This setup includes

* Common infrastructure for ETLs

* Generic AWS Step Functions State Machines that implement common ETL workflow steps:

  * Amazon EMR Step - Run Spark job on an Amazon EMR cluster.
  * Amazon Redshift Step - Run SQL in Redshift.

* Example AWS Step Functions State Machines that implement ETL workflows with
  generic ETL workflow steps.

* Supporting resources for testing ETL Workflows with dummy infrastructure and data.

## Deployment

**Prerequisites**: Requires VPC, subnet and bucket stacks from [sjakthol/aws-account-infra](https://github.com/sjakthol/aws-account-infra).

Deploy the setup with the following commands:

```bash
# Deploy infrastructure
make deploy-infra-emr deploy-infra-stepfn

# Deploy generic ETL workflow steps
make deploy-step-emr deploy-step-redshift -j

# Deploy example ETL workflows that use generic ETL workflow steps
make deploy-example-emr-redshift deploy-example-emr deploy-example-redshift -j

# Deploy Redshift cluster for running Redshift workflows (costs $0.30 / hour in eu-west-1)
make deploy-test-redshift

# Deploy Aurora Postgres cluster for testing Postgres workflows (costs $0.08 / hour in eu-west-1)
make deploy-test-aurora-psql

# Deploy Neptune cluster for testing Neptune workloads (costs $0.11 / hour in eu-west-1)
make deploy-test-neptune
```

Delete the setup with the following commands:

```
make delete-test-redshift delete-test-neptune delete-test-aurora-psql -j
make delete-example-emr-redshift delete-example-emr delete-example-redshift -j
make delete-step-emr delete-step-redshift -j
make delete-infra-stepfn delete-infra-emr
```

Notes:

* `infra-emr` - Must empty S3 buckets and remove security group rules from EMR managed security
groups manually for deletion to succeed.

## Workflow Steps

### EMR Step

The `step-emr.yaml` template defines a generic state machine that creates an EMR
cluster, executes EMR steps and terminates the EMR cluster.

#### Input

```json
{
  "Id": "<Job Identifier>", // identifier used in EMR cluster names
  "ClusterConfiguration": { // configuration for EMR cluster
    "CoreFleetInstanceTypeConfigs": [ // list of instance types to use in core fleet of the cluster
      { "InstanceType": "<Instance Type>" },
      // ...
    ],
    "CoreFleetOnDemandCapacity": 0, // number of ondemand capacity units in core fleet
    "CoreFleetSpotCapacity": 1, // number of spot capacity units in core fleet
    "LeaderFleetInstanceTypeConfigs": [ // list of instance types to use in leader fleet of the cluster
      { "InstanceType": "<Instance Type>" },
      // ...
    ],
    "LeaderFleetOnDemandCapacity": 0, // number of ondemand capacity units in leader fleet
    "LeaderFleetSpotCapacity": 1, // number of spot capacity units in leader fleet
    "ReleaseLabel": "<EMR Release Label>"
  },
  "Steps": [ // list of steps to execute on the cluster
    { "Name": "<Step Name>", "Command": ["<command>", "<arg1>"] },
    // ...
  ]
}
```

Example:

```json
  {
    "Id": "job1",
    "ClusterConfiguration": {
      "CoreFleetInstanceTypeConfigs": [
        {"InstanceType": "c5.xlarge"},
        {"InstanceType": "m5.xlarge"},
        {"InstanceType": "r5.xlarge"}
      ],
      "CoreFleetOnDemandCapacity": 0,
      "CoreFleetSpotCapacity": 1,
      "LeaderFleetInstanceTypeConfigs": [
        {"InstanceType": "c5.xlarge"},
        {"InstanceType": "m5.xlarge"},
        {"InstanceType": "r5.xlarge"}
      ],
      "LeaderFleetOnDemandCapacity": 0,
      "LeaderFleetSpotCapacity": 1,
      "ReleaseLabel": "emr-6.4.0"
    },
    "Steps": [
      { "Name": "Step1", "Command": ["true"] },
      { "Name": "Step2", "Command": ["true"] }
    ]
  }
```

### Redshift Step

The `step-redshift.yaml` defines a generic state machine that executes a list of SQL
statements in Redshift via the Redshift Data API using temporary credentials.

#### Input

```json
{
  "ClusterIdentifier": "<Cluster identifier>",
  "Database": "<Name of the database>",
  "DbUser": "<Database user name>",
  "Sqls": [
    "<list of SQL statements to execute>"
  ]
}
```

Example:

```json
{
   "ClusterIdentifier": "ew1-stepfn-etl-test-redshift",
   "Database": "dev",
   "DbUser": "admin",
   "Sqls": [
     "SELECT 1",
     "SELECT 2"
  ]
}
```


## CloudFormation Stacks

The `templates/` directory contains following CloudFormation stacks

* Common infrastructure
  * `infra-emr` - Common infrastructure for Amazon EMR clusters.
  * `infra-stepfn` - Common infrastructure for AWS Step Functions.

* Generic ETL Workflow steps
  * `step-emr` - State Machine for running Spark / other supported jobs on Amazon EMR.
  * `step-redshift` - State Machine for running SQL in Redshift.

* Example workflows
  * `example-emr` - State Machine that runs steps on an Amazon EMR
  * `example-redshift` - State Machine that runs SQL in Amazon Redshift
  * `example-emr-redshift` - State Machine that first runs an Amazon EMR job and then executes SQL in Redshift

* Supporting resources
  * `test-redshift` - Redshift cluster for testing purposes.
  * `test-aurora-psql` - Aurora Postgres cluster for testing purposes.
  * `test-neptune` - Neptune cluster for testing purposes.

## License

MIT.
