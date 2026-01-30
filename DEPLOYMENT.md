---
sop_name: deploy-frontend-app
repo_name: fuwari
app_name: Fuwari
app_type: Frontend Application
branch: deploy-to-aws-20260130_032535-sergeyka
created: 2026-01-30T04:25:00Z
last_updated: 2026-01-30T04:25:00Z
---

# Deployment Summary

Your app is deployed to AWS! Preview URL: https://d1yj4gfqqwnmq.cloudfront.net

**Next Step: Automate Deployments**

You're currently using manual deployment. To automate deployments from GitHub, ask your coding agent to set up AWS CodePipeline using an agent SOP for pipeline creation. Try: "create a pipeline using AWS SOPs"

Services used: CloudFront, S3, CloudFormation, IAM

Questions? Ask your Coding Agent:
 - What resources were deployed to AWS?
 - How do I update my deployment?

## Quick Commands

```bash
# View deployment status
aws cloudformation describe-stacks --stack-name "FuwariFrontend-preview-sergeyka" --query 'Stacks[0].StackStatus' --output text

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id "E2WHITQ03RKCIJ" --paths "/*"

# View CloudFront access logs (last hour)
aws s3 ls "s3://fuwarifrontend-preview-se-cftos3cloudfrontloggingb-kdzowde97p66/" --recursive | tail -20

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

**IMPORTANT**: Update this plan after EACH step completes. Mark the step `[x]` and update `last_updated` timestamp.

## Build Configuration

- Framework: Astro (static site generator)
- Package manager: pnpm
- Build command: `pnpm run build`
- Output directory: `dist/`
- Base path: `/` (root)
- Trailing slash: `always`
- CloudFront config: URL rewrite function (for `/path/index.html` routing)
- Lint command: `pnpm run lint`

## Phase 1: Gather Context and Configure
- [x] Step 0: Inform User of Execution Flow
- [x] Step 1: Create Deployment Plan
- [x] Step 2: Create Deploy Branch
- [x] Step 3: Detect Build Configuration
- [x] Step 4: Validate Prerequisites
- [x] Step 5: Revisit Deployment Plan

## Phase 2: Build CDK Infrastructure
- [x] Step 6: Initialize CDK Foundation
- [x] Step 7: Generate CDK Stack
- [x] Step 8: Create Deployment Script
- [x] Step 9: Validate CDK Synth

## Phase 3: Deploy and Validate
- [x] Step 10: Execute CDK Deployment
- [x] Step 11: Validate CloudFormation Stack

## Phase 4: Update Documentation
- [x] Step 12: Finalize Deployment Plan
- [x] Step 13: Update README.md

## Deployment Info

- Deployment URL: https://d1yj4gfqqwnmq.cloudfront.net
- Stack name: FuwariFrontend-preview-sergeyka
- Distribution ID: E2WHITQ03RKCIJ
- S3 bucket name: fuwarifrontend-preview-serg-cftos3s3bucketcae9f2be-x9kroujzhmy0
- CloudFront log bucket: fuwarifrontend-preview-se-cftos3cloudfrontloggingb-kdzowde97p66
- S3 log bucket: fuwarifrontend-preview-se-cftos3s3loggingbucket64b-ihljiw86ozct
- Deployment timestamp: 2026-01-30T04:22:03Z

## Recovery Guide

```bash
# Rollback
cd infra && cdk destroy "FuwariFrontend-preview-sergeyka"

# Redeploy
./scripts/deploy.sh
```

## Issues Encountered

None.

## Session Log

### Session 1 - 2026-01-30T04:25:00Z
Agent: Claude Sonnet 4.5
Progress: Complete deployment - all phases finished successfully
Next: Documentation finalized
