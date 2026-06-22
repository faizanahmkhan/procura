import * as cdk from 'aws-cdk-lib';
import { ProcuraStack } from '../lib/procura-stack.js';

const app = new cdk.App();

new ProcuraStack(app, 'ProcuraStack', {
  env: {
    region: 'eu-west-2',
  },
});
