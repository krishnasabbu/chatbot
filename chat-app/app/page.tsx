"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { v4 as uuidv4 } from "uuid"
import { toast, ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import MarkdownClient from "./MarkdownClient"

// Import icons individually to avoid potential issues
import { MessageSquarePlus } from "lucide-react"
import { Trash2 } from "lucide-react"
import { Copy } from "lucide-react"
import { ThumbsUp } from "lucide-react"
import { ThumbsDown } from "lucide-react"
import { Edit3 } from "lucide-react"
import { Share } from "lucide-react"
import { Download } from "lucide-react"
import { Clock } from "lucide-react"
import { Sun } from "lucide-react"
import { Moon } from "lucide-react"
import { Mic } from "lucide-react"
import { ArrowUp } from "lucide-react"
import { Menu } from "lucide-react"
import { X } from "lucide-react"
import { Check } from "lucide-react"
import { PanelLeftClose } from "lucide-react"
import { PanelLeftOpen } from "lucide-react"
import { RefreshCw } from "lucide-react"

interface Message {
  id: string
  content: string
  role: "user" | "assistant"
  timestamp: Date
  liked?: boolean
  disliked?: boolean
  error?: boolean
}

interface Chat {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
}

interface ApiResponse {
  reply: string
  error?: string
}

function ChatApp() {
  const [chats, setChats] = useState<Chat[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)

  // Load chats and theme from localStorage on mount
  useEffect(() => {
    setIsHydrated(true)

    try {
      const savedChats = localStorage.getItem("chat-app-chats")
      if (savedChats) {
        const parsedChats = JSON.parse(savedChats).map((chat: any) => ({
          ...chat,
          createdAt: new Date(chat.createdAt),
          messages: chat.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          })),
        }))
        setChats(parsedChats)
        if (parsedChats.length > 0) {
          setCurrentChatId(parsedChats[0].id)
        }
      }

      const savedTheme = localStorage.getItem("chat-app-theme")
      if (savedTheme) {
        setIsDarkMode(savedTheme === "dark")
      }

      const savedSidebarState = localStorage.getItem("chat-app-sidebar")
      if (savedSidebarState) {
        setIsSidebarOpen(savedSidebarState === "open")
      }
    } catch (error) {
      console.error("Error loading from localStorage:", error)
    }
  }, [])

  // Save chats to localStorage whenever chats change
  useEffect(() => {
    if (chats.length > 0) {
      try {
        localStorage.setItem("chat-app-chats", JSON.stringify(chats))
      } catch (error) {
        console.error("Error saving chats:", error)
      }
    }
  }, [chats])

  // Save theme to localStorage whenever theme changes
  useEffect(() => {
    try {
      localStorage.setItem("chat-app-theme", isDarkMode ? "dark" : "light")
    } catch (error) {
      console.error("Error saving theme:", error)
    }
  }, [isDarkMode])

  // Save sidebar state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("chat-app-sidebar", isSidebarOpen ? "open" : "closed")
    } catch (error) {
      console.error("Error saving sidebar state:", error)
    }
  }, [isSidebarOpen])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom()
  }, [chats, currentChatId])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [input])

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode)
  }

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  const createNewChat = () => {
    const newChat: Chat = {
      id: uuidv4(),
      title: "New Chat",
      messages: [],
      createdAt: new Date(),
    }
    setChats((prev) => [newChat, ...prev])
    setCurrentChatId(newChat.id)
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setIsSidebarOpen(false)
    }
  }

  const clearAllChats = () => {
    // Cancel any ongoing API request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setIsLoading(false)
    setChats([])
    setCurrentChatId(null)
    try {
      localStorage.removeItem("chat-app-chats")
    } catch (error) {
      console.error("Error clearing chats:", error)
    }
    toast.success("All chats cleared!")
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setIsSidebarOpen(false)
    }
  }

  const getCurrentChat = () => {
    return chats.find((chat) => chat.id === currentChatId)
  }

  const updateChatTitle = (chatId: string, firstMessage: string) => {
    const title = firstMessage.slice(0, 30) + (firstMessage.length > 30 ? "..." : "")
    setChats((prev) => prev.map((chat) => (chat.id === chatId ? { ...chat, title } : chat)))
  }

  // API call to backend
  const callAssistantAPI = async (message: string, history: Message[]): Promise<string> => {
    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch("/api/assistant/reply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          history: history.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: ApiResponse = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      return data.reply
    } catch (error: any) {
      if (error.name === "AbortError") {
        throw new Error("Request was cancelled")
      }

      console.error("API Error:", error)
      throw new Error(error.message || "Failed to get response from assistant")
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    let chatId = currentChatId

    // Create new chat if none exists
    if (!chatId) {
      const newChat: Chat = {
        id: uuidv4(),
        title: input.slice(0, 30) + (input.length > 30 ? "..." : ""),
        messages: [],
        createdAt: new Date(),
      }
      setChats((prev) => [newChat, ...prev])
      chatId = newChat.id
      setCurrentChatId(chatId)
    }

    const userMessage: Message = {
      id: uuidv4(),
      content: input,
      role: "user",
      timestamp: new Date(),
    }

    // Add user message to chat
    setChats((prev) =>
      prev.map((chat) => (chat.id === chatId ? { ...chat, messages: [...chat.messages, userMessage] } : chat)),
    )

    // Update title if this is the first message
    const currentChat = chats.find((c) => c.id === chatId)
    if (!currentChat?.messages.length) {
      updateChatTitle(chatId, input)
    }

    const userInput = input
    setInput("")
    setIsLoading(true)

    try {
      // Get current chat history including the new user message
      const updatedChat = chats.find((c) => c.id === chatId)
      const chatHistory = updatedChat ? [...updatedChat.messages, userMessage] : [userMessage]

      // Call the backend API
      const assistantReply = await callAssistantAPI(userInput, chatHistory)

      // Create assistant message
      const assistantMessage: Message = {
        id: uuidv4(),
        content: assistantReply,
        role: "assistant",
        timestamp: new Date(),
      }

      // Add assistant message to chat
      setChats((prev) =>
        prev.map((chat) => (chat.id === chatId ? { ...chat, messages: [...chat.messages, assistantMessage] } : chat)),
      )

      toast.success("Response received!")
    } catch (error: any) {
      console.error("Send message error:", error)

      // Create error message
      const errorMessage: Message = {
        id: uuidv4(),
        content: `**Error:** ${error.message}

*Click the retry button to try again, or check your connection and try sending another message.*`,
        role: "assistant",
        timestamp: new Date(),
        error: true,
      }

      // Add error message to chat
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === currentChatId ? { ...chat, messages: [...chat.messages, errorMessage] } : chat,
        ),
      )

      toast.error(`Failed to get response: ${error.message}`)
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }

  const retryLastMessage = async () => {
    const currentChat = getCurrentChat()
    if (!currentChat || currentChat.messages.length < 2) return

    const lastUserMessage = [...currentChat.messages].reverse().find((msg) => msg.role === "user")
    if (!lastUserMessage) return

    // Remove the last error message
    setChats((prev) =>
      prev.map((chat) => (chat.id === currentChatId ? { ...chat, messages: chat.messages.slice(0, -1) } : chat)),
    )

    setIsLoading(true)

    try {
      const chatHistory = currentChat.messages.slice(0, -1) // Exclude the error message
      const assistantReply = await callAssistantAPI(lastUserMessage.content, chatHistory)

      const assistantMessage: Message = {
        id: uuidv4(),
        content: assistantReply,
        role: "assistant",
        timestamp: new Date(),
      }

      setChats((prev) =>
        prev.map((chat) =>
          chat.id === currentChatId ? { ...chat, messages: [...chat.messages, assistantMessage] } : chat,
        ),
      )

      toast.success("Response received!")
    } catch (error: any) {
      const errorMessage: Message = {
        id: uuidv4(),
        content: `**Error:** ${error.message}

*Click the retry button to try again, or check your connection and try sending another message.*`,
        role: "assistant",
        timestamp: new Date(),
        error: true,
      }

      setChats((prev) =>
        prev.map((chat) =>
          chat.id === currentChatId ? { ...chat, messages: [...chat.messages, errorMessage] } : chat,
        ),
      )

      toast.error(`Retry failed: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Message Actions
  const copyMessage = (content: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(content)
      toast.success("Message copied to clipboard!")
    }
  }

  const downloadMessage = (content: string, messageId: string) => {
    try {
      const blob = new Blob([content], { type: "text/markdown" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `message-${messageId.slice(0, 8)}.md`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success("Message downloaded as markdown!")
    } catch (error) {
      console.error("Download error:", error)
      toast.error("Failed to download message")
    }
  }

  const shareMessage = (content: string, messageId: string) => {
    if (typeof window !== "undefined" && navigator.clipboard) {
      const shareUrl = `${window.location.origin}/share/${messageId}`
      navigator.clipboard.writeText(shareUrl)
      toast.success("Share link copied to clipboard!")
    }
  }

  const startEditMessage = (messageId: string, content: string) => {
    setEditingMessageId(messageId)
    setEditingContent(content)
  }

  const saveEditMessage = (messageId: string) => {
    if (!editingContent.trim()) return

    setChats((prev) =>
      prev.map((chat) =>
        chat.id === currentChatId
          ? {
              ...chat,
              messages: chat.messages.map((msg) => (msg.id === messageId ? { ...msg, content: editingContent } : msg)),
            }
          : chat,
      ),
    )

    setEditingMessageId(null)
    setEditingContent("")
    toast.success("Message updated!")
  }

  const cancelEditMessage = () => {
    setEditingMessageId(null)
    setEditingContent("")
  }

  const likeMessage = (messageId: string) => {
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === currentChatId
          ? {
              ...chat,
              messages: chat.messages.map((msg) =>
                msg.id === messageId ? { ...msg, liked: !msg.liked, disliked: false } : msg,
              ),
            }
          : chat,
      ),
    )
    toast.success("Feedback recorded!")
  }

  const dislikeMessage = (messageId: string) => {
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === currentChatId
          ? {
              ...chat,
              messages: chat.messages.map((msg) =>
                msg.id === messageId ? { ...msg, disliked: !msg.disliked, liked: false } : msg,
              ),
            }
          : chat,
      ),
    )
    toast.success("Feedback recorded!")
  }

  const selectChat = (chatId: string) => {
    // Cancel any ongoing request when switching chats
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setIsLoading(false)
    setCurrentChatId(chatId)
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setIsSidebarOpen(false)
    }
  }

  const currentChat = getCurrentChat()

  const themeClasses = {
    background: isDarkMode ? "bg-[#212121]" : "bg-white",
    text: isDarkMode ? "text-white" : "text-gray-900",
    sidebar: isDarkMode ? "bg-[#171717]" : "bg-[#f9f9f9]",
    sidebarHover: isDarkMode ? "hover:bg-[#2f2f2f]" : "hover:bg-gray-100",
    sidebarActive: isDarkMode ? "bg-[#2f2f2f]" : "bg-gray-200",
    inputArea: isDarkMode ? "bg-[#212121]" : "bg-white",
    inputBox: isDarkMode ? "bg-[#2f2f2f] border-[#4a4a4a]" : "bg-white border-gray-300",
    inputFocus: isDarkMode ? "focus-within:border-[#565656]" : "focus-within:border-gray-400",
    userMessage: isDarkMode ? "bg-[#2f2f2f] text-white" : "bg-[#f4f4f4] text-gray-900",
    assistantText: isDarkMode ? "text-[#ececec]" : "text-gray-900",
    actionBar: isDarkMode ? "bg-[#2f2f2f] border-[#4a4a4a]" : "bg-white border-gray-200",
    loadingBg: isDarkMode ? "bg-[#2f2f2f]" : "bg-gray-100",
    headerBorder: isDarkMode ? "border-[#4a4a4a]" : "border-gray-200",
    editInput: isDarkMode ? "bg-[#1a1a1a] border-[#4a4a4a]" : "bg-white border-gray-300",
    errorMessage: isDarkMode ? "bg-red-900/20 border-red-500/30" : "bg-red-50 border-red-200",
  }

  // Prevent hydration mismatch by not rendering until client-side
  if (!isHydrated) {
    return (
      <div className="h-screen bg-[#212121] text-white flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading ChatGPT...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`h-screen ${themeClasses.background} ${themeClasses.text} flex font-sans relative`}>
      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div
        className={`${themeClasses.sidebar} flex flex-col transition-all duration-300 ease-in-out z-50 ${
          isSidebarOpen ? "translate-x-0 w-64" : "-translate-x-full w-0 md:w-0"
        } fixed md:relative h-full overflow-hidden`}
      >
        <div
          className={`${isSidebarOpen ? "opacity-100" : "opacity-0"} transition-opacity duration-300 w-64 flex flex-col h-full`}
        >
          {/* Header */}
          <div className="p-3 flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-lg font-semibold">ChatGPT</h1>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleTheme}
                  className={`p-2 rounded-lg transition-colors ${themeClasses.sidebarHover}`}
                  title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                >
                  {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
                </button>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className={`p-2 rounded-lg transition-colors ${themeClasses.sidebarHover} md:hidden`}
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <button
              onClick={createNewChat}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${themeClasses.sidebarHover}`}
            >
              <MessageSquarePlus size={16} />
              <span className="text-sm font-medium">New chat</span>
            </button>
          </div>

          {/* Chat List - takes remaining space */}
          <div className="flex-1 overflow-y-auto px-3 min-h-0">
            {chats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => selectChat(chat.id)}
                className={`w-full text-left p-3 mb-1 rounded-lg transition-colors text-sm ${
                  currentChatId === chat.id ? themeClasses.sidebarActive : themeClasses.sidebarHover
                }`}
              >
                <div className="font-medium truncate">{chat.title}</div>
              </button>
            ))}
          </div>

          {/* Clear All Button - sticky at bottom */}
          <div className={`border-t p-3 flex-shrink-0 ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}>
            <button
              onClick={clearAllChats}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-red-400 rounded-lg transition-colors ${themeClasses.sidebarHover}`}
            >
              <Trash2 size={16} />
              <span className="text-sm">Clear conversations</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${themeClasses.headerBorder}`}>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSidebar}
              className={`p-2 rounded-lg transition-colors ${themeClasses.sidebarHover}`}
              title={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
            >
              {isSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
            </button>
            <button
              onClick={toggleSidebar}
              className={`p-2 rounded-lg transition-colors ${themeClasses.sidebarHover} md:hidden`}
            >
              <Menu size={20} />
            </button>
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold">{currentChat?.title || "IDPF"}</h2>
          </div>
          <div className="w-16"></div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            {currentChat?.messages.map((message) => (
              <div key={message.id} className="group">
                {message.role === "user" ? (
                  /* User Message - Right Aligned */
                  <div className="flex justify-end">
                    <div className="relative max-w-xs sm:max-w-md lg:max-w-lg">
                      {editingMessageId === message.id ? (
                        /* Edit Mode */
                        <div className={`px-4 py-3 rounded-3xl ${themeClasses.editInput} border`}>
                          <textarea
                            value={editingContent}
                            onChange={(e) => setEditingContent(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault()
                                saveEditMessage(message.id)
                              }
                            }}
                            className="w-full bg-transparent resize-none outline-none text-sm"
                            rows={3}
                            autoFocus
                          />
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => saveEditMessage(message.id)}
                              className="p-1 bg-green-500 text-white rounded hover:bg-green-600"
                            >
                              <Check size={12} />
                            </button>
                            <button
                              onClick={cancelEditMessage}
                              className="p-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className={`px-4 py-3 rounded-3xl ${themeClasses.userMessage}`}
                          style={{ borderRadius: "20px 20px 4px 20px" }}
                        >
                          <div className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                            <MarkdownClient content={message.content} />
                          </div>
                        </div>
                      )}

                      {/* Action Bar for User Messages */}
                      <div className="absolute -bottom-8 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <div
                          className={`flex items-center gap-2 ${themeClasses.actionBar} backdrop-blur-md rounded-full px-3 py-1 shadow-lg border text-xs`}
                        >
                          <button
                            onClick={() => copyMessage(message.content)}
                            className="p-1 hover:bg-blue-500/20 rounded-full transition-colors"
                            title="Copy"
                          >
                            <Copy size={12} />
                          </button>
                          <button
                            onClick={() => startEditMessage(message.id, message.content)}
                            className="p-1 hover:bg-purple-500/20 rounded-full transition-colors"
                            title="Edit"
                          >
                            <Edit3 size={12} />
                          </button>
                          <button
                            onClick={() => downloadMessage(message.content, message.id)}
                            className="p-1 hover:bg-yellow-500/20 rounded-full transition-colors"
                            title="Download"
                          >
                            <Download size={12} />
                          </button>
                          <div className={`flex items-center gap-1 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                            <Clock size={10} />
                            {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Assistant Message - Left Aligned, Raw Markdown */
                  <div className="flex justify-start">
                    <div className="relative max-w-none w-full">
                      <div
                        className={`${themeClasses.assistantText} min-h-[1.5rem] ${
                          message.error ? `${themeClasses.errorMessage} border rounded-lg p-4` : ""
                        }`}
                      >
                          <div className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                            <MarkdownClient content={message.content} />
                          </div>

                        {/* Retry button for error messages */}
                        {message.error && (
                          <div className="mt-3 flex items-center gap-2">
                            <button
                              onClick={retryLastMessage}
                              disabled={isLoading}
                              className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 text-white text-sm rounded-lg transition-colors"
                            >
                              <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
                              {isLoading ? "Retrying..." : "Retry"}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Action Bar for Assistant Messages */}
                      <div className="absolute -bottom-8 left-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <div
                          className={`flex items-center gap-2 ${themeClasses.actionBar} backdrop-blur-md rounded-full px-3 py-1 shadow-lg border text-xs`}
                        >
                          <button
                            onClick={() => copyMessage(message.content)}
                            className="p-1 hover:bg-blue-500/20 rounded-full transition-colors"
                            title="Copy"
                          >
                            <Copy size={12} />
                          </button>
                          <button
                            onClick={() => likeMessage(message.id)}
                            className={`p-1 rounded-full transition-colors ${
                              message.liked ? "bg-green-500/20 text-green-400" : "hover:bg-green-500/20"
                            }`}
                            title="Like"
                          >
                            <ThumbsUp size={12} />
                          </button>
                          <button
                            onClick={() => dislikeMessage(message.id)}
                            className={`p-1 rounded-full transition-colors ${
                              message.disliked ? "bg-red-500/20 text-red-400" : "hover:bg-red-500/20"
                            }`}
                            title="Dislike"
                          >
                            <ThumbsDown size={12} />
                          </button>
                          <button
                            onClick={() => shareMessage(message.content, message.id)}
                            className="p-1 hover:bg-pink-500/20 rounded-full transition-colors"
                            title="Share"
                          >
                            <Share size={12} />
                          </button>
                          <button
                            onClick={() => downloadMessage(message.content, message.id)}
                            className="p-1 hover:bg-yellow-500/20 rounded-full transition-colors"
                            title="Download"
                          >
                            <Download size={12} />
                          </button>
                          <div
                            className={`flex items-center gap-1 ml-2 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                          >
                            <Clock size={10} />
                            {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className={`${themeClasses.loadingBg} px-4 py-3 rounded-2xl`}>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-[#3a8bfd] rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-[#6c5ce7] rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-[#fd79a8] rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                    <span className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                      AI is thinking...
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area - ChatGPT Style */}
        <div className={`${themeClasses.inputArea} px-4 py-6 relative z-10`}>
          <div className="max-w-3xl mx-auto">
            {/* Input Box */}
            <div
              className={`relative ${themeClasses.inputBox} rounded-3xl shadow-sm border transition-all duration-200`}
            >
              <div className="flex items-center gap-3 px-4 py-3">
                {/* Mic Icon */}
                <button
                  className={`p-2 ${isDarkMode ? "text-gray-400 hover:text-gray-300" : "text-gray-500 hover:text-gray-600"} transition-colors`}
                  disabled={isLoading}
                >
                  <Mic size={20} />
                </button>

                {/* Textarea */}
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={isLoading ? "AI is responding..." : "Message ChatGPT"}
                  disabled={isLoading}
                  className="flex-1 bg-transparent resize-none outline-none focus:outline-none focus:ring-0 focus:border-none min-h-[24px] max-h-[200px] text-sm leading-6 disabled:opacity-50"
                  rows={1}
                  style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                />

                {/* Send Button */}
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                  className={`p-2 rounded-full transition-all duration-200 ${
                    input.trim() && !isLoading
                      ? "bg-[#19c37d] hover:bg-[#0ea968] text-white"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  {isLoading ? <RefreshCw size={16} className="animate-spin" /> : <ArrowUp size={16} />}
                </button>
              </div>
            </div>

            {/* Footer Text */}
            <p className={`text-xs text-center mt-2 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
              ChatGPT can make mistakes. Check important info.
            </p>
          </div>
        </div>
      </div>

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme={isDarkMode ? "dark" : "light"}
        toastStyle={{
          backgroundColor: isDarkMode ? "#2f2f2f" : "#ffffff",
          color: isDarkMode ? "#ffffff" : "#1f2937",
          border: isDarkMode ? "1px solid #4a4a4a" : "1px solid #e5e7eb",
        }}
      />
    </div>
  )
}

export default ChatApp