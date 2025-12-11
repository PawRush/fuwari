# AWS Deployment Setup Complete ✅

Your Fuwari blog is now configured for automatic deployment to AWS S3 + CloudFront with CI/CD via GitHub Actions.

## What Was Created

### Files Added:
1. **`aws-deployment.yaml`** - CloudFormation template for AWS infrastructure
2. **`.github/workflows/deploy-aws.yml`** - GitHub Actions CI/CD workflow
3. **`AWS_DEPLOYMENT.md`** - Complete deployment guide
4. **`scripts/setup-aws-deployment.sh`** - Automated setup helper script

### Quick Setup Guide

Follow these steps to complete the deployment setup:

#### Step 1: Create AWS Infrastructure

Choose one option:

**Option A - Automated (Recommended):**
```bash
chmod +x scripts/setup-aws-deployment.sh
./scripts/setup-aws-deployment.sh
```

This script will:
- Check AWS credentials
- Create CloudFormation stack
- Display all required information
- Guide you through GitHub secret configuration

**Option B - Manual CloudFormation:**
```bash
aws cloudformation create-stack \
  --stack-name fuwari-blog-stack \
  --template-body file://aws-deployment.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1
```

#### Step 2: Get AWS Resource Information

After stack creation completes:
```bash
aws cloudformation describe-stacks \
  --stack-name fuwari-blog-stack \
  --region us-east-1 \
  --query 'Stacks[0].Outputs'
```

Note these values:
- **S3BucketName**
- **CloudFrontDistributionId**
- **CloudFrontDomainName**
- **GitHubActionsRoleArn**

#### Step 3: Configure GitHub Secrets

Go to: GitHub Repository → Settings → Secrets and variables → Actions

Add 4 new secrets:
- `AWS_ROLE_ARN` - From CloudFront stack output
- `AWS_S3_BUCKET` - From CloudFront stack output
- `AWS_CLOUDFRONT_DISTRIBUTION_ID` - From CloudFront stack output
- `AWS_CLOUDFRONT_DOMAIN` - From CloudFront stack output

#### Step 4: Update Configuration

Edit `astro.config.mjs` and replace:
```javascript
site: "https://YOUR_CLOUDFRONT_DOMAIN/",
```

With your actual CloudFront domain from step 2.

#### Step 5: Deploy

```bash
git add .
git commit -m "chore: configure AWS S3 + CloudFront deployment"
git push origin main
```

GitHub Actions will automatically:
1. Build your Astro site
2. Upload to S3
3. Invalidate CloudFront cache
4. Make your site live

## Architecture

```
┌─────────────────────────────────────────────┐
│         Your GitHub Repository              │
│                                             │
│  Trigger: Push to main branch               │
└────────────────────┬────────────────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │   GitHub Actions Workflow  │
        │  (deploy-aws.yml)          │
        │                            │
        │  1. Build Astro site       │
        │  2. Upload to S3           │
        │  3. Invalidate CloudFront  │
        └────────┬────────┬──────────┘
                 │        │
         ┌───────▼──┐   ┌─▼────────────────┐
         │ AWS S3   │   │ AWS CloudFront   │
         │  Bucket  │   │ Distribution     │
         │          │   │ (CDN)            │
         └──────────┘   └─┬────────────────┘
                         │
                    ┌────▼─────────┐
                    │ Your Custom   │
                    │ Domain or     │
                    │ CloudFront    │
                    │ URL           │
                    └───────────────┘
```

## Deployment Flow

Every push to `main` automatically:

1. **Build** - Compiles your Astro site to static files in `dist/`
2. **Upload** - Syncs files to S3 with intelligent caching
3. **Invalidate** - Clears CloudFront cache so users get fresh content
4. **Go Live** - Your changes are immediately available worldwide

## Cache Strategy

- **JS/CSS/Fonts**: 1 year cache (automatically versioned)
- **HTML & Assets**: 1 hour cache with must-revalidate header
- **Index pages**: Real-time with CloudFront invalidation

## Costs

Typical monthly costs for a blog with moderate traffic:
- **S3**: $0.50 - $2 (storage + requests)
- **CloudFront**: $0.50 - $5 (data transfer)
- **Total**: Usually under $10/month

[AWS Calculator](https://calculator.aws/)

## Next Steps

1. ✅ Run setup script or manual CloudFormation
2. ✅ Configure GitHub secrets
3. ✅ Update astro.config.mjs
4. ✅ Commit and push to main
5. Watch deployment via GitHub Actions

## Support

For detailed instructions, see: **`AWS_DEPLOYMENT.md`**

For troubleshooting: See "Troubleshooting" section in AWS_DEPLOYMENT.md

## Rollback

To rollback to previous version:
```bash
git revert <commit-hash>
git push origin main
```

S3 versioning is enabled, so old versions are preserved.

---

**Your site will be live at:**
```
https://YOUR_CLOUDFRONT_DOMAIN/
```

Good luck! 🚀
