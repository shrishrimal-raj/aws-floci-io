export interface IrsaTrustInput {
  accountId: string;
  oidcProviderArn: string;
  oidcProviderHost: string;
  namespace: string;
  serviceAccount: string;
}

export function irsaTrustPolicy(input: IrsaTrustInput): Record<string, unknown> {
  return {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: { Federated: input.oidcProviderArn },
        Action: "sts:AssumeRoleWithWebIdentity",
        Condition: {
          StringEquals: {
            [`${input.oidcProviderHost}:aud`]: "sts.amazonaws.com",
            [`${input.oidcProviderHost}:sub`]: `system:serviceaccount:${input.namespace}:${input.serviceAccount}`,
          },
        },
      },
    ],
  };
}

export function serviceAccountManifest(namespace: string, name: string, roleArn: string): Record<string, unknown> {
  return {
    apiVersion: "v1",
    kind: "ServiceAccount",
    metadata: { name, namespace, annotations: { "eks.amazonaws.com/role-arn": roleArn } },
  };
}

export function deploymentManifest(name: string, image: string, serviceAccountName: string, port = 3000): Record<string, unknown> {
  return {
    apiVersion: "apps/v1",
    kind: "Deployment",
    metadata: { name },
    spec: {
      replicas: 2,
      selector: { matchLabels: { app: name } },
      template: {
        metadata: { labels: { app: name } },
        spec: { serviceAccountName, containers: [{ name, image, ports: [{ containerPort: port }], readinessProbe: { httpGet: { path: "/health", port } } }] },
      },
    },
  };
}
