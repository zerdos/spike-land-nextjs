import {
  DeleteObjectCommand,
  ListObjectsCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { execa } from "execa";
import { createReadStream, createWriteStream } from "fs";
import { unlink } from "fs/promises";
import { pipeline } from "stream/promises";
import { createGzip } from "zlib";

const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME;
const ENDPOINT = process.env.CLOUDFLARE_R2_ENDPOINT;
const ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

if (!BUCKET_NAME || !ENDPOINT || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY || !DATABASE_URL) {
  throw new Error("Missing required environment variables");
}

const s3 = new S3Client({
  region: "auto",
  endpoint: ENDPOINT,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
});

const main = async () => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `backup-${timestamp}.sql`;
    const compressedFilename = `${filename}.gz`;
    const filepath = `/tmp/${filename}`;
    const compressedFilepath = `/tmp/${compressedFilename}`;

    console.log("Starting database backup...");
    await execa("pg_dump", [DATABASE_URL, "--format=p", `--file=${filepath}`]);
    console.log("Database backup completed.");

    console.log("Compressing backup file...");
    const source = createReadStream(filepath);
    const destination = createWriteStream(compressedFilepath);
    await pipeline(source, createGzip(), destination);
    console.log("Backup file compressed.");

    console.log("Uploading backup to R2...");
    const fileStream = createReadStream(compressedFilepath);
    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: compressedFilename,
      Body: fileStream,
    };
    await s3.send(new PutObjectCommand(uploadParams));
    console.log("Backup uploaded to R2.");

    console.log("Cleaning up local files...");
    await unlink(filepath);
    await unlink(compressedFilepath);
    console.log("Local files cleaned up.");

    console.log("Applying rotation policy...");
    const { Contents } = await s3.send(new ListObjectsCommand({ Bucket: BUCKET_NAME }));
    if (Contents && Contents.length > 7) {
      const sortedBackups = Contents.sort(
        (a, b) => new Date(a.LastModified!).getTime() - new Date(b.LastModified!).getTime(),
      );
      const backupsToDelete = sortedBackups.slice(0, sortedBackups.length - 7);
      for (const backup of backupsToDelete) {
        await s3.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: backup.Key }));
        console.log(`Deleted old backup: ${backup.Key}`);
      }
    }
    console.log("Rotation policy applied.");

    console.log("Backup process completed successfully.");
  } catch (error) {
    console.error("Backup process failed:", error);
    process.exit(1);
  }
};

main();
