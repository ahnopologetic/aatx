"use client"

import { useState, useEffect, useRef } from "react"
import { captureEvent } from "../../lib/posthog";


import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, Code, Search, Terminal, CheckCircle, Clock, Loader2, Play } from "lucide-react"

interface ToolCall {
    id: string
    type: "file_read" | "file_write" | "code_generation" | "search" | "terminal"
    name: string
    status: "pending" | "running" | "completed" | "error"
    details?: string
    result?: string
}

interface Message {
    id: string
    type: "user" | "agent"
    content: string
    toolCalls?: ToolCall[]
    timestamp: Date
}

const toolIcons = {
    file_read: FileText,
    file_write: FileText,
    code_generation: Code,
    search: Search,
    terminal: Terminal,
}

const statusColors = {
    pending: "bg-gray-100 text-gray-600",
    running: "bg-blue-100 text-blue-600",
    completed: "bg-green-100 text-green-600",
    error: "bg-red-100 text-red-600",
}

export default function Component() {
    const [messages, setMessages] = useState<Message[]>([])
    const [isRunning, setIsRunning] = useState(false)
    const [currentResponse, setCurrentResponse] = useState("")
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages, currentResponse])

    const simulateAgentWork = async () => {
        captureEvent("ask_aatx_coder_button: clicked", { plan_id: "demo_plan" });

        if (isRunning) return





captureEvent("ask_aatx_coder_button: clicked", { plan_id: "demo_plan" });
const userMessage: Message = {
            id: Date.now().toString(),
            type: "user",
            content: "Create a React component for a todo list with TypeScript",
            timestamp: new Date(),
        }

        setMessages((prev) => [...prev, userMessage])

        // Simulate tool calls
        const toolCalls: ToolCall[] = [
            {
                id: "1",
                type: "search",
                name: "Search for React TypeScript patterns",
                status: "pending",
                details: "Looking for best practices...",
            },
            {
                id: "2",
                type: "file_read",
                name: "Read existing components",
                status: "pending",
                details: "src/components/ui/button.tsx",
            },
            {
                id: "3",
                type: "code_generation",
                name: "Generate TodoList component",
                status: "pending",
                details: "Creating TypeScript React component...",
            },
            {
                id: "4",
                type: "file_write",
                name: "Write component file",
                status: "pending",
                details: "src/components/TodoList.tsx",
            },
        ]

        const agentMessage: Message = {
            id: (Date.now() + 1).toString(),
            type: "agent",
            content: "",
            toolCalls,
            timestamp: new Date(),
        }

        setMessages((prev) => [...prev, agentMessage])

        // Simulate tool execution
        for (let i = 0; i < toolCalls.length; i++) {
            await new Promise((resolve) => setTimeout(resolve, 800))

            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === agentMessage.id
                        ? {
                            ...msg,
                            toolCalls: msg.toolCalls?.map((tool) =>
                                tool.id === toolCalls[i].id ? { ...tool, status: "running" } : tool,
                            ),
                        }
                        : msg,
                ),
            )

            await new Promise((resolve) => setTimeout(resolve, 1500))

            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === agentMessage.id
                        ? {
                            ...msg,
                            toolCalls: msg.toolCalls?.map((tool) =>
                                tool.id === toolCalls[i].id
                                    ? {
                                        ...tool,
                                        status: "completed",
                                        result: `✓ ${tool.name} completed successfully`,
                                    }
                                    : tool,
                            ),
                        }
                        : msg,
                ),
            )
        }

        // Stream response
        const response =
            "I've created a comprehensive TodoList component with TypeScript. The component includes:\n\n• State management for todos with proper TypeScript interfaces\n• Add, toggle, and delete functionality\n• Clean, accessible UI with proper ARIA labels\n• Responsive design using Tailwind CSS\n• Input validation and error handling\n\nThe component is now ready to use in your React application!"

        for (let i = 0; i <= response.length; i++) {
            await new Promise((resolve) => setTimeout(resolve, 30))
            setCurrentResponse(response.slice(0, i))
        }

        // Update final message
        setMessages((prev) => prev.map((msg) => (msg.id === agentMessage.id ? { ...msg, content: response } : msg)))

        setCurrentResponse("")
        setIsRunning(false)
    }

    const clearMessages = () => {
        setMessages([])
        setCurrentResponse("")
    }

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-white border-b">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <Code className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h1 className="font-semibold text-gray-900">Coding Agent</h1>
                        <p className="text-sm text-gray-500">AI-powered development assistant</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={simulateAgentWork} disabled={isRunning} className="flex items-center gap-2">
                        {isRunning ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Working...
                            </>
                        ) : (
                            <>
                                <Play className="w-4 h-4" />
                                Start Demo
                            </>
                        )}
                    </Button>
                    <Button variant="outline" onClick={clearMessages}>
                        Clear
                    </Button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <AnimatePresence>
                    {messages.map((message) => (
                        <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <MessageComponent message={message} />
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* Current streaming response */}
                {currentResponse && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <Code className="w-4 h-4 text-white" />
                        </div>
                        <Card className="flex-1">
                            <CardContent className="p-4">
                                <div className="prose prose-sm max-w-none">
                                    {currentResponse}
                                    <motion.span
                                        animate={{ opacity: [1, 0] }}
                                        transition={{ duration: 0.8, repeat: Number.POSITIVE_INFINITY }}
                                        className="inline-block w-2 h-4 bg-blue-500 ml-1"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                <div ref={messagesEndRef} />
            </div>
        </div>
    )
}

function MessageComponent({ message }: { message: Message }) {
    if (message.type === "user") {
        return (
            <div className="flex gap-3 justify-end">
                <Card className="max-w-2xl">
                    <CardContent className="p-4">
                        <p className="text-gray-900">{message.content}</p>
                    </CardContent>
                </Card>
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-gray-600">U</span>
                </div>
            </div>
        )
    }

    return (
        <div className="flex gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Code className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 space-y-3">
                {/* Tool calls */}
                {message.toolCalls && (
                    <div className="space-y-2">
                        <AnimatePresence>
                            {message.toolCalls.map((tool) => (
                                <motion.div
                                    key={tool.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <ToolCallComponent tool={tool} />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}

                {/* Response content */}
                {message.content && (
                    <Card>
                        <CardContent className="p-4">
                            <div className="prose prose-sm max-w-none whitespace-pre-line">{message.content}</div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}

function ToolCallComponent({ tool }: { tool: ToolCall }) {
    const Icon = toolIcons[tool.type]

    return (
        <motion.div layout className="flex items-center gap-3 p-3 bg-white rounded-lg border">
            <div className="flex items-center gap-2 flex-1">
                <Icon className="w-4 h-4 text-gray-600" />
                <span className="font-medium text-sm">{tool.name}</span>
                {tool.details && <span className="text-xs text-gray-500">• {tool.details}</span>}
            </div>

            <div className="flex items-center gap-2">
                {tool.status === "running" && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                {tool.status === "completed" && <CheckCircle className="w-4 h-4 text-green-500" />}
                {tool.status === "pending" && <Clock className="w-4 h-4 text-gray-400" />}

                <Badge variant="secondary" className={statusColors[tool.status]}>
                    {tool.status}
                </Badge>
            </div>
        </motion.div>
    )
}

import { captureEvent } from "../../lib/posthog";
