import * as cdk from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import { CloudFrontToS3 } from "@aws-solutions-constructs/aws-cloudfront-s3";
import { Construct } from "constructs";

export interface FrontendStackProps extends cdk.StackProps {
  environment: string;
  buildOutputPath: string; // e.g., "../dist" or "../build"
}

export class FrontendStack extends cdk.Stack {
  public readonly distributionDomainName: string;
  public readonly bucketName: string;

  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    const { environment, buildOutputPath } = props;

    const isProd = environment === "prod";
    // Persisting production buckets for safety and compliance reasons
    const removalPolicy = isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY;

    // Provisions an Amazon CloudFront Distribution that serves objects from an AWS S3 Bucket via an Origin Access Control (OAC).
    // For more information, see https://docs.aws.amazon.com/solutions/latest/constructs/aws_cloudfront_s3.html
    const cloudfrontToS3 = new CloudFrontToS3(this, "CloudFrontToS3", {
      // S3 content bucket configuration
      bucketProps: {
        bucketName: `${id.toLowerCase()}-${this.account}`,
        removalPolicy,
        autoDeleteObjects: !isProd, // Only auto-delete in non-prod (required for DESTROY to work on non-empty buckets)
        versioned: false,
      },
      // S3 access logging bucket configuration
      loggingBucketProps: {
        bucketName: `${id.toLowerCase()}-s3logs-${this.account}`,
        removalPolicy,
        autoDeleteObjects: !isProd,
        lifecycleRules: [
          {
            id: "DeleteOldLogs",
            enabled: true,
            expiration: isProd ? cdk.Duration.days(3650) : cdk.Duration.days(7),
          },
        ],
      },
      // CloudFront logging bucket configuration
      cloudFrontLoggingBucketProps: {
        bucketName: `${id.toLowerCase()}-cflogs-${this.account}`,
        removalPolicy,
        autoDeleteObjects: !isProd,
        lifecycleRules: [
          {
            id: "DeleteOldLogs",
            enabled: true,
            expiration: isProd ? cdk.Duration.days(3650) : cdk.Duration.days(7),
          },
        ],
      },
      insertHttpSecurityHeaders: false,
      // Security headers
      responseHeadersPolicyProps: {
        securityHeadersBehavior: {
          contentTypeOptions: { override: true },
          frameOptions: {
            frameOption: cloudfront.HeadersFrameOption.DENY,
            override: true,
          },
          strictTransportSecurity: {
            accessControlMaxAge: cdk.Duration.seconds(47304000),
            includeSubdomains: true,
            override: true,
          },
        },
        customHeadersBehavior: {
          customHeaders: [
            {
              header: "Cache-Control",
              value: "no-store, no-cache",
              override: true,
            },
          ],
        },
      },
      // CloudFront distribution configuration
      cloudFrontDistributionProps: {
        comment: `${id} - ${environment}`,
        defaultRootObject: "index.html",
        errorResponses: [
          {
            httpStatus: 403,
            responseHttpStatus: 200,
            responsePagePath: "/index.html",
            ttl: cdk.Duration.minutes(5),
          },
          {
            httpStatus: 404,
            responseHttpStatus: 200,
            responsePagePath: "/index.html",
            ttl: cdk.Duration.minutes(5),
          },
        ],
        priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // US, Canada, Europe
        enableIpv6: true,
        httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
        minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      },
    });

    const websiteBucket = cloudfrontToS3.s3Bucket!;
    const distribution = cloudfrontToS3.cloudFrontWebDistribution;

    // Deploy website assets to S3
    const withAssets = this.node.tryGetContext("withAssets") !== "false";
    if (withAssets) {
      new s3deploy.BucketDeployment(this, "DeployWebsite", {
        sources: [s3deploy.Source.asset(buildOutputPath)],
        destinationBucket: websiteBucket,
        distribution,
        distributionPaths: ["/*"],
        prune: true, // Remove old files
        memoryLimit: 512,
      });
    }

    // Store for cross-stack reference
    this.distributionDomainName = distribution.distributionDomainName;
    this.bucketName = websiteBucket.bucketName;

    // Outputs
    new cdk.CfnOutput(this, "WebsiteURL", {
      value: `https://${distribution.distributionDomainName}`,
      description: "CloudFront distribution URL",
      exportName: `${id}-WebsiteURL`,
    });

    new cdk.CfnOutput(this, "BucketName", {
      value: websiteBucket.bucketName,
      description: "S3 bucket name",
      exportName: `${id}-BucketName`,
    });

    new cdk.CfnOutput(this, "DistributionId", {
      value: distribution.distributionId,
      description: "CloudFront distribution ID",
      exportName: `${id}-DistributionId`,
    });

    new cdk.CfnOutput(this, "DistributionDomainName", {
      value: distribution.distributionDomainName,
      description: "CloudFront domain name",
      exportName: `${id}-DistributionDomain`,
    });

    if (cloudfrontToS3.s3LoggingBucket) {
      new cdk.CfnOutput(this, "S3LogBucketName", {
        value: cloudfrontToS3.s3LoggingBucket.bucketName,
        description: "Bucket for S3 access logs",
        exportName: `${id}-S3LogBucket`,
      });
    }

    if (cloudfrontToS3.cloudFrontLoggingBucket) {
      new cdk.CfnOutput(this, "CloudFrontLogBucketName", {
        value: cloudfrontToS3.cloudFrontLoggingBucket.bucketName,
        description: "Bucket for CloudFront access logs",
        exportName: `${id}-CloudFrontLogBucket`,
      });
    }

    cdk.Tags.of(this).add("Stack", "Frontend");
    cdk.Tags.of(this).add("aws-mcp:deploy:type", "webapp-cloudfront");
  }
}
