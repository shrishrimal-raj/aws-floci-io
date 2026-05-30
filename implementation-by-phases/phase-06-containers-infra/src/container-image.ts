import { CreateRepositoryCommand, GetAuthorizationTokenCommand, type ECRClient } from "@aws-sdk/client-ecr";

export interface ImageRef {
  accountId: string;
  region: string;
  repository: string;
  tag: string;
}

/** Builds canonical ECR image URI used by ECS/EKS task specs and rollback runbooks. */
export function imageUri(ref: ImageRef): string {
  return `${ref.accountId}.dkr.ecr.${ref.region}.amazonaws.com/${ref.repository}:${ref.tag}`;
}

/** Creates practical Docker build/login/push commands for CI pipelines. */
export function dockerBuildPushCommands(ref: ImageRef, dockerfile = "Dockerfile", context = "."): string[] {
  const uri = imageUri(ref);
  return [
    `docker build -f ${dockerfile} -t ${uri} ${context}`,
    `aws ecr get-login-password --region ${ref.region} | docker login --username AWS --password-stdin ${ref.accountId}.dkr.ecr.${ref.region}.amazonaws.com`,
    `docker push ${uri}`,
  ];
}

/** ECR repository helper that enforces scan-on-push and server-side encryption. */
export class EcrRepository {
  constructor(private readonly ecr: ECRClient) {}

  /** Creates an image repository for a service and returns its URI. */
  async ensure(name: string): Promise<string | undefined> {
    const result = await this.ecr.send(
      new CreateRepositoryCommand({
        repositoryName: name,
        imageScanningConfiguration: { scanOnPush: true },
        encryptionConfiguration: { encryptionType: "AES256" },
      })
    );
    return result.repository?.repositoryUri;
  }

  /** Reads temporary ECR Docker login password for controlled build agents. */
  async loginPassword(): Promise<string> {
    const result = await this.ecr.send(new GetAuthorizationTokenCommand({}));
    const token = result.authorizationData?.[0]?.authorizationToken;
    if (!token) throw new Error("ECR returned no authorization token");
    return Buffer.from(token, "base64").toString("utf8").split(":")[1] ?? "";
  }
}
