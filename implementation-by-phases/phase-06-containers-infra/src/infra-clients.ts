import { ApplicationAutoScalingClient } from "@aws-sdk/client-application-auto-scaling";
import { CloudFormationClient } from "@aws-sdk/client-cloudformation";
import { EC2Client } from "@aws-sdk/client-ec2";
import { ECRClient } from "@aws-sdk/client-ecr";
import { ECSClient } from "@aws-sdk/client-ecs";
import { EKSClient } from "@aws-sdk/client-eks";
import { ElasticLoadBalancingV2Client } from "@aws-sdk/client-elastic-load-balancing-v2";
import { Route53Client } from "@aws-sdk/client-route-53";
import { awsDefaults, type AwsClientOptions } from "@floci-lab/aws-clients";

export interface InfraClients {
  ecr: ECRClient;
  ecs: ECSClient;
  ec2: EC2Client;
  eks: EKSClient;
  cloudFormation: CloudFormationClient;
  elbv2: ElasticLoadBalancingV2Client;
  autoScaling: ApplicationAutoScalingClient;
  route53: Route53Client;
}

export function createInfraClients(options: AwsClientOptions = {}): InfraClients {
  const endpoint = options.endpoint ?? process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566";
  const defaults = awsDefaults({ endpoint, ...options });
  return {
    ecr: new ECRClient(defaults),
    ecs: new ECSClient(defaults),
    ec2: new EC2Client(defaults),
    eks: new EKSClient(defaults),
    cloudFormation: new CloudFormationClient(defaults),
    elbv2: new ElasticLoadBalancingV2Client(defaults),
    autoScaling: new ApplicationAutoScalingClient(defaults),
    route53: new Route53Client(defaults),
  };
}
