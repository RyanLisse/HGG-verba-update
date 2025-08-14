import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ConnectPayload,
  HealthPayload,
  RAGConfig,
  QueryPayload,
  Credentials,
  DocumentsPreviewPayload,
  DocumentPayload,
  ChunkScore,
  ContentPayload,
  ChunksPayload,
  RAGConfigResponse,
  AllSuggestionsPayload,
  MetadataPayload,
  DatacountResponse,
  SuggestionsPayload,
  ChunkPayload,
  DocumentFilter,
  VectorsPayload,
  UserConfigResponse,
  ThemeConfigResponse,
  Theme,
  UserConfig,
  LabelsResponse,
  Themes,
} from '../types';
import * as api from '../api';

// Health check
export const useHealth = () => {
  return useQuery({
    queryKey: ['health'],
    queryFn: api.fetchHealth,
    refetchInterval: 30000, // Check every 30 seconds
  });
};

// Connection
export const useConnect = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ deployment, url, apiKey, port }: {
      deployment: string;
      url: string;
      apiKey: string;
      port: string;
    }) => api.connectToVerba(deployment, url, apiKey, port),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health'] });
    },
  });
};

// RAG Config
export const useRAGConfig = (credentials: Credentials) => {
  return useQuery({
    queryKey: ['ragConfig', credentials],
    queryFn: () => api.fetchRAGConfig(credentials),
    enabled: !!credentials,
  });
};

export const useUpdateRAGConfig = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ config, credentials }: {
      config: RAGConfig | null;
      credentials: Credentials;
    }) => api.updateRAGConfig(config, credentials),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['ragConfig', variables.credentials] 
      });
    },
  });
};

// User Config
export const useUserConfig = (credentials: Credentials) => {
  return useQuery({
    queryKey: ['userConfig', credentials],
    queryFn: () => api.fetchUserConfig(credentials),
    enabled: !!credentials,
  });
};

export const useUpdateUserConfig = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userConfig, credentials }: {
      userConfig: UserConfig;
      credentials: Credentials;
    }) => api.updateUserConfig(userConfig, credentials),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['userConfig', variables.credentials] 
      });
    },
  });
};

// Theme Config
export const useThemeConfig = (credentials: Credentials) => {
  return useQuery({
    queryKey: ['themeConfig', credentials],
    queryFn: () => api.fetchThemeConfig(credentials),
    enabled: !!credentials,
  });
};

export const useUpdateThemeConfig = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ themes, theme, credentials }: {
      themes: Themes;
      theme: Theme;
      credentials: Credentials;
    }) => api.updateThemeConfig(themes, theme, credentials),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['themeConfig', variables.credentials] 
      });
    },
  });
};

// Query
export const useSendQuery = () => {
  return useMutation({
    mutationFn: ({ query, RAG, labels, documentFilter, credentials }: {
      query: string;
      RAG: RAGConfig | null;
      labels: string[];
      documentFilter: DocumentFilter[];
      credentials: Credentials;
    }) => api.sendUserQuery(query, RAG, labels, documentFilter, credentials),
  });
};

// Documents
export const useDocument = (uuid: string | null, credentials: Credentials) => {
  return useQuery({
    queryKey: ['document', uuid, credentials],
    queryFn: () => api.fetchSelectedDocument(uuid, credentials),
    enabled: !!uuid && !!credentials,
  });
};

export const useAllDocuments = (
  query: string,
  labels: string[],
  page: number,
  pageSize: number,
  credentials: Credentials
) => {
  return useQuery({
    queryKey: ['documents', query, labels, page, pageSize, credentials],
    queryFn: () => api.retrieveAllDocuments(query, labels, page, pageSize, credentials),
    enabled: !!credentials,
  });
};

export const useDeleteDocument = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ uuid, credentials }: {
      uuid: string;
      credentials: Credentials;
    }) => api.deleteDocument(uuid, credentials),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['datacount'] });
    },
  });
};

export const useDeleteAllDocuments = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ resetMode, credentials }: {
      resetMode: string;
      credentials: Credentials;
    }) => api.deleteAllDocuments(resetMode, credentials),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['datacount'] });
    },
  });
};

// Data count
export const useDatacount = (
  embeddingModel: string,
  documentFilter: DocumentFilter[],
  credentials: Credentials
) => {
  return useQuery({
    queryKey: ['datacount', embeddingModel, documentFilter, credentials],
    queryFn: () => api.fetchDatacount(embeddingModel, documentFilter, credentials),
    enabled: !!credentials && !!embeddingModel,
  });
};

// Labels
export const useLabels = (credentials: Credentials) => {
  return useQuery({
    queryKey: ['labels', credentials],
    queryFn: () => api.fetchLabels(credentials),
    enabled: !!credentials,
  });
};

// Content
export const useContent = (
  uuid: string | null,
  page: number,
  chunkScores: ChunkScore[],
  credentials: Credentials
) => {
  return useQuery({
    queryKey: ['content', uuid, page, chunkScores, credentials],
    queryFn: () => api.fetchContent(uuid, page, chunkScores, credentials),
    enabled: !!uuid && !!credentials,
  });
};

// Vectors
export const useVectors = (
  uuid: string | null,
  showAll: boolean,
  credentials: Credentials
) => {
  return useQuery({
    queryKey: ['vectors', uuid, showAll, credentials],
    queryFn: () => api.fetch_vectors(uuid, showAll, credentials),
    enabled: !!uuid && !!credentials,
  });
};

// Chunks
export const useChunks = (
  uuid: string | null,
  page: number,
  pageSize: number,
  credentials: Credentials
) => {
  return useQuery({
    queryKey: ['chunks', uuid, page, pageSize, credentials],
    queryFn: () => api.fetch_chunks(uuid, page, pageSize, credentials),
    enabled: !!uuid && !!credentials,
  });
};

export const useChunk = (
  uuid: string | null,
  embedder: string,
  credentials: Credentials
) => {
  return useQuery({
    queryKey: ['chunk', uuid, embedder, credentials],
    queryFn: () => api.fetch_chunk(uuid, embedder, credentials),
    enabled: !!uuid && !!embedder && !!credentials,
  });
};

// Metadata
export const useMetadata = (credentials: Credentials) => {
  return useQuery({
    queryKey: ['metadata', credentials],
    queryFn: () => api.fetchMeta(credentials),
    enabled: !!credentials,
  });
};

// Suggestions
export const useSuggestions = (
  query: string,
  limit: number,
  credentials: Credentials
) => {
  return useQuery({
    queryKey: ['suggestions', query, limit, credentials],
    queryFn: () => api.fetchSuggestions(query, limit, credentials),
    enabled: !!credentials && query.length > 0,
  });
};

export const useAllSuggestions = (
  page: number,
  pageSize: number,
  credentials: Credentials
) => {
  return useQuery({
    queryKey: ['allSuggestions', page, pageSize, credentials],
    queryFn: () => api.fetchAllSuggestions(page, pageSize, credentials),
    enabled: !!credentials,
  });
};

export const useDeleteSuggestion = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ uuid, credentials }: {
      uuid: string;
      credentials: Credentials;
    }) => api.deleteSuggestion(uuid, credentials),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['allSuggestions'] });
    },
  });
};