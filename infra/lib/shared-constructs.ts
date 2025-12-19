import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

export interface CodeBuildRoleProps {
  allowSecretsManager?: boolean;
  allowS3Artifacts?: boolean;
  allowCloudFormation?: boolean;
  allowCdkBootstrap?: boolean;
  additionalPolicies?: iam.PolicyStatement[];
}

/**
 * CodeBuildRole - IAM role for CodeBuild projects with essential permissions
 */
export class CodeBuildRole extends Construct {
  public readonly role: iam.Role;

  constructor(scope: Construct, id: string, props: CodeBuildRoleProps = {}) {
    super(scope, id);

    // Create role
    this.role = new iam.Role(this, "Role", {
      assumedBy: new iam.ServicePrincipal("codebuild.amazonaws.com"),
      description: `CodeBuild role for ${id}`,
    });

    // CloudWatch logs
    this.role.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ],
        resources: ["arn:aws:logs:*:*:*"],
      }),
    );

    // ECR for images
    this.role.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "ecr:GetAuthorizationToken",
          "ecr:GetDownloadUrlForLayer",
          "ecr:GetImage",
          "ecr:DescribeImages",
        ],
        resources: ["*"],
      }),
    );

    // Secrets Manager
    if (props.allowSecretsManager) {
      this.role.addToPrincipalPolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            "secretsmanager:GetSecretValue",
            "secretsmanager:DescribeSecret",
          ],
          resources: ["arn:aws:secretsmanager:*:*:secret:*"],
        }),
      );
    }

    // S3 Artifacts
    if (props.allowS3Artifacts) {
      this.role.addToPrincipalPolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            "s3:GetObject",
            "s3:PutObject",
            "s3:ListBucket",
            "s3:GetBucketLocation",
          ],
          resources: ["arn:aws:s3:::*-pipeline-artifacts-*", "arn:aws:s3:::*-pipeline-artifacts-*/*"],
        }),
      );
    }

    // CloudFormation
    if (props.allowCloudFormation) {
      this.role.addToPrincipalPolicy(
        new iam.PolicyStatement({
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
            "cloudformation:CreateChangeSet",
            "cloudformation:DescribeChangeSet",
            "cloudformation:ExecuteChangeSet",
          ],
          resources: ["arn:aws:cloudformation:*:*:stack/*"],
        }),
      );
    }

    // CDK Bootstrap
    if (props.allowCdkBootstrap) {
      this.role.addToPrincipalPolicy(
        new iam.PolicyStatement({
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
        }),
      );

      this.role.addToPrincipalPolicy(
        new iam.PolicyStatement({
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
        }),
      );

      // SSM for CDK bootstrap version check
      this.role.addToPrincipalPolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            "ssm:GetParameter",
            "ssm:PutParameter",
          ],
          resources: ["arn:aws:ssm:*:*:parameter/cdk-bootstrap/*"],
        }),
      );
    }

    // Add additional policies if provided
    if (props.additionalPolicies) {
      for (const policy of props.additionalPolicies) {
        this.role.addToPrincipalPolicy(policy);
      }
    }
  }
}

/**
 * ArtifactsBucket - S3 bucket for CodePipeline artifacts
 */
export class ArtifactsBucket extends Construct {
  public readonly bucket: s3.Bucket;

  constructor(scope: Construct, id: string) {
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
