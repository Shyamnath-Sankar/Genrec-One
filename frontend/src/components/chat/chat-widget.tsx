'use client'

import { useState, useRef, useEffect, memo } from 'react'
import ReactMarkdown, { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { 
  MessageCircle, 
  X, 
  Send, 
  Loader2, 
  Bot,
  Trash2,
  Plus,
  History,
  Minimize2,
  Maximize2,
  MessageSquare,
  Zap,
  ChevronLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Cog,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useChat, Message, ChatSession, ToolExecution } from './use-chat'
import { useAuth } from '@/lib/hooks/use-auth'

// AI Assistant brand colors - Emerald green that works in light & dark
const AI_COLORS = {
  primary: 'from-emerald-500 to-teal-600',
  primaryHover: 'from-emerald-600 to-teal-700',
  light: 'from-emerald-500/20 to-teal-600/20',
  text: 'text-emerald-500',
  bg: 'bg-emerald-500',
}

// Markdown components for AI responses
const markdownComponents: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
  li: ({ children }) => <li className="text-sm">{children}</li>,
  code: ({ className, children }) => {
    const isInline = !className
    if (isInline) {
      return (
        <code className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono text-emerald-600 dark:text-emerald-400">
          {children}
        </code>
      )
    }
    return (
      <code className="block p-2 rounded bg-muted text-xs font-mono overflow-x-auto mb-2">
        {children}
      </code>
    )
  },
  pre: ({ children }) => (
    <pre className="rounded-lg bg-slate-900 dark:bg-slate-950 p-3 overflow-x-auto mb-2 text-slate-100">
      {children}
    </pre>
  ),
  a: ({ href, children }) => (
    <a 
      href={href} 
      target="_blank" 
      rel="noopener noreferrer"
      className="text-emerald-600 dark:text-emerald-400 underline underline-offset-2 hover:text-emerald-700 dark:hover:text-emerald-300"
    >
      {children}
    </a>
  ),
  h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
  h2: ({ children }) => <h2 className="text-base font-bold mb-2">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-emerald-500 pl-3 italic text-muted-foreground mb-2">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto mb-2">
      <table className="min-w-full text-xs border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted/50">{children}</thead>,
  th: ({ children }) => <th className="border border-border/50 px-2 py-1 text-left font-semibold">{children}</th>,
  td: ({ children }) => <td className="border border-border/50 px-2 py-1">{children}</td>,
  hr: () => <hr className="border-border/50 my-2" />,
}

// Memoized markdown renderer for performance
const MarkdownContent = memo(({ content }: { content: string }) => (
  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
    {content}
  </ReactMarkdown>
))
MarkdownContent.displayName = 'MarkdownContent'

