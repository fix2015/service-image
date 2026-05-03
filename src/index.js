require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { serviceAuth } = require('./middleware/auth');
const { processAndUpload, deleteFromS3, isS3Configured } = require('./upload');

const app = express();
const PORT = process.env.PORT || 3021;

app.use(cors());
app.use(express.json());

// Serve local uploads as fallback
app.use('/uploads', express.static('/tmp/uploads'));

// Health check (no auth required)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', s3: isS3Configured() });
});

// All other routes require API key
app.use(serviceAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
    }
  },
});

// POST /upload — general image upload with resize
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const opts = {
      maxWidth: parseInt(req.body.maxWidth) || 1200,
      maxHeight: parseInt(req.body.maxHeight) || 1200,
      quality: parseInt(req.body.quality) || 80,
      cover: req.body.cover === 'true',
      prefix: req.body.prefix || 'uploads',
    };

    const result = await processAndUpload(req.file.buffer, opts);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /upload/avatar — square crop + resize for avatars
app.post('/upload/avatar', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const size = parseInt(req.body.size) || 256;
    const result = await processAndUpload(req.file.buffer, {
      maxWidth: size,
      maxHeight: size,
      cover: true,
      prefix: 'avatars',
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /:key — remove image from S3
app.delete('/:prefix/:key', async (req, res) => {
  try {
    const fullKey = `${req.params.prefix}/${req.params.key}`;
    await deleteFromS3(fullKey);
    res.json({ message: 'Deleted', key: fullKey });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Image service running on port ${PORT}`);
});

module.exports = app;
