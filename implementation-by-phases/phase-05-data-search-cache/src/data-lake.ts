import { StartQueryExecutionCommand, type AthenaClient } from "@aws-sdk/client-athena";
import { CreateDatabaseCommand, CreateTableCommand, type CreateTableCommandInput, type GlueClient } from "@aws-sdk/client-glue";

export type LakeLayer = "bronze" | "silver" | "gold";

export interface S3Partition {
  tenantId: string;
  year: string;
  month: string;
  day: string;
}

/**
 * Builds partitioned S3 prefixes for bronze/silver/gold analytics layers.
 * Example: checkout events land under `silver/event_type=checkout/tenant_id=t/year=2026/...`.
 */
export function lakePrefix(layer: LakeLayer, eventType: string, partition: S3Partition): string {
  return `${layer}/event_type=${eventType}/tenant_id=${partition.tenantId}/year=${partition.year}/month=${partition.month}/day=${partition.day}/`;
}

/**
 * Verifies Athena SQL includes tenant/date partition predicates to control scan cost.
 * Example: dashboards must filter tenant_id/year/month/day before query execution starts.
 */
export function requirePartitionPredicate(sql: string): boolean {
  const normalized = sql.toLowerCase().replace(/\s+/g, " ");
  return normalized.includes("where") && ["tenant_id", "year", "month", "day"].every((key) => normalized.includes(key));
}

/**
 * Creates explicit Glue table input for partitioned Parquet event data.
 * Example: platform team owns schema instead of relying on crawler inference drift.
 */
export function createEventsTableInput(databaseName: string, tableName: string, location: string): CreateTableCommandInput {
  return {
    DatabaseName: databaseName,
    TableInput: {
      Name: tableName,
      TableType: "EXTERNAL_TABLE",
      Parameters: { classification: "parquet", "projection.enabled": "true" },
      StorageDescriptor: {
        Location: location,
        InputFormat: "org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat",
        OutputFormat: "org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat",
        SerdeInfo: { SerializationLibrary: "org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe" },
        Columns: [
          { Name: "event_id", Type: "string" },
          { Name: "event_type", Type: "string" },
          { Name: "occurred_at", Type: "timestamp" },
          { Name: "payload", Type: "string" },
        ],
      },
      PartitionKeys: [
        { Name: "tenant_id", Type: "string" },
        { Name: "year", Type: "string" },
        { Name: "month", Type: "string" },
        { Name: "day", Type: "string" },
      ],
    },
  };
}

/**
 * Glue catalog facade for database/table provisioning.
 * Example: deployment pipeline ensures analytics database and external event table exist.
 */
export class GlueCatalog {
  constructor(private readonly glue: GlueClient) {}

  async ensureDatabase(name: string): Promise<void> {
    await this.glue.send(new CreateDatabaseCommand({ DatabaseInput: { Name: name } }));
  }

  async createEventsTable(databaseName: string, tableName: string, location: string): Promise<void> {
    await this.glue.send(new CreateTableCommand(createEventsTableInput(databaseName, tableName, location)));
  }
}

/**
 * Athena query facade with mandatory partition guard.
 * Example: analytics API rejects broad unpartitioned SQL before it creates runaway S3 scan cost.
 */
export class AthenaQueries {
  constructor(
    private readonly athena: AthenaClient,
    private readonly database = process.env.ATHENA_DATABASE ?? "analytics",
    private readonly outputLocation = process.env.ATHENA_OUTPUT ?? "s3://analytics-query-results/"
  ) {}

  async start(sql: string): Promise<string | undefined> {
    if (!requirePartitionPredicate(sql)) throw new Error("Athena query must include tenant_id/year/month/day partition predicate");
    const result = await this.athena.send(
      new StartQueryExecutionCommand({
        QueryString: sql,
        QueryExecutionContext: { Database: this.database },
        ResultConfiguration: { OutputLocation: this.outputLocation },
      })
    );
    return result.QueryExecutionId;
  }
}
