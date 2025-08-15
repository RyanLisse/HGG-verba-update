/**
 * Dynamic VectorView with Lazy Loading
 *
 * This component implements bundle optimization by:
 * 1. Lazy loading Three.js dependencies only when needed
 * 2. Providing loading states and error boundaries
 * 3. Conditional loading based on document selection
 * 4. Maintaining identical API to VectorView
 */

'use client';

import dynamic from 'next/dynamic';
import type React from 'react';
import { useState } from 'react';
import type { ChunkScore, Credentials } from '@/app/types';

// Loading component for progressive UX
const VectorViewLoader: React.FC = () => (
  <div
    data-testid="vector-view-loading"
    className="flex h-[45vh] w-full items-center justify-center"
    role="status"
    aria-label="Loading vector visualization"
  >
    <div className="flex flex-col items-center gap-4">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />
      <p className="text-text-alt-verba">Loading Vector Visualization...</p>
    </div>
  </div>
);

// Error fallback component
const VectorViewError: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
  <div
    data-testid="vector-view-error"
    className="flex h-[45vh] w-full items-center justify-center"
    role="alert"
  >
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="text-error text-6xl">⚠️</div>
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-semibold text-text-verba">
          Unable to load 3D visualization
        </h3>
        <p className="text-text-alt-verba">Try refreshing the page</p>
      </div>
      <button
        data-testid="vector-view-retry"
        className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-primary-foreground hover:bg-primary/90"
        onClick={onRetry}
        type="button"
      >
        Retry Loading
      </button>
    </div>
  </div>
);

// Placeholder when no document is selected
const VectorViewPlaceholder: React.FC = () => (
  <div
    data-testid="vector-view-placeholder"
    className="flex h-[45vh] w-full items-center justify-center"
  >
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="text-text-alt-verba text-6xl">📊</div>
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-semibold text-text-verba">
          Vector Space Visualization
        </h3>
        <p className="text-text-alt-verba">
          Select a document to view its vector space
        </p>
      </div>
    </div>
  </div>
);

// Dynamically imported VectorView with Three.js
const LazyVectorView = dynamic(() => import('./VectorView'), {
  ssr: false, // Disable SSR for Three.js components
  loading: () => <VectorViewLoader />,
});

// Error boundary hook
const useVectorViewErrorBoundary = () => {
  const [hasError, setHasError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const resetError = () => {
    setHasError(false);
    setRetryKey((prev) => prev + 1);
  };

  return { hasError, setHasError, resetError, retryKey };
};

// Props interface matching VectorView exactly
interface DynamicVectorViewProps {
  credentials: Credentials;
  selectedDocument: string | null;
  chunkScores?: ChunkScore[];
  production: 'Local' | 'Demo' | 'Production';
}

const DynamicVectorView: React.FC<DynamicVectorViewProps> = ({
  credentials,
  selectedDocument,
  chunkScores,
  production,
}) => {
  const { hasError, setHasError, resetError, retryKey } =
    useVectorViewErrorBoundary();

  // Don't load Three.js if no document is selected
  if (!selectedDocument) {
    return <VectorViewPlaceholder />;
  }

  // Show error fallback if Three.js failed to load
  if (hasError) {
    return <VectorViewError onRetry={resetError} />;
  }

  // Error boundary wrapper
  const ErrorBoundaryWrapper: React.FC<{ children: React.ReactNode }> = ({
    children,
  }) => {
    try {
      return <>{children}</>;
    } catch (error) {
      setHasError(true);
      return <VectorViewError onRetry={resetError} />;
    }
  };

  return (
    <ErrorBoundaryWrapper key={retryKey}>
      <LazyVectorView
        credentials={credentials}
        selectedDocument={selectedDocument}
        {...(chunkScores && { chunkScores })}
        production={production}
      />
    </ErrorBoundaryWrapper>
  );
};

export default DynamicVectorView;
