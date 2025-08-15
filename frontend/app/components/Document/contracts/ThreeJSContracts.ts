/**
 * TDD London School Contracts for Three.js Dynamic Loading
 *
 * These interfaces define the contracts between components for testing
 * and dependency injection. Following London School principles of
 * mock-driven design.
 */

import type { ReactElement, ComponentType } from 'react';
import type { VerbaVector, ChunkScore } from '@/app/types';

// Loading States
export type LoadingState = 'idle' | 'loading' | 'loaded' | 'error';

export interface LoadingError extends Error {
  code?: string;
  retryable?: boolean;
  context?: Record<string, unknown>;
}

// Three.js Component Props Interfaces
export interface CanvasProps {
  children: React.ReactNode;
  shadows?: boolean;
  camera?: any;
  scene?: any;
  gl?: any;
  [key: string]: any;
}

export interface OrbitControlsProps {
  enablePan?: boolean;
  enableZoom?: boolean;
  enableRotate?: boolean;
  target?: [number, number, number];
  [key: string]: any;
}

export interface FloatProps {
  children: React.ReactNode;
  speed?: number;
  rotationIntensity?: number;
  floatIntensity?: number;
  [key: string]: any;
}

export interface SphereProps {
  vector: VerbaVector;
  color: string;
  documentTitle: string;
  multiplication: number;
  dynamicColor: boolean;
  chunk_id: string;
  chunk_uuid: string;
  selectedChunk: string | null;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  chunkScores?: ChunkScore[];
  setHoverTitle: React.MutableRefObject<(title: string | null) => void>;
  setSelectedChunk: (chunkUuid: string) => void;
  onClick?: () => void;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
}

// Three.js Components Interface
export interface ThreeJSComponents {
  Canvas: ComponentType<CanvasProps>;
  OrbitControls: ComponentType<OrbitControlsProps>;
  Float: ComponentType<FloatProps>;
  PerspectiveCamera: ComponentType<any>;
  useFrame: (callback: (state: any, delta: number) => void) => void;
  THREE: {
    Color: new (color?: string | number) => any;
    Vector3: new (x?: number, y?: number, z?: number) => any;
    Mesh: new () => any;
  };
}

// Dynamic Loader Contract
export interface ThreeJSLoaderContract {
  /**
   * Asynchronously loads Three.js components
   * @throws {LoadingError} When loading fails
   */
  loadThreeJS(): Promise<ThreeJSComponents>;

  /**
   * Checks if Three.js components are currently loaded
   */
  isLoaded(): boolean;

  /**
   * Gets current loading state
   */
  getLoadingState(): LoadingState;

  /**
   * Preloads Three.js components without blocking
   */
  preload(): Promise<void>;

  /**
   * Clears loaded components from memory
   */
  unload(): void;
}

// Component Factory Contract
export interface ComponentFactoryContract {
  /**
   * Creates Canvas component with proper error boundaries
   */
  createCanvas(props: CanvasProps): ReactElement;

  /**
   * Creates OrbitControls component
   */
  createOrbitControls(props: OrbitControlsProps): ReactElement;

  /**
   * Creates Float wrapper component
   */
  createFloat(props: FloatProps): ReactElement;

  /**
   * Creates Sphere geometry with interactions
   */
  createSphere(props: SphereProps): ReactElement;

  /**
   * Creates fallback 2D visualization
   */
  createFallbackVisualization(props: any): ReactElement;
}

// State Manager Contract
export interface StateManagerContract<T> {
  /**
   * Gets current state
   */
  getState(): T;

  /**
   * Updates state and notifies subscribers
   */
  setState(newState: Partial<T>): void;

  /**
   * Subscribes to state changes
   */
  subscribe(callback: (state: T) => void): () => void;

  /**
   * Resets state to initial values
   */
  reset(): void;
}

// Vector View State
export interface VectorViewState {
  threeJSState: LoadingState;
  vectorsState: LoadingState;
  chunksState: LoadingState;
  error?: LoadingError;
  retryCount: number;
}

// Error Handler Contract
export interface ErrorHandlerContract {
  /**
   * Handles errors with context
   */
  handleError(error: LoadingError, context?: string): void;

  /**
   * Reports error for monitoring
   */
  reportError(error: LoadingError): void;

  /**
   * Determines if error is retryable
   */
  isRetryable(error: LoadingError): boolean;

  /**
   * Creates retry strategy
   */
  createRetryStrategy(
    maxRetries?: number
  ): (fn: () => Promise<any>) => Promise<any>;
}

// Performance Monitor Contract
export interface PerformanceMonitorContract {
  /**
   * Marks performance timing
   */
  mark(name: string): void;

  /**
   * Measures performance between marks
   */
  measure(name: string, startMark: string, endMark: string): number;

  /**
   * Reports loading metrics
   */
  reportLoadingMetrics(metrics: {
    bundleSize: number;
    loadTime: number;
    renderTime: number;
  }): void;
}

// Bundle Analyzer Contract
export interface BundleAnalyzerContract {
  /**
   * Gets current bundle information
   */
  getBundleInfo(): Promise<{
    initialSize: number;
    chunkSizes: Record<string, number>;
    loadedChunks: string[];
  }>;

