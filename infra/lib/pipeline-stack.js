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
        this.artifactsBucket = new shared_constructs_1.ArtifactsBucket(this, "Artifacts").bucket;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGlwZWxpbmUtc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJwaXBlbGluZS1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMscUVBQXVEO0FBQ3ZELDJFQUE2RDtBQUM3RCwyRkFBNkU7QUFDN0UseURBQTJDO0FBQzNDLHlEQUEyQztBQUUzQywyREFBcUU7QUFRckUsTUFBYSxhQUFjLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDMUIsUUFBUSxDQUF3QjtJQUNoQyxlQUFlLENBQW9CO0lBRW5ELFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBeUI7UUFDakUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsMEJBQTBCO1FBQzFCLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxtQ0FBZSxDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQyxNQUFNLENBQUM7UUFFckUscUNBQXFDO1FBQ3JDLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSx1QkFBdUIsRUFBRTtZQUNyRSxXQUFXLEVBQUUsK0JBQStCO1NBQzdDLENBQUMsQ0FBQztRQUVILHlCQUF5QjtRQUN6QixNQUFNLFdBQVcsR0FBRyxJQUFJLGlDQUFhLENBQUMsSUFBSSxFQUFFLGFBQWEsRUFBRTtZQUN6RCxtQkFBbUIsRUFBRSxJQUFJO1lBQ3pCLGdCQUFnQixFQUFFLElBQUk7U0FDdkIsQ0FBQyxDQUFDO1FBRUgsTUFBTSxTQUFTLEdBQUcsSUFBSSxpQ0FBYSxDQUFDLElBQUksRUFBRSxXQUFXLEVBQUU7WUFDckQsbUJBQW1CLEVBQUUsSUFBSTtZQUN6QixnQkFBZ0IsRUFBRSxJQUFJO1lBQ3RCLG1CQUFtQixFQUFFLElBQUk7WUFDekIsaUJBQWlCLEVBQUUsSUFBSTtZQUN2QixrQkFBa0Is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LENBQUMsZUFBZSxDQUFDLFlBQVk7Z0JBQ2xELFdBQVcsRUFBRSxTQUFTLENBQUMsV0FBVyxDQUFDLEtBQUs7YUFDekM7WUFDRCxTQUFTLEVBQUUsU0FBUyxDQUFDLFNBQVMsQ0FBQyxrQkFBa0IsQ0FDL0MsK0JBQStCLENBQ2hDO1NBQ0YsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVPLDJCQUEyQixDQUNqQyxJQUFjO1FBRWQsT0FBTyxJQUFJLFNBQVMsQ0FBQyxlQUFlLENBQUMsSUFBSSxFQUFFLHVCQUF1QixFQUFFO1lBQ2xFLFdBQVcsRUFBRSx1QkFBdUI7WUFDcEMsSUFBSTtZQUNKLFdBQVcsRUFBRTtnQkFDWCxVQUFVLEVBQUUsU0FBUyxDQUFDLGVBQWUsQ0FBQyxZQUFZO2dCQUNsRCxXQUFXLEVBQUUsU0FBUyxDQUFDLFdBQVcsQ0FBQyxLQUFLO2FBQ3pDO1lBQ0QsU0FBUyxFQUFFLFNBQVMsQ0FBQyxTQUFTLENBQUMsa0JBQWtCLENBQy9DLGdDQUFnQyxDQUNqQztTQUNGLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQXJQRCxzQ0FxUEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSBcImF3cy1jZGstbGliXCI7XG5pbXBvcnQgKiBhcyBjb2RlYnVpbGQgZnJvbSBcImF3cy1jZGstbGliL2F3cy1jb2RlYnVpbGRcIjtcbmltcG9ydCAqIGFzIGNvZGVwaXBlbGluZSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWNvZGVwaXBlbGluZVwiO1xuaW1wb3J0ICogYXMgY29kZXBpcGVsaW5lX2FjdGlvbnMgZnJvbSBcImF3cy1jZGstbGliL2F3cy1jb2RlcGlwZWxpbmUtYWN0aW9uc1wiO1xuaW1wb3J0ICogYXMgaWFtIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtaWFtXCI7XG5pbXBvcnQgKiBhcyBzbnMgZnJvbSBcImF3cy1jZGstbGliL2F3cy1zbnNcIjtcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gXCJjb25zdHJ1Y3RzXCI7XG5pbXBvcnQgeyBBcnRpZmFjdHNCdWNrZXQsIENvZGVCdWlsZFJvbGUgfSBmcm9tIFwiLi9zaGFyZWQtY29uc3RydWN0c1wiO1xuXG5leHBvcnQgaW50ZXJmYWNlIFBpcGVsaW5lU3RhY2tQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcbiAgY29kZUNvbm5lY3Rpb25Bcm46IHN0cmluZztcbiAgcmVwb3NpdG9yeU5hbWU6IHN0cmluZztcbiAgYnJhbmNoTmFtZTogc3RyaW5nO1xufVxuXG5leHBvcnQgY2xhc3MgUGlwZWxpbmVTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIHB1YmxpYyByZWFkb25seSBwaXBlbGluZTogY29kZXBpcGVsaW5lLlBpcGVsaW5lO1xuICBwdWJsaWMgcmVhZG9ubHkgYXJ0aWZhY3RzQnVja2V0OiBjZGsuYXdzX3MzLkJ1Y2tldDtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogUGlwZWxpbmVTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICAvLyBDcmVhdGUgYXJ0aWZhY3RzIGJ1Y2tldFxuICAgIHRoaXMuYXJ0aWZhY3RzQnVja2V0ID0gbmV3IEFydGlmYWN0c0J1Y2tldCh0aGlzLCBcIkFydGlmYWN0c1wiKS5idWNrZXQ7XG5cbiAgICAvLyBDcmVhdGUgU05TIHRvcGljIGZvciBub3RpZmljYXRpb25zXG4gICAgY29uc3Qgbm90aWZpY2F0aW9uVG9waWMgPSBuZXcgc25zLlRvcGljKHRoaXMsIFwiUGlwZWxpbmVOb3RpZmljYXRpb25zXCIsIHtcbiAgICAgIGRpc3BsYXlOYW1lOiBcIkZ1d2FyaSBQaXBlbGluZSBOb3RpZmljYXRpb25zXCIsXG4gICAgfSk7XG5cbiAgICAvLyBDcmVhdGUgQ29kZUJ1aWxkIHJvbGVzXG4gICAgY29uc3QgcXVhbGl0eVJvbGUgPSBuZXcgQ29kZUJ1aWxkUm9sZSh0aGlzLCBcIlF1YWxpdHlSb2xlXCIsIHtcbiAgICAgIGFsbG93U2VjcmV0c01hbmFnZXI6IHRydWUsXG4gICAgICBhbGxvd1MzQXJ0aWZhY3RzOiB0cnVlLFxuICAgIH0pO1xuXG4gICAgY29uc3QgYnVpbGRSb2xlID0gbmV3IENvZGVCdWlsZFJvbGUodGhpcywgXCJCdWlsZFJvbGVcIiwge1xuICAgICAgYWxsb3dTZWNyZXRzTWFuYWdlcjogdHJ1ZSxcbiAgICAgIGFsbG93UzNBcnRpZmFjdHM6IHRydWUsXG4gICAgICBhbGxvd0Nsb3VkRm9ybWF0aW9uOiB0cnVlLFxuICAgICAgYWxsb3dDZGtCb290c3RyYXA6IHRydWUsXG4gICAgICBhZGRpdGlvbmFsUG9saWNpZXM6IFtcbiAgICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgICBcImNsb3VkZnJvbnQ6R2V0RGlzdHJpYnV0aW9uXCIsXG4gICAgICAgICAgICBcImNsb3VkZnJvbnQ6R2V0RGlzdHJpYnV0aW9uQ29uZmlnXCIsXG4gICAgICAgICAgXSxcbiAgICAgICAgICByZXNvdXJjZXM6IFtcIipcIl0sXG4gICAgICAgIH0pLFxuICAgICAgXSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGRlcGxveVJvbGUgPSBuZXcgQ29kZUJ1aWxkUm9sZSh0aGlzLCBcIkRlcGxveVJvbGVcIiwge1xuICAgICAgYWxsb3dTZWNyZXRzTWFuYWdlcjogdHJ1ZSxcbiAgICAgIGFsbG93UzNBcnRpZmFjdHM6IHRydWUsXG4gICAgICBhbGxvd0Nsb3VkRm9ybWF0aW9uOiB0cnVlLFxuICAgICAgYWxsb3dDZGtCb290c3RyYXA6IHRydWUsXG4gICAgICBhZGRpdGlvbmFsUG9saWNpZXM6IFtcbiAgICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgICBcInMzOkxpc3RCdWNrZXRcIixcbiAgICAgICAgICAgIFwiczM6R2V0QnVja2V0TG9jYXRpb25cIixcbiAgICAgICAgICAgIFwiczM6R2V0T2JqZWN0XCIsXG4gICAgICAgICAgICBcInMzOlB1dE9iamVjdFwiLFxuICAgICAgICAgICAgXCJzMzpEZWxldGVPYmplY3RcIixcbiAgICAgICAgICBdLFxuICAgICAgICAgIHJlc291cmNlczogW1xuICAgICAgICAgICAgXCJhcm46YXdzOnMzOjo6Ki1mcm9udGVuZC0qXCIsXG4gICAgICAgICAgICBcImFybjphd3M6czM6OjoqLWZyb250ZW5kLSovKlwiLFxuICAgICAgICAgIF0sXG4gICAgICAgIH0pLFxuICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgICAgIFwiY2xvdWRmcm9udDpDcmVhdGVJbnZhbGlkYXRpb25cIixcbiAgICAgICAgICAgIFwiY2xvdWRmcm9udDpHZXRJbnZhbGlkYXRpb25cIixcbiAgICAgICAgICBdLFxuICAgICAgICAgIHJlc291cmNlczogW1wiKlwiXSxcbiAgICAgICAgfSksXG4gICAgICBdLFxuICAgIH0pO1xuXG4gICAgLy8gQ3JlYXRlIENvZGVCdWlsZCBwcm9qZWN0c1xuICAgIGNvbnN0IGxpbnRUeXBlUHJvamVjdCA9IHRoaXMuY3JlYXRlTGludFR5cGVQcm9qZWN0KHF1YWxpdHlSb2xlLnJvbGUpO1xuICAgIGNvbnN0IHVuaXRUZXN0c1Byb2plY3QgPSB0aGlzLmNyZWF0ZVVuaXRUZXN0c1Byb2plY3QocXVhbGl0eVJvbGUucm9sZSk7XG4gICAgY29uc3QgZnJvbnRlbmRCdWlsZFByb2plY3QgPSB0aGlzLmNyZWF0ZUZyb250ZW5kQnVpbGRQcm9qZWN0KGJ1aWxkUm9sZS5yb2xlKTtcbiAgICBjb25zdCBkZXBsb3lGcm9udGVuZFByb2plY3QgPSB0aGlzLmNyZWF0ZURlcGxveUZyb250ZW5kUHJvamVjdChcbiAgICAgIGRlcGxveVJvbGUucm9sZSxcbiAgICApO1xuXG4gICAgLy8gRGVmaW5lIHBpcGVsaW5lIGFydGlmYWN0c1xuICAgIGNvbnN0IGFydGlmYWN0cyA9IHtcbiAgICAgIHNvdXJjZTogbmV3IGNvZGVwaXBlbGluZS5BcnRpZmFjdChcIlNvdXJjZU91dHB1dFwiKSxcbiAgICAgIGxpbnQ6IG5ldyBjb2RlcGlwZWxpbmUuQXJ0aWZhY3QoXCJMaW50VHlwZU91dHB1dFwiKSxcbiAgICAgIHVuaXQ6IG5ldyBjb2RlcGlwZWxpbmUuQXJ0aWZhY3QoXCJVbml0VGVzdHNPdXRwdXRcIiksXG4gICAgICBmcm9udGVuZEJ1aWxkOiBuZXcgY29kZXBpcGVsaW5lLkFydGlmYWN0KFwiRnJvbnRlbmRCdWlsZE91dHB1dFwiKSxcbiAgICB9O1xuXG4gICAgY29uc3QgW293bmVyLCByZXBvXSA9IHByb3BzLnJlcG9zaXRvcnlOYW1lLnNwbGl0KFwiL1wiKTtcblxuICAgIC8vIERlZmluZSBwaXBlbGluZSBzdGFnZXNcbiAgICBjb25zdCBzdGFnZXM6IGNvZGVwaXBlbGluZS5TdGFnZVByb3BzW10gPSBbXG4gICAgICB7XG4gICAgICAgIHN0YWdlTmFtZTogXCJTb3VyY2VcIixcbiAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgIG5ldyBjb2RlcGlwZWxpbmVfYWN0aW9ucy5Db2RlU3RhckNvbm5lY3Rpb25zU291cmNlQWN0aW9uKHtcbiAgICAgICAgICAgIGFjdGlvbk5hbWU6IFwiU291cmNlXCIsXG4gICAgICAgICAgICBvd25lcixcbiAgICAgICAgICAgIHJlcG8sXG4gICAgICAgICAgICBicmFuY2g6IHByb3BzLmJyYW5jaE5hbWUsXG4gICAgICAgICAgICBjb25uZWN0aW9uQXJuOiBwcm9wcy5jb2RlQ29ubmVjdGlvbkFybixcbiAgICAgICAgICAgIG91dHB1dDogYXJ0aWZhY3RzLnNvdXJjZSxcbiAgICAgICAgICAgIHRyaWdnZXJPblB1c2g6IHRydWUsXG4gICAgICAgICAgfSksXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBzdGFnZU5hbWU6IFwiUXVhbGl0eVwiLFxuICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgbmV3IGNvZGVwaXBlbGluZV9hY3Rpb25zLkNvZGVCdWlsZEFjdGlvbih7XG4gICAgICAgICAgICBhY3Rpb25OYW1lOiBcIkxpbnRUeXBlXCIsXG4gICAgICAgICAgICBwcm9qZWN0OiBsaW50VHlwZVByb2plY3QsXG4gICAgICAgICAgICBpbnB1dDogYXJ0aWZhY3RzLnNvdXJjZSxcbiAgICAgICAgICAgIG91dHB1dHM6IFthcnRpZmFjdHMubGludF0sXG4gICAgICAgICAgfSksXG4gICAgICAgICAgbmV3IGNvZGVwaXBlbGluZV9hY3Rpb25zLkNvZGVCdWlsZEFjdGlvbih7XG4gICAgICAgICAgICBhY3Rpb25OYW1lOiBcIlVuaXRUZXN0c1wiLFxuICAgICAgICAgICAgcHJvamVjdDogdW5pdFRlc3RzUHJvamVjdCxcbiAgICAgICAgICAgIGlucHV0OiBhcnRpZmFjdHMuc291cmNlLFxuICAgICAgICAgICAgb3V0cHV0czogW2FydGlmYWN0cy51bml0XSxcbiAgICAgICAgICB9KSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIHN0YWdlTmFtZTogXCJCdWlsZFwiLFxuICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgbmV3IGNvZGVwaXBlbGluZV9hY3Rpb25zLkNvZGVCdWlsZEFjdGlvbih7XG4gICAgICAgICAgICBhY3Rpb25OYW1lOiBcIkZyb250ZW5kQnVpbGRcIixcbiAgICAgICAgICAgIHByb2plY3Q6IGZyb250ZW5kQnVpbGRQcm9qZWN0LFxuICAgICAgICAgICAgaW5wdXQ6IGFydGlmYWN0cy5zb3VyY2UsXG4gICAgICAgICAgICBvdXRwdXRzOiBbYXJ0aWZhY3RzLmZyb250ZW5kQnVpbGRdLFxuICAgICAgICAgIH0pLFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgc3RhZ2VOYW1lOiBcIkRlcGxveVByb2RcIixcbiAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgIG5ldyBjb2RlcGlwZWxpbmVfYWN0aW9ucy5Db2RlQnVpbGRBY3Rpb24oe1xuICAgICAgICAgICAgYWN0aW9uTmFtZTogXCJEZXBsb3lGcm9udGVuZFByb2RcIixcbiAgICAgICAgICAgIHByb2plY3Q6IGRlcGxveUZyb250ZW5kUHJvamVjdCxcbiAgICAgICAgICAgIGlucHV0OiBhcnRpZmFjdHMuc291cmNlLFxuICAgICAgICAgICAgZXh0cmFJbnB1dHM6IFthcnRpZmFjdHMuZnJvbnRlbmRCdWlsZF0sXG4gICAgICAgICAgICBlbnZpcm9ubWVudFZhcmlhYmxlczoge1xuICAgICAgICAgICAgICBFTlZJUk9OTUVOVDogeyB2YWx1ZTogXCJwcm9kXCIgfSxcbiAgICAgICAgICAgICAgQlVJTERfRElSOiB7IHZhbHVlOiBcImRpc3RcIiB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHJ1bk9yZGVyOiAxLFxuICAgICAgICAgIH0pLFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICBdO1xuXG4gICAgLy8gQ3JlYXRlIHBpcGVsaW5lXG4gICAgdGhpcy5waXBlbGluZSA9IG5ldyBjb2RlcGlwZWxpbmUuUGlwZWxpbmUodGhpcywgXCJQaXBlbGluZVwiLCB7XG4gICAgICBwaXBlbGluZU5hbWU6IFwiRnV3YXJpQnVpbGRQaXBlbGluZVwiLFxuICAgICAgcGlwZWxpbmVUeXBlOiBjb2RlcGlwZWxpbmUuUGlwZWxpbmVUeXBlLlYyLFxuICAgICAgYXJ0aWZhY3RCdWNrZXQ6IHRoaXMuYXJ0aWZhY3RzQnVja2V0LFxuICAgICAgc3RhZ2VzLFxuICAgIH0pO1xuXG4gICAgLy8gU3Vic2NyaWJlIHRvIG5vdGlmaWNhdGlvbnNcbiAgICB0aGlzLnBpcGVsaW5lLm5vdGlmeU9uRXhlY3V0aW9uU3RhdGVDaGFuZ2UoXG4gICAgICBcIlBpcGVsaW5lRXhlY3V0aW9uTm90aWZpY2F0aW9uc1wiLFxuICAgICAgbm90aWZpY2F0aW9uVG9waWMsXG4gICAgKTtcblxuICAgIC8vIE91dHB1dHNcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCBcIlBpcGVsaW5lTmFtZVwiLCB7XG4gICAgICB2YWx1ZTogdGhpcy5waXBlbGluZS5waXBlbGluZU5hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogXCJDb2RlUGlwZWxpbmUgTmFtZVwiLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgXCJBcnRpZmFjdHNCdWNrZXRcIiwge1xuICAgICAgdmFsdWU6IHRoaXMuYXJ0aWZhY3RzQnVja2V0LmJ1Y2tldE5hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogXCJTMyBBcnRpZmFjdHMgQnVja2V0XCIsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCBcIkJ1aWxkUm9sZUFyblwiLCB7XG4gICAgICB2YWx1ZTogYnVpbGRSb2xlLnJvbGUucm9sZUFybixcbiAgICAgIGRlc2NyaXB0aW9uOiBcIkNvZGVCdWlsZCBCdWlsZCBSb2xlIEFSTlwiLFxuICAgICAgZXhwb3J0TmFtZTogYCR7dGhpcy5zdGFja05hbWV9LUJ1aWxkUm9sZUFybmAsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCBcIkRlcGxveVJvbGVBcm5cIiwge1xuICAgICAgdmFsdWU6IGRlcGxveVJvbGUucm9sZS5yb2xlQXJuLFxuICAgICAgZGVzY3JpcHRpb246IFwiQ29kZUJ1aWxkIERlcGxveSBSb2xlIEFSTlwiLFxuICAgICAgZXhwb3J0TmFtZTogYCR7dGhpcy5zdGFja05hbWV9LURlcGxveVJvbGVBcm5gLFxuICAgIH0pO1xuXG4gICAgY2RrLlRhZ3Mub2YodGhpcykuYWRkKFwiU3RhY2tcIiwgXCJQaXBlbGluZVwiKTtcbiAgICBjZGsuVGFncy5vZih0aGlzKS5hZGQoXCJhd3MtbWNwOmRlcGxveTp0eXBlXCIsIFwiY2ktY2RcIik7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZUxpbnRUeXBlUHJvamVjdChyb2xlOiBpYW0uUm9sZSk6IGNvZGVidWlsZC5QaXBlbGluZVByb2plY3Qge1xuICAgIHJldHVybiBuZXcgY29kZWJ1aWxkLlBpcGVsaW5lUHJvamVjdCh0aGlzLCBcIkxpbnRUeXBlUHJvamVjdFwiLCB7XG4gICAgICBwcm9qZWN0TmFtZTogXCJGdXdhcmktTGludFR5cGVcIixcbiAgICAgIHJvbGUsXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBidWlsZEltYWdlOiBjb2RlYnVpbGQuTGludXhCdWlsZEltYWdlLlNUQU5EQVJEXzdfMCxcbiAgICAgICAgY29tcHV0ZVR5cGU6IGNvZGVidWlsZC5Db21wdXRlVHlwZS5TTUFMTCxcbiAgICAgIH0sXG4gICAgICBidWlsZFNwZWM6IGNvZGVidWlsZC5CdWlsZFNwZWMuZnJvbVNvdXJjZUZpbGVuYW1lKFwiYnVpbGRzcGVjcy9saW50X3R5cGUueW1sXCIpLFxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVVbml0VGVzdHNQcm9qZWN0KHJvbGU6IGlhbS5Sb2xlKTogY29kZWJ1aWxkLlBpcGVsaW5lUHJvamVjdCB7XG4gICAgcmV0dXJuIG5ldyBjb2RlYnVpbGQuUGlwZWxpbmVQcm9qZWN0KHRoaXMsIFwiVW5pdFRlc3RzUHJvamVjdFwiLCB7XG4gICAgICBwcm9qZWN0TmFtZTogXCJGdXdhcmktVW5pdFRlc3RzXCIsXG4gICAgICByb2xlLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgYnVpbGRJbWFnZTogY29kZWJ1aWxkLkxpbnV4QnVpbGRJbWFnZS5TVEFOREFSRF83XzAsXG4gICAgICAgIGNvbXB1dGVUeXBlOiBjb2RlYnVpbGQuQ29tcHV0ZVR5cGUuU01BTEwsXG4gICAgICB9LFxuICAgICAgYnVpbGRTcGVjOiBjb2RlYnVpbGQuQnVpbGRTcGVjLmZyb21Tb3VyY2VGaWxlbmFtZShcImJ1aWxkc3BlY3MvdW5pdF90ZXN0cy55bWxcIiksXG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZUZyb250ZW5kQnVpbGRQcm9qZWN0KFxuICAgIHJvbGU6IGlhbS5Sb2xlLFxuICApOiBjb2RlYnVpbGQuUGlwZWxpbmVQcm9qZWN0IHtcbiAgICByZXR1cm4gbmV3IGNvZGVidWlsZC5QaXBlbGluZVByb2plY3QodGhpcywgXCJGcm9udGVuZEJ1aWxkUHJvamVjdFwiLCB7XG4gICAgICBwcm9qZWN0TmFtZTogXCJGdXdhcmktRnJvbnRlbmRCdWlsZFwiLFxuICAgICAgcm9sZSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIGJ1aWxkSW1hZ2U6IGNvZGVidWlsZC5MaW51eEJ1aWxkSW1hZ2UuU1RBTkRBUkRfN18wLFxuICAgICAgICBjb21wdXRlVHlwZTogY29kZWJ1aWxkLkNvbXB1dGVUeXBlLlNNQUxMLFxuICAgICAgfSxcbiAgICAgIGJ1aWxkU3BlYzogY29kZWJ1aWxkLkJ1aWxkU3BlYy5mcm9tU291cmNlRmlsZW5hbWUoXG4gICAgICAgIFwiYnVpbGRzcGVjcy9mcm9udGVuZF9idWlsZC55bWxcIixcbiAgICAgICksXG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZURlcGxveUZyb250ZW5kUHJvamVjdChcbiAgICByb2xlOiBpYW0uUm9sZSxcbiAgKTogY29kZWJ1aWxkLlBpcGVsaW5lUHJvamVjdCB7XG4gICAgcmV0dXJuIG5ldyBjb2RlYnVpbGQuUGlwZWxpbmVQcm9qZWN0KHRoaXMsIFwiRGVwbG95RnJvbnRlbmRQcm9qZWN0XCIsIHtcbiAgICAgIHByb2plY3ROYW1lOiBcIkZ1d2FyaS1EZXBsb3lGcm9udGVuZFwiLFxuICAgICAgcm9sZSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIGJ1aWxkSW1hZ2U6IGNvZGVidWlsZC5MaW51eEJ1aWxkSW1hZ2UuU1RBTkRBUkRfN18wLFxuICAgICAgICBjb21wdXRlVHlwZTogY29kZWJ1aWxkLkNvbXB1dGVUeXBlLlNNQUxMLFxuICAgICAgfSxcbiAgICAgIGJ1aWxkU3BlYzogY29kZWJ1aWxkLkJ1aWxkU3BlYy5mcm9tU291cmNlRmlsZW5hbWUoXG4gICAgICAgIFwiYnVpbGRzcGVjcy9kZXBsb3lfZnJvbnRlbmQueW1sXCIsXG4gICAgICApLFxuICAgIH0pO1xuICB9XG59XG4iXX0=