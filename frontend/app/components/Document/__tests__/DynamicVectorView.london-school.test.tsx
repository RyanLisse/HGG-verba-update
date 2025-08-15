/**
 * TDD London School Tests for Dynamic VectorView with Lazy Loading
 *
 * Following London School (mockist) principles:
 * - Mock all collaborators and dependencies
 * - Focus on behavior verification over state testing
 * - Test object interactions and contracts
 * - Drive design through outside-in TDD
 *
 * Key behaviors to test:
 * 1. Lazy loading of Three.js components
 * 2. Loading state management
 * 3. Error boundary behavior
 * 4. Bundle optimization through dynamic imports
 */

import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import React from 'react';

// Mock dynamic import
const mockVectorViewComponent = vi.fn(
  ({
    credentials,
    selectedDocument,
    production,
    chunkScores,
  }: {
    credentials: Credentials;
    selectedDocument: string;
    production: string;
    chunkScores: ChunkScore[];
  }) => (
    <div data-testid="mock-vector-view">
      <span data-testid="mock-credentials">{JSON.stringify(credentials)}</span>
      <span data-testid="mock-selected-document">{selectedDocument}</span>
      <span data-testid="mock-production">{production}</span>
      <span data-testid="mock-chunk-scores">{JSON.stringify(chunkScores)}</span>
    </div>
  )
);

// Mock Next.js dynamic import
vi.mock('next/dynamic', () => {
  return (importFn: () => Promise<any>, options?: any) => {
    const DynamicComponent = (props: any) => {
      const [Component, setComponent] =
        React.useState<React.ComponentType | null>(null);
      const [isLoading, setIsLoading] = React.useState(true);
      const [error, setError] = React.useState<Error | null>(null);

      React.useEffect(() => {
        importFn()
          .then((mod) => {
            setComponent(() => mod.default || mod);
            setIsLoading(false);
          })
          .catch((err) => {
            setError(err);
            setIsLoading(false);
          });
      }, []);

      if (error) {
        if (options?.loading) {
          return React.createElement(options.loading);
        }
        throw error;
      }

      if (isLoading || !Component) {
        if (options?.loading) {
          return React.createElement(options.loading);
        }
        return <div data-testid="default-loading">Loading...</div>;
      }

      return React.createElement(Component, props);
    };

    // Simulate ssr: false behavior
    if (options?.ssr === false) {
      return DynamicComponent;
    }

    return DynamicComponent;
  };
});

// Mock the VectorView import
vi.mock('../VectorView', () => {
  return {
    __esModule: true,
    default: mockVectorViewComponent,
  };
});

import type { Credentials, ChunkScore } from '@/app/types';

// Mock data factories
const createMockCredentials = (): Credentials => ({
  key: 'test-key',
  url: 'http://localhost:8080',
  deployment: 'Local',
  default_deployment: 'Local',
});

const createMockChunkScores = (): ChunkScore[] => [
  { uuid: 'chunk-1', chunk_id: 1, score: 0.95, embedder: 'test-embedder' },
  { uuid: 'chunk-2', chunk_id: 2, score: 0.87, embedder: 'test-embedder' },
];

