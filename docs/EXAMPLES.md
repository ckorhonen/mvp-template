# Usage Examples

Practical examples and code snippets for common use cases.

## AI Gateway Examples

### Simple Chat Completion

```bash
curl -X POST https://your-worker.workers.dev/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Explain Cloudflare Workers in simple terms"}
    ]
  }'
```

### Multi-turn Conversation

```bash
curl -X POST https://your-worker.workers.dev/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "system", "content": "You are a helpful coding assistant"},
      {"role": "user", "content": "How do I create a REST API?"},
      {"role": "assistant", "content": "To create a REST API..."},
      {"role": "user", "content": "Can you show me an example with TypeScript?"}
    ],
    "temperature": 0.7,
    "max_tokens": 500
  }'
```

### Code Generation

```bash
curl -X POST https://your-worker.workers.dev/api/ai/completion \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Write a TypeScript function that validates an email address:",
    "max_tokens": 200
  }'
```

## Database Examples

### Create a User

```bash
curl -X POST https://your-worker.workers.dev/api/database/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "username": "johndoe",
    "display_name": "John Doe",
    "bio": "Software developer"
  }'
```

### Query Users with Pagination

```bash
# Get first page
curl "https://your-worker.workers.dev/api/database/users?limit=10&offset=0"

# Get second page
curl "https://your-worker.workers.dev/api/database/users?limit=10&offset=10"
```

### Update a User

```bash
curl -X PUT https://your-worker.workers.dev/api/database/users/1 \
  -H "Content-Type: application/json" \
  -d '{
    "display_name": "John Smith",
    "bio": "Senior developer and tech lead"
  }'
```

### Create a Blog Post

```bash
curl -X POST https://your-worker.workers.dev/api/database/posts \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "title": "Getting Started with Cloudflare Workers",
    "content": "In this post, we will explore...",
    "slug": "getting-started-cloudflare-workers",
    "status": "published"
  }'
```

## KV Storage Examples

### Store User Session

```bash
curl -X POST https://your-worker.workers.dev/api/kv/session:abc123 \
  -H "Content-Type: application/json" \
  -d '{
    "value": {
      "userId": 1,
      "email": "user@example.com",
      "loginTime": "2025-01-16T14:00:00Z"
    },
    "ttl": 86400
  }'
```

### Cache API Response

```bash
curl -X POST https://your-worker.workers.dev/api/kv/cache:users:list \
  -H "Content-Type: application/json" \
  -d '{
    "value": [{"id": 1, "name": "John"}],
    "ttl": 3600,
    "metadata": {"cached_at": "2025-01-16T14:00:00Z"}
  }'
```

### Get Cached Data

```bash
curl "https://your-worker.workers.dev/api/kv/cache:users:list?type=json"
```

### List Keys by Prefix

```bash
curl "https://your-worker.workers.dev/api/kv?prefix=session:&limit=50"
```

## R2 Storage Examples

### Upload an Image

```bash
curl -X POST https://your-worker.workers.dev/api/r2/upload \
  -F "file=@photo.jpg" \
  -F "key=profile/user123/avatar.jpg"
```

### Upload with Custom Filename

```bash
curl -X POST https://your-worker.workers.dev/api/r2/upload \
  -F "file=@document.pdf" \
  -F "key=documents/report-2025.pdf"
```

### Download a File

```bash
curl "https://your-worker.workers.dev/api/r2/download/profile/user123/avatar.jpg" \
  -o downloaded-avatar.jpg
```

### List Files in a Folder

```bash
curl "https://your-worker.workers.dev/api/r2/list?prefix=documents/&limit=100"
```

### Delete a File

```bash
curl -X DELETE https://your-worker.workers.dev/api/r2/old-file.jpg
```

## Combined Workflow Examples

### Content Processing Pipeline

Process text with AI, store in database, cache, and backup:

```bash
curl -X POST https://your-worker.workers.dev/api/example/combined \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Cloudflare Workers is a serverless platform that lets you deploy code to Cloudflares global network. It runs your code close to your users for minimal latency and maximum performance."
  }'
```

Response shows the AI summary, database storage, cache status, and backup confirmation.

## JavaScript/TypeScript Client Examples

### Fetch API

```typescript
// AI Chat
const chatResponse = await fetch('https://your-worker.workers.dev/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [
      { role: 'user', content: 'Hello!' }
    ]
  })
});
const chatData = await chatResponse.json();
console.log(chatData.data.response);

// Database Query
const usersResponse = await fetch('https://your-worker.workers.dev/api/database/users?limit=10');
const usersData = await usersResponse.json();
console.log(usersData.data.records);

// File Upload
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('key', 'uploads/myfile.jpg');

const uploadResponse = await fetch('https://your-worker.workers.dev/api/r2/upload', {
  method: 'POST',
  body: formData
});
const uploadData = await uploadResponse.json();
console.log('Uploaded:', uploadData.data.key);
```

### Axios

