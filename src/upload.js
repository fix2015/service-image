const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const sharp = require('sharp');
const fs = require('fs');
const crypto = require('crypto');

const DEFAULTS = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 80,
};

let s3Client = null;

function getS3Client() {
  if (!s3Client) {
    s3Client = new S3Client({
      region: process.env.AWS_S3_REGION || 'eu-central-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3Client;
}

function isS3Configured() {
  return !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_S3_BUCKET);
}

/**
 * Resize image buffer and upload to S3.
 * @param {Buffer} buffer - Raw image buffer
 * @param {Object} opts - { maxWidth, maxHeight, quality, cover, prefix }
 * @returns {Object} { url, key, width, height, size }
 */
async function processAndUpload(buffer, opts = {}) {
  const maxW = opts.maxWidth || DEFAULTS.maxWidth;
  const maxH = opts.maxHeight || DEFAULTS.maxHeight;
  const quality = opts.quality || DEFAULTS.quality;
  const cover = opts.cover || false;
  const prefix = opts.prefix || 'uploads';

  const resized = await sharp(buffer)
    .resize(maxW, maxH, { fit: cover ? 'cover' : 'inside', withoutEnlargement: !cover })
    .jpeg({ quality, mozjpeg: true })
    .toBuffer();

  const metadata = await sharp(resized).metadata();

  if (!isS3Configured()) {
    // Local fallback: save to /tmp
    const filename = `${crypto.randomUUID()}.jpg`;
    const localPath = `/tmp/uploads/${filename}`;
    fs.mkdirSync('/tmp/uploads', { recursive: true });
    fs.writeFileSync(localPath, resized);
    return {
      url: `/uploads/${filename}`,
      key: filename,
      width: metadata.width,
      height: metadata.height,
      size: resized.length,
      local: true,
    };
  }

  const bucket = process.env.AWS_S3_BUCKET;
  const region = process.env.AWS_S3_REGION || 'eu-central-1';
  const key = `${prefix}/${crypto.randomUUID()}.jpg`;

  await getS3Client().send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: resized,
    ContentType: 'image/jpeg',
  }));

  return {
    url: `https://${bucket}.s3.${region}.amazonaws.com/${key}`,
    key,
    width: metadata.width,
    height: metadata.height,
    size: resized.length,
  };
}

/**
 * Delete an object from S3 by key.
 */
async function deleteFromS3(key) {
  if (!isS3Configured()) return;
  const bucket = process.env.AWS_S3_BUCKET;
  await getS3Client().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

module.exports = { processAndUpload, deleteFromS3, isS3Configured };
