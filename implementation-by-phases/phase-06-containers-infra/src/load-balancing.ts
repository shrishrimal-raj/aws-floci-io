import { CreateLoadBalancerCommand, CreateTargetGroupCommand, type ElasticLoadBalancingV2Client } from "@aws-sdk/client-elastic-load-balancing-v2";
import { ChangeResourceRecordSetsCommand, type ChangeResourceRecordSetsCommandInput, type Route53Client } from "@aws-sdk/client-route-53";

export function chooseLoadBalancer(protocol: "http" | "grpc" | "tcp" | "udp"): "ALB" | "NLB" {
  return protocol === "http" || protocol === "grpc" ? "ALB" : "NLB";
}

export function targetGroupName(serviceName: string, color: "blue" | "green" = "blue"): string {
  return `${serviceName}-${color}-tg`.slice(0, 32);
}

export class AlbFactory {
  constructor(private readonly elbv2: ElasticLoadBalancingV2Client) {}

  async createAlb(name: string, subnets: string[], securityGroups: string[]): Promise<string | undefined> {
    const result = await this.elbv2.send(new CreateLoadBalancerCommand({ Name: name, Type: "application", Scheme: "internet-facing", Subnets: subnets, SecurityGroups: securityGroups }));
    return result.LoadBalancers?.[0]?.LoadBalancerArn;
  }

  async createTargetGroup(name: string, vpcId: string, port: number): Promise<string | undefined> {
    const result = await this.elbv2.send(
      new CreateTargetGroupCommand({ Name: name, VpcId: vpcId, Port: port, Protocol: "HTTP", TargetType: "ip", HealthCheckPath: "/health" })
    );
    return result.TargetGroups?.[0]?.TargetGroupArn;
  }
}

export function weightedAliasRecord(
  name: string,
  hostedZoneId: string,
  blueDns: string,
  blueZoneId: string,
  greenDns: string,
  greenZoneId: string,
  greenWeight: number
): ChangeResourceRecordSetsCommandInput {
  const blueWeight = 100 - greenWeight;
  return {
    HostedZoneId: hostedZoneId,
    ChangeBatch: {
      Changes: [
        {
          Action: "UPSERT",
          ResourceRecordSet: { Name: name, Type: "A", SetIdentifier: "blue", Weight: blueWeight, AliasTarget: { DNSName: blueDns, HostedZoneId: blueZoneId, EvaluateTargetHealth: true } },
        },
        {
          Action: "UPSERT",
          ResourceRecordSet: { Name: name, Type: "A", SetIdentifier: "green", Weight: greenWeight, AliasTarget: { DNSName: greenDns, HostedZoneId: greenZoneId, EvaluateTargetHealth: true } },
        },
      ],
    },
  };
}

export class Route53TrafficShifter {
  constructor(private readonly route53: Route53Client) {}

  async shift(input: ReturnType<typeof weightedAliasRecord>): Promise<void> {
    await this.route53.send(new ChangeResourceRecordSetsCommand(input));
  }
}
