import { auditEvent, complianceFindings, deploymentManifest, irsaTrustPolicy, serviceAccountManifest } from "../index.js";

/**
 * Enterprise EKS example: IRSA least privilege, Kubernetes deployment manifest,
 * deployment audit record, and compliance gate used before kubectl apply.
 */
export function buildEksIrsaComplianceExample() {
  const roleArn = "arn:aws:iam::123456789012:role/catalog-reader";
  const namespace = "retail";
  const serviceAccount = "catalog";

  return {
    trustPolicy: irsaTrustPolicy({
      accountId: "123456789012",
      oidcProviderArn: "arn:aws:iam::123456789012:oidc-provider/oidc.eks.us-east-1.amazonaws.com/id/EXAMPLE",
      oidcProviderHost: "oidc.eks.us-east-1.amazonaws.com/id/EXAMPLE",
      namespace,
      serviceAccount,
    }),
    serviceAccount: serviceAccountManifest(namespace, serviceAccount, roleArn),
    deployment: deploymentManifest("catalog", "123456789012.dkr.ecr.us-east-1.amazonaws.com/catalog:v18", serviceAccount, 3001),
    compliance: complianceFindings({ privateSubnets: ["subnet-a", "subnet-b"], scanOnPush: true, desiredCount: 3, tags: { CostCenter: "retail-platform", Owner: "catalog-team", DataClass: "internal" } }),
    audit: auditEvent(
      {
        action: "eks.workload.apply",
        resource: "deployment/catalog",
        result: "ALLOW",
        context: { tenantId: "retail", actorId: "platform-admin", requestId: "kubectl-apply-18", sourceIp: "10.0.2.50" },
        metadata: { namespace, serviceAccount, roleArn },
      },
      new Date("2024-06-02T09:30:00Z")
    ),
  };
}
