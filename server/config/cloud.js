const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const dotenv = require('dotenv');

dotenv.config();

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY
  }
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

module.exports = {
  r2,
  PutObjectCommand,
  GetObjectCommand,
  downloadFromR2
};