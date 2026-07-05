import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { HttpApi } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import type { Construct } from 'constructs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class ProcuraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ── Storage ──────────────────────────────────────────────────────────────

    const vendorDocsBucket = new s3.Bucket(this, 'VendorDocsBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const policyProfilesTable = new dynamodb.Table(this, 'PolicyProfilesTable', {
      tableName: 'PolicyProfiles',
      partitionKey: { name: 'profileId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const evaluationsTable = new dynamodb.Table(this, 'EvaluationsTable', {
      tableName: 'Evaluations',
      partitionKey: { name: 'evaluationId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    evaluationsTable.addGlobalSecondaryIndex({
      indexName: 'profileId-index',
      partitionKey: { name: 'profileId', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // ── MCP server (created first so its API endpoint can be passed to the backend) ──

    const mcpServerFn = new NodejsFunction(this, 'McpServerFunction', {
      functionName: 'procura-mcp-server',
      entry: join(__dirname, '../../mcp-server/src/index.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      memorySize: 256,
      timeout: cdk.Duration.seconds(10),
      bundling: { minify: true, sourceMap: true },
      environment: {
        VENDOR_DOCS_BUCKET: vendorDocsBucket.bucketName,
        POLICY_PROFILES_TABLE: policyProfilesTable.tableName,
        NODE_OPTIONS: '--enable-source-maps',
      },
    });

    vendorDocsBucket.grantRead(mcpServerFn);
    policyProfilesTable.grantReadData(mcpServerFn);

    const mcpApi = new HttpApi(this, 'McpApi', {
      apiName: 'procura-mcp-server',
      defaultIntegration: new HttpLambdaIntegration('McpIntegration', mcpServerFn),
    });

    // ── Backend orchestrator ──────────────────────────────────────────────────

    const backendFn = new NodejsFunction(this, 'BackendFunction', {
      functionName: 'procura-backend',
      entry: join(__dirname, '../../backend/src/index.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      memorySize: 512,
      timeout: cdk.Duration.seconds(30),
      bundling: { minify: true, sourceMap: true },
      environment: {
        VENDOR_DOCS_BUCKET: vendorDocsBucket.bucketName,
        POLICY_PROFILES_TABLE: policyProfilesTable.tableName,
        EVALUATIONS_TABLE: evaluationsTable.tableName,
        MCP_SERVER_URL: mcpApi.apiEndpoint,
        NODE_OPTIONS: '--enable-source-maps',
      },
    });

    vendorDocsBucket.grantReadWrite(backendFn);
    policyProfilesTable.grantReadData(backendFn);
    evaluationsTable.grantReadWriteData(backendFn);

    const backendApi = new HttpApi(this, 'BackendApi', {
      apiName: 'procura-backend',
      defaultIntegration: new HttpLambdaIntegration('BackendIntegration', backendFn),
    });

    // ── Outputs ───────────────────────────────────────────────────────────────

    new cdk.CfnOutput(this, 'BackendApiUrl', {
      exportName: 'ProcuraBackendApiUrl',
      value: backendApi.apiEndpoint,
      description: 'Backend orchestrator API endpoint',
    });

    new cdk.CfnOutput(this, 'McpServerApiUrl', {
      exportName: 'ProcuraMcpServerApiUrl',
      value: mcpApi.apiEndpoint,
      description: 'MCP server API endpoint',
    });
  }
}
