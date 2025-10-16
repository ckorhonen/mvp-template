/**
 * R2 Storage Routes
 * Example endpoints showcasing R2 bucket operations
 */

import { jsonResponse, errorResponse, storeInR2, retrieveFromR2, deleteFromR2 } from '../lib/utils';
import type { Env } from '../types';

export async function handleR2Routes(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  try {
    // GET /api/r2/assets/:key - Get asset from R2
    if (path.match(/^\/api\/r2\/assets\/.+$/) && request.method === 'GET') {
      const key = path.replace('/api/r2/assets/', '');
      const object = await retrieveFromR2(env.ASSETS, key);

      if (!object) {
        return errorResponse('Object not found', 404);
      }

      return new Response(object.body, {
        headers: {
          'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
          'ETag': object.httpEtag,
          'Cache-Control': 'public, max-age=31536000',
        },
      });
    }

    // POST /api/r2/assets - Upload asset to R2
    if (path === '/api/r2/assets' && request.method === 'POST') {
      const formData = await request.formData();
      const file = formData.get('file') as File;

      if (!file) {
        return errorResponse('File is required', 400);
      }

      const key = `${Date.now()}-${file.name}`;
      const buffer = await file.arrayBuffer();

      await storeInR2(env.ASSETS, key, buffer, {
        contentType: file.type,
      });

      return jsonResponse({
        success: true,
        key,
        url: `/api/r2/assets/${key}`,
        size: file.size,
        type: file.type,
      }, 201);
    }

    // DELETE /api/r2/assets/:key - Delete asset from R2
    if (path.match(/^\/api\/r2\/assets\/.+$/) && request.method === 'DELETE') {
      const key = path.replace('/api/r2/assets/', '');
      await deleteFromR2(env.ASSETS, key);

      return jsonResponse({ success: true });
    }

    // GET /api/r2/list - List objects in R2 bucket
    if (path === '/api/r2/list' && request.method === 'GET') {
      const prefix = url.searchParams.get('prefix') || '';
      const limit = parseInt(url.searchParams.get('limit') || '10');

      const list = await env.ASSETS.list({ prefix, limit });

      return jsonResponse({
        objects: list.objects.map((obj) => ({
          key: obj.key,
          size: obj.size,
          uploaded: obj.uploaded,
        })),
        truncated: list.truncated,
      });
    }

    // POST /api/r2/uploads - Upload file to uploads bucket
    if (path === '/api/r2/uploads' && request.method === 'POST') {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      const userId = formData.get('userId') as string;

      if (!file || !userId) {
        return errorResponse('File and userId are required', 400);
      }

      const key = `uploads/${userId}/${Date.now()}-${file.name}`;
      const buffer = await file.arrayBuffer();

      await storeInR2(env.UPLOADS, key, buffer, {
        contentType: file.type,
      });

      return jsonResponse(
        {
          success: true,
          key,
          url: `/api/r2/uploads/${key}`,
          size: file.size,
        },
        201
      );
    }

    return errorResponse('Not found', 404);
  } catch (error) {
    console.error('R2 route error:', error);
    return errorResponse(
      'Internal server error',
      500,
      error instanceof Error ? error.message : undefined
    );
  }
}
