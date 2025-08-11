"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type NdjsonEvent =
  | { type: "chunk"; data: unknown }
  | { type: "text"; data: string }
  | { type: "final"; data: { finishReason: string | null; usage?: Record<string, unknown>; toolCalls?: Record<string, unknown>[]; toolResults?: Record<string, unknown>[]; text?: string } }
  | { type: "error"; error: string };

export type AgentRunViewerProps = {
  endpoint: string; // e.g. "/api/ai/scan/guest/stream"
  body: Record<string, unknown>;
  className?: string;
};

type ToolCallGroup = {
  id: string;
  name?: string;
  calls: Record<string, unknown>[];
  results: Record<string, unknown>[];
};

function parseToolEvent(chunk: unknown) {
  // Mastra ChunkType: { type, runId, from, payload }
  // We try to infer tool call lifecycle from payload shape
  if (typeof chunk === 'object' && chunk !== null) {
    const c = chunk as Record<string, unknown> & { type?: string; payload?: Record<string, unknown> };
    return { type: c.type, payload: c.payload as Record<string, unknown> | undefined };
  }
  return { type: undefined, payload: undefined };
}

export default function AgentRunViewer({ endpoint, body, className }: AgentRunViewerProps) {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [finishReason, setFinishReason] = useState<string | null>(null);
  const [usage, setUsage] = useState<Record<string, unknown> | null>(null);
  const [toolGroups, setToolGroups] = useState<ToolCallGroup[]>([]);

  const controllerRef = useRef<AbortController | null>(null);

  const start = async () => {
    setConnected(true);
    setError(null);
    setText("");
    setFinishReason(null);
    setUsage(null);
    setToolGroups([]);

    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        throw new Error(`Request failed: ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 1);
          if (!line) continue;
          try {
            const evt = JSON.parse(line) as NdjsonEvent;
            handleEvent(evt);
          } catch (e) {
            // ignore malformed lines
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setConnected(false);
    }
  };

  const stop = () => {
    controllerRef.current?.abort();
    setConnected(false);
  };

  const handleEvent = (evt: NdjsonEvent) => {
    if (evt.type === "text") {
      setText((t) => t + evt.data);
      return;
    }
    if (evt.type === "chunk") {
      const parsed = parseToolEvent(evt.data);
      const payload = parsed.payload as Record<string, any> | undefined;
      const toolId = payload?.tool?.id || payload?.toolName || parsed.type || "unknown";
      const displayName = payload?.tool?.id || payload?.toolName || parsed.type;
      setToolGroups((groups) => {
        const next = [...groups];
        let group = next.find((g) => g.id === toolId);
        if (!group) {
          group = { id: toolId, name: displayName, calls: [], results: [] };
          next.push(group);
        }
        // Classify as call vs result by presence of status/result fields
        const isResult = "result" in (payload || {}) || payload?.status === "success";
        if (isResult) {
          if (payload) group.results.push(payload);
        } else {
          if (payload) group.calls.push(payload);
        }
        return next;
      });
      return;
    }
    if (evt.type === "final") {
      setFinishReason(evt.data.finishReason ?? null);
      setUsage((evt.data.usage as Record<string, unknown>) ?? null);
      if (Array.isArray(evt.data.toolCalls) || Array.isArray(evt.data.toolResults)) {
        setToolGroups((groups) => {
          const copy = [...groups];
          // Merge Mastra-collected calls/results at the end
          if (Array.isArray(evt.data.toolCalls)) {
            for (const call of evt.data.toolCalls) {
              const callObj = call as Record<string, any>;
              const id = callObj?.tool?.id || callObj?.toolName || callObj?.type || "unknown";
              let g = copy.find((x) => x.id === id);
              if (!g) {
                g = { id, name: id, calls: [], results: [] };
                copy.push(g);
              }
              g.calls.push(callObj);
            }
          }
          if (Array.isArray(evt.data.toolResults)) {
            for (const result of evt.data.toolResults) {
              const resultObj = result as Record<string, any>;
              const id = resultObj?.tool?.id || resultObj?.toolName || resultObj?.type || "unknown";
              let g = copy.find((x) => x.id === id);
              if (!g) {
                g = { id, name: id, calls: [], results: [] };
                copy.push(g);
              }
              g.results.push(resultObj);
            }
          }
          return copy;
        });
      }
      if (evt.data.text) setText(evt.data.text);
      return;
    }
    if (evt.type === "error") {
      setError(evt.error);
      return;
    }
  };

  const summary = useMemo(() => {
    if (!usage) return null;
    const total = (usage as Record<string, unknown>)?.totalTokens ?? 0;
    return `${total} tokens`;
  }, [usage]);

  useEffect(() => {
    // Autostart on mount for convenience
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-2">
        <button onClick={connected ? stop : start} className="px-2 py-1 border rounded">
          {connected ? "Stop" : "Run"}
        </button>
        {summary && <span className="text-sm text-gray-500">{summary}</span>}
        {finishReason && <span className="text-sm text-gray-500">ended: {finishReason}</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        <div className="md:col-span-2">
          <h3 className="font-semibold mb-2">Assistant</h3>
          <div className="p-3 border rounded min-h-[120px] whitespace-pre-wrap">
            {text || <span className="text-gray-400">Waiting for output…</span>}
          </div>
        </div>

        <div className="md:col-span-1">
          <h3 className="font-semibold mb-2">Tools</h3>
          <div className="space-y-3">
            {toolGroups.length === 0 && (
              <div className="text-gray-400">No tool activity yet</div>
            )}
            {toolGroups.map((g) => (
              <details key={g.id} className="border rounded">
                <summary className="cursor-pointer select-none px-3 py-2 flex items-center justify-between">
                  <span>{g.name || g.id}</span>
                  <span className="text-xs text-gray-500">{g.calls.length} calls · {g.results.length} results</span>
                </summary>
                <div className="px-3 py-2 space-y-2">
                  {g.calls.length > 0 && (
                    <div>
                      <div className="font-medium mb-1 text-sm">Calls</div>
                      <ul className="space-y-1">
                        {g.calls.map((c, i) => (
                          <li key={i} className="bg-gray-50 border rounded p-2 overflow-auto text-xs">
                            <pre className="whitespace-pre-wrap">{JSON.stringify(c, null, 2)}</pre>
                          </li>)
                        )}
                      </ul>
                    </div>
                  )}
                  {g.results.length > 0 && (
                    <div>
                      <div className="font-medium mb-1 text-sm">Results</div>
                      <ul className="space-y-1">
                        {g.results.map((r, i) => (
                          <li key={i} className="bg-gray-50 border rounded p-2 overflow-auto text-xs">
                            <pre className="whitespace-pre-wrap">{JSON.stringify(r, null, 2)}</pre>
                          </li>)
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </details>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


