import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect, useCallback } from 'react'
import type {
  Credentials,
  RAGConfig,
  RAGConfigResponse,
  ConnectPayload,
  HealthPayload,
  QueryPayload,
  DatacountResponse,
  LabelsResponse,
  MetadataPayload,
  DocumentPayload,
  ChunkPayload,
  ContentPayload,
  VectorsPayload,
  SuggestionsPayload,
  AllSuggestionsPayload,
  UserConfig,
  UserConfigResponse,
  ThemeConfigResponse,
} from '../types'

// Enhanced error class for better error handling
export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// Base API client with enhanced error handling
class ApiClient {
  private baseUrl: string = ''

  async detectHost(): Promise<string> {
    const localUrl = 'http://localhost:8000/api/health'
    const rootUrl = '/api/health'

    try {
      const response = await fetch(localUrl)
      if (response.ok) {
        this.baseUrl = 'http://localhost:8000'
        return this.baseUrl
      }
    } catch {
      // Fallback to root URL
    }

    try {
      const response = await fetch(rootUrl)
      if (response.ok) {
        this.baseUrl = window.location.origin
        return this.baseUrl
      }
    } catch {
      // Final fallback
    }

    throw new Error('Both health checks failed, please check the Verba Server')
  }

  async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    if (!this.baseUrl) {
      await this.detectHost()
    }

    const url = `${this.baseUrl}${endpoint}`
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage: string
      
      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = errorJson.message || errorJson.detail || errorText
      } catch {
        errorMessage = errorText || response.statusText
      }

      throw new ApiError(response.status, response.statusText, errorMessage)
    }

    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      return response.json()
    }

    return response.text() as unknown as T
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }
}

const apiClient = new ApiClient()

// Query keys for consistent caching
export const queryKeys = {
  health: ['health'] as const,
  ragConfig: (credentials: Credentials) => ['rag-config', credentials] as const,
  connect: (credentials: Credentials) => ['connect', credentials] as const,
  datacount: (credentials: Credentials) => ['datacount', credentials] as const,
  labels: (credentials: Credentials) => ['labels', credentials] as const,
  metadata: (credentials: Credentials) => ['metadata', credentials] as const,
  suggestions: (credentials: Credentials) => ['suggestions', credentials] as const,
  allSuggestions: (credentials: Credentials) => ['all-suggestions', credentials] as const,
  userConfig: (credentials: Credentials) => ['user-config', credentials] as const,
  themeConfig: (credentials: Credentials) => ['theme-config', credentials] as const,
  documents: (credentials: Credentials, filter?: any) => ['documents', credentials, filter] as const,
  chunks: (credentials: Credentials, payload: any) => ['chunks', credentials, payload] as const,
  content: (credentials: Credentials, payload: any) => ['content', credentials, payload] as const,
  vectors: (credentials: Credentials, payload: any) => ['vectors', credentials, payload] as const,
} as const

// API hooks
export function useHealth() {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: () => apiClient.get<HealthPayload>('/api/health'),
    staleTime: 30 * 1000, // 30 seconds
    cacheTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useConnect(credentials: Credentials, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.connect(credentials),
    queryFn: () => apiClient.post<ConnectPayload>('/api/connect', { credentials }),
    enabled: enabled && !!(credentials.deployment || credentials.url),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  })
}

export function useRAGConfig(credentials: Credentials, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.ragConfig(credentials),
    queryFn: () => apiClient.post<RAGConfigResponse>('/api/get_rag_config', credentials),
    enabled: enabled && !!(credentials.deployment || credentials.url),
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

export function useDatacount(credentials: Credentials, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.datacount(credentials),
    queryFn: () => apiClient.post<DatacountResponse>('/api/get_datacount', credentials),
    enabled,
    staleTime: 30 * 1000, // 30 seconds
  })
}

export function useLabels(credentials: Credentials, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.labels(credentials),
    queryFn: () => apiClient.post<LabelsResponse>('/api/get_labels', credentials),
    enabled,
    staleTime: 60 * 1000, // 1 minute
  })
}

export function useMetadata(credentials: Credentials, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.metadata(credentials),
    queryFn: () => apiClient.post<MetadataPayload>('/api/get_meta', credentials),
    enabled,
    staleTime: 60 * 1000, // 1 minute
  })
}

