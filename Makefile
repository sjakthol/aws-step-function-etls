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


define stack_template =

deploy-$(basename $(notdir $(1))): $(1)
	$(AWS_CMD) cloudformation deploy \
		--stack-name $(DEPLOYMENT_NAME)-$(basename $(notdir $(1))) \
		--tags $(TAGS) \
		--parameter-overrides DeploymentName=$(DEPLOYMENT_NAME) $(EXTRA_PARAMS) \
		--no-fail-on-empty-changeset \
		--template-file $(1) \
		--capabilities CAPABILITY_NAMED_IAM

delete-$(basename $(notdir $(1))): $(1)
	$(AWS_CMD) cloudformation delete-stack \
		--stack-name $(DEPLOYMENT_NAME)-$(basename $(notdir $(1)))
	$(AWS_CMD) cloudformation wait stack-delete-complete \
		--stack-name $(DEPLOYMENT_NAME)-$(basename $(notdir $(1)))

endef

$(foreach template, $(wildcard templates/*.yaml), $(eval $(call stack_template,$(template))))
