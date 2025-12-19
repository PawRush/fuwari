"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PipelineStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const codebuild = __importStar(require("aws-cdk-lib/aws-codebuild"));
const codepipeline = __importStar(require("aws-cdk-lib/aws-codepipeline"));
const codepipeline_actions = __importStar(require("aws-cdk-lib/aws-codepipeline-actions"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const sns = __importStar(require("aws-cdk-lib/aws-sns"));
const shared_constructs_1 = require("./shared-constructs");
class PipelineStack extends cdk.Stack {
    pipeline;
    artifactsBucket;
    constructor(scope, id, props) {
        super(scope, id, props);
        // Create artifacts bucket
        this.artifactsBucket = new shared_constructs_1.ArtifactsBucket(this, "ArtifactsBucket").bucket;
        // Create SNS topic for notifications
        const notificationTopic = new sns.Topic(this, "PipelineNotifications", {
            displayName: "Fuwari Pipeline Notifications",
        });
        // Create CodeBuild roles
        const qualityRole = new shared_constructs_1.CodeBuildRole(this, "QualityRole", {
            allowSecretsManager: true,
            allowS3Artifacts: true,
        });
        const buildRole = new shared_constructs_1.CodeBuildRole(this, "BuildRole", {
            allowSecretsManager: true,
            allowS3Artifacts: true,
            allowCloudFormation: true,
            allowCdkBootstrap: true,
            additionalPolicies: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: [
                        "cloudfront:GetDistribution",
                        "cloudfront:GetDistributionConfig",
                    ],
                    resources: ["*"],
                }),
            ],
        });
        const deployRole = new shared_constructs_1.CodeBuildRole(this, "DeployRole", {
            allowSecretsManager: true,
            allowS3Artifacts: true,
            allowCloudFormation: true,
            allowCdkBootstrap: true,
            additionalPolicies: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: [
                        "s3:ListBucket",
                        "s3:GetBucketLocation",
                        "s3:GetObject",
                        "s3:PutObject",
                        "s3:DeleteObject",
                    ],
                    resources: [
                        "arn:aws:s3:::*-frontend-*",
                        "arn:aws:s3:::*-frontend-*/*",
                    ],
                }),
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: [
                        "cloudfront:CreateInvalidation",
                        "cloudfront:GetInvalidation",
                    ],
                    resources: ["*"],
                }),
            ],
        });
        // Create CodeBuild projects
        const lintTypeProject = this.createLintTypeProject(qualityRole.role);
        const unitTestsProject = this.createUnitTestsProject(qualityRole.role);
        const frontendBuildProject = this.createFrontendBuildProject(buildRole.role);
        const deployFrontendProject = this.createDeployFrontendProject(deployRole.role);
        // Define pipeline artifacts
        const artifacts = {
            source: new codepipeline.Artifact("SourceOutput"),
            lint: new codepipeline.Artifact("LintTypeOutput"),
            unit: new codepipeline.Artifact("UnitTestsOutput"),
            frontendBuild: new codepipeline.Artifact("FrontendBuildOutput"),
        };
        const [owner, repo] = props.repositoryName.split("/");
        // Define pipeline stages
        const stages = [
            {
                stageName: "Source",
                actions: [
                    new codepipeline_actions.CodeStarConnectionsSourceAction({
                        actionName: "Source",
                        owner,
                        repo,
                        branch: props.branchName,
                        connectionArn: props.codeConnectionArn,
                        output: artifacts.source,
                        triggerOnPush: true,
                    }),
                ],
            },
            {
                stageName: "Quality",
                actions: [
                    new codepipeline_actions.CodeBuildAction({
                        actionName: "LintType",
                        project: lintTypeProject,
                        input: artifacts.source,
                        outputs: [artifacts.lint],
                    }),
                    new codepipeline_actions.CodeBuildAction({
                        actionName: "UnitTests",
                        project: unitTestsProject,
                        input: artifacts.source,
                        outputs: [artifacts.unit],
                    }),
                ],
            },
            {
                stageName: "Build",
                actions: [
                    new codepipeline_actions.CodeBuildAction({
                        actionName: "FrontendBuild",
                        project: frontendBuildProject,
                        input: artifacts.source,
                        outputs: [artifacts.frontendBuild],
                    }),
                ],
            },
            {
                stageName: "DeployProd",
                actions: [
                    new codepipeline_actions.CodeBuildAction({
                        actionName: "DeployFrontendProd",
                        project: deployFrontendProject,
                        input: artifacts.source,
                        extraInputs: [artifacts.frontendBuild],
                        environmentVariables: {
                            ENVIRONMENT: { value: "prod" },
                            BUILD_DIR: { value: "dist" },
                        },
                        runOrder: 1,
                    }),
                ],
            },
        ];
        // Create pipeline
        this.pipeline = new codepipeline.Pipeline(this, "Pipeline", {
            pipelineName: "FuwariBuildPipeline",
            pipelineType: codepipeline.PipelineType.V2,
            artifactBucket: this.artifactsBucket,
            stages,
        });
        // Subscribe to notifications
        this.pipeline.notifyOnExecutionStateChange("PipelineExecutionNotifications", notificationTopic);
        // Outputs
        new cdk.CfnOutput(this, "PipelineName", {
            value: this.pipeline.pipelineName,
            description: "CodePipeline Name",
        });
        new cdk.CfnOutput(this, "ArtifactsBucket", {
            value: this.artifactsBucket.bucketName,
            description: "S3 Artifacts Bucket",
        });
        new cdk.CfnOutput(this, "BuildRoleArn", {
            value: buildRole.role.roleArn,
            description: "CodeBuild Build Role ARN",
            exportName: `${this.stackName}-BuildRoleArn`,
        });
        new cdk.CfnOutput(this, "DeployRoleArn", {
            value: deployRole.role.roleArn,
            description: "CodeBuild Deploy Role ARN",
            exportName: `${this.stackName}-DeployRoleArn`,
        });
        cdk.Tags.of(this).add("Stack", "Pipeline");
        cdk.Tags.of(this).add("aws-mcp:deploy:type", "ci-cd");
    }
    createLintTypeProject(role) {
        return new codebuild.PipelineProject(this, "LintTypeProject", {
            projectName: "Fuwari-LintType",
            role,
            environment: {
                buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
                computeType: codebuild.ComputeType.SMALL,
            },
            buildSpec: codebuild.BuildSpec.fromSourceFilename("buildspecs/lint_type.yml"),
        });
    }
    createUnitTestsProject(role) {
        return new codebuild.PipelineProject(this, "UnitTestsProject", {
            projectName: "Fuwari-UnitTests",
            role,
            environment: {
                buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
                computeType: codebuild.ComputeType.SMALL,
            },
            buildSpec: codebuild.BuildSpec.fromSourceFilename("buildspecs/unit_tests.yml"),
        });
    }
    createFrontendBuildProject(role) {
        return new codebuild.PipelineProject(this, "FrontendBuildProject", {
            projectName: "Fuwari-FrontendBuild",
            role,
            environment: {
                buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
                computeType: codebuild.ComputeType.SMALL,
            },
            buildSpec: codebuild.BuildSpec.fromSourceFilename("buildspecs/frontend_build.yml"),
        });
    }
    createDeployFrontendProject(role) {
        return new codebuild.PipelineProject(this, "DeployFrontendProject", {
            projectName: "Fuwari-DeployFrontend",
            role,
            environment: {
                buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
                computeType: codebuild.ComputeType.SMALL,
            },
            buildSpec: codebuild.BuildSpec.fromSourceFilename("buildspecs/deploy_frontend.yml"),
        });
    }
}
exports.PipelineStack = PipelineStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGlwZWxpbmUtc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJwaXBlbGluZS1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMscUVBQXVEO0FBQ3ZELDJFQUE2RDtBQUM3RCwyRkFBNkU7QUFDN0UseURBQTJDO0FBQzNDLHlEQUEyQztBQUUzQywyREFBcUU7QUFRckUsTUFBYSxhQUFjLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDMUIsUUFBUSxDQUF3QjtJQUNoQyxlQUFlLENBQW9CO0lBRW5ELFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBeUI7UUFDakUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsMEJBQTBCO1FBQzFCLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxtQ0FBZSxDQUFDLElBQUksRUFBRSxpQkFBaUIsQ0FBQyxDQUFDLE1BQU0sQ0FBQztRQUUzRSxxQ0FBcUM7UUFDckMsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLHVCQUF1QixFQUFFO1lBQ3JFLFdBQVcsRUFBRSwrQkFBK0I7U0FDN0MsQ0FBQyxDQUFDO1FBRUgseUJBQXlCO1FBQ3pCLE1BQU0sV0FBVyxHQUFHLElBQUksaUNBQWEsQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFO1lBQ3pELG1CQUFtQixFQUFFLElBQUk7WUFDekIsZ0JBQWdCLEVBQUUsSUFBSTtTQUN2QixDQUFDLENBQUM7UUFFSCxNQUFNLFNBQVMsR0FBRyxJQUFJLGlDQUFhLENBQUMsSUFBSSxFQUFFLFdBQVcsRUFBRTtZQUNyRCxtQkFBbUIsRUFBRSxJQUFJO1lBQ3pCLGdCQUFnQixFQUFFLElBQUk7WUFDdEIsbUJBQW1CLEVBQUUsSUFBSTtZQUN6QixpQkFBaUIsRUFBRSxJQUFJO1lBQ3ZCLGtCQUFr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QVMsQ0FBQyxlQUFlLENBQUMsWUFBWTtnQkFDbEQsV0FBVyxFQUFFLFNBQVMsQ0FBQyxXQUFXLENBQUMsS0FBSzthQUN6QztZQUNELFNBQVMsRUFBRSxTQUFTLENBQUMsU0FBUyxDQUFDLGtCQUFrQixDQUMvQywrQkFBK0IsQ0FDaEM7U0FDRixDQUFDLENBQUM7SUFDTCxDQUFDO0lBRU8sMkJBQTJCLENBQ2pDLElBQWM7UUFFZCxPQUFPLElBQUksU0FBUyxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUUsdUJBQXVCLEVBQUU7WUFDbEUsV0FBVyxFQUFFLHVCQUF1QjtZQUNwQyxJQUFJO1lBQ0osV0FBVyxFQUFFO2dCQUNYLFVBQVUsRUFBRSxTQUFTLENBQUMsZUFBZSxDQUFDLFlBQVk7Z0JBQ2xELFdBQVcsRUFBRSxTQUFTLENBQUMsV0FBVyxDQUFDLEtBQUs7YUFDekM7WUFDRCxTQUFTLEVBQUUsU0FBUyxDQUFDLFNBQVMsQ0FBQyxrQkFBa0IsQ0FDL0MsZ0NBQWdDLENBQ2pDO1NBQ0YsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBclBELHNDQXFQQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tIFwiYXdzLWNkay1saWJcIjtcbmltcG9ydCAqIGFzIGNvZGVidWlsZCBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWNvZGVidWlsZFwiO1xuaW1wb3J0ICogYXMgY29kZXBpcGVsaW5lIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtY29kZXBpcGVsaW5lXCI7XG5pbXBvcnQgKiBhcyBjb2RlcGlwZWxpbmVfYWN0aW9ucyBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWNvZGVwaXBlbGluZS1hY3Rpb25zXCI7XG5pbXBvcnQgKiBhcyBpYW0gZnJvbSBcImF3cy1jZGstbGliL2F3cy1pYW1cIjtcbmltcG9ydCAqIGFzIHNucyBmcm9tIFwiYXdzLWNkay1saWIvYXdzLXNuc1wiO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSBcImNvbnN0cnVjdHNcIjtcbmltcG9ydCB7IEFydGlmYWN0c0J1Y2tldCwgQ29kZUJ1aWxkUm9sZSB9IGZyb20gXCIuL3NoYXJlZC1jb25zdHJ1Y3RzXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGlwZWxpbmVTdGFja1Byb3BzIGV4dGVuZHMgY2RrLlN0YWNrUHJvcHMge1xuICBjb2RlQ29ubmVjdGlvbkFybjogc3RyaW5nO1xuICByZXBvc2l0b3J5TmFtZTogc3RyaW5nO1xuICBicmFuY2hOYW1lOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjbGFzcyBQaXBlbGluZVN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgcHVibGljIHJlYWRvbmx5IHBpcGVsaW5lOiBjb2RlcGlwZWxpbmUuUGlwZWxpbmU7XG4gIHB1YmxpYyByZWFkb25seSBhcnRpZmFjdHNCdWNrZXQ6IGNkay5hd3NfczMuQnVja2V0O1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBQaXBlbGluZVN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIC8vIENyZWF0ZSBhcnRpZmFjdHMgYnVja2V0XG4gICAgdGhpcy5hcnRpZmFjdHNCdWNrZXQgPSBuZXcgQXJ0aWZhY3RzQnVja2V0KHRoaXMsIFwiQXJ0aWZhY3RzQnVja2V0XCIpLmJ1Y2tldDtcblxuICAgIC8vIENyZWF0ZSBTTlMgdG9waWMgZm9yIG5vdGlmaWNhdGlvbnNcbiAgICBjb25zdCBub3RpZmljYXRpb25Ub3BpYyA9IG5ldyBzbnMuVG9waWModGhpcywgXCJQaXBlbGluZU5vdGlmaWNhdGlvbnNcIiwge1xuICAgICAgZGlzcGxheU5hbWU6IFwiRnV3YXJpIFBpcGVsaW5lIE5vdGlmaWNhdGlvbnNcIixcbiAgICB9KTtcblxuICAgIC8vIENyZWF0ZSBDb2RlQnVpbGQgcm9sZXNcbiAgICBjb25zdCBxdWFsaXR5Um9sZSA9IG5ldyBDb2RlQnVpbGRSb2xlKHRoaXMsIFwiUXVhbGl0eVJvbGVcIiwge1xuICAgICAgYWxsb3dTZWNyZXRzTWFuYWdlcjogdHJ1ZSxcbiAgICAgIGFsbG93UzNBcnRpZmFjdHM6IHRydWUsXG4gICAgfSk7XG5cbiAgICBjb25zdCBidWlsZFJvbGUgPSBuZXcgQ29kZUJ1aWxkUm9sZSh0aGlzLCBcIkJ1aWxkUm9sZVwiLCB7XG4gICAgICBhbGxvd1NlY3JldHNNYW5hZ2VyOiB0cnVlLFxuICAgICAgYWxsb3dTM0FydGlmYWN0czogdHJ1ZSxcbiAgICAgIGFsbG93Q2xvdWRGb3JtYXRpb246IHRydWUsXG4gICAgICBhbGxvd0Nka0Jvb3RzdHJhcDogdHJ1ZSxcbiAgICAgIGFkZGl0aW9uYWxQb2xpY2llczogW1xuICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgICAgIFwiY2xvdWRmcm9udDpHZXREaXN0cmlidXRpb25cIixcbiAgICAgICAgICAgIFwiY2xvdWRmcm9udDpHZXREaXN0cmlidXRpb25Db25maWdcIixcbiAgICAgICAgICBdLFxuICAgICAgICAgIHJlc291cmNlczogW1wiKlwiXSxcbiAgICAgICAgfSksXG4gICAgICBdLFxuICAgIH0pO1xuXG4gICAgY29uc3QgZGVwbG95Um9sZSA9IG5ldyBDb2RlQnVpbGRSb2xlKHRoaXMsIFwiRGVwbG95Um9sZVwiLCB7XG4gICAgICBhbGxvd1NlY3JldHNNYW5hZ2VyOiB0cnVlLFxuICAgICAgYWxsb3dTM0FydGlmYWN0czogdHJ1ZSxcbiAgICAgIGFsbG93Q2xvdWRGb3JtYXRpb246IHRydWUsXG4gICAgICBhbGxvd0Nka0Jvb3RzdHJhcDogdHJ1ZSxcbiAgICAgIGFkZGl0aW9uYWxQb2xpY2llczogW1xuICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgICAgIFwiczM6TGlzdEJ1Y2tldFwiLFxuICAgICAgICAgICAgXCJzMzpHZXRCdWNrZXRMb2NhdGlvblwiLFxuICAgICAgICAgICAgXCJzMzpHZXRPYmplY3RcIixcbiAgICAgICAgICAgIFwiczM6UHV0T2JqZWN0XCIsXG4gICAgICAgICAgICBcInMzOkRlbGV0ZU9iamVjdFwiLFxuICAgICAgICAgIF0sXG4gICAgICAgICAgcmVzb3VyY2VzOiBbXG4gICAgICAgICAgICBcImFybjphd3M6czM6OjoqLWZyb250ZW5kLSpcIixcbiAgICAgICAgICAgIFwiYXJuOmF3czpzMzo6OiotZnJvbnRlbmQtKi8qXCIsXG4gICAgICAgICAgXSxcbiAgICAgICAgfSksXG4gICAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICAgXCJjbG91ZGZyb250OkNyZWF0ZUludmFsaWRhdGlvblwiLFxuICAgICAgICAgICAgXCJjbG91ZGZyb250OkdldEludmFsaWRhdGlvblwiLFxuICAgICAgICAgIF0sXG4gICAgICAgICAgcmVzb3VyY2VzOiBbXCIqXCJdLFxuICAgICAgICB9KSxcbiAgICAgIF0sXG4gICAgfSk7XG5cbiAgICAvLyBDcmVhdGUgQ29kZUJ1aWxkIHByb2plY3RzXG4gICAgY29uc3QgbGludFR5cGVQcm9qZWN0ID0gdGhpcy5jcmVhdGVMaW50VHlwZVByb2plY3QocXVhbGl0eVJvbGUucm9sZSk7XG4gICAgY29uc3QgdW5pdFRlc3RzUHJvamVjdCA9IHRoaXMuY3JlYXRlVW5pdFRlc3RzUHJvamVjdChxdWFsaXR5Um9sZS5yb2xlKTtcbiAgICBjb25zdCBmcm9udGVuZEJ1aWxkUHJvamVjdCA9IHRoaXMuY3JlYXRlRnJvbnRlbmRCdWlsZFByb2plY3QoYnVpbGRSb2xlLnJvbGUpO1xuICAgIGNvbnN0IGRlcGxveUZyb250ZW5kUHJvamVjdCA9IHRoaXMuY3JlYXRlRGVwbG95RnJvbnRlbmRQcm9qZWN0KFxuICAgICAgZGVwbG95Um9sZS5yb2xlLFxuICAgICk7XG5cbiAgICAvLyBEZWZpbmUgcGlwZWxpbmUgYXJ0aWZhY3RzXG4gICAgY29uc3QgYXJ0aWZhY3RzID0ge1xuICAgICAgc291cmNlOiBuZXcgY29kZXBpcGVsaW5lLkFydGlmYWN0KFwiU291cmNlT3V0cHV0XCIpLFxuICAgICAgbGludDogbmV3IGNvZGVwaXBlbGluZS5BcnRpZmFjdChcIkxpbnRUeXBlT3V0cHV0XCIpLFxuICAgICAgdW5pdDogbmV3IGNvZGVwaXBlbGluZS5BcnRpZmFjdChcIlVuaXRUZXN0c091dHB1dFwiKSxcbiAgICAgIGZyb250ZW5kQnVpbGQ6IG5ldyBjb2RlcGlwZWxpbmUuQXJ0aWZhY3QoXCJGcm9udGVuZEJ1aWxkT3V0cHV0XCIpLFxuICAgIH07XG5cbiAgICBjb25zdCBbb3duZXIsIHJlcG9dID0gcHJvcHMucmVwb3NpdG9yeU5hbWUuc3BsaXQoXCIvXCIpO1xuXG4gICAgLy8gRGVmaW5lIHBpcGVsaW5lIHN0YWdlc1xuICAgIGNvbnN0IHN0YWdlczogY29kZXBpcGVsaW5lLlN0YWdlUHJvcHNbXSA9IFtcbiAgICAgIHtcbiAgICAgICAgc3RhZ2VOYW1lOiBcIlNvdXJjZVwiLFxuICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgbmV3IGNvZGVwaXBlbGluZV9hY3Rpb25zLkNvZGVTdGFyQ29ubmVjdGlvbnNTb3VyY2VBY3Rpb24oe1xuICAgICAgICAgICAgYWN0aW9uTmFtZTogXCJTb3VyY2VcIixcbiAgICAgICAgICAgIG93bmVyLFxuICAgICAgICAgICAgcmVwbyxcbiAgICAgICAgICAgIGJyYW5jaDogcHJvcHMuYnJhbmNoTmFtZSxcbiAgICAgICAgICAgIGNvbm5lY3Rpb25Bcm46IHByb3BzLmNvZGVDb25uZWN0aW9uQXJuLFxuICAgICAgICAgICAgb3V0cHV0OiBhcnRpZmFjdHMuc291cmNlLFxuICAgICAgICAgICAgdHJpZ2dlck9uUHVzaDogdHJ1ZSxcbiAgICAgICAgICB9KSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIHN0YWdlTmFtZTogXCJRdWFsaXR5XCIsXG4gICAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgICBuZXcgY29kZXBpcGVsaW5lX2FjdGlvbnMuQ29kZUJ1aWxkQWN0aW9uKHtcbiAgICAgICAgICAgIGFjdGlvbk5hbWU6IFwiTGludFR5cGVcIixcbiAgICAgICAgICAgIHByb2plY3Q6IGxpbnRUeXBlUHJvamVjdCxcbiAgICAgICAgICAgIGlucHV0OiBhcnRpZmFjdHMuc291cmNlLFxuICAgICAgICAgICAgb3V0cHV0czogW2FydGlmYWN0cy5saW50XSxcbiAgICAgICAgICB9KSxcbiAgICAgICAgICBuZXcgY29kZXBpcGVsaW5lX2FjdGlvbnMuQ29kZUJ1aWxkQWN0aW9uKHtcbiAgICAgICAgICAgIGFjdGlvbk5hbWU6IFwiVW5pdFRlc3RzXCIsXG4gICAgICAgICAgICBwcm9qZWN0OiB1bml0VGVzdHNQcm9qZWN0LFxuICAgICAgICAgICAgaW5wdXQ6IGFydGlmYWN0cy5zb3VyY2UsXG4gICAgICAgICAgICBvdXRwdXRzOiBbYXJ0aWZhY3RzLnVuaXRdLFxuICAgICAgICAgIH0pLFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgc3RhZ2VOYW1lOiBcIkJ1aWxkXCIsXG4gICAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgICBuZXcgY29kZXBpcGVsaW5lX2FjdGlvbnMuQ29kZUJ1aWxkQWN0aW9uKHtcbiAgICAgICAgICAgIGFjdGlvbk5hbWU6IFwiRnJvbnRlbmRCdWlsZFwiLFxuICAgICAgICAgICAgcHJvamVjdDogZnJvbnRlbmRCdWlsZFByb2plY3QsXG4gICAgICAgICAgICBpbnB1dDogYXJ0aWZhY3RzLnNvdXJjZSxcbiAgICAgICAgICAgIG91dHB1dHM6IFthcnRpZmFjdHMuZnJvbnRlbmRCdWlsZF0sXG4gICAgICAgICAgfSksXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBzdGFnZU5hbWU6IFwiRGVwbG95UHJvZFwiLFxuICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgbmV3IGNvZGVwaXBlbGluZV9hY3Rpb25zLkNvZGVCdWlsZEFjdGlvbih7XG4gICAgICAgICAgICBhY3Rpb25OYW1lOiBcIkRlcGxveUZyb250ZW5kUHJvZFwiLFxuICAgICAgICAgICAgcHJvamVjdDogZGVwbG95RnJvbnRlbmRQcm9qZWN0LFxuICAgICAgICAgICAgaW5wdXQ6IGFydGlmYWN0cy5zb3VyY2UsXG4gICAgICAgICAgICBleHRyYUlucHV0czogW2FydGlmYWN0cy5mcm9udGVuZEJ1aWxkXSxcbiAgICAgICAgICAgIGVudmlyb25tZW50VmFyaWFibGVzOiB7XG4gICAgICAgICAgICAgIEVOVklST05NRU5UOiB7IHZhbHVlOiBcInByb2RcIiB9LFxuICAgICAgICAgICAgICBCVUlMRF9ESVI6IHsgdmFsdWU6IFwiZGlzdFwiIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcnVuT3JkZXI6IDEsXG4gICAgICAgICAgfSksXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgIF07XG5cbiAgICAvLyBDcmVhdGUgcGlwZWxpbmVcbiAgICB0aGlzLnBpcGVsaW5lID0gbmV3IGNvZGVwaXBlbGluZS5QaXBlbGluZSh0aGlzLCBcIlBpcGVsaW5lXCIsIHtcbiAgICAgIHBpcGVsaW5lTmFtZTogXCJGdXdhcmlCdWlsZFBpcGVsaW5lXCIsXG4gICAgICBwaXBlbGluZVR5cGU6IGNvZGVwaXBlbGluZS5QaXBlbGluZVR5cGUuVjIsXG4gICAgICBhcnRpZmFjdEJ1Y2tldDogdGhpcy5hcnRpZmFjdHNCdWNrZXQsXG4gICAgICBzdGFnZXMsXG4gICAgfSk7XG5cbiAgICAvLyBTdWJzY3JpYmUgdG8gbm90aWZpY2F0aW9uc1xuICAgIHRoaXMucGlwZWxpbmUubm90aWZ5T25FeGVjdXRpb25TdGF0ZUNoYW5nZShcbiAgICAgIFwiUGlwZWxpbmVFeGVjdXRpb25Ob3RpZmljYXRpb25zXCIsXG4gICAgICBub3RpZmljYXRpb25Ub3BpYyxcbiAgICApO1xuXG4gICAgLy8gT3V0cHV0c1xuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsIFwiUGlwZWxpbmVOYW1lXCIsIHtcbiAgICAgIHZhbHVlOiB0aGlzLnBpcGVsaW5lLnBpcGVsaW5lTmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiBcIkNvZGVQaXBlbGluZSBOYW1lXCIsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCBcIkFydGlmYWN0c0J1Y2tldFwiLCB7XG4gICAgICB2YWx1ZTogdGhpcy5hcnRpZmFjdHNCdWNrZXQuYnVja2V0TmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiBcIlMzIEFydGlmYWN0cyBCdWNrZXRcIixcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsIFwiQnVpbGRSb2xlQXJuXCIsIHtcbiAgICAgIHZhbHVlOiBidWlsZFJvbGUucm9sZS5yb2xlQXJuLFxuICAgICAgZGVzY3JpcHRpb246IFwiQ29kZUJ1aWxkIEJ1aWxkIFJvbGUgQVJOXCIsXG4gICAgICBleHBvcnROYW1lOiBgJHt0aGlzLnN0YWNrTmFtZX0tQnVpbGRSb2xlQXJuYCxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsIFwiRGVwbG95Um9sZUFyblwiLCB7XG4gICAgICB2YWx1ZTogZGVwbG95Um9sZS5yb2xlLnJvbGVBcm4sXG4gICAgICBkZXNjcmlwdGlvbjogXCJDb2RlQnVpbGQgRGVwbG95IFJvbGUgQVJOXCIsXG4gICAgICBleHBvcnROYW1lOiBgJHt0aGlzLnN0YWNrTmFtZX0tRGVwbG95Um9sZUFybmAsXG4gICAgfSk7XG5cbiAgICBjZGsuVGFncy5vZih0aGlzKS5hZGQoXCJTdGFja1wiLCBcIlBpcGVsaW5lXCIpO1xuICAgIGNkay5UYWdzLm9mKHRoaXMpLmFkZChcImF3cy1tY3A6ZGVwbG95OnR5cGVcIiwgXCJjaS1jZFwiKTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlTGludFR5cGVQcm9qZWN0KHJvbGU6IGlhbS5Sb2xlKTogY29kZWJ1aWxkLlBpcGVsaW5lUHJvamVjdCB7XG4gICAgcmV0dXJuIG5ldyBjb2RlYnVpbGQuUGlwZWxpbmVQcm9qZWN0KHRoaXMsIFwiTGludFR5cGVQcm9qZWN0XCIsIHtcbiAgICAgIHByb2plY3ROYW1lOiBcIkZ1d2FyaS1MaW50VHlwZVwiLFxuICAgICAgcm9sZSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIGJ1aWxkSW1hZ2U6IGNvZGVidWlsZC5MaW51eEJ1aWxkSW1hZ2UuU1RBTkRBUkRfN18wLFxuICAgICAgICBjb21wdXRlVHlwZTogY29kZWJ1aWxkLkNvbXB1dGVUeXBlLlNNQUxMLFxuICAgICAgfSxcbiAgICAgIGJ1aWxkU3BlYzogY29kZWJ1aWxkLkJ1aWxkU3BlYy5mcm9tU291cmNlRmlsZW5hbWUoXCJidWlsZHNwZWNzL2xpbnRfdHlwZS55bWxcIiksXG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZVVuaXRUZXN0c1Byb2plY3Qocm9sZTogaWFtLlJvbGUpOiBjb2RlYnVpbGQuUGlwZWxpbmVQcm9qZWN0IHtcbiAgICByZXR1cm4gbmV3IGNvZGVidWlsZC5QaXBlbGluZVByb2plY3QodGhpcywgXCJVbml0VGVzdHNQcm9qZWN0XCIsIHtcbiAgICAgIHByb2plY3ROYW1lOiBcIkZ1d2FyaS1Vbml0VGVzdHNcIixcbiAgICAgIHJvbGUsXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBidWlsZEltYWdlOiBjb2RlYnVpbGQuTGludXhCdWlsZEltYWdlLlNUQU5EQVJEXzdfMCxcbiAgICAgICAgY29tcHV0ZVR5cGU6IGNvZGVidWlsZC5Db21wdXRlVHlwZS5TTUFMTCxcbiAgICAgIH0sXG4gICAgICBidWlsZFNwZWM6IGNvZGVidWlsZC5CdWlsZFNwZWMuZnJvbVNvdXJjZUZpbGVuYW1lKFwiYnVpbGRzcGVjcy91bml0X3Rlc3RzLnltbFwiKSxcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlRnJvbnRlbmRCdWlsZFByb2plY3QoXG4gICAgcm9sZTogaWFtLlJvbGUsXG4gICk6IGNvZGVidWlsZC5QaXBlbGluZVByb2plY3Qge1xuICAgIHJldHVybiBuZXcgY29kZWJ1aWxkLlBpcGVsaW5lUHJvamVjdCh0aGlzLCBcIkZyb250ZW5kQnVpbGRQcm9qZWN0XCIsIHtcbiAgICAgIHByb2plY3ROYW1lOiBcIkZ1d2FyaS1Gcm9udGVuZEJ1aWxkXCIsXG4gICAgICByb2xlLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgYnVpbGRJbWFnZTogY29kZWJ1aWxkLkxpbnV4QnVpbGRJbWFnZS5TVEFOREFSRF83XzAsXG4gICAgICAgIGNvbXB1dGVUeXBlOiBjb2RlYnVpbGQuQ29tcHV0ZVR5cGUuU01BTEwsXG4gICAgICB9LFxuICAgICAgYnVpbGRTcGVjOiBjb2RlYnVpbGQuQnVpbGRTcGVjLmZyb21Tb3VyY2VGaWxlbmFtZShcbiAgICAgICAgXCJidWlsZHNwZWNzL2Zyb250ZW5kX2J1aWxkLnltbFwiLFxuICAgICAgKSxcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlRGVwbG95RnJvbnRlbmRQcm9qZWN0KFxuICAgIHJvbGU6IGlhbS5Sb2xlLFxuICApOiBjb2RlYnVpbGQuUGlwZWxpbmVQcm9qZWN0IHtcbiAgICByZXR1cm4gbmV3IGNvZGVidWlsZC5QaXBlbGluZVByb2plY3QodGhpcywgXCJEZXBsb3lGcm9udGVuZFByb2plY3RcIiwge1xuICAgICAgcHJvamVjdE5hbWU6IFwiRnV3YXJpLURlcGxveUZyb250ZW5kXCIsXG4gICAgICByb2xlLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgYnVpbGRJbWFnZTogY29kZWJ1aWxkLkxpbnV4QnVpbGRJbWFnZS5TVEFOREFSRF83XzAsXG4gICAgICAgIGNvbXB1dGVUeXBlOiBjb2RlYnVpbGQuQ29tcHV0ZVR5cGUuU01BTEwsXG4gICAgICB9LFxuICAgICAgYnVpbGRTcGVjOiBjb2RlYnVpbGQuQnVpbGRTcGVjLmZyb21Tb3VyY2VGaWxlbmFtZShcbiAgICAgICAgXCJidWlsZHNwZWNzL2RlcGxveV9mcm9udGVuZC55bWxcIixcbiAgICAgICksXG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==