  /**
   * Analyzes bundle splitting effectiveness
   */
  analyzeSplitting(): Promise<{
    threejsChunkSize: number;
    mainBundleSize: number;
    compressionRatio: number;
  }>;
}

// Vector View Dependencies (Dependency Injection Container)
export interface VectorViewDependencies {
  threeJSLoader: ThreeJSLoaderContract;
  componentFactory: ComponentFactoryContract;
  stateManager: StateManagerContract<VectorViewState>;
  errorHandler: ErrorHandlerContract;
  performanceMonitor?: PerformanceMonitorContract;
  bundleAnalyzer?: BundleAnalyzerContract;
}

// Progressive Enhancement Strategy
export interface ProgressiveEnhancementStrategy {
  /**
   * Determines if Three.js should be loaded based on context
   */
  shouldLoadThreeJS(context: {
    userAgent: string;
    connectionType: string;
    deviceMemory?: number;
    hardwareConcurrency?: number;
  }): boolean;

  /**
   * Gets fallback visualization strategy
   */
  getFallbackStrategy(): 'hidden' | '2d-canvas' | 'static-image';

  /**
   * Determines preloading strategy
   */
  getPreloadStrategy(): 'immediate' | 'on-hover' | 'on-scroll' | 'never';
}

// Accessibility Contract
export interface AccessibilityContract {
  /**
   * Provides screen reader descriptions for 3D content
   */
  getAriaDescription(vectors: VerbaVector[]): string;

  /**
   * Creates keyboard navigation handlers
   */
  createKeyboardHandlers(): {
    onKeyDown: (event: KeyboardEvent) => void;
    getFocusableElements: () => HTMLElement[];
  };

  /**
   * Provides alternative text representation
   */
  getTextAlternative(selectedChunk?: string): string;
}

// Testing Support Contracts

// Mock Factory Contract
export interface MockFactoryContract {
  /**
   * Creates mock Three.js components
   */
  createMockComponents(): ThreeJSComponents;

  /**
   * Creates mock loader with configurable behavior
   */
  createMockLoader(options?: {
    shouldFail?: boolean;
    loadingDelay?: number;
    failureType?: 'network' | 'parsing' | 'memory';
  }): ThreeJSLoaderContract;

  /**
   * Creates mock error handler
   */
  createMockErrorHandler(): ErrorHandlerContract;

  /**
   * Creates mock state manager
   */
  createMockStateManager<T>(initialState: T): StateManagerContract<T>;
}

// Test Coordinator Contract (for Swarm coordination)
export interface TestCoordinatorContract {
  /**
   * Notifies other test agents of test start
   */
  notifyTestStart(params: {
    agent: string;
    testSuite: string;
    contracts: string[];
  }): Promise<void>;

  /**
   * Shares test results with swarm
   */
  shareResults(results: {
    mockContracts: Record<string, any>;
    behaviorSpecs: Record<string, string>;
    performanceMetrics: Record<string, number>;
  }): Promise<void>;

  /**
   * Gets shared mock contracts from other agents
   */
  getSharedContracts(): Promise<Record<string, any>>;
}

// Contract Verification Helpers
export const ContractVerifiers = {
  /**
   * Verifies ThreeJS Loader implements contract correctly
   */
  verifyThreeJSLoader: (loader: ThreeJSLoaderContract): void => {
    if (typeof loader.loadThreeJS !== 'function') {
      throw new Error('ThreeJSLoader must implement loadThreeJS method');
    }
    if (typeof loader.isLoaded !== 'function') {
      throw new Error('ThreeJSLoader must implement isLoaded method');
    }
    if (typeof loader.getLoadingState !== 'function') {
      throw new Error('ThreeJSLoader must implement getLoadingState method');
    }
  },

  /**
   * Verifies Component Factory implements contract correctly
   */
  verifyComponentFactory: (factory: ComponentFactoryContract): void => {
    const requiredMethods = [
      'createCanvas',
      'createOrbitControls',
      'createFloat',
      'createSphere',
      'createFallbackVisualization',
    ];

    for (const method of requiredMethods) {
      if (typeof (factory as any)[method] !== 'function') {
        throw new Error(`ComponentFactory must implement ${method} method`);
      }
    }
  },

  /**
   * Verifies props interface compatibility
   */
  verifyVectorViewProps: (props: any): void => {
    const requiredProps = ['credentials', 'selectedDocument', 'production'];

    for (const prop of requiredProps) {
      if (!(prop in props)) {
        throw new Error(`VectorView props must include ${prop}`);
      }
    }
  },
};

// Type Guards
export const TypeGuards = {
  isLoadingError: (error: Error): error is LoadingError => {
    return 'code' in error || 'retryable' in error;
  },

  isThreeJSComponents: (obj: any): obj is ThreeJSComponents => {
    return (
      obj &&
      typeof obj.Canvas === 'function' &&
      typeof obj.OrbitControls === 'function' &&
      typeof obj.Float === 'function'
    );
  },

  isVectorViewState: (state: any): state is VectorViewState => {
    return (
      state &&
      'threeJSState' in state &&
      'vectorsState' in state &&
      'chunksState' in state
    );
  },
};

export default {
  ContractVerifiers,
  TypeGuards,
};
