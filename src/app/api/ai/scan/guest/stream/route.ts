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

  // Fan-out: forward both chunk objects and plain text stream
  (async () => {
    try {
      // Forward chunk objects
      for await (const chunk of stream as any) {
        await send({ type: 'chunk', data: chunk });
      }
    } catch (err) {
      await send({ type: 'error', error: err instanceof Error ? err.message : String(err) });
    }
  })();

  (async () => {
    try {
      const textStream = (stream as any).textStream as ReadableStream<string>;
      if (textStream) {
        const reader = textStream.getReader();
        // eslint-disable-next-line no-constant-condition
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
      const finishReason = await (stream as any).finishReason;
      const usage = await (stream as any).usage;
      const toolCalls = await (stream as any).toolCalls;
      const toolResults = await (stream as any).toolResults;
      const fullText = await (stream as any).text;
      await send({
        type: 'final',
        data: { finishReason, usage, toolCalls, toolResults, text: fullText },
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


