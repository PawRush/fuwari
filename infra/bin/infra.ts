#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { execSync } from "child_process";
import { FrontendStack } from "../lib/stacks/frontend-stack";
import { PipelineStack } from "../lib/pipeline-stack";

const app = new cdk.App();

// Environment detection
const getDefaultEnvironment = (): string => {
  try {
    const username = process.env.USER || execSync('whoami').toString().trim();
    return `preview-${username}`;
  } catch {
    return 'preview-local';
  }
};

const environment = app.node.tryGetContext("environment") || getDefaultEnvironment();
const account = process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.CDK_DEFAULT_REGION || "us-east-1";

// Get context values for pipeline
const codeConnectionArn = app.node.tryGetContext("codeConnectionArn");
const repositoryName = app.node.tryGetContext("repositoryName") || "pawrush-repos/fuwari";
const branchName = app.node.tryGetContext("branchName") || "deploy-to-aws";
const pipelineOnly = app.node.tryGetContext("pipelineOnly") === "true";

// INSTRUCTIONS: adjust buildOutputPath if needed
const buildOutputPath = app.node.tryGetContext("buildPath") || "../dist";

// Create infrastructure stacks only if not pipeline-only mode
if (!pipelineOnly) {
  new FrontendStack(app, `FuwariFrontend-${environment}`, {
    env: { account, region },
    environment,
    buildOutputPath,
    description: `Static website hosting - ${environment}`,
  });
}

// Create pipeline stack (only if CodeConnection ARN is provided)
if (codeConnectionArn) {
  new PipelineStack(app, "FuwariBuildPipeline", {
    env: { account, region },
    description: "CI/CD Pipeline for Fuwari",
    codeConnectionArn,
    repositoryName,
    branchName,
  });
} else if (pipelineOnly) {
  console.warn("⚠️  CodeConnection ARN not provided. Pipeline stack will not be created.");
  console.warn("   Provide --context codeConnectionArn=<ARN> to deploy the pipeline.");
}

// Global tags
cdk.Tags.of(app).add("Project", "Fuwari");
cdk.Tags.of(app).add("ManagedBy", "CDK");
if (!pipelineOnly) {
  cdk.Tags.of(app).add("Environment", environment);
}
