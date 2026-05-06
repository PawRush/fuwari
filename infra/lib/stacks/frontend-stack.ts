import * as cdk from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import { CloudFrontToS3 } from "@aws-solutions-constructs/aws-cloudfront-s3";
import { Construct } from "constructs";

export interface FrontendStackProps extends cdk.StackProps {
  environment: string;
  buildOutputPath: string;
}

export class FrontendStack extends cdk.Stack {
  public readonly distributionDomainName: string;
  public readonly bucketName: string;

  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    const { environment, buildOutputPath } = props;
    const isProd = environment === "prod";
    const removalPolicy = isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY;

    // CSP via CloudFront Function - permissive policy for 3rd-party CDNs/APIs
    const cspFunction = new cloudfront.Function(this, "CspFunction", {
      runtime: cloudfront.FunctionRuntime.JS_2_0,
      code: cloudfront.FunctionCode.fromInline(`
        function handler(event) {
          var response = event.response;
          response.headers['content-security-policy'] = {
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob:; style-src 'self' 'unsafe-inline' https:; font-src 'self' https: data:; img-src 'self' https: data: blob:; connect-src 'self' https: wss:; frame-src 'self' https:; media-src 'self' https: blob:; worker-src 'self' https: blob:; object-src 'self' https:; manifest-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
          };
          return response;
        }
      `),
      comment: "Adds Content-Security-Policy header",
    });

    const cloudfrontToS3 = new CloudFrontToS3(this, "CFToS3", {
      bucketProps: {
        removalPolicy,
        autoDeleteObjects: !isProd,
        versioned: false,
        enforceSSL: true,
      },
      loggingBucketProps: {
        removalPolicy,
        autoDeleteObjects: !isProd,
        lifecycleRules: [{ id: "DeleteOldLogs", enabled: true, expiration: isProd ? cdk.Duration.days(3650) : cdk.Duration.days(7) }],
        enforceSSL: true,
      },
      cloudFrontLoggingBucketProps: {
        removalPolicy,
        autoDeleteObjects: !isProd,
        lifecycleRules: [{ id: "DeleteOldLogs", enabled: true, expiration: isProd ? cdk.Duration.days(3650) : cdk.Duration.days(7) }],
        enforceSSL: true,
      },
      insertHttpSecurityHeaders: false,
      cloudFrontDistributionProps: {
        comment: `${id} - ${environment}`,
        defaultRootObject: "index.html",
        defaultBehavior: {
          responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
          functionAssociations: [
            {
              function: cspFunction,
              eventType: cloudfront.FunctionEventType.VIEWER_RESPONSE
            },
            {
              function: new cloudfront.Function(this, "UrlRewriteFunction", {
                runtime: cloudfront.FunctionRuntime.JS_2_0,
                code: cloudfront.FunctionCode.fromInline(`
                  function handler(event) {
                    const request = event.request;
                    let uri = request.uri;
                    if (!uri.includes('.')) {
                      if (!uri.endsWith('/')) uri += '/';
                      request.uri = uri + 'index.html';
                    }
                    return request;
                  }
                `),
                comment: "Rewrites /path to /path/index.html",
              }),
              eventType: cloudfront.FunctionEventType.VIEWER_REQUEST
            },
          ],
        },
        priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
        enableIpv6: true,
        httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
        minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      },
    });

    const websiteBucket = cloudfrontToS3.s3Bucket!;
    const distribution = cloudfrontToS3.cloudFrontWebDistribution;

    new s3deploy.BucketDeployment(this, "DeployWebsite", {
      sources: [s3deploy.Source.asset(buildOutputPath)],
      destinationBucket: websiteBucket,
      distribution,
      distributionPaths: ["/*"],
      prune: true,
      memoryLimit: 512,
    });

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
    cdk.Tags.of(this).add("aws-mcp:deploy:sop", "deploy-frontend-app");
    cdk.Tags.of(cloudfrontToS3).add("Stack", "Frontend");
    cdk.Tags.of(cloudfrontToS3).add("aws-mcp:deploy:sop", "deploy-frontend-app");
  }
}
