"use client";

import { useMutation, useQuery, useQueryClient, QueryKey } from "@tanstack/react-query";
import {
  Credentials,
  DocumentsPreviewPayload,
  LabelsResponse,
  RAGConfigResponse,
  DatacountResponse,
  DocumentFilter,
} from "@/app/types";
import {
  retrieveAllDocuments,
  fetchLabels,
  fetchRAGConfig,
  fetchDatacount,
  fetchSuggestions,
  deleteDocument,
} from "@/app/api";

// Utilities
const credKey = (c: Credentials) => `${c.deployment}:${c.url}`;

// Documents list + labels (server returns both)
export function useDocumentsQuery(
  credentials: Credentials,
  query: string,
  labels: string[],
  page: number,
  pageSize: number
) {
  return useQuery<DocumentsPreviewPayload | null>({
    queryKey: ["documents", credKey(credentials), query, labels.sort().join("|"), page, pageSize] as QueryKey,
    queryFn: () => retrieveAllDocuments(query, labels, page, pageSize, credentials),
    select: (data) => data,
    enabled: Boolean(credentials?.url),
  });
}

export function useLabelsQuery(credentials: Credentials) {
  return useQuery<LabelsResponse | null>({
    queryKey: ["labels", credKey(credentials)] as QueryKey,
    queryFn: () => fetchLabels(credentials),
    enabled: Boolean(credentials?.url),
  });
}

export function useRAGConfigQuery(credentials: Credentials) {
  return useQuery<RAGConfigResponse | null>({
    queryKey: ["rag-config", credKey(credentials)] as QueryKey,
    queryFn: () => fetchRAGConfig(credentials),
    enabled: Boolean(credentials?.url),
  });
}

export function useDatacountQuery(
  credentials: Credentials,
  embedder: string,
  documentFilter: DocumentFilter[]
) {
  return useQuery<DatacountResponse | null>({
    queryKey: [
      "datacount",
      credKey(credentials),
      embedder,
      JSON.stringify(documentFilter ?? []),
    ] as QueryKey,
    queryFn: () => fetchDatacount(embedder, documentFilter, credentials),
    enabled: Boolean(credentials?.url && embedder),
  });
}

export function useDeleteDocumentMutation(credentials: Credentials) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (uuid: string) => deleteDocument(uuid, credentials),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents", credKey(credentials)] });
    },
  });
}

export function useSuggestionsQuery(
  credentials: Credentials,
  query: string,
  n: number,
  enabled: boolean
) {
  return useQuery({
    queryKey: ["suggestions", credKey(credentials), query, n],
    queryFn: () => fetchSuggestions(query, n, credentials),
    enabled: Boolean(credentials?.url) && enabled && query.trim().length > 0,
  });
}
