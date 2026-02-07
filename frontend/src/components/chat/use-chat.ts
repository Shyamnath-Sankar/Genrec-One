'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { apiClient } from '@/lib/api/client'

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool'

export type ToolExecution = {
  tool: string
  toolCallId: string
  arguments: Record<string, unknown>
  description?: string
  status: 'pending' | 'executing' | 'completed' | 'failed'
  result?: unknown
  requiresConfirmation?: boolean
}

export type Message = {
  id: string
  role: MessageRole
  content: string
  toolCalls?: {
    name: string
    arguments: Record<string, unknown>
  }[]
  toolExecutions?: ToolExecution[]
  isStreaming?: boolean
  createdAt: Date
}

export type ChatSession = {
  id: string
  title: string
  messageCount: number
  createdAt: string
  lastMessageAt: string | null
}

export type UseChatOptions = {
  sessionId?: string
  onError?: (error: Error) => void
  onToolExecution?: (tool: string, status: 'start' | 'complete', result?: unknown) => void
}

export type UseChatReturn = {
  messages: Message[]
  isLoading: boolean
  isStreaming: boolean
  sessionId: string | null
  sessions: ChatSession[]
  error: Error | null
  sendMessage: (content: string) => Promise<void>
  loadSession: (sessionId: string) => Promise<void>
  createSession: () => Promise<string>
  deleteSession: (sessionId: string) => Promise<void>
  loadSessions: () => Promise<void>
  clearMessages: () => void
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(options.sessionId || null)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [error, setError] = useState<Error | null>(null)
  
  const abortControllerRef = useRef<AbortController | null>(null)

  // Load sessions on mount
  const loadSessions = useCallback(async () => {
    try {
      const result = await apiClient.getPaginated<ChatSession>('/chat/sessions', 1, 20)
      setSessions(result.data)
    } catch (e) {
      console.error('Failed to load sessions:', e)
    }
  }, [])

  // Load a specific session with messages
  const loadSession = useCallback(async (id: string) => {
    try {
      setIsLoading(true)
      const data = await apiClient.get<{
        id: string
        title: string
        messages: Array<{
          id: string
          role: MessageRole
          content: string | null
          toolCalls?: { name: string; arguments: Record<string, unknown> }[]
          createdAt: string
        }>
      }>(`/chat/sessions/${id}`)
      
      setSessionId(data.id)
      setMessages(
        data.messages
          .filter(m => m.role !== 'system' && m.role !== 'tool')
          .map(m => ({
            id: m.id,
            role: m.role,
            content: m.content || '',
            toolCalls: m.toolCalls,
            createdAt: new Date(m.createdAt),
          }))
      )
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to load session'))
      options.onError?.(e instanceof Error ? e : new Error('Failed to load session'))
    } finally {
      setIsLoading(false)
    }
  }, [options])

  // Create a new session
  const createSession = useCallback(async (): Promise<string> => {
    try {
      const data = await apiClient.post<{ id: string }>('/chat/sessions', {})
      setSessionId(data.id)
      setMessages([])
      await loadSessions()
      return data.id
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to create session'))
      throw e
    }
  }, [loadSessions])

  // Delete a session
  const deleteSession = useCallback(async (id: string) => {
    try {
      await apiClient.delete(`/chat/sessions/${id}`)
      if (sessionId === id) {
        setSessionId(null)
        setMessages([])
      }
      await loadSessions()
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to delete session'))
    }
  }, [sessionId, loadSessions])

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([])
    setSessionId(null)
    setError(null)
  }, [])

  // Send a message with streaming
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isStreaming) return

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      createdAt: new Date(),
    }
    setMessages(prev => [...prev, userMessage])
    
    // Add placeholder for assistant message
    const assistantId = `assistant-${Date.now()}`
    const assistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      isStreaming: true,
      createdAt: new Date(),
    }
    setMessages(prev => [...prev, assistantMessage])
    
    setIsLoading(true)
    setIsStreaming(true)
    setError(null)

    // Create abort controller
    abortControllerRef.current = new AbortController()

    try {
      const token = apiClient.getAccessToken()
      
      const response = await fetch(`${API_BASE_URL}/api/v1/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: content.trim(),
          session_id: sessionId,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let buffer = ''
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          
          const data = line.slice(6)
          if (!data) continue

          try {
            const event = JSON.parse(data)

            switch (event.type) {
              case 'session':
                setSessionId(event.session_id)
                break

              case 'content':
                fullContent += event.content
                setMessages(prev =>
                  prev.map(m =>
                    m.id === assistantId
                      ? { ...m, content: fullContent }
                      : m
                  )
                )
                break

              case 'confirmation_required':
                // Add tool execution info requiring confirmation
                setMessages(prev =>
                  prev.map(m =>
                    m.id === assistantId
                      ? {
                          ...m,
                          toolExecutions: [
                            ...(m.toolExecutions || []),
                            {
                              tool: event.tool,
                              toolCallId: event.tool_call_id,
                              arguments: event.arguments,
                              description: event.description,
                              status: 'pending' as const,
                              requiresConfirmation: true,
                            },
                          ],
                        }
                      : m
                  )
                )
                options.onToolExecution?.(event.tool, 'start')
                break

              case 'tool_start':
                // Update tool status to executing
                setMessages(prev =>
                  prev.map(m =>
                    m.id === assistantId
                      ? {
                          ...m,
                          toolExecutions: (m.toolExecutions || []).map(te =>
                            te.tool === event.tool
                              ? { ...te, status: 'executing' as const }
                              : te
                          ),
                        }
                      : m
                  )
                )
                break

              case 'tool_result':
                // Update tool with result
                setMessages(prev =>
                  prev.map(m =>
                    m.id === assistantId
                      ? {
                          ...m,
                          toolExecutions: (m.toolExecutions || []).map(te =>
                            te.tool === event.tool
                              ? {
                                  ...te,
                                  status: event.success ? 'completed' as const : 'failed' as const,
                                  result: event.result,
                                }
                              : te
                          ),
                        }
                      : m
                  )
                )
                options.onToolExecution?.(event.tool, 'complete', event.result)
                break

              case 'error':
                throw new Error(event.error)

              case 'done':
                break
            }
          } catch (parseError) {
            // Skip invalid JSON
            console.warn('Failed to parse SSE event:', parseError)
          }
        }
      }

      // Mark streaming as complete
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? { ...m, isStreaming: false }
            : m
        )
      )

      // Refresh sessions list
      await loadSessions()

    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        // User cancelled
        return
      }
      
      const error = e instanceof Error ? e : new Error('Failed to send message')
      setError(error)
      options.onError?.(error)

      // Remove the streaming message on error
      setMessages(prev => prev.filter(m => m.id !== assistantId))

    } finally {
      setIsLoading(false)
      setIsStreaming(false)
      abortControllerRef.current = null
    }
  }, [sessionId, isStreaming, loadSessions, options])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  return {
    messages,
    isLoading,
    isStreaming,
    sessionId,
    sessions,
    error,
    sendMessage,
    loadSession,
    createSession,
    deleteSession,
    loadSessions,
    clearMessages,
  }
}
