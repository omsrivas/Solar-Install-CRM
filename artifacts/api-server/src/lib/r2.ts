import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// ---------------------------------------------------------------------------
// Client initialisation
// ---------------------------------------------------------------------------

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

function buildClient(): S3Client {
  const accountId = requireEnv("R2_ACCOUNT_ID");
  const accessKeyId = requireEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = requireEnv("R2_SECRET_ACCESS_KEY");

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

// Lazy singleton — client is only created on first use so the server can
// start without R2 env vars (they will be validated at call time).
let _client: S3Client | undefined;

export function getR2Client(): S3Client {
  if (!_client) _client = buildClient();
  return _client;
}

export function getBucket(): string {
  return requireEnv("R2_BUCKET_NAME");
}

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

/**
 * Upload a file buffer to R2.
 * @param key       Object key (path inside the bucket), e.g. "invoices/abc123.pdf"
 * @param body      Raw file buffer
 * @param contentType  MIME type, e.g. "application/pdf"
 */
export async function uploadToR2(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  await getR2Client().send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

/**
 * Generate a pre-signed download URL valid for `expiresIn` seconds (default 1 h).
 * The URL carries a Content-Disposition header so the browser triggers a download
 * with the original file name.
 */
export async function getPresignedDownloadUrl(
  key: string,
  originalName: string,
  expiresIn = 3600,
): Promise<string> {
  // Sanitise filename for Content-Disposition header
  const safe = originalName.replace(/"/g, '\\"');
  return getSignedUrl(
    getR2Client(),
    new GetObjectCommand({
      Bucket: getBucket(),
      Key: key,
      ResponseContentDisposition: `attachment; filename="${safe}"`,
    }),
    { expiresIn },
  );
}

/**
 * Delete an object from R2.
 * Resolves successfully even if the object does not exist (idempotent).
 */
export async function deleteFromR2(key: string): Promise<void> {
  await getR2Client().send(
    new DeleteObjectCommand({ Bucket: getBucket(), Key: key }),
  );
}

/**
 * Check whether an object exists in R2 without downloading it.
 */
export async function existsInR2(key: string): Promise<boolean> {
  try {
    await getR2Client().send(
      new HeadObjectCommand({ Bucket: getBucket(), Key: key }),
    );
    return true;
  } catch {
    return false;
  }
}
