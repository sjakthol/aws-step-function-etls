# Mapping from long region names to shorter ones that is to be
# used in the stack names
AWS_eu-west-1_PREFIX = ew1
AWS_us-east-1_PREFIX = ue1
AWS_eu-north-1_PREFIX = en1

# Some defaults
AWS ?= aws
AWS_REGION ?= eu-north-1

AWS_CMD := $(AWS) --region $(AWS_REGION)
AWS_ACCOUNT_ID = $(eval AWS_ACCOUNT_ID := $(shell $(AWS_CMD) sts get-caller-identity --query Account --output text))$(AWS_ACCOUNT_ID)

STACK_REGION_PREFIX := $(AWS_$(AWS_REGION)_PREFIX)
DEPLOYMENT_NAME := $(STACK_REGION_PREFIX)-stepfn-etl
TAGS ?= DeploymentName=$(DEPLOYMENT_NAME)

# Generic deployment and teardown targets
deploy-%:
	$(AWS_CMD) cloudformation deploy \
		--stack-name $(DEPLOYMENT_NAME)-$* \
		--tags $(TAGS) \
		--parameter-overrides DeploymentName=$(DEPLOYMENT_NAME) $(EXTRA_PARAMS) \
		--no-fail-on-empty-changeset \
		--template-file templates/$*.yaml \
		--capabilities CAPABILITY_NAMED_IAM \
		$(EXTRA_ARGS)

delete-%:
	$(AWS_CMD) cloudformation delete-stack \
		--stack-name $(DEPLOYMENT_NAME)-$*

	$(AWS_CMD) cloudformation wait stack-delete-complete \
		--stack-name $(DEPLOYMENT_NAME)-$*

# Concrete deploy and delete targets for autocompletion
$(addprefix deploy-,$(basename $(notdir $(wildcard templates/*.yaml)))):
$(addprefix delete-,$(basename $(notdir $(wildcard templates/*.yaml)))):
