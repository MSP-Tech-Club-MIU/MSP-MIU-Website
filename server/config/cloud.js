const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { NodeHttpHandler } = require("@smithy/node-http-handler");
const https = require("https");
const dotenv = require('dotenv');

dotenv.config();

/**
 * Node 22+/24 on Windows often fails Cloudflare R2 TLS with
 * "unable to verify the first certificate" unless system CAs are used.
 * Prefer --use-system-ca on process start; also allow R2_TLS_INSECURE=true for local proxies.
 */
function buildHttpsAgent() {
  const insecure = String(process.env.R2_TLS_INSECURE || '').toLowerCase() === 'true';
  return new https.Agent({
    keepAlive: true,
    rejectUnauthorized: !insecure
  });
}

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY
  },
  requestHandler: new NodeHttpHandler({
    httpsAgent: buildHttpsAgent(),
    connectionTimeout: 10000,
    requestTimeout: 60000
  })
});

/**
 * Download an object from R2 (S3-compatible) into a Buffer.
 * @param {string} key Object key (same as stored on submission.r2_key)
 * @returns {Promise<Buffer>}
 */
async function downloadFromR2(key) {
  const bucket = process.env.R2_BUCKET;
  if (!bucket) {
    throw new Error('R2_BUCKET is not configured');
  }
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key
  });
  const response = await r2.send(command);
  const chunks = [];
  for await (const chunk of response.Body) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/**
 * Upload object to R2 and return stored key.
 * @param {Buffer} body
 * @param {string} key
 * @param {string} contentType
 */
async function uploadToR2(body, key, contentType = 'application/octet-stream') {
  const bucket = process.env.R2_BUCKET;
  if (!bucket) {
    throw new Error('R2_BUCKET is not configured');
  }
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType
  });
  await r2.send(command);
  return { key };
}

module.exports = {
  r2,
  PutObjectCommand,
  GetObjectCommand,
  downloadFromR2,
  uploadToR2
};
