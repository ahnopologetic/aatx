"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { BarChart3, CheckCircle2, FileSearch, FileText, FolderOpen, GitBranch, Loader2, Search, Sparkles, XCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type NdjsonEvent =
    | { type: "chunk"; data: unknown }
    | { type: "text"; data: string }
    | { type: "final"; data: { finishReason: string | null; usage?: Record<string, unknown>; toolCalls?: Record<string, unknown>[]; toolResults?: Record<string, unknown>[]; text?: string } }
    | { type: "error"; error: string };

export type AgentScanStepsProps = {
    endpoint?: string;
    body: Record<string, unknown>;
    className?: string;
    autoStart?: boolean;
    onComplete?: (result: {
        finishReason: string | null;
        usage?: Record<string, unknown>;
        text?: string;
        parsedObject?: unknown;
    }) => void;
};

type StepStatus = "pending" | "running" | "success" | "error";

type StepItem = {
    id: string;
    icon: React.ElementType;
    title: string;
    description?: string;
    status: StepStatus;
    details?: string | Record<string, unknown> | null;
    timestamp: number;
};

function getToolIcon(toolName: string): React.ElementType {
    if (toolName.includes("git") || toolName.includes("clone")) return GitBranch;
    if (toolName.includes("grep") || toolName.includes("search-analytics")) return BarChart3;
    if (toolName.includes("search-files")) return FileSearch;
    if (toolName.includes("list") || toolName.includes("directory")) return FolderOpen;
    if (toolName.includes("read") || toolName.includes("file")) return FileText;
    if (toolName.includes("analytics") || toolName.includes("tracking")) return BarChart3;
    return Search;
}

function getStepDescription(toolName: string, payload: Record<string, unknown>): { title: string; description?: string } {
    const args = (payload?.args as Record<string, unknown>) || {};
    const result = (payload?.result as Record<string, unknown>) || {};
    const status = payload?.status as string | undefined;

    // Git clone tool
    if (toolName === "git-clone-tool" || toolName.includes("git-clone")) {
        if (status === "pending") {
            return {
                title: "Cloning GitHub repo…",
                description: args.repoUrl ? String(args.repoUrl) : "Preparing to clone…"
            };
        }
        if (status === "success") {
            return {
                title: "Cloned GitHub repo",
                description: args.repoUrl ? String(args.repoUrl) : (result.clonePath ? `Saved to ${String(result.clonePath)}` : undefined)
            };
        }
        if (status === "error") {
            return { title: "Failed to clone repository", description: String((payload as Record<string, unknown>)?.error ?? "") };
        }
    }

    // Search/grep tool
    if (toolName === "grep-tool" || toolName.includes("grep")) {
        if (status === "pending") {
            return {
                title: "Searching codebase",
                description: args.pattern ? `Looking for "${args.pattern}"` : "Scanning files..."
            };
        }
        if (status === "success") {
            const matches = (result.totalMatches as number | undefined) ?? 0;
            return {
                title: `Found ${matches} match${matches !== 1 ? 'es' : ''}`,
                description: args.pattern ? `Pattern: "${args.pattern}"` : undefined
            };
        }
    }

    // List directory
    if (toolName === "list-directory-tool" || toolName.includes("list-directory")) {
        if (status === "pending") {
            return {
                title: "Exploring project structure",
                description: String(args.directoryPath || "Analyzing directory layout...")
            };
        }
        if (status === "success") {
            const items = (result.totalItems as number | undefined) ?? 0;
            return {
                title: `Found ${items} item${items !== 1 ? 's' : ''}`,
                description: String(args.directoryPath || "Directory explored")
            };
        }
    }

    // Search files
    if (toolName === "search-files-tool" || toolName.includes("search-files")) {
        if (status === "pending") {
            return {
                title: "Searching for files",
                description: args.searchPattern ? `Pattern: "${String(args.searchPattern)}"` : "Scanning project..."
            };
        }
        if (status === "success") {
            const files = (result.totalMatches as number | undefined) ?? 0;
            return {
                title: `Found ${files} file${files !== 1 ? 's' : ''}`,
                description: String(args.searchPattern || "Search complete")
            };
        }
    }

    // Read file
    if (toolName === "read-file-tool" || toolName.includes("read-file")) {
        if (status === "pending") {
            const filePath = String(args.filePath ?? '');
            const fileName = filePath.split('/').pop() || filePath;
            return {
                title: "Reading file",
                description: fileName || "Loading content..."
            };
        }
        if (status === "success") {
            const filePath2 = String(args.filePath ?? '');
            const fileName = filePath2.split('/').pop() || filePath2;
            return {
                title: "File loaded",
                description: `${(result.linesRead as number | undefined) ?? 0} lines from ${fileName}`
            };
        }
    }

    // Analytics scanning
    if (toolName === "search-analytics-code-tool" || toolName.includes("analytics") || toolName.includes("tracking")) {
        if (status === "pending") {
            return {
                title: "Analyzing tracking implementation",
                description: "Detecting analytics providers and events..."
            };
        }
        if (status === "success") {
            return {
                title: "Analytics scan complete",
                description: "Found tracking implementations"
            };
        }
    }

    // Default
    if (status === "pending") return { title: "Processing...", description: toolName };
    if (status === "success") return { title: "Step complete", description: toolName };
    if (status === "error") return { title: "Step failed", description: String((payload as Record<string, unknown>)?.error ?? toolName) };
    return { title: toolName, description: undefined };
}

