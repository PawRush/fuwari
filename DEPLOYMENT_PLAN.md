---
sop_name: deploy-frontend-app
repo_name: fuwari
app_name: Fuwari
app_type: Frontend Application (Astro Static Site)
branch: main
created: 2026-01-21T21:12:00Z
last_updated: 2026-01-21T21:17:00Z
---

# Deployment Plan: Fuwari

Coding Agents should follow this Deployment Plan, and validate previous progress if picking up the Deployment in a new coding session.

**IMPORTANT**: Update this plan after EACH step completes. Mark the step `[x]` and update `last_updated` timestamp.

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
- [...] Step 10: Execute CDK Deployment
- [ ] Step 11: Validate CloudFormation Stack

## Phase 4: Update Documentation
- [ ] Step 12: Finalize Deployment Plan
- [ ] Step 13: Update README.md

## Build Configuration

- Framework: Astro (Static Site Generator)
- Package Manager: pnpm (detected from pnpm-lock.yaml and packageManager field)
- Build Command: pnpm run build
- Output Directory: dist/
- Base Path: / (root)
- Trailing Slash: always (static multi-page with /path/index.html)
- Entry Point: index.html
- Lint Command: pnpm run lint
- CloudFront Config: URL rewrite function (/path → /path/index.html)

## Deployment Info

- Framework: Astro (Static Site Generator)
- Deployment URL: [after completion]
- Stack name: [after creation]
- Distribution ID: [after creation]
- S3 Bucket: [after creation]
- CloudFront Log Bucket: [after creation]
- S3 Log Bucket: [after creation]

## Recovery Guide

```bash
# Rollback
cd infra && cdk destroy "<StackName>"

# Redeploy
./scripts/deploy.sh
```

## Issues Encountered

1. **CSS Build Error**: Fixed pre-existing build error in `markdown.css` where the `link` class from `main.css` wasn't accessible. Added `@import './main.css';` to `markdown.css` to resolve the issue.

## Session Log

### Session 1 - 2026-01-21T21:12:00Z
Agent: Claude Sonnet 4.5
Progress: Created deployment plan
Next: Create deploy branch