// DEPRECATED: This suite targets the legacy Three.js dynamic wrapper. Skipped during deck.gl migration.
describe.skip('DynamicVectorView London School TDD (deprecated)', () => {
  let mockCredentials: Credentials;
  let mockChunkScores: ChunkScore[];

  beforeEach(() => {
    vi.clearAllMocks();
    mockCredentials = createMockCredentials();
    mockChunkScores = createMockChunkScores();
  });

  describe('Lazy Loading Behavior', () => {
    it('should show loading state while Three.js components are being imported', async () => {
      // This test will be written first to drive the implementation
      // We expect a DynamicVectorView component that shows loading state

      // Import the component we're about to create
      const DynamicVectorView = (await import('../DynamicVectorView')).default;

      // Act: Render component
      render(
        <DynamicVectorView
          credentials={mockCredentials}
          selectedDocument="doc-1"
          production="Local"
        />
      );

      // Assert: Loading state is shown initially
      expect(screen.getByTestId('vector-view-loading')).toBeInTheDocument();
      expect(
        screen.getByText('Loading Vector Visualization...')
      ).toBeInTheDocument();
    });

    it('should render Three.js VectorView after dynamic import completes', async () => {
      // Arrange: Mock successful import
      const DynamicVectorView = (await import('../DynamicVectorView')).default;

      // Act: Render component
      render(
        <DynamicVectorView
          credentials={mockCredentials}
          selectedDocument="doc-1"
          production="Local"
          chunkScores={mockChunkScores}
        />
      );

      // Assert: Loading is replaced by actual component
      await waitFor(() => {
        expect(
          screen.queryByTestId('vector-view-loading')
        ).not.toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByTestId('mock-vector-view')).toBeInTheDocument();
      });

      // Verify props are passed correctly
      expect(screen.getByTestId('mock-selected-document')).toHaveTextContent(
        'doc-1'
      );
      expect(screen.getByTestId('mock-production')).toHaveTextContent('Local');
    });

    it('should handle dynamic import errors with fallback UI', async () => {
      // This test drives the error boundary implementation
      const DynamicVectorView = (await import('../DynamicVectorView')).default;

      // Mock import failure
      vi.mocked(mockVectorViewComponent).mockImplementation(() => {
        throw new Error('Failed to load Three.js components');
      });

      // Act: Render component
      render(
        <DynamicVectorView
          credentials={mockCredentials}
          selectedDocument="doc-1"
          production="Local"
        />
      );

      // Assert: Error boundary shows fallback
      await waitFor(() => {
        expect(screen.getByTestId('vector-view-error')).toBeInTheDocument();
      });

      expect(
        screen.getByText('Unable to load 3D visualization')
      ).toBeInTheDocument();
      expect(screen.getByText('Try refreshing the page')).toBeInTheDocument();
    });

    it('should not load Three.js when no document is selected', async () => {
      // This test drives conditional loading optimization
      const DynamicVectorView = (await import('../DynamicVectorView')).default;

      // Act: Render without selected document
      render(
        <DynamicVectorView
          credentials={mockCredentials}
          selectedDocument={null}
          production="Local"
        />
      );

      // Assert: Shows placeholder instead of loading Three.js
      expect(screen.getByTestId('vector-view-placeholder')).toBeInTheDocument();
      expect(
        screen.getByText('Select a document to view its vector space')
      ).toBeInTheDocument();

      // Verify Three.js component is not loaded
      expect(mockVectorViewComponent).not.toHaveBeenCalled();
    });
  });

  describe('Bundle Optimization Behavior', () => {
    it('should use dynamic import for Three.js components', async () => {
      // This test verifies that we're using dynamic imports correctly
      const DynamicVectorView = (await import('../DynamicVectorView')).default;

      // Act: Render component
      render(
        <DynamicVectorView
          credentials={mockCredentials}
          selectedDocument="doc-1"
          production="Local"
        />
      );

      // Assert: Component is wrapped with dynamic loading
      expect(screen.getByTestId('vector-view-loading')).toBeInTheDocument();

      // Verify actual component loads after import
      await waitFor(() => {
        expect(screen.getByTestId('mock-vector-view')).toBeInTheDocument();
      });
    });

    it('should implement server-side rendering opt-out', async () => {
      // This test ensures SSR is disabled for Three.js components
      const DynamicVectorView = (await import('../DynamicVectorView')).default;

      // The dynamic import should have ssr: false option
      // This is verified through the component behavior, not directly testable

      // Act: Render component
      render(
        <DynamicVectorView
          credentials={mockCredentials}
          selectedDocument="doc-1"
          production="Local"
        />
      );

      // Assert: Component renders client-side only
      expect(screen.getByTestId('vector-view-loading')).toBeInTheDocument();
    });
  });

  describe('Performance Behavior', () => {
    it('should show progressive loading states', async () => {
      // This test drives the UX during loading
      const DynamicVectorView = (await import('../DynamicVectorView')).default;

      // Act: Render component
      render(
        <DynamicVectorView
          credentials={mockCredentials}
          selectedDocument="doc-1"
          production="Local"
        />
      );

      // Assert: Initial loading state
      expect(screen.getByTestId('vector-view-loading')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();

      // Assert: Smooth transition to loaded state
      await waitFor(() => {
        expect(screen.getByTestId('mock-vector-view')).toBeInTheDocument();
      });
    });

    it('should maintain component state during loading transitions', async () => {
      // This test ensures props are preserved during loading
      const DynamicVectorView = (await import('../DynamicVectorView')).default;

      const { rerender } = render(
        <DynamicVectorView
          credentials={mockCredentials}
          selectedDocument="doc-1"
          production="Local"
        />
      );

      // Act: Change props during loading
      rerender(
        <DynamicVectorView
          credentials={mockCredentials}
          selectedDocument="doc-2"
          production="Demo"
        />
      );

      // Assert: Updated props are passed when component loads
      await waitFor(() => {
        expect(screen.getByTestId('mock-vector-view')).toBeInTheDocument();
      });

      expect(screen.getByTestId('mock-selected-document')).toHaveTextContent(
        'doc-2'
      );
      expect(screen.getByTestId('mock-production')).toHaveTextContent('Demo');
    });
  });

  describe('Error Boundary Behavior', () => {
    it('should catch Three.js runtime errors', async () => {
      // This test drives error boundary implementation
      const DynamicVectorView = (await import('../DynamicVectorView')).default;

      // Mock runtime error in Three.js component
      vi.mocked(mockVectorViewComponent).mockImplementation(() => {
        throw new Error('WebGL context lost');
      });

      // Act: Render component
      render(
        <DynamicVectorView
          credentials={mockCredentials}
          selectedDocument="doc-1"
          production="Local"
        />
      );

      // Assert: Error boundary handles the error
      await waitFor(() => {
        expect(screen.getByTestId('vector-view-error')).toBeInTheDocument();
      });

      expect(
        screen.getByText('Unable to load 3D visualization')
      ).toBeInTheDocument();
    });

    it('should provide error recovery mechanism', async () => {
      // This test drives the retry functionality
      const DynamicVectorView = (await import('../DynamicVectorView')).default;

      // Mock initial error, then success
      vi.mocked(mockVectorViewComponent)
        .mockImplementationOnce(() => {
          throw new Error('Initial load failed');
        })
        .mockImplementation((_props) => (
          <div data-testid="mock-vector-view-recovered" />
        ));

      render(
        <DynamicVectorView
          credentials={mockCredentials}
          selectedDocument="doc-1"
          production="Local"
        />
      );

      // Assert: Error state is shown
      await waitFor(() => {
        expect(screen.getByTestId('vector-view-error')).toBeInTheDocument();
      });

      // Act: Click retry button
      const retryButton = screen.getByTestId('vector-view-retry');
      retryButton.click();

      // Assert: Component recovers
      await waitFor(() => {
        expect(
          screen.getByTestId('mock-vector-view-recovered')
        ).toBeInTheDocument();
      });
    });
  });

  describe('Contract Verification', () => {
    it('should maintain identical external API to VectorView', async () => {
      // This test ensures the wrapper doesn't change the component interface
      const DynamicVectorView = (await import('../DynamicVectorView')).default;

      // Test all props are supported
      const allProps = {
        credentials: mockCredentials,
        selectedDocument: 'doc-1',
        production: 'Local' as const,
        chunkScores: mockChunkScores,
      };

      // Act & Assert: Component accepts all props
      expect(() => {
        render(<DynamicVectorView {...allProps} />);
      }).not.toThrow();

      // Verify props are forwarded correctly
      await waitFor(() => {
        expect(screen.getByTestId('mock-vector-view')).toBeInTheDocument();
      });

      expect(mockVectorViewComponent).toHaveBeenCalledWith(
        expect.objectContaining(allProps),
        expect.anything()
      );
    });

    it('should handle all production environment types', async () => {
      const DynamicVectorView = (await import('../DynamicVectorView')).default;
      const environments = ['Local', 'Demo', 'Production'] as const;

      for (const env of environments) {
        const { unmount } = render(
          <DynamicVectorView
            credentials={mockCredentials}
            selectedDocument="doc-1"
            production={env}
          />
        );

        await waitFor(() => {
          expect(screen.getByTestId('mock-vector-view')).toBeInTheDocument();
        });

        expect(screen.getByTestId('mock-production')).toHaveTextContent(env);
        unmount();
      }
    });
  });

  describe('Accessibility Behavior', () => {
    it('should maintain accessibility during loading states', async () => {
      const DynamicVectorView = (await import('../DynamicVectorView')).default;

      render(
        <DynamicVectorView
          credentials={mockCredentials}
          selectedDocument="doc-1"
          production="Local"
        />
      );

      // Assert: Loading has proper ARIA attributes
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(
        screen.getByLabelText('Loading vector visualization')
      ).toBeInTheDocument();

      // Assert: Loading text is announced to screen readers
      expect(
        screen.getByText('Loading Vector Visualization...')
      ).toBeInTheDocument();
    });

    it('should provide meaningful error messages', async () => {
      const DynamicVectorView = (await import('../DynamicVectorView')).default;

      vi.mocked(mockVectorViewComponent).mockImplementation(() => {
        throw new Error('WebGL not supported');
      });

      render(
        <DynamicVectorView
          credentials={mockCredentials}
          selectedDocument="doc-1"
          production="Local"
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      expect(
        screen.getByText('Unable to load 3D visualization')
      ).toBeInTheDocument();
      expect(screen.getByText('Try refreshing the page')).toBeInTheDocument();
    });
  });
});

// Export contract definitions for other tests
export const DynamicVectorViewContracts = {
  props: {
    credentials: 'Credentials',
    selectedDocument: 'string | null',
    production: '"Local" | "Demo" | "Production"',
    chunkScores: 'ChunkScore[] | undefined',
  },

  behaviors: {
    'shows loading state during import': 'loading spinner with progress',
    'lazy loads Three.js components': 'dynamic import with code splitting',
    'handles import errors gracefully': 'error boundary with retry',
    'optimizes bundle size': 'Three.js only loaded when needed',
    'maintains VectorView API': 'identical props and behavior',
  },

  collaborators: {
    'Next.js dynamic()': 'code splitting and lazy loading',
    VectorView: 'wrapped Three.js component',
    'Error Boundary': 'catches and handles loading/runtime errors',
    'Loading UI': 'progressive loading states',
  },
};
