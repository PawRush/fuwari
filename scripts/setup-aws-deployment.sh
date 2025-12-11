#!/bin/bash

# AWS S3 + CloudFront Deployment Setup Script
# This script helps you set up AWS infrastructure and GitHub secrets

set -e

echo "🚀 Fuwari AWS Deployment Setup"
echo "================================"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first:"
    echo "   https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured. Please configure them:"
    echo "   aws configure"
    exit 1
fi

AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "✅ AWS Account ID: $AWS_ACCOUNT_ID"
echo ""

# Get or create stack
read -p "Enter stack name (default: fuwari-blog-stack): " STACK_NAME
STACK_NAME=${STACK_NAME:-fuwari-blog-stack}

read -p "Enter site name (default: fuwari): " SITE_NAME
SITE_NAME=${SITE_NAME:-fuwari}

echo ""
echo "Creating CloudFormation stack: $STACK_NAME"
echo ""

# Create stack
aws cloudformation create-stack \
  --stack-name "$STACK_NAME" \
  --template-body file://aws-deployment.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1 \
  --parameters ParameterKey=SiteName,ParameterValue="$SITE_NAME"

# Wait for stack creation
echo "Waiting for stack creation to complete..."
aws cloudformation wait stack-create-complete \
  --stack-name "$STACK_NAME" \
  --region us-east-1

echo "✅ Stack created successfully!"
echo ""

# Get outputs
echo "Retrieving stack outputs..."
OUTPUTS=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region us-east-1 \
  --query 'Stacks[0].Outputs' \
  --output json)

S3_BUCKET=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="S3BucketName") | .OutputValue')
DISTRIBUTION_ID=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="CloudFrontDistributionId") | .OutputValue')
DOMAIN_NAME=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="CloudFrontDomainName") | .OutputValue')
ROLE_ARN=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="GitHubActionsRoleArn") | .OutputValue')

echo ""
echo "📝 AWS Resources Created:"
echo "========================"
echo "S3 Bucket: $S3_BUCKET"
echo "CloudFront Distribution ID: $DISTRIBUTION_ID"
echo "CloudFront Domain: $DOMAIN_NAME"
echo "GitHub Actions Role ARN: $ROLE_ARN"
echo ""

echo "🔐 Next Steps - Configure GitHub Secrets:"
echo "=========================================="
echo ""
echo "1. Go to your GitHub repository"
echo "2. Settings → Secrets and variables → Actions"
echo "3. Click 'New repository secret' and add:"
echo ""
echo "   Name: AWS_ROLE_ARN"
echo "   Value: $ROLE_ARN"
echo ""
echo "   Name: AWS_S3_BUCKET"
echo "   Value: $S3_BUCKET"
echo ""
echo "   Name: AWS_CLOUDFRONT_DISTRIBUTION_ID"
echo "   Value: $DISTRIBUTION_ID"
echo ""
echo "   Name: AWS_CLOUDFRONT_DOMAIN"
echo "   Value: $DOMAIN_NAME"
echo ""

echo "4. Update astro.config.mjs:"
echo "   site: \"https://$DOMAIN_NAME/\","
echo ""

echo "5. Commit and push to main branch:"
echo "   git add ."
echo "   git commit -m 'chore: configure AWS deployment'"
echo "   git push origin main"
echo ""

echo "✅ Setup complete! Your site will be deployed to:"
echo "   https://$DOMAIN_NAME/"
