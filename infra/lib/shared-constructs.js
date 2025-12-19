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
exports.ArtifactsBucket = exports.CodeBuildRole = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
const constructs_1 = require("constructs");
/**
 * CodeBuildRole - IAM role for CodeBuild projects with essential permissions
 */
class CodeBuildRole extends constructs_1.Construct {
    role;
    constructor(scope, id, props = {}) {
        super(scope, id);
        // Create role
        this.role = new iam.Role(this, "Role", {
            assumedBy: new iam.ServicePrincipal("codebuild.amazonaws.com"),
            description: `CodeBuild role for ${id}`,
        });
        // CloudWatch logs
        this.role.addToPrincipalPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents",
            ],
            resources: ["arn:aws:logs:*:*:*"],
        }));
        // ECR for images
        this.role.addToPrincipalPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                "ecr:GetAuthorizationToken",
                "ecr:GetDownloadUrlForLayer",
                "ecr:GetImage",
                "ecr:DescribeImages",
            ],
            resources: ["*"],
        }));
        // Secrets Manager
        if (props.allowSecretsManager) {
            this.role.addToPrincipalPolicy(new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    "secretsmanager:GetSecretValue",
                    "secretsmanager:DescribeSecret",
                ],
                resources: ["arn:aws:secretsmanager:*:*:secret:*"],
            }));
        }
        // S3 Artifacts
        if (props.allowS3Artifacts) {
            this.role.addToPrincipalPolicy(new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    "s3:GetObject",
                    "s3:PutObject",
                    "s3:ListBucket",
                    "s3:GetBucketLocation",
                ],
                resources: ["arn:aws:s3:::*-pipeline-artifacts-*", "arn:aws:s3:::*-pipeline-artifacts-*/*"],
            }));
        }
        // CloudFormation
        if (props.allowCloudFormation) {
            this.role.addToPrincipalPolicy(new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    "cloudformation:DescribeStacks",
                    "cloudformation:DescribeStackEvents",
                    "cloudformation:DescribeStackResource",
                    "cloudformation:DescribeStackResources",
                    "cloudformation:GetTemplate",
                    "cloudformation:ListStackResources",
                    "cloudformation:CreateStack",
                    "cloudformation:UpdateStack",
                    "cloudformation:DeleteStack",
                ],
                resources: ["arn:aws:cloudformation:*:*:stack/*"],
            }));
        }
        // CDK Bootstrap
        if (props.allowCdkBootstrap) {
            this.role.addToPrincipalPolicy(new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    "iam:CreateRole",
                    "iam:GetRole",
                    "iam:PutRolePolicy",
                    "iam:AttachRolePolicy",
                    "iam:PassRole",
                    "iam:CreateInstanceProfile",
                    "iam:AddRoleToInstanceProfile",
                ],
                resources: ["arn:aws:iam::*:role/cdk-*", "arn:aws:iam::*:instance-profile/cdk-*"],
            }));
            this.role.addToPrincipalPolicy(new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    "s3:CreateBucket",
                    "s3:GetBucketVersioning",
                    "s3:PutBucketVersioning",
                    "s3:GetObject",
                    "s3:PutObject",
                    "s3:ListBucket",
                ],
                resources: ["arn:aws:s3:::cdk-*", "arn:aws:s3:::cdk-*/*"],
            }));
        }
        // Add additional policies if provided
        if (props.additionalPolicies) {
            for (const policy of props.additionalPolicies) {
                this.role.addToPrincipalPolicy(policy);
            }
        }
    }
}
exports.CodeBuildRole = CodeBuildRole;
/**
 * ArtifactsBucket - S3 bucket for CodePipeline artifacts
 */
