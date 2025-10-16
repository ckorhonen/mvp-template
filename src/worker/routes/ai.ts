import { RouteHandler, WorkerError } from '../types';
import { ResponseBuilder } from '../utils/response';
import { RequestValidator } from '../utils/validation';
import { AIGateway } from '../utils/ai-gateway';

/**
 * AI Gateway route handlers
 */

/**
 * POST /api/ai/chat - Chat completion endpoint
 */
export const chatHandler: RouteHandler = async (request, env) => {
  const body = await RequestValidator.parseJSON<{
    message: string;
    systemPrompt?: string;
    temperature?: number;
  }>(request);

  RequestValidator.validateRequired(body, ['message']);

  const aiGateway = new AIGateway(env);
  
  const messages = [];
  if (body.systemPrompt) {
    messages.push({
      role: 'system' as const,
      content: body.systemPrompt,
    });
  }
  messages.push({
    role: 'user' as const,
    content: body.message,
  });

  const response = await aiGateway.chatCompletion({
    model: 'gpt-4',
    messages,
    temperature: body.temperature ?? 0.7,
  });

  return ResponseBuilder.success({
    message: response.choices[0].message.content,
    usage: response.usage,
  });
};

/**
 * POST /api/ai/embeddings - Generate embeddings
 */
export const embeddingsHandler: RouteHandler = async (request, env) => {
  const body = await RequestValidator.parseJSON<{
    text: string | string[];
  }>(request);

  RequestValidator.validateRequired(body, ['text']);

  const aiGateway = new AIGateway(env);
  const embeddings = await aiGateway.createEmbedding(body.text);

  return ResponseBuilder.success({ embeddings });
};

/**
 * POST /api/ai/chat/stream - Streaming chat endpoint
 */
export const chatStreamHandler: RouteHandler = async (request, env) => {
  const body = await RequestValidator.parseJSON<{
    message: string;
  }>(request);

  RequestValidator.validateRequired(body, ['message']);

  const aiGateway = new AIGateway(env);
  const stream = await aiGateway.chatCompletionStream({
    model: 'gpt-4',
    messages: [{ role: 'user', content: body.message }],
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
};
