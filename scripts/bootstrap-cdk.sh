#!/bin/bash
set -e

PIPELINE_STACK_NAME=${1:-"FuwariBuildPipeline"}
BUILD_ROLE_ARN_INPUT=$2
DEPLOY_ROLE_ARN_INPUT=$3

echo "================================================"
echo "CDK Bootstrap with Pipeline Trust"
echo "================================================"
echo ""

# Get AWS account and region
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
REGION=${AWS_DEFAULT_REGION:-us-east-1}

echo "Target Environment:"
echo "  Account: $ACCOUNT"
echo "  Region:  $REGION"
echo "  Pipeline Stack: $PIPELINE_STACK_NAME"
echo ""

# Check if pipeline stack exists
if ! aws cloudformation describe-stacks --stack-name $PIPELINE_STACK_NAME --region $REGION >/dev/null 2>&1; then
  echo "❌ Error: Pipeline stack '$PIPELINE_STACK_NAME' does not exist"
  echo "   Deploy the pipeline stack first"
  exit 1
fi

# Extract role ARNs
if [ -z "$BUILD_ROLE_ARN_INPUT" ]; then
  BUILD_ROLE_ARN=$(aws cloudformation describe-stacks \
    --stack-name $PIPELINE_STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`BuildRoleArn`].OutputValue' \
    --output text)
else
  BUILD_ROLE_ARN=$BUILD_ROLE_ARN_INPUT
fi

if [ -z "$DEPLOY_ROLE_ARN_INPUT" ]; then
  DEPLOY_ROLE_ARN=$(aws cloudformation describe-stacks \
    --stack-name $PIPELINE_STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`DeployRoleArn`].OutputValue' \
    --output text)
else
  DEPLOY_ROLE_ARN=$DEPLOY_ROLE_ARN_INPUT
fi

if [ -z "$DEPLOY_ROLE_ARN" ] || [ "$DEPLOY_ROLE_ARN" = "None" ]; then
  echo "❌ Error: DeployRoleArn not found"
  exit 1
fi

echo ""
echo "Bootstrapping CDK..."
TRUST_ARGS="--trust $DEPLOY_ROLE_ARN"
if [ -n "$BUILD_ROLE_ARN" ] && [ "$BUILD_ROLE_ARN" != "None" ]; then
  TRUST_ARGS="$TRUST_ARGS --trust $BUILD_ROLE_ARN"
fi

npx cdk bootstrap aws://$ACCOUNT/$REGION $TRUST_ARGS --cloudformation-execution-policies "arn:aws:iam::aws:policy/AdministratorAccess" --verbose

echo ""
echo "✅ CDK bootstrap completed successfully"
echo ""
