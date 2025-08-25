'use client'

import { useState, useCallback, useRef } from 'react'
import { z } from 'zod'

export type CoderState = 'idle' | 'running' | 'background' | 'review' | 'creating-pr' | 'success' | 'stopped' | 'error'

export type CoderResult = {
    pullRequestUrl: string
    branchName: string
    eventsImplemented: number
} | null

export type ToolCall = {
    name: string
    timestamp: number
    arguments?: Record<string, any>
    result?: any
}

export interface CoderObjectData {
    state: CoderState
    result: CoderResult | null
    tools: ToolCall[]
    currentTool?: ToolCall
}

export type CoderObject = CoderObjectData | null

// Helper function to ensure object has required properties
function ensureValidObject(obj: Partial<CoderObjectData>): CoderObjectData {
    return {
        state: obj.state || 'running',
        result: obj.result || null,
        tools: obj.tools || [],
        currentTool: obj.currentTool
    }
}

interface UseCoderStreamParams {
    api: string
    schema: z.ZodSchema
}

interface UseCoderStreamReturn {
    object: CoderObject
    submit: (data: any) => Promise<void>
    isLoading: boolean
    error: string | null
    stop: () => void
    streamText: string
}

// Helper function to extract state from chunk data
function extractStateFromChunk(chunkData: any, existingObject: CoderObject): CoderObject {
    // Try to find state-like information in the chunk
    if (chunkData.state) {
        return ensureValidObject({
            state: chunkData.state,
            result: chunkData.result || null,
            tools: existingObject?.tools || [],
            currentTool: existingObject?.currentTool
        })
    }

    // Default to running state if we can't determine
    return ensureValidObject({
        state: 'running',
        result: null,
        tools: existingObject?.tools || [],
        currentTool: existingObject?.currentTool
    })
}

