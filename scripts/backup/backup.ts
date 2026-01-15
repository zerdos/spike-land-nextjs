import {
  DeleteObjectCommand,
  ListObjectsCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { spawn } from "child_process";
import { createReadStream, createWriteStream } from "fs";
import { unlink } from "fs/promises";
import { pipeline } from "stream/promises";
import { createGzip } from "zlib";

export interface BackupConfig {
  bucketName: string;
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export interface BackupDependencies {
  s3Client: S3Client;
  config: BackupConfig;
}

/**
 * Validates required environment variables and returns configuration
 * @throws Error if any required environment variable is missing
 */
export function getConfigFromEnv(): BackupConfig {
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;
  const endpoint = process.env.CLOUDFLARE_R2_ENDPOINT;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const databaseUrl = process.env.DATABASE_URL;

  if (!bucketName || !endpoint || !accessKeyId || !secretAccessKey || !databaseUrl) {
    throw new Error("Missing required environment variables");
  }

  return { bucketName, endpoint, accessKeyId, secretAccessKey };
}

/**
 * Creates an S3 client configured for Cloudflare R2
 */
export function createS3Client(config: BackupConfig): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

/**
 * Filters and validates backup objects from S3 listing
 */
export function filterValidBackups(
  contents: { Key?: string; LastModified?: Date; }[] | undefined,
): { Key: string; LastModified: Date; }[] {
  return (contents || []).filter(
    (obj): obj is { Key: string; LastModified: Date; } =>
      !!obj.Key && !!obj.LastModified && obj.Key.endsWith(".sql.gz"),
  );
}

/**
 * Main backup function that can be called with injected dependencies for testing
 */
export async function runBackup(deps: BackupDependencies): Promise<void> {
  const { s3Client, config } = deps;

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `backup-${timestamp}.sql`;
  const compressedFilename = `${filename}.gz`;
  const filepath = `/tmp/${filename}`;
  const compressedFilepath = `/tmp/${compressedFilename}`;

  console.log("Starting database backup...");
  // pg_dump reads DATABASE_URL from environment automatically
  // Passing it as CLI argument would expose it in process list
  await new Promise<void>((resolve, reject) => {
    const proc = spawn("pg_dump", ["--format=p", `--file=${filepath}`], {
      stdio: "inherit",
      env: process.env,
    });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`pg_dump exited with code ${code}`));
    });
    proc.on("error", reject);
  });
  console.log("Database backup completed.");

  console.log("Compressing backup file...");
  const source = createReadStream(filepath);
  const destination = createWriteStream(compressedFilepath);
  await pipeline(source, createGzip(), destination);
  console.log("Backup file compressed.");

  console.log("Uploading backup to R2...");
  const fileStream = createReadStream(compressedFilepath);
  const uploadParams = {
    Bucket: config.bucketName,
    Key: compressedFilename,
    Body: fileStream,
  };
  await s3Client.send(new PutObjectCommand(uploadParams));
  console.log("Backup uploaded to R2.");

  console.log("Cleaning up local files...");
  await unlink(filepath);
  await unlink(compressedFilepath);
  console.log("Local files cleaned up.");

  console.log("Applying rotation policy...");
  const { Contents } = await s3Client.send(
    new ListObjectsCommand({ Bucket: config.bucketName, Prefix: "backup-" }),
  );

  const validBackups = filterValidBackups(Contents);

  if (validBackups.length > 7) {
    const sortedBackups = [...validBackups].sort(
      (a, b) => new Date(a.LastModified).getTime() - new Date(b.LastModified).getTime(),
    );
    const backupsToDelete = sortedBackups.slice(0, sortedBackups.length - 7);
    for (const backup of backupsToDelete) {
      await s3Client.send(new DeleteObjectCommand({ Bucket: config.bucketName, Key: backup.Key }));
      console.log(`Deleted old backup: ${backup.Key}`);
    }
  }
  console.log("Rotation policy applied.");

  console.log("Backup process completed successfully.");
}

/**
 * Main entry point that reads config from environment
 */
export async function main(): Promise<void> {
  try {
    const config = getConfigFromEnv();
    const s3Client = createS3Client(config);
    await runBackup({ s3Client, config });
  } catch (error) {
    console.error("Backup process failed:", error);
    process.exit(1);
  }
}

// Only run when executed directly (not when imported for testing)
const isMainModule = typeof require !== "undefined" && require.main === module;
const isDirectExecution = process.argv[1]?.endsWith("backup.ts");

if (isMainModule || isDirectExecution) {
  main();
}