export function useSuggestions(credentials: Credentials, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.suggestions(credentials),
    queryFn: () => apiClient.post<SuggestionsPayload>('/api/get_suggestions', credentials),
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

export function useAllSuggestions(credentials: Credentials, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.allSuggestions(credentials),
    queryFn: () => apiClient.post<AllSuggestionsPayload>('/api/get_all_suggestions', credentials),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useUserConfig(credentials: Credentials, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.userConfig(credentials),
    queryFn: () => apiClient.post<UserConfigResponse>('/api/get_user_config', credentials),
    enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

export function useThemeConfig(credentials: Credentials, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.themeConfig(credentials),
    queryFn: () => apiClient.post<ThemeConfigResponse>('/api/get_theme_config', credentials),
    enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Mutation hooks with proper error handling and optimistic updates
export function useUpdateRAGConfig() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (payload: { credentials: Credentials; config: RAGConfig }) =>
      apiClient.post('/api/set_rag_config', payload),
    onSuccess: (_, variables) => {
      // Invalidate and refetch RAG config
      queryClient.invalidateQueries({ queryKey: queryKeys.ragConfig(variables.credentials) })
    },
    onError: (error) => {
      console.error('Failed to update RAG config:', error)
    },
  })
}

export function useUpdateUserConfig() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (payload: { credentials: Credentials; config: UserConfig }) =>
      apiClient.post('/api/set_user_config', payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.userConfig(variables.credentials) })
    },
  })
}

export function useQuery(payload: QueryPayload) {
  return useMutation({
    mutationFn: () => apiClient.post('/api/query', payload),
  })
}

export function useSearchDocuments() {
  return useMutation({
    mutationFn: (payload: any) => apiClient.post('/api/search_documents', payload),
  })
}

export function useDeleteSuggestion() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (payload: any) => apiClient.post('/api/delete_suggestion', payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suggestions(variables.credentials) })
      queryClient.invalidateQueries({ queryKey: queryKeys.allSuggestions(variables.credentials) })
    },
  })
}

// WebSocket hook with better error handling and reconnection
export function useWebSocket(url: string, options?: {
  onMessage?: (event: MessageEvent) => void
  onError?: (event: Event) => void
  onClose?: (event: CloseEvent) => void
  shouldReconnect?: boolean
  reconnectInterval?: number
  maxReconnectAttempts?: number
}) {
  const {
    onMessage,
    onError,
    onClose,
    shouldReconnect = true,
    reconnectInterval = 1000,
    maxReconnectAttempts = 5
  } = options || {}

  const [socket, setSocket] = useState<WebSocket | null>(null)
  const [readyState, setReadyState] = useState<number>(WebSocket.CONNECTING)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(url)
      
      ws.onopen = () => {
        setReadyState(WebSocket.OPEN)
        setReconnectAttempts(0)
      }
      
      ws.onmessage = (event) => {
        onMessage?.(event)
      }
      
      ws.onerror = (event) => {
        setReadyState(WebSocket.CLOSED)
        onError?.(event)
      }
      
      ws.onclose = (event) => {
        setReadyState(WebSocket.CLOSED)
        onClose?.(event)
        
        if (shouldReconnect && reconnectAttempts < maxReconnectAttempts) {
          setTimeout(() => {
            setReconnectAttempts(prev => prev + 1)
            connect()
          }, reconnectInterval * Math.pow(2, reconnectAttempts))
        }
      }
      
      setSocket(ws)
    } catch (error) {
      console.error('WebSocket connection failed:', error)
      setReadyState(WebSocket.CLOSED)
    }
  }, [url, onMessage, onError, onClose, shouldReconnect, reconnectInterval, maxReconnectAttempts, reconnectAttempts])

  useEffect(() => {
    connect()
    
    return () => {
      socket?.close()
    }
  }, [connect])

  const sendMessage = useCallback((message: string | object) => {
    if (socket && readyState === WebSocket.OPEN) {
      const data = typeof message === 'string' ? message : JSON.stringify(message)
      socket.send(data)
    } else {
      console.warn('WebSocket is not connected')
    }
  }, [socket, readyState])

  return {
    socket,
    readyState,
    sendMessage,
    reconnectAttempts,
    isConnecting: readyState === WebSocket.CONNECTING,
    isOpen: readyState === WebSocket.OPEN,
    isClosing: readyState === WebSocket.CLOSING,
    isClosed: readyState === WebSocket.CLOSED,
  }
}

export { apiClient }