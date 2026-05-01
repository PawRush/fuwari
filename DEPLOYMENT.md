---
sop_name: deploy-frontend-app
repo_name: fuwari
app_name: Fuwari
app_type: Frontend Application (Astro Static Site)
branch: deploy-to-aws-20260501_121659-kamielw
created: 2026-05-01T12:48:00Z
completed: 2026-05-01T12:58:00Z
---

# Deployment Summary

Your app is deployed to AWS! Preview URL: **https://d3k2l416i44onb.cloudfront.net**

**Next Step: Automate Deployments**

You're currently using manual deployment. To automate deployments from GitHub, ask your coding agent to set up AWS CodePipeline using an agent SOP for pipeline creation. Try: "create a pipeline using AWS SOPs"

Services used: CloudFront, S3, CloudFormation, IAM

Questions? Ask your Coding Agent:
- What resources were deployed to AWS?
- How do I update my deployment?

## Quick Commands

```bash
# View deployment status
aws cloudformation describe-stacks --stack-name "FuwariFrontend-preview-kamielw" --region eu-central-1 --query 'Stacks[0].StackStatus' --output text

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id "E30W90PNT1O62T" --paths "/*"

# View CloudFront access logs (last hour)
aws s3 ls "s3://fuwarifrontend-preview-ka-cftos3cloudfrontloggingb-ocrnqyirmwqm/" --recursive | tail -20

# Redeploy
./scripts/deploy.sh
```

## Production Readiness

For production deployments, consider:
- WAF Protection: Add AWS WAF with managed rules (Core Rule Set, Known Bad Inputs) and rate limiting
- CSP Headers: Configure Content Security Policy in CloudFront response headers (`script-src 'self'`, `frame-ancestors 'none'`)
- Custom Domain: Set up Route 53 and ACM certificate
- Monitoring: CloudWatch alarms for 4xx/5xx errors and CloudFront metrics
- Auth Redirect URLs: If using an auth provider (Auth0, Supabase, Firebase, Lovable, etc.), add your CloudFront URL to allowed redirect URLs

---

# Deployment Plan: Fuwari

Coding Agents should follow this Deployment Plan, and validate previous progress if picking up the Deployment in a new coding session.

## Phase 1: Gather Context and Configure ✅
- [x] Step 0: Inform User of Execution Flow
- [x] Step 1: Create Deployment Plan
- [x] Step 2: Create Deploy Branch
- [x] Step 3: Detect Build Configuration
- [x] Step 4: Validate Prerequisites
- [x] Step 5: Revisit Deployment Plan
- [x] Update DEPLOYMENT_PLAN.md

### Build Configuration Detected:
- Framework: Astro (static site generator)
- Package Manager: pnpm 9.14.4
- Build Command: `pnpm run build`
- Output Directory: `dist/`
- Base Path: `/` (root)
- Trailing Slash: `always`
- CloudFront Config: URL rewrite function (rewrites `/path` to `/path/index.html`)
- Lint Command: `pnpm run lint`

## Phase 2: Build CDK Infrastructure ✅
- [x] Step 6: Initialize CDK Foundation
- [x] Step 7: Generate CDK Stack
- [x] Step 8: Create Deployment Script
- [x] Step 9: Validate CDK Synth
- [x] Update DEPLOYMENT_PLAN.md

## Phase 3: Deploy and Validate ✅
- [x] Step 10: Execute CDK Deployment
- [x] Step 11: Validate CloudFormation Stack
- [x] Update DEPLOYMENT_PLAN.md

## Phase 4: Update Documentation ✅
- [x] Step 12: Finalize Deployment Plan
- [x] Step 13: Update README.md

## Deployment Info

- Deployment URL: https://d3k2l416i44onb.cloudfront.net
- Stack name: FuwariFrontend-preview-kamielw
- Distribution ID: E30W90PNT1O62T
- Distribution Domain: d3k2l416i44onb.cloudfront.net
- S3 Bucket Name: fuwarifrontend-preview-kami-cftos3s3bucketcae9f2be-biya4xeqfs33
- CloudFront Log Bucket: fuwarifrontend-preview-ka-cftos3cloudfrontloggingb-ocrnqyirmwqm
- S3 Log Bucket: fuwarifrontend-preview-ka-cftos3s3loggingbucket64b-lmoxm6xavndp
- Region: eu-central-1
- Environment: preview-kamielw
- Deployment Timestamp: 2026-05-01T12:56:48Z

## Recovery Guide

```bash
# Rollback
cd infra
cdk destroy "FuwariFrontend-preview-kamielw"

# Redeploy
./scripts/deploy.sh

# Deploy to different environment
./scripts/deploy.sh dev
./scripts/deploy.sh prod
```

## Issues Encountered

None.

## Session Log

### Session 1 - 2026-05-01T12:48:00Z - 2026-05-01T12:58:00Z
Agent: Claude Sonnet 4.5
Progress: Complete deployment from scratch
- Phase 1: Analyzed codebase (Astro static site), detected build config
- Phase 2: Generated CDK infrastructure with CloudFront + S3
- Phase 3: Deployed successfully to AWS
- Phase 4: Finalized documentation
Result: Live at https://d3k2l416i44onb.cloudfront.net
