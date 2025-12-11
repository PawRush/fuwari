#!/bin/bash

# Script to set up AWS IAM role for GitHub Actions OIDC
# This creates a role that GitHub Actions can assume to deploy to AWS

set -e

# Configuration
ROLE_NAME="FuwariGitHubActionsRole"
REPO_OWNER="PawRush"
REPO_NAME="fuwari"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "Setting up GitHub Actions OIDC role for $REPO_OWNER/$REPO_NAME"
echo "AWS Account ID: $AWS_ACCOUNT_ID"

# Create trust policy
cat > trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::${AWS_ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:${REPO_OWNER}/${REPO_NAME}:ref:refs/heads/main"
        }
      }
    }
  ]
}
EOF

# Create permissions policy
cat > permissions-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudformation:*",
        "s3:*",
        "cloudfront:*",
        "iam:*",
        "lambda:*",
        "logs:*",
        "sts:*"
      ],
      "Resource": "*"
    }
  ]
}
EOF

# Check if OIDC provider exists
if ! aws iam get-open-id-connect-provider --open-id-connect-provider-arn "arn:aws:iam::${AWS_ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com" &> /dev/null; then
  echo "Creating GitHub OIDC provider..."
  aws iam create-open-id-connect-provider \
    --url "https://token.actions.githubusercontent.com" \
    --client-id-list "sts.amazonaws.com" \
    --thumbprint-list "6938fd4d98bab03faadb97b34396831e3780aea1" \
    --tags Key=Purpose,Value=GitHubActions
else
  echo "GitHub OIDC provider already exists"
fi

# Create or update the role
if aws iam get-role --role-name "$ROLE_NAME" &> /dev/null; then
  echo "Updating existing role $ROLE_NAME..."
  aws iam update-assume-role-policy --role-name "$ROLE_NAME" --policy-document file://trust-policy.json
else
  echo "Creating role $ROLE_NAME..."
  aws iam create-role --role-name "$ROLE_NAME" --assume-role-policy-document file://trust-policy.json
fi

# Create or update the policy
POLICY_NAME="${ROLE_NAME}Policy"
if aws iam get-role-policy --role-name "$ROLE_NAME" --policy-name "$POLICY_NAME" &> /dev/null; then
  echo "Updating role policy..."
  aws iam put-role-policy --role-name "$ROLE_NAME" --policy-name "$POLICY_NAME" --policy-document file://permissions-policy.json
else
  echo "Creating role policy..."
  aws iam put-role-policy --role-name "$ROLE_NAME" --policy-name "$POLICY_NAME" --policy-document file://permissions-policy.json
fi

# Get role ARN
ROLE_ARN=$(aws iam get-role --role-name "$ROLE_NAME" --query 'Role.Arn' --output text)

echo ""
echo "✅ Setup complete!"
echo ""
echo "Role ARN: $ROLE_ARN"
echo ""
echo "Next steps:"
echo "1. In your GitHub repository, go to Settings > Secrets and variables > Actions"
echo "2. Add a new repository secret named 'AWS_ROLE_ARN' with the value:"
echo "   $ROLE_ARN"
echo "3. Push your code to the main branch to trigger the deployment pipeline"
echo ""

# Clean up temporary files
rm -f trust-policy.json permissions-policy.json