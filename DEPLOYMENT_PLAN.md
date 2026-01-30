---
sop_name: deploy-frontend-app
repo_name: fuwari
app_name: Fuwari
app_type: Frontend Application
branch: deploy-to-aws-20260130_032535-sergeyka
created: 2026-01-30T04:25:00Z
last_updated: 2026-01-30T04:25:00Z
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
- [ ] Step 6: Initialize CDK Foundation
- [ ] Step 7: Generate CDK Stack
- [ ] Step 8: Create Deployment Script
- [ ] Step 9: Validate CDK Synth

## Phase 3: Deploy and Validate
- [ ] Step 10: Execute CDK Deployment
- [ ] Step 11: Validate CloudFormation Stack

## Phase 4: Update Documentation
- [ ] Step 12: Finalize Deployment Plan
- [ ] Step 13: Update README.md

## Deployment Info

- Deployment URL: [after completion]
- Stack name: [after creation]
- Distribution ID: [after creation]
- S3 bucket name: [after creation]
- CloudFront log bucket: [after creation]
- S3 log bucket: [after creation]

## Recovery Guide

```bash
# Rollback
cd infra && cdk destroy "<StackName>"

# Redeploy
./scripts/deploy.sh
```

## Issues Encountered

None.

## Session Log

### Session 1 - 2026-01-30T04:25:00Z
Agent: Claude Sonnet 4.5
Progress: Created DEPLOYMENT_PLAN.md
Next: Create deploy branch
