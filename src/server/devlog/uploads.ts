import "server-only";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/env";

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const SIGNED_UPLOAD_EXPIRY_SECONDS = 300;

type BuildUploadInput = {
  userId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
};

function getS3Config() {
  if (!env.AWS_REGION || !env.AWS_S3_BUCKET || !env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) {
    throw new Error("S3 uploads are not configured");
  }

  return {
    region: env.AWS_REGION,
    bucket: env.AWS_S3_BUCKET,
    client: new S3Client({
      region: env.AWS_REGION,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      },
    }),
  };
}

function sanitizeFilename(name: string) {
  const cleaned = name.trim().replace(/[^a-zA-Z0-9._-]/g, "-");
  return cleaned.length > 0 ? cleaned.slice(0, 120) : "file";
}

function buildPublicUrl(bucket: string, region: string, key: string) {
  if (env.AWS_S3_PUBLIC_BASE_URL) {
    return new URL(key, env.AWS_S3_PUBLIC_BASE_URL.endsWith("/") ? env.AWS_S3_PUBLIC_BASE_URL : `${env.AWS_S3_PUBLIC_BASE_URL}/`).toString();
  }

  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

export async function buildSignedUpload(input: BuildUploadInput) {
  if (input.sizeBytes <= 0 || input.sizeBytes > MAX_UPLOAD_BYTES) {
    throw new Error(`Upload must be between 1 byte and ${MAX_UPLOAD_BYTES} bytes`);
  }

  const { region, bucket, client } = getS3Config();
  const extensionSafeName = sanitizeFilename(input.filename);
  const key = `devlogs/${input.userId}/${crypto.randomUUID()}-${extensionSafeName}`;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: input.mimeType,
    ContentLength: input.sizeBytes,
  });

  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: SIGNED_UPLOAD_EXPIRY_SECONDS,
  });

  return {
    uploadUrl,
    storageKey: key,
    expiresInSeconds: SIGNED_UPLOAD_EXPIRY_SECONDS,
    publicUrl: buildPublicUrl(bucket, region, key),
  };
}
