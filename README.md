# service-image

Reusable image upload, resize & S3 storage microservice.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check (no auth) |
| POST | `/upload` | Upload and resize image |
| POST | `/upload/avatar` | Square crop + resize for avatars |
| DELETE | `/:prefix/:key` | Remove image from S3 |

## Authentication

All endpoints (except `/health`) require `X-Service-Key` header.

## Upload Options

**POST /upload** (multipart/form-data)
- `file` — image file (JPEG, PNG, WebP, max 10MB)
- `maxWidth` — max width in px (default: 1200)
- `maxHeight` — max height in px (default: 1200)
- `quality` — JPEG quality 1-100 (default: 80)
- `cover` — `true` for cover fit, `false` for inside fit
- `prefix` — S3 key prefix (default: `uploads`)

**POST /upload/avatar** (multipart/form-data)
- `file` — image file
- `size` — square size in px (default: 256)

## Response

```json
{
  "url": "https://bucket.s3.region.amazonaws.com/uploads/uuid.jpg",
  "key": "uploads/uuid.jpg",
  "width": 800,
  "height": 600,
  "size": 45230
}
```

## Setup

```bash
cp .env.example .env  # configure S3 credentials
npm install
npm run dev           # http://localhost:3021
```

## Docker

```bash
docker-compose up     # runs on port 3021
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 3021) |
| `SERVICE_API_KEY` | Yes | API key for authentication |
| `AWS_ACCESS_KEY_ID` | No | S3 access key (falls back to local) |
| `AWS_SECRET_ACCESS_KEY` | No | S3 secret key |
| `AWS_S3_BUCKET` | No | S3 bucket name |
| `AWS_S3_REGION` | No | S3 region (default: eu-central-1) |