class ArtifactsBucket extends constructs_1.Construct {
    bucket;
    constructor(scope, id) {
        super(scope, id);
        const account = cdk.Stack.of(this).account;
        this.bucket = new s3.Bucket(this, "Bucket", {
            bucketName: `fuwari-pipeline-artifacts-${account}`,
            encryption: s3.BucketEncryption.S3_MANAGED,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            versioned: true,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            lifecycleRules: [
                {
                    id: "DeleteOldArtifacts",
                    enabled: true,
                    noncurrentVersionExpiration: cdk.Duration.days(30),
                    abortIncompleteMultipartUploadAfter: cdk.Duration.days(7),
                },
            ],
        });
    }
}
exports.ArtifactsBucket = ArtifactsBucket;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hhcmVkLWNvbnN0cnVjdHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzaGFyZWQtY29uc3RydWN0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMseURBQTJDO0FBQzNDLHVEQUF5QztBQUN6QywyQ0FBdUM7QUFVdkM7O0dBRUc7QUFDSCxNQUFhLGFBQWMsU0FBUSxzQkFBUztJQUMxQixJQUFJLENBQVc7SUFFL0IsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxRQUE0QixFQUFFO1FBQ3RFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsY0FBYztRQUNkLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUU7WUFDckMsU0FBUyxFQUFFLElBQUksR0FBRyxDQUFDLGdCQUFnQixDQUFDLHlCQUF5QixDQUFDO1lBQzlELFdBQVcsRUFBRSxzQkFBc0IsRUFBRSxFQUFFO1NBQ3hDLENBQUMsQ0FBQztRQUVILGtCQUFrQjtRQUNsQixJQUFJLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUM1QixJQUFJLEdBQUcsQ0FBQyxlQUFlLENBQUM7WUFDdEIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSztZQUN4QixPQUFPLEVBQUU7Z0JBQ1AscUJBQXFCO2dCQUNyQixzQkFBc0I7Z0JBQ3RCLG1CQUFtQjthQUNwQjtZQUNELFNBQVMsRUFBRSxDQUFDLG9CQUFvQixDQUFDO1NBQ2xDLENBQUMsQ0FDSCxDQUFDO1FBRUYsaUJBQWlCO1FBQ2pCLElBQUksQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQzVCLElBQUksR0FBRyxDQUFDLGVBQWUsQ0FBQztZQUN0QixNQUFNLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLO1lBQ3hCLE9BQU8sRUFBRTtnQkFDUCwy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TUFBTSxDQUFDLENBQUM7WUFDekMsQ0FBQztRQUNILENBQUM7SUFDSCxDQUFDO0NBQ0Y7QUFuSUQsc0NBbUlDO0FBRUQ7O0dBRUc7QUFDSCxNQUFhLGVBQWdCLFNBQVEsc0JBQVM7SUFDNUIsTUFBTSxDQUFZO0lBRWxDLFlBQVksS0FBZ0IsRUFBRSxFQUFVO1FBQ3RDLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsTUFBTSxPQUFPLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDO1FBRTNDLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUU7WUFDMUMsVUFBVSxFQUFFLDZCQUE2QixPQUFPLEVBQUU7WUFDbEQsVUFBVSxFQUFFLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVO1lBQzFDLGlCQUFpQixFQUFFLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTO1lBQ2pELFNBQVMsRUFBRSxJQUFJO1lBQ2YsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTztZQUN4QyxpQkFBaUIsRUFBRSxJQUFJO1lBQ3ZCLGNBQWMsRUFBRTtnQkFDZDtvQkFDRSxFQUFFLEVBQUUsb0JBQW9CO29CQUN4QixPQUFPLEVBQUUsSUFBSTtvQkFDYiwyQkFBMkIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7b0JBQ2xELG1DQUFtQyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztpQkFDMUQ7YUFDRjtTQUNGLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQXpCRCwwQ0F5QkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSBcImF3cy1jZGstbGliXCI7XG5pbXBvcnQgKiBhcyBpYW0gZnJvbSBcImF3cy1jZGstbGliL2F3cy1pYW1cIjtcbmltcG9ydCAqIGFzIHMzIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtczNcIjtcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gXCJjb25zdHJ1Y3RzXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29kZUJ1aWxkUm9sZVByb3BzIHtcbiAgYWxsb3dTZWNyZXRzTWFuYWdlcj86IGJvb2xlYW47XG4gIGFsbG93UzNBcnRpZmFjdHM/OiBib29sZWFuO1xuICBhbGxvd0Nsb3VkRm9ybWF0aW9uPzogYm9vbGVhbjtcbiAgYWxsb3dDZGtCb290c3RyYXA/OiBib29sZWFuO1xuICBhZGRpdGlvbmFsUG9saWNpZXM/OiBpYW0uUG9saWN5U3RhdGVtZW50W107XG59XG5cbi8qKlxuICogQ29kZUJ1aWxkUm9sZSAtIElBTSByb2xlIGZvciBDb2RlQnVpbGQgcHJvamVjdHMgd2l0aCBlc3NlbnRpYWwgcGVybWlzc2lvbnNcbiAqL1xuZXhwb3J0IGNsYXNzIENvZGVCdWlsZFJvbGUgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xuICBwdWJsaWMgcmVhZG9ubHkgcm9sZTogaWFtLlJvbGU7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IENvZGVCdWlsZFJvbGVQcm9wcyA9IHt9KSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcblxuICAgIC8vIENyZWF0ZSByb2xlXG4gICAgdGhpcy5yb2xlID0gbmV3IGlhbS5Sb2xlKHRoaXMsIFwiUm9sZVwiLCB7XG4gICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uU2VydmljZVByaW5jaXBhbChcImNvZGVidWlsZC5hbWF6b25hd3MuY29tXCIpLFxuICAgICAgZGVzY3JpcHRpb246IGBDb2RlQnVpbGQgcm9sZSBmb3IgJHtpZH1gLFxuICAgIH0pO1xuXG4gICAgLy8gQ2xvdWRXYXRjaCBsb2dzXG4gICAgdGhpcy5yb2xlLmFkZFRvUHJpbmNpcGFsUG9saWN5KFxuICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgICBcImxvZ3M6Q3JlYXRlTG9nR3JvdXBcIixcbiAgICAgICAgICBcImxvZ3M6Q3JlYXRlTG9nU3RyZWFtXCIsXG4gICAgICAgICAgXCJsb2dzOlB1dExvZ0V2ZW50c1wiLFxuICAgICAgICBdLFxuICAgICAgICByZXNvdXJjZXM6IFtcImFybjphd3M6bG9nczoqOio6KlwiXSxcbiAgICAgIH0pLFxuICAgICk7XG5cbiAgICAvLyBFQ1IgZm9yIGltYWdlc1xuICAgIHRoaXMucm9sZS5hZGRUb1ByaW5jaXBhbFBvbGljeShcbiAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgXCJlY3I6R2V0QXV0aG9yaXphdGlvblRva2VuXCIsXG4gICAgICAgICAgXCJlY3I6R2V0RG93bmxvYWRVcmxGb3JMYXllclwiLFxuICAgICAgICAgIFwiZWNyOkdldEltYWdlXCIsXG4gICAgICAgICAgXCJlY3I6RGVzY3JpYmVJbWFnZXNcIixcbiAgICAgICAgXSxcbiAgICAgICAgcmVzb3VyY2VzOiBbXCIqXCJdLFxuICAgICAgfSksXG4gICAgKTtcblxuICAgIC8vIFNlY3JldHMgTWFuYWdlclxuICAgIGlmIChwcm9wcy5hbGxvd1NlY3JldHNNYW5hZ2VyKSB7XG4gICAgICB0aGlzLnJvbGUuYWRkVG9QcmluY2lwYWxQb2xpY3koXG4gICAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICAgXCJzZWNyZXRzbWFuYWdlcjpHZXRTZWNyZXRWYWx1ZVwiLFxuICAgICAgICAgICAgXCJzZWNyZXRzbWFuYWdlcjpEZXNjcmliZVNlY3JldFwiLFxuICAgICAgICAgIF0sXG4gICAgICAgICAgcmVzb3VyY2VzOiBbXCJhcm46YXdzOnNlY3JldHNtYW5hZ2VyOio6KjpzZWNyZXQ6KlwiXSxcbiAgICAgICAgfSksXG4gICAgICApO1xuICAgIH1cblxuICAgIC8vIFMzIEFydGlmYWN0c1xuICAgIGlmIChwcm9wcy5hbGxvd1MzQXJ0aWZhY3RzKSB7XG4gICAgICB0aGlzLnJvbGUuYWRkVG9QcmluY2lwYWxQb2xpY3koXG4gICAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICAgXCJzMzpHZXRPYmplY3RcIixcbiAgICAgICAgICAgIFwiczM6UHV0T2JqZWN0XCIsXG4gICAgICAgICAgICBcInMzOkxpc3RCdWNrZXRcIixcbiAgICAgICAgICAgIFwiczM6R2V0QnVja2V0TG9jYXRpb25cIixcbiAgICAgICAgICBdLFxuICAgICAgICAgIHJlc291cmNlczogW1wiYXJuOmF3czpzMzo6OiotcGlwZWxpbmUtYXJ0aWZhY3RzLSpcIiwgXCJhcm46YXdzOnMzOjo6Ki1waXBlbGluZS1hcnRpZmFjdHMtKi8qXCJdLFxuICAgICAgICB9KSxcbiAgICAgICk7XG4gICAgfVxuXG4gICAgLy8gQ2xvdWRGb3JtYXRpb25cbiAgICBpZiAocHJvcHMuYWxsb3dDbG91ZEZvcm1hdGlvbikge1xuICAgICAgdGhpcy5yb2xlLmFkZFRvUHJpbmNpcGFsUG9saWN5KFxuICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgICAgIFwiY2xvdWRmb3JtYXRpb246RGVzY3JpYmVTdGFja3NcIixcbiAgICAgICAgICAgIFwiY2xvdWRmb3JtYXRpb246RGVzY3JpYmVTdGFja0V2ZW50c1wiLFxuICAgICAgICAgICAgXCJjbG91ZGZvcm1hdGlvbjpEZXNjcmliZVN0YWNrUmVzb3VyY2VcIixcbiAgICAgICAgICAgIFwiY2xvdWRmb3JtYXRpb246RGVzY3JpYmVTdGFja1Jlc291cmNlc1wiLFxuICAgICAgICAgICAgXCJjbG91ZGZvcm1hdGlvbjpHZXRUZW1wbGF0ZVwiLFxuICAgICAgICAgICAgXCJjbG91ZGZvcm1hdGlvbjpMaXN0U3RhY2tSZXNvdXJjZXNcIixcbiAgICAgICAgICAgIFwiY2xvdWRmb3JtYXRpb246Q3JlYXRlU3RhY2tcIixcbiAgICAgICAgICAgIFwiY2xvdWRmb3JtYXRpb246VXBkYXRlU3RhY2tcIixcbiAgICAgICAgICAgIFwiY2xvdWRmb3JtYXRpb246RGVsZXRlU3RhY2tcIixcbiAgICAgICAgICBdLFxuICAgICAgICAgIHJlc291cmNlczogW1wiYXJuOmF3czpjbG91ZGZvcm1hdGlvbjoqOio6c3RhY2svKlwiXSxcbiAgICAgICAgfSksXG4gICAgICApO1xuICAgIH1cblxuICAgIC8vIENESyBCb290c3RyYXBcbiAgICBpZiAocHJvcHMuYWxsb3dDZGtCb290c3RyYXApIHtcbiAgICAgIHRoaXMucm9sZS5hZGRUb1ByaW5jaXBhbFBvbGljeShcbiAgICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgICBcImlhbTpDcmVhdGVSb2xlXCIsXG4gICAgICAgICAgICBcImlhbTpHZXRSb2xlXCIsXG4gICAgICAgICAgICBcImlhbTpQdXRSb2xlUG9saWN5XCIsXG4gICAgICAgICAgICBcImlhbTpBdHRhY2hSb2xlUG9saWN5XCIsXG4gICAgICAgICAgICBcImlhbTpQYXNzUm9sZVwiLFxuICAgICAgICAgICAgXCJpYW06Q3JlYXRlSW5zdGFuY2VQcm9maWxlXCIsXG4gICAgICAgICAgICBcImlhbTpBZGRSb2xlVG9JbnN0YW5jZVByb2ZpbGVcIixcbiAgICAgICAgICBdLFxuICAgICAgICAgIHJlc291cmNlczogW1wiYXJuOmF3czppYW06Oio6cm9sZS9jZGstKlwiLCBcImFybjphd3M6aWFtOjoqOmluc3RhbmNlLXByb2ZpbGUvY2RrLSpcIl0sXG4gICAgICAgIH0pLFxuICAgICAgKTtcblxuICAgICAgdGhpcy5yb2xlLmFkZFRvUHJpbmNpcGFsUG9saWN5KFxuICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgICAgIFwiczM6Q3JlYXRlQnVja2V0XCIsXG4gICAgICAgICAgICBcInMzOkdldEJ1Y2tldFZlcnNpb25pbmdcIixcbiAgICAgICAgICAgIFwiczM6UHV0QnVja2V0VmVyc2lvbmluZ1wiLFxuICAgICAgICAgICAgXCJzMzpHZXRPYmplY3RcIixcbiAgICAgICAgICAgIFwiczM6UHV0T2JqZWN0XCIsXG4gICAgICAgICAgICBcInMzOkxpc3RCdWNrZXRcIixcbiAgICAgICAgICBdLFxuICAgICAgICAgIHJlc291cmNlczogW1wiYXJuOmF3czpzMzo6OmNkay0qXCIsIFwiYXJuOmF3czpzMzo6OmNkay0qLypcIl0sXG4gICAgICAgIH0pLFxuICAgICAgKTtcbiAgICB9XG5cbiAgICAvLyBBZGQgYWRkaXRpb25hbCBwb2xpY2llcyBpZiBwcm92aWRlZFxuICAgIGlmIChwcm9wcy5hZGRpdGlvbmFsUG9saWNpZXMpIHtcbiAgICAgIGZvciAoY29uc3QgcG9saWN5IG9mIHByb3BzLmFkZGl0aW9uYWxQb2xpY2llcykge1xuICAgICAgICB0aGlzLnJvbGUuYWRkVG9QcmluY2lwYWxQb2xpY3kocG9saWN5KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBBcnRpZmFjdHNCdWNrZXQgLSBTMyBidWNrZXQgZm9yIENvZGVQaXBlbGluZSBhcnRpZmFjdHNcbiAqL1xuZXhwb3J0IGNsYXNzIEFydGlmYWN0c0J1Y2tldCBleHRlbmRzIENvbnN0cnVjdCB7XG4gIHB1YmxpYyByZWFkb25seSBidWNrZXQ6IHMzLkJ1Y2tldDtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcblxuICAgIGNvbnN0IGFjY291bnQgPSBjZGsuU3RhY2sub2YodGhpcykuYWNjb3VudDtcblxuICAgIHRoaXMuYnVja2V0ID0gbmV3IHMzLkJ1Y2tldCh0aGlzLCBcIkJ1Y2tldFwiLCB7XG4gICAgICBidWNrZXROYW1lOiBgZnV3YXJpLXBpcGVsaW5lLWFydGlmYWN0cy0ke2FjY291bnR9YCxcbiAgICAgIGVuY3J5cHRpb246IHMzLkJ1Y2tldEVuY3J5cHRpb24uUzNfTUFOQUdFRCxcbiAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBzMy5CbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BTEwsXG4gICAgICB2ZXJzaW9uZWQ6IHRydWUsXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgICAgYXV0b0RlbGV0ZU9iamVjdHM6IHRydWUsXG4gICAgICBsaWZlY3ljbGVSdWxlczogW1xuICAgICAgICB7XG4gICAgICAgICAgaWQ6IFwiRGVsZXRlT2xkQXJ0aWZhY3RzXCIsXG4gICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICBub25jdXJyZW50VmVyc2lvbkV4cGlyYXRpb246IGNkay5EdXJhdGlvbi5kYXlzKDMwKSxcbiAgICAgICAgICBhYm9ydEluY29tcGxldGVNdWx0aXBhcnRVcGxvYWRBZnRlcjogY2RrLkR1cmF0aW9uLmRheXMoNyksXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgIH0pO1xuICB9XG59XG4iXX0=