function extractJsonFromMarkdown(markdown: string): string | null {
    const jsonFence = /```json\n([\s\S]*?)\n```/i.exec(markdown);
    if (jsonFence && jsonFence[1]) return jsonFence[1].trim();
    const anyFence = /```[a-zA-Z0-9_-]*\n([\s\S]*?)\n```/g;
    let m: RegExpExecArray | null;
    while ((m = anyFence.exec(markdown))) {
        const content = (m[1] || "").trim();
        if (content.startsWith("{") || content.startsWith("[")) return content;
    }
    return null;
}

// Step item component

function StepItemView({ step, isLast }: { step: StepItem; isLast: boolean }) {
    const Icon = step.icon;
    const [open, setOpen] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="flex gap-3"
        >
            <div className="flex flex-col items-center">
                <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    step.status === "success" ? "bg-green-100 text-green-600" :
                        step.status === "error" ? "bg-red-100 text-red-600" :
                            step.status === "running" ? "bg-blue-100 text-blue-600" :
                                "bg-gray-100 text-gray-400"
                )}>
                    {step.status === "running" ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : step.status === "success" ? (
                        <CheckCircle2 className="w-5 h-5" />
                    ) : step.status === "error" ? (
                        <XCircle className="w-5 h-5" />
                    ) : (
                        <Icon className="w-5 h-5" />
                    )}
                </div>
                {!isLast && (
                    <div className={cn(
                        "w-0.5 flex-1 mt-2",
                        step.status === "success" ? "bg-green-200" :
                            step.status === "error" ? "bg-red-200" :
                                step.status === "running" ? "bg-blue-200" :
                                    "bg-gray-200"
                    )} />
                )}
            </div>

            <div className="flex-1 pb-8">
                <Collapsible open={open} onOpenChange={setOpen}>
                    <CollapsibleTrigger asChild>
                        <button
                            type="button"
                            className={cn(
                                "flex items-center w-full text-left font-medium text-sm focus:outline-none",
                                open ? "text-primary" : ""
                            )}
                        >
                            <span className="flex-1">{step.title}</span>
                            {step.details && (
                                <ChevronDown
                                    className={cn(
                                        "ml-2 h-4 w-4 transition-transform",
                                        open ? "rotate-180" : "rotate-0"
                                    )}
                                />
                            )}
                        </button>
                    </CollapsibleTrigger>
                    {step.description && (
                        <div className="text-xs text-muted-foreground mt-0.5">{step.description}</div>
                    )}
                    {step.details && (
                        <CollapsibleContent>
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                className="mt-2 p-2 bg-muted/30 rounded text-xs overflow-auto max-h-32"
                            >
                                <pre className="whitespace-pre-wrap">
                                    {typeof step.details === 'string'
                                        ? step.details
                                        : JSON.stringify(step.details, null, 2)}
                                </pre>
                            </motion.div>
                        </CollapsibleContent>
                    )}
                </Collapsible>
            </div>
        </motion.div>
    );
}

