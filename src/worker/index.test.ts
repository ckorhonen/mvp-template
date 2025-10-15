import worker from './index';

// Mock environment and context
const mockEnv = {} as any;
const mockCtx = {
  waitUntil: jest.fn(),
  passThroughOnException: jest.fn(),
} as any;

describe('Cloudflare Worker', () => {
  it('returns health status on /api/health', async () => {
    const request = new Request('https://example.com/api/health');
    const response = await worker.fetch(request, mockEnv, mockCtx);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('status', 'healthy');
    expect(data).toHaveProperty('timestamp');
  });

  it('returns hello message on /api/hello', async () => {
    const request = new Request('https://example.com/api/hello');
    const response = await worker.fetch(request, mockEnv, mockCtx);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('message', 'Hello from Cloudflare Worker!');
  });

  it('returns 404 for unknown routes', async () => {
    const request = new Request('https://example.com/api/unknown');
    const response = await worker.fetch(request, mockEnv, mockCtx);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toHaveProperty('error', 'Not Found');
  });

  it('handles CORS preflight requests', async () => {
    const request = new Request('https://example.com/api/hello', {
      method: 'OPTIONS',
    });
    const response = await worker.fetch(request, mockEnv, mockCtx);

    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
  });

  it('includes CORS headers in responses', async () => {
    const request = new Request('https://example.com/api/health');
    const response = await worker.fetch(request, mockEnv, mockCtx);

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
});
