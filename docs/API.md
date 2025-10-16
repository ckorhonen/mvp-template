# API Documentation

Comprehensive API reference for all endpoints.

## Base URL

```
https://your-worker.workers.dev
```

## Authentication

Most endpoints don't require authentication by default. To add authentication:

1. Use the `api_keys` table for API key management
2. Add an authentication middleware
3. Pass API keys via `X-API-Key` header

---

## Health Check

### GET /health

Check the health status of all services.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-01-16T14:30:00.000Z",
    "environment": "production",
    "version": "v1",
    "checks": {
      "kv": true,
      "d1": true,
      "r2": true
    },
    "responseTime": "45ms"
  }
}
```

---

## AI Gateway Endpoints

### POST /api/ai/chat

Generate AI chat completions using OpenAI via Cloudflare AI Gateway.

**Request:**
```json
{
  "messages": [
    {"role": "system", "content": "You are a helpful assistant"},
    {"role": "user", "content": "What is Cloudflare Workers?"}
  ],
  "model": "gpt-4o-mini",
  "temperature": 0.7,
  "max_tokens": 1000
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "response": "Cloudflare Workers is a serverless platform...",
    "model": "gpt-4o-mini",
    "usage": {
      "prompt_tokens": 25,
      "completion_tokens": 150,
      "total_tokens": 175
    }
  },
  "metadata": {
    "timestamp": "2025-01-16T14:30:00.000Z"
  }
}
```

### POST /api/ai/completion

Generate text completions.

**Request:**
```json
{
  "prompt": "Once upon a time in a land far away",
  "model": "gpt-3.5-turbo-instruct",
  "temperature": 0.7,
  "max_tokens": 500
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "response": "there lived a brave knight...",
    "model": "gpt-3.5-turbo-instruct",
    "usage": {
      "prompt_tokens": 10,
      "completion_tokens": 120,
      "total_tokens": 130
    }
  }
}
```

---

## D1 Database Endpoints

### GET /api/database/:table

Query records from a table with pagination.

**Parameters:**
- `limit` (query) - Number of records to return (default: 100)
- `offset` (query) - Number of records to skip (default: 0)

**Example:**
```bash
GET /api/database/users?limit=10&offset=0
```

**Response:**
```json
{
  "success": true,
  "data": {
    "records": [
      {
        "id": 1,
        "email": "user@example.com",
        "username": "johndoe",
        "created_at": "2025-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "limit": 10,
      "offset": 0,
      "total": 45,
      "hasMore": true
    }
  }
}
```

### POST /api/database/:table

Create a new record.

**Request:**
```json
{
  "email": "newuser@example.com",
  "username": "newuser",
  "display_name": "New User"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "email": "newuser@example.com",
    "username": "newuser",
    "display_name": "New User",
    "created_at": "2025-01-16T14:30:00.000Z",
    "message": "Record created successfully"
  }
}
```

### PUT /api/database/:table/:id

Update an existing record.

**Request:**
```json
{
  "display_name": "Updated Name",
  "bio": "New bio text"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "display_name": "Updated Name",
    "bio": "New bio text",
    "updated_at": "2025-01-16T14:35:00.000Z",
    "message": "Record updated successfully"
  }
}
```

### DELETE /api/database/:table/:id

Delete a record.

**Response:**
```
HTTP 204 No Content
```

---

## KV Storage Endpoints

### GET /api/kv/:key

Get a value from KV storage.

**Parameters:**
- `type` (query) - Response type: `text`, `json`, `arrayBuffer`, `stream` (default: `text`)

**Example:**
```bash
GET /api/kv/user:123?type=json
```

**Response:**
```json
{
  "success": true,
  "data": {
    "key": "user:123",
    "value": {"name": "John", "age": 30}
  }
}
```

### POST /api/kv/:key

Set a value in KV storage.

**Request:**
```json
{
  "value": {"name": "John", "age": 30},
  "ttl": 3600,
  "metadata": {"created_by": "user123"}
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "key": "user:123",
    "value": {"name": "John", "age": 30},
    "message": "Value stored successfully"
  }
}
```

### DELETE /api/kv/:key

Delete a value from KV storage.

**Response:**
```
HTTP 204 No Content
```

### GET /api/kv

List keys in KV storage.

**Parameters:**
- `prefix` (query) - Filter keys by prefix
- `limit` (query) - Number of keys to return (default: 100)
- `cursor` (query) - Pagination cursor

**Example:**
```bash
GET /api/kv?prefix=user:&limit=50
```

**Response:**
```json
{
  "success": true,
  "data": {
    "keys": [
      {"name": "user:123", "expiration": 1705420800},
      {"name": "user:456", "expiration": null}
    ],
    "list_complete": false,
    "cursor": "next_page_token"
  }
}
```

---

## R2 Storage Endpoints

### POST /api/r2/upload

Upload a file to R2 storage.

**Request:**
```
Content-Type: multipart/form-data

