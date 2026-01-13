#!/bin/bash
set -e

ENVIRONMENT="${1:-preview-$(whoami)}"
WITH_ASSETS="${WITH_ASSETS:-true}"

if [[ "$ENVIRONMENT" != "prod" ]]; then
    export overrideWarningsEnabled=false
fi

echo "Starting AWS CDK deployment to environment: $ENVIRONMENT"
echo "Asset deployment: $WITH_ASSETS"

if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "AWS CLI not configured. Run 'aws configure' first."
    exit 1
fi

if [ "$WITH_ASSETS" = "true" ]; then
    echo "Building frontend..."
    pnpm run build
else
    echo "Skipping frontend build (WITH_ASSETS=false)"
fi

echo "Installing CDK dependencies..."
cd infra
npm install --no-progress
npm run build

echo "Bootstrapping CDK..."
npx cdk bootstrap --progress events

echo "Deploying CDK stacks for environment: $ENVIRONMENT..."

DEPLOY_CMD=(npx cdk deploy --all --context "environment=$ENVIRONMENT" --require-approval never --progress events)

if [ "$WITH_ASSETS" = "false" ]; then
    DEPLOY_CMD+=(--context withAssets=false)
fi

if [[ "$ENVIRONMENT" == "preview-"* ]]; then
    echo "Using hotswap deployment for faster development feedback..."
    DEPLOY_CMD+=(--hotswap-fallback)
else
    echo "Using standard deployment for shared environment..."
fi

"${DEPLOY_CMD[@]}"

FRONTEND_URL=$(aws cloudformation describe-stacks \
    --stack-name "FuwariFrontend-${ENVIRONMENT}" \
    --query 'Stacks[0].Outputs[?OutputKey==`WebsiteURL`].OutputValue' \
    --output text)

DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
    --stack-name "FuwariFrontend-${ENVIRONMENT}" \
    --query 'Stacks[0].Outputs[?OutputKey==`DistributionId`].OutputValue' \
    --output text)

echo ""
echo "Deployment complete for environment: $ENVIRONMENT!"
echo "Frontend URL: $FRONTEND_URL"
echo ""
echo "Usage examples:"
echo "  ./scripts/deploy.sh                   # Deploy to preview-\$(whoami)"
echo "  ./scripts/deploy.sh dev               # Deploy to dev"
echo "  ./scripts/deploy.sh prod              # Deploy to production"
echo "  WITH_ASSETS=false ./scripts/deploy.sh # Deploy without updating assets"
