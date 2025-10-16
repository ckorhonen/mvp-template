# Cloudflare Services Integration Guide

Complete guide to integrating and using all Cloudflare services in this MVP template.

## Table of Contents

- [D1 Database](#d1-database)
- [KV Storage](#kv-storage)
- [R2 Object Storage](#r2-object-storage)
- [AI Gateway](#ai-gateway)
- [Queues](#queues)
- [Analytics Engine](#analytics-engine)
- [Durable Objects](#durable-objects)

## D1 Database

### Overview

D1 is Cloudflare's serverless SQL database built on SQLite. It provides:
- Global replication
- Low latency at the edge
- Automatic backups
- SQL compatibility

### Setup

```bash
# Create database
npx wrangler d1 create mvp-database

# Apply migrations
npx wrangler d1 execute mvp-database --file=./migrations/0001_initial_schema.sql
```

### Usage Example

```typescript
import { createDatabaseService } from './services/database';

const db = createDatabaseService(env);

// Simple query
const users = await db.query('SELECT * FROM users WHERE active = ?', [1]);

// Query builder
const user = await db
  .select('users', { email: 'user@example.com' })
  .first();

// Insert
const result = await db.insert('users', {
  email: 'new@example.com',
  name: 'New User'
});

// Update
await db.update('users', 
  { last_login_at: new Date().toISOString() },
  { id: userId }
);

// Delete
await db.delete('users', { id: userId });
```

### Best Practices

1. **Use prepared statements** to prevent SQL injection
2. **Create indexes** for frequently queried columns
3. **Batch operations** when possible for better performance
4. **Use transactions** for related operations
5. **Keep migrations sequential** and versioned

### Limits

- Maximum database size: 10 GB
- Maximum SQL statement size: 1 MB
- Maximum batch size: 100 statements

## KV Storage

### Overview

Workers KV is a global, low-latency, key-value data store. Perfect for:
- Caching
- Session storage
- Configuration
- Short-lived data

### Setup

```bash
# Create namespaces
npx wrangler kv:namespace create CACHE
npx wrangler kv:namespace create CACHE --preview
```

### Usage Example

```typescript
// Write
await env.CACHE.put('key', 'value', {
  expirationTtl: 3600, // 1 hour
  metadata: { created: Date.now() }
});

// Read
const value = await env.CACHE.get('key');
const valueWithMetadata = await env.CACHE.getWithMetadata('key');

// Delete
await env.CACHE.delete('key');

// List keys
const keys = await env.CACHE.list({ prefix: 'user:' });
```

### Best Practices

1. **Set expiration times** to prevent stale data
2. **Use prefixes** for key organization
3. **Store metadata** for versioning and timestamps
4. **Keep values small** (< 25 MB per key)
5. **Cache frequently accessed data**

### Limits

- Value size: 25 MB
- Key size: 512 bytes
- Metadata size: 1 KB
- Operations: Unlimited reads, 1,000 writes/day (free tier)

## R2 Object Storage

### Overview

R2 is Cloudflare's object storage with zero egress fees. Ideal for:
- Static assets
- User uploads
- Backups
- Large files

### Setup

```bash
# Create buckets
npx wrangler r2 bucket create mvp-assets
npx wrangler r2 bucket create mvp-uploads
```

### Usage Example

```typescript
// Upload object
await env.ASSETS.put('images/logo.png', fileBuffer, {
  httpMetadata: {
    contentType: 'image/png'
  },
  customMetadata: {
    uploadedBy: userId
  }
});

// Download object
const object = await env.ASSETS.get('images/logo.png');
const arrayBuffer = await object.arrayBuffer();

// List objects
const objects = await env.ASSETS.list({ prefix: 'images/' });

// Delete object
await env.ASSETS.delete('images/logo.png');

// Generate presigned URL (if needed)
// Use Cloudflare Access or custom auth
```

### Best Practices

1. **Use appropriate content types** for better browser handling
2. **Organize with prefixes** (e.g., `user-123/`, `public/`)
3. **Set metadata** for tracking and versioning
4. **Implement access controls** for sensitive data
5. **Use lifecycle policies** for automatic cleanup

### Limits

- Object size: 5 TB
- Operations: Unlimited (with free tier limits on storage)
- No egress fees

## AI Gateway

### Overview

AI Gateway provides a unified interface to AI providers with:
- Caching for cost reduction
- Rate limiting
- Request analytics
- Fallback providers

### Setup

1. Create gateway at [dash.cloudflare.com/ai/ai-gateway](https://dash.cloudflare.com/ai/ai-gateway)
2. Add gateway ID to `.env`
3. Configure OpenAI API key

### Usage Example

```typescript
import { createAIService } from './services/ai';

const ai = createAIService(env);

// Text generation
const text = await ai.generateText(
  'Write a product description',
  'You are a marketing expert'
);

// Chat completion
const response = await ai.createChatCompletion({
  messages: [
    { role: 'system', content: 'You are helpful' },
    { role: 'user', content: 'Hello!' }
  ],
  temperature: 0.7
});

// Content moderation
const moderation = await ai.moderateContent(userContent);
if (moderation.flagged) {
  // Handle inappropriate content
}

// Embeddings
const embeddings = await ai.createEmbedding([
  'First text',
  'Second text'
]);
```

### Best Practices

1. **Use caching** to reduce costs
2. **Implement rate limiting** per user
3. **Monitor usage** via dashboard
4. **Set reasonable max_tokens** limits
5. **Handle errors gracefully**

### Cost Optimization

- Cache common requests
- Use cheaper models when possible
- Set token limits
- Monitor via AI Gateway analytics

## Queues

### Overview

Cloudflare Queues provides message queuing for:
- Background jobs
- Asynchronous processing
- Decoupled architecture
- Scheduled tasks

### Setup

```bash
# Create queue
npx wrangler queues create mvp-tasks
```

### Usage Example

```typescript
// Send message to queue
await env.TASK_QUEUE.send({
  type: 'send_email',
  userId: '123',
  data: { to: 'user@example.com' }
});

// Batch send
await env.TASK_QUEUE.sendBatch([
  { body: { type: 'task1' } },
  { body: { type: 'task2' } }
]);

// Consumer (in worker)
export default {
  async queue(batch, env) {
    for (const message of batch.messages) {
      const { type, userId, data } = message.body;
      
      switch (type) {
        case 'send_email':
          await sendEmail(data);
          break;
        // Handle other message types
      }
      
      message.ack();
    }
  }
};
```

### Best Practices

1. **Use appropriate batch sizes** for efficiency
2. **Implement idempotency** for retry safety
3. **Handle errors gracefully** with DLQ
4. **Monitor queue depth** to prevent backlog
5. **Use message types** for routing

### Limits

- Message size: 128 KB
- Batch size: 100 messages
- Retention: 4 days

## Analytics Engine

### Overview

Analytics Engine provides time-series analytics at scale:
- Real-time data ingestion
- SQL-based querying
- Cost-effective storage
- No sampling

### Usage Example

```typescript
// Write data point
await env.ANALYTICS.writeDataPoint({
  blobs: ['page_view', '/home'],
  doubles: [1], // count
  indexes: ['pages'] // for querying
});

// Track user event
await env.ANALYTICS.writeDataPoint({
  blobs: ['user_signup', userId, 'email'],
  doubles: [1],
  indexes: ['users', 'signups']
});

// Query via GraphQL API (separate from worker)
// Use Cloudflare Dashboard or GraphQL endpoint
```

### Best Practices

1. **Use consistent blob names** for easier querying
2. **Store numeric data in doubles** for aggregations
3. **Use indexes** for filtering
4. **Batch writes** when possible
5. **Design for queries** you'll need

## Durable Objects

### Overview

Durable Objects provide:
- Strongly consistent storage
- Stateful coordination
- WebSocket support
- Global uniqueness

### Usage Example

```typescript
// Rate Limiter Durable Object
export class RateLimiter {
  constructor(state, env) {
    this.state = state;
  }

  async fetch(request) {
    const ip = request.headers.get('CF-Connecting-IP');
    const key = `ratelimit:${ip}`;
    
    let count = (await this.state.storage.get(key)) || 0;
    count++;
    
    if (count > 60) {
      return new Response('Rate limit exceeded', { status: 429 });
    }
    
    await this.state.storage.put(key, count, {
      expirationTtl: 60
    });
    
    return new Response('OK');
  }
}

// Use in worker
const id = env.RATE_LIMITER.idFromName(ip);
const stub = env.RATE_LIMITER.get(id);
const response = await stub.fetch(request);
```

### Best Practices

1. **Use unique IDs** for proper distribution
2. **Implement cleanup** for old data
3. **Handle concurrency** properly
4. **Keep state minimal** for performance
5. **Use alarms** for scheduled tasks

## Integration Patterns

### Caching Strategy

```typescript
// Check cache first
let data = await env.CACHE.get(key);

if (!data) {
  // Query database
  data = await env.DB.prepare('SELECT * FROM users WHERE id = ?')
    .bind(userId)
    .first();
  
  // Store in cache
  await env.CACHE.put(key, JSON.stringify(data), {
    expirationTtl: 3600
  });
}
```

### File Upload Flow

```typescript
// 1. Receive upload
const formData = await request.formData();
const file = formData.get('file');

// 2. Store in R2
const key = `uploads/${userId}/${Date.now()}-${file.name}`;
await env.UPLOADS.put(key, file.stream());

// 3. Save metadata to D1
await env.DB.prepare(
  'INSERT INTO uploads (user_id, key, filename) VALUES (?, ?, ?)'
).bind(userId, key, file.name).run();

// 4. Queue for processing
await env.TASK_QUEUE.send({
  type: 'process_upload',
  key,
  userId
});
```

### Background Job Processing

```typescript
// 1. Trigger job
await env.TASK_QUEUE.send({
  type: 'generate_report',
  userId,
  reportId
});

// 2. Process in consumer
export default {
  async queue(batch, env) {
    for (const message of batch.messages) {
      if (message.body.type === 'generate_report') {
        // Generate report
        const report = await generateReport(message.body);
        
        // Save to R2
        await env.ASSETS.put(
          `reports/${message.body.reportId}.pdf`,
          report
        );
        
        // Update database
        await env.DB.prepare(
          'UPDATE reports SET status = ? WHERE id = ?'
        ).bind('completed', message.body.reportId).run();
        
        message.ack();
      }
    }
  }
};
```

## Troubleshooting

### Common Issues

1. **Database not found**: Check database ID in `wrangler.toml`
2. **KV not updating**: Wait for eventual consistency (usually < 60s)
3. **R2 403 errors**: Verify bucket permissions
4. **Queue not processing**: Check consumer configuration
5. **AI Gateway errors**: Verify API key and gateway ID

### Debugging Tips

```bash
# View logs
npx wrangler tail

# Test locally
npx wrangler dev --local

# Check bindings
npx wrangler whoami
```

## Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [D1 Documentation](https://developers.cloudflare.com/d1/)
- [KV Documentation](https://developers.cloudflare.com/kv/)
- [R2 Documentation](https://developers.cloudflare.com/r2/)
- [AI Gateway Docs](https://developers.cloudflare.com/ai-gateway/)
- [Queues Documentation](https://developers.cloudflare.com/queues/)
- [Analytics Engine Docs](https://developers.cloudflare.com/analytics/analytics-engine/)