// Tool execution card component
function ToolExecutionCard({ execution }: { execution: ToolExecution }) {
  const getToolIcon = (tool: string) => {
    const icons: Record<string, string> = {
      'get_leave_balance': '📊',
      'apply_leave': '📝',
      'cancel_leave': '❌',
      'get_my_leave_applications': '📋',
      'get_upcoming_holidays': '🏖️',
      'get_attendance_status': '⏰',
      'check_in': '✅',
      'check_out': '🚪',
      'get_attendance_summary': '📈',
      'create_ticket': '🎫',
      'get_my_tickets': '📑',
      'add_ticket_comment': '💬',
      'get_my_profile': '👤',
      'get_team_members': '👥',
      'get_department_directory': '🏢',
      'get_payslip': '💰',
      'get_salary_structure': '💵',
      'get_pending_approvals': '⏳',
      'approve_request': '✅',
      'reject_request': '🚫',
      'get_announcements': '📢',
    }
    return icons[tool] || '⚙️'
  }

  const getToolName = (tool: string) => {
    return tool
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const getStatusIcon = () => {
    switch (execution.status) {
      case 'pending':
        return <Clock className="h-3.5 w-3.5 text-amber-500" />
      case 'executing':
        return <Cog className="h-3.5 w-3.5 text-blue-500 animate-spin" />
      case 'completed':
        return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
      case 'failed':
        return <XCircle className="h-3.5 w-3.5 text-red-500" />
    }
  }

  const getStatusColor = () => {
    switch (execution.status) {
      case 'pending':
        return 'border-amber-500/30 bg-amber-500/5'
      case 'executing':
        return 'border-blue-500/30 bg-blue-500/5'
      case 'completed':
        return 'border-emerald-500/30 bg-emerald-500/5'
      case 'failed':
        return 'border-red-500/30 bg-red-500/5'
    }
  }

  return (
    <div className={cn(
      'rounded-lg border px-3 py-2 mt-2 text-xs',
      getStatusColor()
    )}>
      <div className="flex items-center gap-2">
        <span className="text-sm">{getToolIcon(execution.tool)}</span>
        <span className="font-medium flex-1">{getToolName(execution.tool)}</span>
        {getStatusIcon()}
      </div>
      {execution.requiresConfirmation && execution.status === 'pending' && (
        <div className="mt-1.5 text-amber-600 dark:text-amber-400 text-[10px]">
          Requires confirmation
        </div>
      )}
      {execution.status === 'executing' && (
        <div className="mt-1.5 text-blue-600 dark:text-blue-400 text-[10px]">
          Executing action...
        </div>
      )}
      {execution.status === 'completed' && (
        <div className="mt-1.5 text-emerald-600 dark:text-emerald-400 text-[10px]">
          Action completed successfully
        </div>
      )}
      {execution.status === 'failed' && (
        <div className="mt-1.5 text-red-600 dark:text-red-400 text-[10px]">
          Action failed
        </div>
      )}
    </div>
  )
}

function MessageBubble({ message, employeeName }: { message: Message; employeeName: string }) {
  const isUser = message.role === 'user'
  
  return (
    <div
      className={cn(
        'flex gap-3 px-4 py-2',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      <Avatar className={cn(
        'h-8 w-8 flex-shrink-0 ring-2 ring-background',
        !isUser && 'shadow-lg shadow-emerald-500/20'
      )}>
        <AvatarFallback className={cn(
          'text-xs font-medium',
          isUser 
            ? 'bg-slate-700 text-white dark:bg-slate-600' 
            : `bg-gradient-to-br ${AI_COLORS.primary} text-white`
        )}>
          {isUser ? (
            employeeName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
          ) : (
            <Bot className="h-4 w-4" />
          )}
        </AvatarFallback>
      </Avatar>
      
      <div
        className={cn(
          'flex flex-col max-w-[80%]',
          isUser ? 'items-end' : 'items-start'
        )}
      >
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
            isUser
              ? 'bg-slate-700 text-white dark:bg-slate-600 rounded-tr-sm'
              : 'bg-muted/80 dark:bg-muted/50 rounded-tl-sm border border-border/50'
          )}
        >
          {message.isStreaming && !message.content ? (
            <div className="flex items-center gap-1.5 py-1">
              <div className={cn('h-2 w-2 rounded-full animate-bounce', AI_COLORS.bg)} style={{ animationDelay: '0ms' }} />
              <div className={cn('h-2 w-2 rounded-full animate-bounce', AI_COLORS.bg)} style={{ animationDelay: '150ms' }} />
              <div className={cn('h-2 w-2 rounded-full animate-bounce', AI_COLORS.bg)} style={{ animationDelay: '300ms' }} />
            </div>
          ) : isUser ? (
            <div className="whitespace-pre-wrap break-words">
              {message.content}
            </div>
          ) : (
            <div className="break-words prose-sm max-w-none">
              <MarkdownContent content={message.content} />
              {message.isStreaming && (
                <span className={cn('inline-block w-0.5 h-4 ml-1 animate-pulse', AI_COLORS.bg)} />
              )}
            </div>
          )}
        </div>
        
        {/* Tool Executions */}
        {!isUser && message.toolExecutions && message.toolExecutions.length > 0 && (
          <div className="mt-1 max-w-[80%]">
            {message.toolExecutions.map((execution, idx) => (
              <ToolExecutionCard key={idx} execution={execution} />
            ))}
          </div>
        )}
        <span className="text-[10px] text-muted-foreground mt-1 px-2">
          {message.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  )
}

function ChatHistory({ 
  sessions, 
  currentSessionId,
  onSelectSession,
  onDeleteSession,
  onNewChat,
  onClose,
}: { 
  sessions: ChatSession[]
  currentSessionId: string | null
  onSelectSession: (id: string) => void
  onDeleteSession: (id: string) => void
  onNewChat: () => void
  onClose: () => void
}) {
  return (
    <div className="flex flex-col h-full bg-muted/30">
      <div className="p-3 border-b flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="icon"
          className="h-8 w-8 lg:hidden"
          onClick={onClose}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button 
          variant="default" 
          size="sm"
          className={cn(
            'flex-1 justify-start gap-2',
            `bg-gradient-to-r ${AI_COLORS.primary} hover:${AI_COLORS.primaryHover} text-white border-0`
          )}
          onClick={onNewChat}
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {sessions.length === 0 ? (
            <div className="text-center py-8 px-4">
              <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                No conversations yet
              </p>
            </div>
          ) : (
            sessions.map(session => (
              <div
                key={session.id}
                className={cn(
                  'group flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm cursor-pointer transition-all',
                  currentSessionId === session.id
                    ? `bg-gradient-to-r ${AI_COLORS.light} ${AI_COLORS.text} font-medium`
                    : 'hover:bg-muted'
                )}
                onClick={() => onSelectSession(session.id)}
              >
                <MessageCircle className="h-4 w-4 flex-shrink-0 opacity-70" />
                <span className="flex-1 truncate">
                  {session.title || 'New Chat'}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteSession(session.id)
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [input, setInput] = useState('')
  const [chatError, setChatError] = useState<string | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  
  const { employee } = useAuth()
  const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : 'User'
  
  const {
    messages,
    isLoading,
    isStreaming,
    sessionId,
    sessions,
    error,
    sendMessage,
    loadSession,
    deleteSession,
    loadSessions,
    clearMessages,
  } = useChat({
    onError: (error) => {
      console.error('Chat error:', error)
      setChatError(error.message || 'Something went wrong. Please try again.')
      // Auto-clear error after 5 seconds
      setTimeout(() => setChatError(null), 5000)
    },
  })

  // Load sessions when chat opens
  useEffect(() => {
    if (isOpen) {
      loadSessions()
    }
  }, [isOpen, loadSessions])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [messages])

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return
    
    const message = input.trim()
    setInput('')
    await sendMessage(message)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleNewChat = () => {
    clearMessages()
    setShowHistory(false)
  }

  const handleSelectSession = async (id: string) => {
    await loadSession(id)
    setShowHistory(false)
  }

  // Floating button when closed
  if (!isOpen) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className={cn(
                'fixed bottom-4 right-4 z-50 h-12 w-12 sm:h-14 sm:w-14 sm:bottom-5 sm:right-5 rounded-full',
                'flex items-center justify-center',
                `bg-gradient-to-br ${AI_COLORS.primary}`,
                'shadow-lg shadow-emerald-500/30 dark:shadow-emerald-500/20',
                'transition-all duration-300 ease-out',
                'hover:scale-110 hover:shadow-xl hover:shadow-emerald-500/40',
                'active:scale-95',
                'group'
              )}
              onClick={() => setIsOpen(true)}
            >
              <Zap className="h-6 w-6 text-white transition-transform group-hover:scale-110" />
              {/* Pulse ring effect */}
              <span className={cn(
                'absolute inset-0 rounded-full',
                `bg-gradient-to-br ${AI_COLORS.primary}`,
                'animate-ping opacity-20'
              )} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left" className="font-medium">
            <p>AI Assistant</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <Card
      className={cn(
        'fixed z-50 flex flex-col overflow-hidden',
        'shadow-2xl shadow-black/20 dark:shadow-black/40',
        'transition-all duration-300 ease-out',
        'border border-border/50',
        isExpanded
          ? 'inset-2 sm:inset-4 rounded-2xl'
          : 'bottom-0 right-0 left-0 h-[85vh] rounded-t-2xl sm:bottom-5 sm:right-5 sm:left-auto sm:w-[420px] sm:h-[600px] sm:rounded-2xl',
        'bg-background'
      )}
    >
      {/* Header */}
      <div className={cn(
        'flex items-center justify-between px-4 py-3',
        'border-b bg-gradient-to-r',
        AI_COLORS.light
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            'flex h-10 w-10 items-center justify-center rounded-xl',
            `bg-gradient-to-br ${AI_COLORS.primary}`,
            'shadow-lg shadow-emerald-500/30'
          )}>
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-sm flex items-center gap-2">
              HR Assistant
              <span className={cn(
                'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium',
                `bg-gradient-to-r ${AI_COLORS.primary} text-white`
              )}>
                AI
              </span>
            </h3>
            <p className="text-xs text-muted-foreground">
              {isStreaming ? (
                <span className="flex items-center gap-1">
                  <span className={cn('h-1.5 w-1.5 rounded-full animate-pulse', AI_COLORS.bg)} />
                  Thinking...
                </span>
              ) : 'Powered by Gemini'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg hover:bg-white/10"
            onClick={() => setShowHistory(!showHistory)}
          >
            <History className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg hover:bg-white/10"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg hover:bg-white/10"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* History Panel - Overlay on mobile, side panel on desktop */}
        {showHistory && (
          <>
            {/* Mobile backdrop */}
            <div 
              className="absolute inset-0 bg-black/20 z-10 sm:hidden"
              onClick={() => setShowHistory(false)}
            />
            <div className={cn(
              'absolute sm:relative z-20 h-full',
              'w-[280px] sm:w-64 border-r flex-shrink-0 bg-background'
            )}>
              <ChatHistory
                sessions={sessions}
                currentSessionId={sessionId}
                onSelectSession={handleSelectSession}
                onDeleteSession={deleteSession}
                onNewChat={handleNewChat}
                onClose={() => setShowHistory(false)}
              />
            </div>
          </>
        )}

        {/* Messages */}
        <div className="flex-1 flex flex-col overflow-hidden bg-muted/20">
          <ScrollArea className="flex-1" ref={scrollAreaRef}>
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                {/* Welcome Icon */}
                <div className={cn(
                  'flex h-20 w-20 items-center justify-center rounded-2xl mb-5',
                  `bg-gradient-to-br ${AI_COLORS.light}`,
                  'shadow-lg'
                )}>
                  <Zap className={cn('h-10 w-10', AI_COLORS.text)} />
                </div>
                
                <h3 className="font-semibold text-xl mb-2">How can I help you?</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-[280px]">
                  I can assist with leaves, attendance, tickets, payroll, and more!
                </p>
                
                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-2 w-full max-w-[320px]">
                  {[
                    { text: 'Check leave balance', icon: '📊' },
                    { text: 'Apply for leave', icon: '📝' },
                    { text: 'My attendance today', icon: '⏰' },
                    { text: 'Create a ticket', icon: '🎫' },
                  ].map((suggestion) => (
                    <button
                      key={suggestion.text}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2.5 rounded-xl text-left text-sm',
                        'bg-background border border-border/50',
                        'hover:border-emerald-500/50 hover:bg-emerald-500/5',
                        'transition-all duration-200',
                        'group'
                      )}
                      onClick={() => {
                        setInput(suggestion.text)
                        inputRef.current?.focus()
                      }}
                    >
                      <span className="text-base">{suggestion.icon}</span>
                      <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                        {suggestion.text}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-3">
                {messages.map((message) => (
                  <MessageBubble 
                    key={message.id} 
                    message={message} 
                    employeeName={employeeName}
                  />
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <div className="p-3 border-t bg-background/80 backdrop-blur-sm">
            {/* Error Banner */}
            {chatError && (
              <div className="mb-2 flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-600 dark:text-red-400">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="flex-1">{chatError}</span>
                <button 
                  onClick={() => setChatError(null)}
                  className="p-0.5 hover:bg-red-500/10 rounded"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <Textarea
                ref={inputRef}
                placeholder="Ask me anything..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isStreaming}
                className={cn(
                  'min-h-[44px] max-h-[120px] resize-none rounded-xl',
                  'border-border/50 bg-muted/50',
                  'focus:border-emerald-500/50 focus:ring-emerald-500/20',
                  'placeholder:text-muted-foreground/60'
                )}
                rows={1}
              />
              <Button
                size="icon"
                className={cn(
                  'h-11 w-11 rounded-xl flex-shrink-0',
                  `bg-gradient-to-br ${AI_COLORS.primary}`,
                  `hover:${AI_COLORS.primaryHover}`,
                  'shadow-lg shadow-emerald-500/20',
                  'transition-all duration-200',
                  'disabled:opacity-50 disabled:shadow-none'
                )}
                onClick={handleSend}
                disabled={!input.trim() || isStreaming}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground/60 text-center mt-2">
              AI responses may not always be accurate. Please verify important info.
            </p>
          </div>
        </div>
      </div>
    </Card>
  )
}