file: [binary file data]
key: optional-custom-filename.jpg
```

**Response:**
```json
{
  "success": true,
  "data": {
    "key": "optional-custom-filename.jpg",
    "size": 1024567,
    "type": "image/jpeg",
    "message": "File uploaded successfully"
  }
}
```

### GET /api/r2/download/:key

Download a file from R2 storage.

**Response:**
```
Content-Type: image/jpeg
Content-Length: 1024567

[binary file data]
```

### GET /api/r2/list

List objects in R2 bucket.

**Parameters:**
- `prefix` (query) - Filter objects by prefix
- `limit` (query) - Number of objects to return (default: 100)
- `cursor` (query) - Pagination cursor

**Response:**
```json
{
  "success": true,
  "data": {
    "objects": [
      {
        "key": "photo.jpg",
        "size": 1024567,
        "uploaded": "2025-01-16T14:00:00.000Z",
        "httpEtag": "abc123"
      }
    ],
    "truncated": false,
    "cursor": null
  }
}
```

### DELETE /api/r2/:key

Delete a file from R2 storage.

**Response:**
```
HTTP 204 No Content
```

---

## Combined Example

### POST /api/example/combined

Demonstrates using multiple Cloudflare services together:
1. Check KV cache
2. Process with AI (OpenAI via AI Gateway)
3. Store in D1 database
4. Cache result in KV
5. Backup to R2

**Request:**
```json
{
  "text": "Your text to process and summarize"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-v4",
    "originalText": "Your text to process and summarize",
    "summary": "AI-generated summary...",
    "timestamp": "2025-01-16T14:30:00.000Z",
    "cached": false,
    "services": {
      "ai": true,
      "database": true,
      "cache": true,
      "backup": true
    }
  }
}
```

---

## Error Responses

All errors follow a consistent format:

**Validation Error (400):**
```json
{
  "success": false,
  "error": {
    "message": "Invalid request",
    "code": "VALIDATION_ERROR",
    "details": [
      {"field": "email", "message": "email is required", "code": "REQUIRED_FIELD"}
    ]
  },
  "metadata": {
    "timestamp": "2025-01-16T14:30:00.000Z"
  }
}
```

**Not Found (404):**
```json
{
  "success": false,
  "error": {
    "message": "Resource not found",
    "code": "NOT_FOUND"
  }
}
```

**Rate Limit (429):**
```json
{
  "success": false,
  "error": {
    "message": "Rate limit exceeded. Please try again later.",
    "code": "RATE_LIMIT_EXCEEDED",
    "details": {
      "limit": 60,
      "window": "1 minute",
      "retryAfter": 60
    }
  }
}
```

**Server Error (500):**
```json
{
  "success": false,
  "error": {
    "message": "An unexpected error occurred",
    "code": "INTERNAL_SERVER_ERROR"
  }
}
```

---

## Rate Limits

Default rate limits (configurable via environment variables):

- **Per minute**: 60 requests
- **Per hour**: 1000 requests

Rate limiting is applied per client IP address.

---

## CORS

CORS is enabled for configured origins. Default allowed origins:
- `http://localhost:5173`
- `http://localhost:3000`
- `http://localhost:8787`

Configure via `CORS_ALLOWED_ORIGINS` environment variable.
