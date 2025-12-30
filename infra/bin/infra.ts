#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { execSync } from "child_process";
import { FrontendStack } from "../lib/stacks/frontend-stack";

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

const buildOutputPath = app.node.tryGetContext("buildPath") || "../dist";

new FrontendStack(app, `FuwariFrontend-${environment}`, {
  env: { account, region },
  environment,
  buildOutputPath,
  description: `Fuwari static blog - ${environment}`,
  terminationProtection: environment === "prod",
});

cdk.Tags.of(app).add("Project", "Fuwari");
cdk.Tags.of(app).add("ManagedBy", "CDK");
cdk.Tags.of(app).add("Environment", environment);
