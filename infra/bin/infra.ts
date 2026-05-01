#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { execSync } from "node:child_process";
import { FrontendStack } from "../lib/stacks/frontend-stack";
import { PipelineStack } from "../lib/stacks/pipeline-stack";

const app = new cdk.App();

const getDefaultEnvironment = (): string => {
	try {
		const username = process.env.USER || execSync("whoami").toString().trim();
		return `preview-${username}`;
	} catch {
		return "preview-local";
	}
};

const account = process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.CDK_DEFAULT_REGION || "us-east-1";

const codeConnectionArn = app.node.tryGetContext("codeConnectionArn");
const repositoryName =
	app.node.tryGetContext("repositoryName") || "PawRush/fuwari";
const branchName =
	app.node.tryGetContext("branchName") ||
	"deploy-to-aws-20260501_121659-kamielw";

if (!codeConnectionArn) {
	const environment =
		app.node.tryGetContext("environment") || getDefaultEnvironment();
	const buildOutputPath = app.node.tryGetContext("buildPath") || "../dist";

	new FrontendStack(app, `FuwariFrontend-${environment}`, {
		env: { account, region },
		environment,
		buildOutputPath,
		description: `Static website hosting - ${environment}`,
		terminationProtection: environment === "prod",
	});

	cdk.Tags.of(app).add("Environment", environment);
}

if (codeConnectionArn) {
	new PipelineStack(app, "FuwariPipelineStack", {
		env: { account, region },
		description: "CI/CD Pipeline for Fuwari",
		codeConnectionArn,
		repositoryName,
		branchName,
		terminationProtection: true,
	});
}

cdk.Tags.of(app).add("Project", "Fuwari");
cdk.Tags.of(app).add("ManagedBy", "CDK");