// Helper function to extract state from text content
function extractStateFromText(text: string, currentObject: CoderObject): CoderObject | null {
    const lowerText = text.toLowerCase()
    const tools = currentObject?.tools || []
    const currentTool = currentObject?.currentTool

    // Look for tool usage patterns
    const toolCallMatch = text.match(/using tool[:\s]+["']?([a-zA-Z0-9_-]+)["']?/i) ||
        text.match(/calling[:\s]+["']?([a-zA-Z0-9_-]+)["']?/i) ||
        text.match(/executing[:\s]+["']?([a-zA-Z0-9_-]+)["']?/i) ||
        text.match(/I'll use[:\s]+["']?([a-zA-Z0-9_-]+)["']?/i) ||
        text.match(/using[:\s]+["']?([a-zA-Z0-9_-]+)["']? to/i) ||
        text.match(/running[:\s]+["']?([a-zA-Z0-9_-]+)["']?/i) ||
        text.match(/executing command[:\s]+["']?([a-zA-Z0-9_-]+)["']?/i) ||
        text.match(/\*\*([a-zA-Z0-9_-]+)\*\*/i) // Markdown bold tool names

    if (toolCallMatch) {
        const toolName = toolCallMatch[1]
        const newTool: ToolCall = {
            name: toolName,
            timestamp: Date.now()
        }

        // Extract arguments if available
        const argsMatch = text.match(/with arguments?[:\s]+(.*)/i)
        if (argsMatch) {
            try {
                // Try to parse arguments if they look like JSON
                if (argsMatch[1].trim().startsWith('{')) {
                    newTool.arguments = JSON.parse(argsMatch[1])
                } else {
                    newTool.arguments = { raw: argsMatch[1].trim() }
                }
            } catch (e) {
                newTool.arguments = { text: argsMatch[1].trim() }
            }
        }

        return ensureValidObject({
            state: currentObject?.state || 'running',
            result: currentObject?.result || null,
            tools: [...tools, newTool],
            currentTool: newTool
        })
    }

    // Look for tool result patterns
    const toolResultMatch = text.match(/result of[:\s]+["']?([a-zA-Z0-9_-]+)["']?[:\s]+(.*)/i) ||
        text.match(/([a-zA-Z0-9_-]+) returned[:\s]+(.*)/i) ||
        text.match(/output from[:\s]+["']?([a-zA-Z0-9_-]+)["']?[:\s]+(.*)/i) ||
        text.match(/result from[:\s]+["']?([a-zA-Z0-9_-]+)["']?[:\s]+(.*)/i) ||
        text.match(/([a-zA-Z0-9_-]+) result[:\s]+(.*)/i) ||
        text.match(/([a-zA-Z0-9_-]+) completed[:\s]+(.*)/i)

    if (toolResultMatch && currentTool) {
        const toolName = toolResultMatch[1]
        const resultText = toolResultMatch[2]

        // Only update if this matches the current tool
        if (currentTool.name === toolName) {
            const updatedTools = tools.map(tool =>
                tool === currentTool
                    ? { ...tool, result: resultText.trim() }
                    : tool
            )

            return ensureValidObject({
                state: currentObject?.state || 'running',
                result: currentObject?.result || null,
                tools: updatedTools,
                currentTool: { ...currentTool, result: resultText.trim() }
            })
        }
    }

    // Look for state keywords in the text
    if (lowerText.includes('creating pull request') || lowerText.includes('creating pr')) {
                return ensureValidObject({ 
            state: 'creating-pr', 
            result: currentObject?.result || null,
            tools: currentObject?.tools || [],
            currentTool: currentObject?.currentTool
        })
    }

    if (lowerText.includes('reviewing') || lowerText.includes('review')) {
                return ensureValidObject({ 
            state: 'review', 
            result: currentObject?.result || null,
            tools: currentObject?.tools || [],
            currentTool: currentObject?.currentTool
        })
    }

    if (lowerText.includes('success') || lowerText.includes('completed')) {
                return ensureValidObject({ 
            state: 'success', 
            result: currentObject?.result || null,
            tools: currentObject?.tools || [],
            currentTool: currentObject?.currentTool
        })
    }

    if (lowerText.includes('background') || lowerText.includes('processing')) {
                return ensureValidObject({ 
            state: 'background', 
            result: currentObject?.result || null,
            tools: currentObject?.tools || [],
            currentTool: currentObject?.currentTool
        })
    }

    // Look for PR URL patterns
    const prUrlMatch = text.match(/https:\/\/github\.com\/[^\/]+\/[^\/]+\/pull\/\d+/)
    if (prUrlMatch) {
        return ensureValidObject({
            state: 'success',
            result: {
                pullRequestUrl: prUrlMatch[0],
                branchName: currentObject?.result?.branchName || 'unknown',
                eventsImplemented: currentObject?.result?.eventsImplemented || 0
            },
            tools: currentObject?.tools || [],
            currentTool: currentObject?.currentTool
        })
    }

    // Look for branch names
    const branchMatch = text.match(/branch[:\s]+([^\s,]+)/)
    if (branchMatch && currentObject) {
        return ensureValidObject({
            state: currentObject.state,
            result: {
                pullRequestUrl: currentObject.result?.pullRequestUrl || '',
                branchName: branchMatch[1],
                eventsImplemented: currentObject.result?.eventsImplemented || 0
            },
            tools: currentObject.tools || [],
            currentTool: currentObject.currentTool
        })
    }

    // Look for events implemented count
    const eventsMatch = text.match(/implemented\s+(\d+)\s+events?/i)
    if (eventsMatch && currentObject && currentObject.result) {
        const count = parseInt(eventsMatch[1], 10)
        if (!isNaN(count)) {
            return ensureValidObject({
                state: currentObject.state,
                result: {
                    pullRequestUrl: currentObject.result.pullRequestUrl || '',
                    branchName: currentObject.result.branchName || '',
                    eventsImplemented: count
                },
                tools: currentObject.tools || [],
                currentTool: currentObject.currentTool
            })
        }
    }

    return null
}

export function useCoderStream({ api, schema }: UseCoderStreamParams): UseCoderStreamReturn {
    const [object, setObject] = useState<CoderObject>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [streamText, setStreamText] = useState<string>('')
    const abortControllerRef = useRef<AbortController | null>(null)

    const stop = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
            abortControllerRef.current = null
            setIsLoading(false)
                        setObject(prev => {
                if (prev) {
                    return ensureValidObject({ 
                        ...prev, 
                        state: 'stopped',
                        currentTool: prev.currentTool ? {
                            ...prev.currentTool,
                            result: 'Operation stopped by user'
                        } : undefined
                    })
                } else {
                    return ensureValidObject({ 
                        state: 'stopped', 
                        result: null,
                        tools: [],
                        currentTool: undefined
                    })
                }
            })
            setStreamText(prev => prev + "\n\n[Operation stopped by user]")
        }
    }, [])

    const submit = useCallback(async (data: any) => {
        // Reset state
        setError(null)
        setIsLoading(true)
        setStreamText('')
        setObject(ensureValidObject({
            state: 'running',
            result: null,
            tools: [],
            currentTool: undefined
        }))

        // Create abort controller for cancellation
        const abortController = new AbortController()
        abortControllerRef.current = abortController

        try {
            const response = await fetch(api, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
                signal: abortController.signal,
            })

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            if (!response.body) {
                throw new Error('No response body')
            }

            const reader = response.body.getReader()
            const decoder = new TextDecoder()

            try {
                while (true) {
                    const { done, value } = await reader.read()

                    if (done) break

                    // Decode the chunk
                    const chunk = decoder.decode(value, { stream: true })

                    // Split by newlines to handle multiple NDJSON objects in one chunk
                    const lines = chunk.split('\n').filter(line => line.trim())

                    for (const line of lines) {
                        try {
                            const parsed = JSON.parse(line)

                            // Handle different message types from the stream
                            if (parsed.type === 'chunk' && parsed.data) {
                                // Try to parse the structured output or extract state from agent response
                                const chunkData = parsed.data

                                // Check for tool calls in the chunk data
                                if (chunkData && typeof chunkData === 'object') {
                                    // Look for tool calls in the chunk data
                                    if (chunkData.toolCalls && Array.isArray(chunkData.toolCalls)) {
                                        setObject(prev => {
                                            const tools = [...(prev?.tools || [])]
                                            let currentTool = prev?.currentTool

                                            // Process each tool call
                                            chunkData.toolCalls.forEach((toolCall: any) => {
                                                if (toolCall && toolCall.name) {
                                                    const newTool: ToolCall = {
                                                        name: toolCall.name,
                                                        timestamp: Date.now(),
                                                        arguments: toolCall.args || toolCall.arguments
                                                    }
                                                    tools.push(newTool)
                                                    currentTool = newTool
                                                }
                                            })

                                                                                            return ensureValidObject({
                                                state: prev?.state || 'running',
                                                result: prev?.result || null,
                                                tools,
                                                currentTool
                                            })
                                        })
                                    }

                                    // Look for tool results in the chunk data
                                    if (chunkData.toolResults && Array.isArray(chunkData.toolResults)) {
                                        setObject(prev => {
                                            const tools = [...(prev?.tools || [])]
                                            let currentTool = prev?.currentTool

                                            // Process each tool result
                                            chunkData.toolResults.forEach((toolResult: any) => {
                                                if (toolResult && toolResult.name && currentTool && toolResult.name === currentTool.name) {
                                                    // Update the current tool with the result
                                                    currentTool = {
                                                        ...currentTool,
                                                        result: toolResult.result || toolResult.output
                                                    }

                                                    // Update the tool in the tools array
                                                    const toolIndex = tools.findIndex(t => t === prev?.currentTool)
                                                    if (toolIndex !== -1) {
                                                        tools[toolIndex] = currentTool
                                                    }
                                                }
                                            })

                                                                                            return ensureValidObject({
                                                state: prev?.state || 'running',
                                                result: prev?.result || null,
                                                tools,
                                                currentTool
                                            })
                                        })
                                    }

                                    // If this looks like our coder schema data, validate and update
                                    try {
                                        const validatedData = schema.parse(chunkData)
                                        setObject(prev => {
                                            return ensureValidObject({
                                                ...validatedData,
                                                tools: prev?.tools || [],
                                                currentTool: prev?.currentTool
                                            })
                                        })
                                    } catch (validationError) {
                                        // If validation fails, try to extract state from content
                                        setObject(prev => extractStateFromChunk(chunkData, prev))
                                    }
                                }
                            } else if (parsed.type === 'text' && parsed.data) {
                                // Handle text streaming - accumulate text and try to extract state information
                                const textData = parsed.data
                                if (typeof textData === 'string') {
                                    setStreamText(prev => prev + textData)
                                    const currentObject = object || { state: 'running', result: null }
                                    const updatedObject = extractStateFromText(textData, currentObject)
                                    if (updatedObject) {
                                        setObject(updatedObject)
                                    }
                                }
                            } else if (parsed.type === 'final' && parsed.data) {
                                // Handle final result
                                const finalData = parsed.data
                                if (finalData && typeof finalData === 'object') {
                                    try {
                                        const validatedData = schema.parse(finalData)
                                        setObject(prev => {
                                            return ensureValidObject({
                                                ...validatedData,
                                                tools: prev?.tools || [],
                                                currentTool: prev?.currentTool
                                            })
                                        })
                                    } catch (validationError) {
                                        setObject(prev => extractStateFromChunk(finalData, prev))
                                    }
                                }
                            } else if (parsed.type === 'error') {
                                const errorMessage = parsed.error || 'Unknown error occurred'
                                setError(errorMessage)
                                                                    setObject(prev => {
                                        if (prev) {
                                            return ensureValidObject({ 
                                                ...prev, 
                                                state: 'error',
                                                currentTool: prev.currentTool ? {
                                                    ...prev.currentTool,
                                                    result: `Error: ${errorMessage}`
                                                } : undefined
                                            })
                                        } else {
                                            return ensureValidObject({ 
                                                state: 'error', 
                                                result: null,
                                                tools: [],
                                                currentTool: undefined
                                            })
                                        }
                                    })
                                break
                            }
                        } catch (parseError) {
                            console.warn('Failed to parse NDJSON line:', line, parseError)
                        }
                    }
                }
            } finally {
                reader.releaseLock()
            }
        } catch (err) {
            if (err instanceof Error) {
                if (err.name === 'AbortError') {
                    // Request was aborted, this is expected when user calls stop()
                    return
                }
                const errorMessage = err.message
                setError(errorMessage)
                setObject(prev => prev ? {
                    ...prev,
                    state: 'error',
                    currentTool: prev.currentTool ? {
                        ...prev.currentTool,
                        result: `Error: ${errorMessage}`
                    } : undefined
                } : {
                    state: 'error',
                    result: null,
                    tools: [],
                    currentTool: undefined
                })
            } else {
                const errorMessage = 'Unknown error occurred'
                setError(errorMessage)
                setObject(prev => prev ? {
                    ...prev,
                    state: 'error',
                    currentTool: prev.currentTool ? {
                        ...prev.currentTool,
                        result: `Error: ${errorMessage}`
                    } : undefined
                } : {
                    state: 'error',
                    result: null,
                    tools: [],
                    currentTool: undefined
                })
            }
        } finally {
            setIsLoading(false)
            abortControllerRef.current = null
        }
    }, [api, schema])

    return {
        object,
        submit,
        isLoading,
        error,
        stop,
        streamText,
    }
}
