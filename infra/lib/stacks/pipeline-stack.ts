import * as cdk from "aws-cdk-lib";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import * as codepipeline from "aws-cdk-lib/aws-codepipeline";
import * as pipelines from "aws-cdk-lib/pipelines";
import type { Construct } from "constructs";
import { FrontendStack } from "./frontend-stack";

export interface PipelineStackProps extends cdk.StackProps {
	codeConnectionArn: string;
	repositoryName: string;
	branchName: string;
}

export class PipelineStack extends cdk.Stack {
	public readonly pipeline: pipelines.CodePipeline;

	constructor(scope: Construct, id: string, props: PipelineStackProps) {
		super(scope, id, props);

		const source = pipelines.CodePipelineSource.connection(
			props.repositoryName,
			props.branchName,
			{
				connectionArn: props.codeConnectionArn,
				triggerOnPush: true,
			},
		);

		const synth = new pipelines.ShellStep("Synth", {
			input: source,
			commands: [
				"pnpm install",
				"(cd infra && pnpm install)",

				// Lint check
				'pnpm run lint',

				// Secret scanning
				"npx -y @secretlint/quick-start '**/*'",

				// Build frontend
				"pnpm run build",

				// Build and synth CDK
				"cd infra",
				"pnpm run build",
				`npx -y cdk synth --context codeConnectionArn="${props.codeConnectionArn}" --context repositoryName="${props.repositoryName}" --context branchName="${props.branchName}"`,
			],
			primaryOutputDirectory: "infra/cdk.out",
		});

		this.pipeline = new pipelines.CodePipeline(this, "Pipeline", {
			pipelineName: "FuwariPipeline",
			selfMutation: true,
			pipelineType: codepipeline.PipelineType.V2,
			synth,
			synthCodeBuildDefaults: {
				buildEnvironment: {
					computeType: codebuild.ComputeType.MEDIUM,
					buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
				},
				partialBuildSpec: codebuild.BuildSpec.fromObject({
					version: "0.2",
					phases: {
						install: {
							"runtime-versions": {
								nodejs: "latest",
							},
							commands: [
								"corepack enable && corepack prepare pnpm@latest --activate",
							],
						},
					},
				}),
			},
		});

		// Deploy production environment
		const deployStage = new cdk.Stage(this, "Deploy", {
			env: { account: this.account, region: this.region },
		});
		new FrontendStack(deployStage, "FuwariFrontend-prod", {
			stackName: "FuwariFrontend-prod",
			environment: "prod",
			buildOutputPath: "../dist",
		});
		this.pipeline.addStage(deployStage);

		// Build pipeline to enable property access
		this.pipeline.buildPipeline();

		cdk.Tags.of(this).add("Stack", "Pipeline");
		cdk.Tags.of(this).add("aws-mcp:deploy:sop", "setup-pipeline");

		new cdk.CfnOutput(this, "PipelineName", {
			value: "FuwariPipeline",
			description: "CodePipeline Name",
		});

		new cdk.CfnOutput(this, "PipelineArn", {
			value: this.pipeline.pipeline.pipelineArn,
			description: "CodePipeline ARN",
		});
	}
}