// Steps viewer component
export function AgentStepsViewer({ steps, isRunning }: { steps: StepItem[]; isRunning: boolean }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                    Progress
                    {isRunning && <Loader2 className="w-4 h-4 animate-spin" />}
                </CardTitle>
                <CardDescription>Real-time analysis steps</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                    {steps.length === 0 ? (
                        <div className="text-muted-foreground text-sm">Waiting to start...</div>
                    ) : (
                        <div className="space-y-0">
                            <AnimatePresence mode="popLayout">
                                {steps.map((step, idx) => (
                                    <StepItemView
                                        key={step.id}
                                        step={step}
                                        isLast={idx === steps.length - 1}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    );
}

// Output viewer component
export function AgentOutputViewer({
    text,
    parsedObject,
    error,
    finishReason
}: {
    text: string;
    parsedObject: unknown | null;
    error: string | null;
    finishReason: string | null;
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Result
                </CardTitle>
                <CardDescription>Detected tracking plan</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[400px]">
                    {!finishReason ? (
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Analyzing repository...
                        </div>
                    ) : parsedObject ? (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-3"
                        >
                            <div className="text-sm text-muted-foreground">Successfully analyzed repository</div>
                            <div className="bg-slate-900 text-slate-50 rounded-lg p-4 overflow-auto">
                                <pre className="text-xs">
                                    <code>{JSON.stringify(parsedObject, null, 2)}</code>
                                </pre>
                            </div>
                        </motion.div>
                    ) : error ? (
                        <div className="text-red-600 text-sm">{error}</div>
                    ) : (
                        <div className="text-muted-foreground text-sm">
                            {text || "No structured output found"}
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    );
}



// Main component
export default function AgentScanSteps({
    endpoint = "/api/ai/scan/guest/stream",
    body,
    className,
    autoStart = true,
    onComplete
}: AgentScanStepsProps) {
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [steps, setSteps] = useState<StepItem[]>([]);
    const [assistantText, setAssistantText] = useState("");
    const [finishReason, setFinishReason] = useState<string | null>(null);
    const [usage, setUsage] = useState<Record<string, unknown> | null>(null);
    const [parsedObject, setParsedObject] = useState<unknown | null>(null);

    const controllerRef = useRef<AbortController | null>(null);
    const stepKeyMap = useRef<Map<string, string>>(new Map());

    const start = async () => {
        setConnected(true);
        setError(null);
        setSteps([]);
        setAssistantText("");
        setFinishReason(null);
        setUsage(null);
        setParsedObject(null);
        stepKeyMap.current.clear();

        const controller = new AbortController();
        controllerRef.current = controller;

        try {
            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
                signal: controller.signal,
            });
            if (!res.ok || !res.body) throw new Error(`Request failed: ${res.status}`);

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

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
                    } catch {
                        // ignore malformed
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
            setAssistantText((t) => t + evt.data);
            return;
        }

        if (evt.type === "chunk") {
            const chunk: Record<string, unknown> = (evt as { type: "chunk"; data: unknown }).data as Record<string, unknown> || {};
            // Support both writer payloads (in chunk.payload) and direct payloads
            const payload = (chunk as { payload?: { result?: unknown; error?: unknown } }).payload ?? chunk;

            const output = (payload as Record<string, unknown>)?.output as Record<string, unknown> | undefined;
            if (!output) return;

            const args = (output?.args as Record<string, unknown>) || {};
            const toolName: string = (args as Record<string, unknown>).toolName as string || (payload as Record<string, unknown>)?.toolName as string || "unknown";
            const status = output?.status as StepStatus | undefined;

            if (status === "pending" || status === "success" || status === "error") {
                const stepKey = toolName + "-" + (args.repoUrl || args.filePath || args.pattern || args.directoryPath || args.searchPattern || "");
                let stepId = stepKeyMap.current.get(stepKey);

                if (!stepId) {
                    stepId = `step-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                    stepKeyMap.current.set(stepKey, stepId);
                }

                const { title, description } = getStepDescription(toolName, output as Record<string, unknown>);
                const icon = getToolIcon(toolName);

                setSteps((prev) => {
                    const existing = prev.find(s => s.id === stepId);
                    const newStep: StepItem = {
                        id: stepId!,
                        icon,
                        title,
                        description,
                        status: status === "pending" ? "running" : status === "error" ? "error" : "success",
                        details: status === "success" ? (payload.result as string | Record<string, unknown> | null) : status === "error" ? (payload.error as string | Record<string, unknown> | null) : null,
                        timestamp: Date.now(),
                    };

                    if (existing) {
                        return prev.map(s => s.id === stepId ? newStep : s);
                    } else {
                        return [...prev, newStep];
                    }
                });
            } else {
                // Fallback: create/update a running step even without explicit status
                const stepKey = toolName + "-generic";
                let stepId = stepKeyMap.current.get(stepKey);
                if (!stepId) {
                    stepId = `step-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                    stepKeyMap.current.set(stepKey, stepId);
                }
                const { title, description } = getStepDescription(toolName, output as Record<string, unknown>);
                const icon = getToolIcon(toolName);
                setSteps((prev) => {
                    const existing = prev.find(s => s.id === stepId);
                    const newStep: StepItem = {
                        id: stepId!,
                        icon,
                        title,
                        description,
                        status: existing?.status ?? "running",
                        details: existing?.details ?? undefined,
                        timestamp: Date.now(),
                    };
                    if (existing) {
                        return prev.map(s => s.id === stepId ? newStep : s);
                    }
                    return [...prev, newStep];
                });
            }
            return;
        }

        if (evt.type === "final") {
            setFinishReason(evt.data.finishReason ?? null);
            setUsage(evt.data.usage ?? null);
            if (evt.data.text) setAssistantText(evt.data.text);

            const json = extractJsonFromMarkdown(evt.data.text || "");
            if (json) {
                try {
                    const obj = JSON.parse(json);
                    setParsedObject(obj);
                    onComplete?.({
                        finishReason: evt.data.finishReason ?? null,
                        usage: evt.data.usage,
                        text: evt.data.text,
                        parsedObject: obj
                    });
                } catch (e) {
                    setParsedObject(null);
                    setError(e instanceof Error ? e.message : "Invalid JSON");
                    onComplete?.({
                        finishReason: evt.data.finishReason ?? null,
                        usage: evt.data.usage,
                        text: evt.data.text,
                        parsedObject: undefined
                    });
                }
            } else {
                onComplete?.({
                    finishReason: evt.data.finishReason ?? null,
                    usage: evt.data.usage,
                    text: evt.data.text,
                    parsedObject: undefined
                });
            }
            return;
        }

        if (evt.type === "error") {
            setError(evt.error);
            return;
        }
    };

    const summary = useMemo(() => {
        if (!usage) return null;
        const total = (usage as Record<string, any>)?.totalTokens ?? 0;
        return `${total} tokens`;
    }, [usage]);

    useEffect(() => {
        if (autoStart) start();
    }, [autoStart]);

    return (
        <div className={className}>
            {/* Control bar */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">Repository Analysis</h3>
                    {summary && <Badge variant="secondary">{summary}</Badge>}
                    {finishReason && <Badge variant="outline">{finishReason}</Badge>}
                </div>
                <Button
                    variant={connected ? "destructive" : "default"}
                    size="sm"
                    onClick={connected ? stop : start}
                >
                    {connected ? (
                        <>
                            <XCircle className="w-4 h-4 mr-2" />
                            Stop
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Start Analysis
                        </>
                    )}
                </Button>
            </div>

            {/* Main content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AgentStepsViewer steps={steps} isRunning={connected} />
                <AgentOutputViewer
                    text={assistantText}
                    parsedObject={parsedObject}
                    error={error}
                    finishReason={finishReason}
                />
            </div>
        </div>
    );
}