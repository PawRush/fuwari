---
sop_name: setup-pipeline
repo_name: fuwari
app_name: Fuwari
app_type: Frontend Application with CI/CD Pipeline
branch: deploy-to-aws-20260506_150212-kamielw
created: 2026-05-06
completed: 2026-05-06
---

# Deployment Summary

Your app has a CodePipeline pipeline. Changes on GitHub branch **deploy-to-aws-20260506_150212-kamielw** will be deployed automatically to production. This is managed by CloudFormation stack **FuwariPipelineStack**.

**Production URL**: https://dioc9c79u2spc.cloudfront.net

**Pipeline Console**: https://eu-central-1.console.aws.amazon.com/codesuite/codepipeline/pipelines/FuwariPipeline/view

Services used: CodePipeline, CodeBuild, CodeConnections, CloudFormation, CloudFront, S3, IAM

Questions? Ask your Coding Agent:
 - How can I change the source branch?
 - How do I add a custom domain?
 - What's the difference between preview and prod URLs?

## Quick Commands

```bash
# View pipeline status
aws codepipeline get-pipeline-state --name "FuwariPipeline" --region eu-central-1 --query 'stageStates[*].[stageName,latestExecution.status]' --output table

# View build logs
aws logs tail "/aws/codebuild/FuwariPipelineStack-Synth" --region eu-central-1 --follow

# Trigger pipeline manually
aws codepipeline start-pipeline-execution --name "FuwariPipeline" --region eu-central-1

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id "E1JAOIY6SKQICT" --paths "/*" --region eu-central-1
```

## Production Deployment Info

- **Stack Name**: FuwariFrontend-prod
- **Region**: eu-central-1
- **Website URL**: https://dioc9c79u2spc.cloudfront.net
- **Distribution ID**: E1JAOIY6SKQICT
- **Distribution Domain**: dioc9c79u2spc.cloudfront.net
- **S3 Bucket**: fuwarifrontend-prod-cftos3s3bucketcae9f2be-p68juu6a1av0
- **S3 Log Bucket**: fuwarifrontend-prod-cftos3s3loggingbucket64b485fe-zosbsdax9xwm
- **CloudFront Log Bucket**: fuwarifrontend-prod-cftos3cloudfrontloggingbucket9-3gcxbxdjs10r

## How the Pipeline Works

The pipeline automatically deploys when you push to the **deploy-to-aws-20260506_150212-kamielw** branch:

1. **Source**: Pulls code from GitHub via CodeConnection
2. **Build (Synth)**: 
   - Installs dependencies with pnpm
   - Runs quality checks (lint, check)
   - Scans for secrets
   - Builds the frontend (Astro)
   - Synthesizes CDK infrastructure
3. **UpdatePipeline**: Self-mutation if pipeline changed
4. **Assets**: Publishes file assets to S3
5. **Deploy**: Deploys FuwariFrontend-prod stack with CloudFront distribution

## Pipeline Configuration

**Quality Checks Enabled**:
- ✓ Lint (biome check)
- ✓ Type check (astro check)
- ✓ Secret scanning (@secretlint)

**CodeConnection**:
- ARN: arn:aws:codeconnections:eu-central-1:189681391221:connection/ee7a600a-99ab-4b3a-bf6c-b42cc9f5a026
- Status: AVAILABLE
- Repository: PawRush/fuwari
- Branch: deploy-to-aws-20260506_150212-kamielw

## Production Readiness

For enhanced production deployments, consider:
- **WAF Protection**: Add AWS WAF with managed rules (Core Rule Set, Known Bad Inputs) and rate limiting
- **Custom Domain**: Set up Route 53 and ACM certificate
- **Monitoring**: CloudWatch alarms for 4xx/5xx errors and CloudFront metrics
- **Backup**: Enable S3 versioning for critical assets

## Recovery Guide

```bash
# View stack events (troubleshooting)
aws cloudformation describe-stack-events --stack-name "FuwariFrontend-prod" --region eu-central-1 --max-items 20

# Rollback deployment (destroy and redeploy)
cd infra
pnpm run destroy:pipeline

# Redeploy pipeline
pnpm run deploy:pipeline
```

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| Pipeline failed at Synth | Lint/test failures, CDK synth errors | View logs: `aws logs tail "/aws/codebuild/FuwariPipelineStack-Synth" --region eu-central-1 --follow` |
| Stack deployment failed | IAM permissions, resource conflicts | View events: `aws cloudformation describe-stack-events --stack-name "FuwariFrontend-prod" --region eu-central-1` |
| CodeConnection auth failed | Authorization incomplete | Re-authorize: https://eu-central-1.console.aws.amazon.com/codesuite/settings/connections |
| Stale content after deploy | CloudFront cache | Invalidate: `aws cloudfront create-invalidation --distribution-id "E1JAOIY6SKQICT" --paths "/*" --region eu-central-1` |
| Build fails with "command not found" | Missing build tool | Add installation command to pipeline-stack.ts synth commands |

---

## Original Deployment Plan

### Pipeline Setup Completed: 2026-05-06

**App Identity**
- App name: Fuwari
- Stack prefix: Fuwari

**Stacks Detected**
- FrontendStack (Static website with CloudFront + S3)

**Frontend**
- Framework: Astro (static site generator)
- Build output: dist/
- Package manager: pnpm@9.14.4
- Build command: pnpm run build

**Backend**
- Lambda stack: Not detected
- Lambda functions: None
- Secrets required: No

**Quality Checks**
- lint (biome check) - Pass ✓
- check (astro check) - Pass ✓

**Git Repository**
- Repository: PawRush/fuwari
- Branch: deploy-to-aws-20260506_150212-kamielw

### Execution Summary

All phases completed successfully:

✅ **Phase 1: Gather Context and Configure**
- Detected existing infrastructure
- Confirmed user preferences
- Used existing CodeConnection (no secrets needed)

✅ **Phase 2: Build and Deploy Pipeline**
- Created pipeline-stack.ts
- Updated infra.ts to support pipeline mode
- Bootstrapped CDK environment
- Deployed FuwariPipelineStack
- Pipeline automatically triggered and deployed production stack

✅ **Phase 3: Documentation**
- Created DEPLOYMENT.md
- Updated README.md with pipeline section

### Session Log

**Session 1 - 2026-05-06**
- Agent: Claude Sonnet 4.5
- Progress: Complete pipeline setup from scratch
- Outcome: Pipeline deployed and production site live at https://dioc9c79u2spc.cloudfront.net
- Pipeline URL: https://eu-central-1.console.aws.amazon.com/codesuite/codepipeline/pipelines/FuwariPipeline/view

Created with the [setup-pipeline] Agent Standard Operation Procedure from the [AWS MCP](https://docs.aws.amazon.com/aws-mcp/latest/userguide/what-is-mcp-server.html).
