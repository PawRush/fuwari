# AWS S3 + CloudFront Deployment Guide

This guide explains how to deploy your Fuwari blog to AWS using S3 + CloudFront with automatic CI/CD via GitHub Actions.

## Prerequisites

- AWS Account with appropriate permissions
- AWS CLI configured locally with credentials
- GitHub repository access
- AWS OIDC provider configured for GitHub Actions (optional but recommended for security)

## Step 1: Create AWS Infrastructure

### Option A: Using CloudFormation (Recommended)

```bash
aws cloudformation create-stack \
  --stack-name fuwari-blog-stack \
  --template-body file://aws-deployment.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1 \
  --parameters ParameterKey=SiteName,ParameterValue=fuwari
```

Wait for stack creation to complete:

```bash
aws cloudformation wait stack-create-complete \
  --stack-name fuwari-blog-stack \
  --region us-east-1
```

Get the outputs:

```bash
aws cloudformation describe-stacks \
  --stack-name fuwari-blog-stack \
  --region us-east-1 \
  --query 'Stacks[0].Outputs'
```

Note the following values:
- **S3BucketName**: Your S3 bucket name
- **CloudFrontDistributionId**: Your CloudFront distribution ID
- **CloudFrontDomainName**: Your CloudFront domain (e.g., d123456.cloudfront.net)
- **GitHubActionsRoleArn**: IAM role ARN for GitHub Actions

### Option B: Manual Setup

If you prefer manual setup or don't have CloudFormation permissions:

1. **Create S3 Bucket**
   ```bash
   aws s3 mb s3://fuwari-YOUR_ACCOUNT_ID --region us-east-1

   # Enable versioning
   aws s3api put-bucket-versioning \
     --bucket fuwari-YOUR_ACCOUNT_ID \
     --versioning-configuration Status=Enabled

   # Block public access
   aws s3api put-public-access-block \
     --bucket fuwari-YOUR_ACCOUNT_ID \
     --public-access-block-configuration \
     "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
   ```

2. **Create CloudFront Distribution**
   - Go to AWS CloudFront console
   - Create distribution with S3 bucket as origin
   - Set default root object to `index.html`
   - Configure error pages (404/403 → /404.html)
   - Note the distribution ID and domain name

3. **Create IAM Role for GitHub Actions**
   - Create role with trust policy for GitHub OIDC provider
   - Attach S3 and CloudFront permissions (see `GitHubActionsPolicy` in CloudFormation template)

## Step 2: Configure GitHub Secrets

Add the following secrets to your GitHub repository settings:

1. **AWS_ROLE_ARN**: The ARN of the GitHub Actions IAM role
   ```
   arn:aws:iam::YOUR_ACCOUNT_ID:role/fuwari-blog-stack-GitHubActionsRole-XXX
   ```

2. **AWS_S3_BUCKET**: Your S3 bucket name
   ```
   fuwari-YOUR_ACCOUNT_ID
   ```

3. **AWS_CLOUDFRONT_DISTRIBUTION_ID**: Your CloudFront distribution ID
   ```
   E123ABCD456DEFGH
   ```

4. **AWS_CLOUDFRONT_DOMAIN**: Your CloudFront domain name
   ```
   d123456.cloudfront.net
   ```

To add secrets:
1. Go to your GitHub repository
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Add each secret with the name and value

## Step 3: Update Configuration

1. Update `astro.config.mjs` with your CloudFront domain:
   ```javascript
   site: "https://d123456.cloudfront.net/",
   ```

2. Commit and push changes:
   ```bash
   git add .
   git commit -m "chore: set up AWS S3 + CloudFront deployment"
   git push origin main
   ```

## Step 4: First Deployment

The GitHub Actions workflow will automatically trigger on push to `main` branch.

Monitor the deployment:
1. Go to GitHub repository
2. Click "Actions" tab
3. Watch the "Deploy to AWS S3 + CloudFront" workflow

Once complete, your site will be available at:
```
https://YOUR_CLOUDFRONT_DOMAIN/
```

## Subsequent Deployments

Every push to `main` will automatically:
1. Build your Astro site
2. Upload files to S3
3. Invalidate CloudFront cache
4. Make the changes live

## Cache Strategy

The deployment uses smart caching:

- **JS/CSS/Fonts**: 1 year cache (immutable)
  - These files are automatically versioned by Astro

- **HTML and other assets**: 1 hour cache with must-revalidate
  - Ensures users get fresh content frequently

## Troubleshooting

### Deployment fails with permission error
- Verify AWS_ROLE_ARN secret is correct
- Check IAM role trust relationship includes GitHub OIDC provider
- Ensure role has S3 and CloudFront permissions

### Site shows old content
- CloudFront invalidation may take a few minutes
- Try clearing your browser cache
- Check CloudFront distribution status

### 404 page not working
- Ensure your `dist/404.html` exists
- Verify CloudFront error response configuration

## Monitoring & Logs

View CloudFront logs:
```bash
aws cloudfront get-distribution --id E123ABCD456DEFGH
```

View S3 bucket:
```bash
aws s3 ls s3://fuwari-YOUR_ACCOUNT_ID/
```

## Updating CloudFront Domain in Site Config

After your first deployment succeeds, update `astro.config.mjs`:
```javascript
site: "https://d123456.cloudfront.net/",
```

Replace `d123456.cloudfront.net` with your actual CloudFront domain name.

## Additional Configuration

### Custom Domain (Optional)

To use a custom domain instead of CloudFront domain:

1. Request/purchase a domain
2. Create/import certificate in AWS Certificate Manager
3. Update CloudFront distribution:
   - Add alternate domain names
   - Attach SSL certificate
4. Update DNS records to point to CloudFront

### Cost Optimization

- **S3**: Pay per GB stored + requests
- **CloudFront**: Pay per GB transferred + requests
- **Data transfer**: Typically lowest cost

Estimate costs: https://calculator.aws/

## Rollback

If you need to rollback to a previous version:

1. Revert commit in git
2. Push to main
3. GitHub Actions will redeploy with previous version

S3 versioning is enabled, so old versions are preserved.

## Cleanup

To remove all resources:

```bash
# Delete CloudFormation stack (this will remove S3 bucket, CloudFront, and IAM roles)
aws cloudformation delete-stack \
  --stack-name fuwari-blog-stack \
  --region us-east-1
```

Note: S3 bucket must be empty before deletion. The workflow will have populated it.