```typescript
import axios from 'axios';

const client = axios.create({
  baseURL: 'https://your-worker.workers.dev',
  headers: { 'Content-Type': 'application/json' }
});

// AI Completion
const { data } = await client.post('/api/ai/chat', {
  messages: [{ role: 'user', content: 'Hello!' }]
});
console.log(data.data.response);

// Create Record
await client.post('/api/database/users', {
  email: 'user@example.com',
  username: 'user123'
});

// Update Record
await client.put('/api/database/users/1', {
  display_name: 'Updated Name'
});
```

## Python Examples

```python
import requests

base_url = 'https://your-worker.workers.dev'

# AI Chat
response = requests.post(f'{base_url}/api/ai/chat', json={
    'messages': [
        {'role': 'user', 'content': 'Hello!'}
    ]
})
print(response.json()['data']['response'])

# Database Query
response = requests.get(f'{base_url}/api/database/users', params={
    'limit': 10,
    'offset': 0
})
users = response.json()['data']['records']
print(f'Found {len(users)} users')

# File Upload
with open('photo.jpg', 'rb') as f:
    files = {'file': f}
    data = {'key': 'uploads/photo.jpg'}
    response = requests.post(f'{base_url}/api/r2/upload', files=files, data=data)
    print(response.json()['data']['key'])
```

## React Hook Example

```typescript
import { useState, useEffect } from 'react';

function useAIChat() {
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const chat = async (message: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch('https://your-worker.workers.dev/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: message }]
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        setResponse(data.data.response);
      } else {
        setError(data.error.message);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { response, loading, error, chat };
}

// Usage
function ChatComponent() {
  const { response, loading, chat } = useAIChat();

  return (
    <div>
      <button onClick={() => chat('Hello!')}>
        Send Message
      </button>
      {loading && <p>Loading...</p>}
      {response && <p>{response}</p>}
    </div>
  );
}
```

## Error Handling Examples

```typescript
async function apiCall() {
  try {
    const response = await fetch('https://your-worker.workers.dev/api/database/users');
    const data = await response.json();
    
    if (!data.success) {
      // Handle API error
      console.error('API Error:', data.error.message);
      if (data.error.code === 'RATE_LIMIT_EXCEEDED') {
        // Wait and retry
        await new Promise(resolve => setTimeout(resolve, 60000));
        return apiCall(); // Retry
      }
    }
    
    return data.data;
  } catch (error) {
    // Handle network error
    console.error('Network Error:', error);
    throw error;
  }
}
```

## Batch Operations

```typescript
// Create multiple users
const users = [
  { email: 'user1@example.com', username: 'user1' },
  { email: 'user2@example.com', username: 'user2' },
  { email: 'user3@example.com', username: 'user3' }
];

const promises = users.map(user => 
  fetch('https://your-worker.workers.dev/api/database/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user)
  })
);

const responses = await Promise.all(promises);
const results = await Promise.all(responses.map(r => r.json()));
console.log(`Created ${results.length} users`);
```

## WebSocket Integration (Custom Implementation)

```typescript
// While Workers doesn't support WebSocket servers directly,
// you can use Durable Objects for real-time features

// Example: Polling for updates
async function pollForUpdates(lastTimestamp: string) {
  const response = await fetch(
    `https://your-worker.workers.dev/api/database/posts?since=${lastTimestamp}`
  );
  const data = await response.json();
  return data.data.records;
}

// Poll every 5 seconds
setInterval(async () => {
  const lastCheck = localStorage.getItem('lastCheck') || new Date().toISOString();
  const updates = await pollForUpdates(lastCheck);
  
  if (updates.length > 0) {
    console.log('New updates:', updates);
    localStorage.setItem('lastCheck', new Date().toISOString());
  }
}, 5000);
```

## Testing Examples

```typescript
// Jest test example
describe('API Tests', () => {
  const baseUrl = 'https://your-worker.workers.dev';

  it('should return health status', async () => {
    const response = await fetch(`${baseUrl}/health`);
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.data.status).toBe('healthy');
  });

  it('should create a user', async () => {
    const response = await fetch(`${baseUrl}/api/database/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        username: 'testuser'
      })
    });
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.email).toBe('test@example.com');
  });
});
```

## Advanced Patterns

### Retry with Exponential Backoff

```typescript
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      
      if (response.ok) {
        return await response.json();
      }
      
      if (response.status === 429) {
        // Rate limited, wait and retry
        const delay = Math.pow(2, i) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
}
```

### Caching Strategy

```typescript
async function getCachedOrFetch(key: string, fetchFn: () => Promise<any>, ttl = 3600) {
  // Try to get from cache first
  const cached = await fetch(`https://your-worker.workers.dev/api/kv/${key}?type=json`);
  
  if (cached.ok) {
    const data = await cached.json();
    return data.data.value;
  }
  
  // Fetch fresh data
  const freshData = await fetchFn();
  
  // Store in cache
  await fetch(`https://your-worker.workers.dev/api/kv/${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value: freshData, ttl })
  });
  
  return freshData;
}
```
