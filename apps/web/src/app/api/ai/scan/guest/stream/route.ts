export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { promises as fs } from 'fs';

import { extractJsonFromMarkdown } from '@/utils/string';
import { NextRequest } from 'next/server';
import { mastra } from '~mastra/index';

// Stream Mastra agent progress as NDJSON
export async function POST(req: NextRequest) {
  const { repositoryUrl, analyticsProviders } = await req.json();

  const agent = mastra.getAgent('aatxAgent');

  const encoder = new TextEncoder();

  const stream = agent.streamVNext([
    {
      role: 'user',
      content: `Repository URL: ${repositoryUrl}\nAnalytics Providers: ${Array.isArray(analyticsProviders) ? analyticsProviders.join(', ') : ''}`,
    },
  ], {
    maxSteps: 30,
    maxRetries: 3,
    temperature: 0,
    toolChoice: 'auto',
  });

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  // Helper to send one NDJSON line
  const send = async (obj: unknown) => {
    await writer.write(encoder.encode(JSON.stringify(obj) + '\n'));
  };

  type Usage = { totalTokens?: number } & Record<string, unknown>;
  type AgentChunk = unknown;
  interface StreamLike {
    [Symbol.asyncIterator](): AsyncIterator<AgentChunk>;
    textStream?: ReadableStream<string>;
    finishReason?: Promise<string | null> | string | null;
    usage?: Promise<Usage> | Usage;
    toolCalls?: Promise<unknown[]> | unknown[];
    toolResults?: Promise<unknown[]> | unknown[];
    text?: Promise<string> | string;
  }

  const s = stream as unknown as StreamLike;
  const iterable = stream as unknown as AsyncIterable<AgentChunk>;

  const awaitMaybe = async <T>(v: T | Promise<T> | undefined | null): Promise<T | undefined | null> => {
    if (v === undefined || v === null) return v;
    return await Promise.resolve(v);
  };

  // Fan-out: forward both chunk objects and plain text stream
  (async () => {
    try {
      // Forward chunk objects
      for await (const chunk of iterable) {
        await send({ type: 'chunk', data: chunk as unknown });
      }
    } catch (err) {
      await send({ type: 'error', error: err instanceof Error ? err.message : String(err) });
    }
  })();

  (async () => {
    try {
      const textStream = s.textStream as ReadableStream<string> | undefined;
      if (textStream) {
        const reader = textStream.getReader();
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value) await send({ type: 'text', data: value });
        }
      }
    } catch {
      // ignore text stream errors; chunk stream is primary
    }
  })();

  (async () => {
    try {
      const fullText = await awaitMaybe<string>(s.text as string | Promise<string> | undefined);
      const resultText = extractJsonFromMarkdown(fullText || "");
      const resultJson = resultText ? JSON.parse(resultText) : null;
      let resultSchemaJson = null;
      if (!!resultJson && resultJson?.success) {
        const resultSchemaFile = resultJson.resultSchemaFile;
        const resultSchema = await fs.readFile(resultSchemaFile, 'utf8');
        resultSchemaJson = JSON.parse(resultSchema);
      } else {
        resultSchemaJson = null;
      }
      const finishReason = await awaitMaybe<string | null>(s.finishReason ?? null);
      const usage = await awaitMaybe<Usage>(s.usage as Usage | Promise<Usage> | undefined);
      const toolCalls = await awaitMaybe<unknown[]>(s.toolCalls as unknown[] | Promise<unknown[]> | undefined);
      const toolResults = await awaitMaybe<unknown[]>(s.toolResults as unknown[] | Promise<unknown[]> | undefined);
      await send({
        type: 'final',
        data: { finishReason, usage, toolCalls, toolResults, text: fullText, resultSchema: resultSchemaJson },
      });
    } catch (err) {
      await send({ type: 'error', error: err instanceof Error ? err.message : String(err) });
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache, no-transform',
    },
  });
}


