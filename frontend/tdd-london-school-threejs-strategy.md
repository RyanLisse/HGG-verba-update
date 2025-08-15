# TDD London School Strategy: Three.js Dynamic Loading Optimization

## Executive Summary

This document outlines a comprehensive Test-Driven Development strategy following London School (mockist) principles for optimizing the VectorView component's Three.js dependencies through dynamic loading. The goal is to reduce initial bundle size while maintaining identical external API behavior.

## Current State Analysis

### Component Architecture

- **VectorView.tsx**: Heavy Three.js implementation (Canvas, Sphere, OrbitControls)
- **VectorViewDeck.tsx**: Alternative Deck.gl implementation
- **Dependencies**: `@react-three/fiber`, `@react-three/drei`, `three`, `@deck.gl/react`
- **Bundle Impact**: ~500KB+ of Three.js libraries loaded upfront
- **API Surface**: Identical props interface between both implementations

### Performance Issues Identified

1. Large initial bundle size due to Three.js imports
2. Blocking render for users who may never use 3D visualization
3. All dependencies loaded synchronously regardless of usage

## London School TDD Approach

### 1. Outside-In Development Flow

Starting from user behavior and working inward to implementation details:

```typescript
// Acceptance Test - User Experience Level
describe("VectorView 3D Visualization Feature", () => {
  it("should load quickly with progressive enhancement", async () => {
    const mockVectorLoader = createMockVectorLoader();
    const component = render(
      <VectorView
        credentials={mockCredentials}
        selectedDocument="doc-1"
        vectorLoader={mockVectorLoader}
      />
    );

    // Initial state: fast loading without Three.js
    expect(component.getByText("Loading 3D visualization...")).toBeInTheDocument();
    expect(mockVectorLoader.loadThreeJS).not.toHaveBeenCalled();

    // Progressive enhancement: Three.js loads on demand
    await waitFor(() => {
      expect(mockVectorLoader.loadThreeJS).toHaveBeenCalledOnce();
      expect(component.getByRole("canvas")).toBeInTheDocument();
    });
  });
});
```

### 2. Mock-Driven Contract Definition

Using mocks to define clear interfaces and collaborations:

```typescript
// Contract for Three.js Loader Service
interface ThreeJSLoaderContract {
  loadThreeJS(): Promise<ThreeJSComponents>;
  isLoaded(): boolean;
  getLoadingState(): LoadingState;
}

// Mock implementation for testing
const mockThreeJSLoader: ThreeJSLoaderContract = {
  loadThreeJS: jest.fn().mockResolvedValue({
    Canvas: MockCanvas,
    OrbitControls: MockOrbitControls,
    Float: MockFloat,
  }),
  isLoaded: jest.fn().mockReturnValue(false),
  getLoadingState: jest.fn().mockReturnValue("loading"),
};
```

### 3. Behavior Verification Strategy

Focus on interactions and collaborations rather than implementation:

```typescript
describe("VectorView Dynamic Loading Behavior", () => {
  let mockLoader: jest.Mocked<ThreeJSLoaderContract>;
  let mockVectorFetcher: jest.Mocked<VectorFetcherContract>;

  beforeEach(() => {
    mockLoader = createMockThreeJSLoader();
    mockVectorFetcher = createMockVectorFetcher();
  });

  it("should coordinate loading sequence properly", async () => {
    const component = renderVectorView({
      threeJSLoader: mockLoader,
      vectorFetcher: mockVectorFetcher,
    });

    // Verify proper orchestration
    expect(mockLoader.isLoaded).toHaveBeenCalledBefore(mockLoader.loadThreeJS);
    expect(mockVectorFetcher.fetchVectors).toHaveBeenCalledAfter(
      mockLoader.loadThreeJS,
    );
  });
});
```

## Interface Design

### 1. Loading State Management

```typescript
type LoadingState = "idle" | "loading" | "loaded" | "error";

interface VectorViewState {
  threeJSState: LoadingState;
  vectorsState: LoadingState;
  error?: Error;
}

// Mock for testing state transitions
const mockStateManager = {
  getState: jest.fn(),
  setState: jest.fn(),
  subscribe: jest.fn(),
};
```

### 2. Component Factory Pattern

```typescript
interface ComponentFactory {
  createCanvas(props: CanvasProps): React.ComponentType;
  createOrbitControls(props: OrbitControlsProps): React.ComponentType;
  createSphere(props: SphereProps): React.ComponentType;
}

// Mock factory for testing
const mockComponentFactory: ComponentFactory = {
  createCanvas: jest.fn().mockReturnValue(MockCanvas),
  createOrbitControls: jest.fn().mockReturnValue(MockOrbitControls),
  createSphere: jest.fn().mockReturnValue(MockSphere),
};
```

### 3. Dependency Injection Container

```typescript
interface VectorViewDependencies {
  threeJSLoader: ThreeJSLoaderContract;
  vectorFetcher: VectorFetcherContract;
  componentFactory: ComponentFactory;
  errorHandler: ErrorHandlerContract;
}

// Testable component with injected dependencies
const VectorViewWithDI: React.FC<VectorViewProps & VectorViewDependencies> = ({
  threeJSLoader,
  vectorFetcher,
  componentFactory,
  errorHandler,
  ...props
}) => {
  // Implementation here
};
```

## Test Strategy by Layer

### 1. Unit Tests (London School Mocks)

**ThreeJS Loader Service**

```typescript
describe("ThreeJSLoaderService", () => {
  let mockDynamicImport: jest.Mock;

  beforeEach(() => {
    mockDynamicImport = jest.fn();
    (global as any).import = mockDynamicImport;
  });

  it("should load Three.js components lazily", async () => {
    const mockThreeComponents = {
      Canvas: jest.fn(),
      OrbitControls: jest.fn(),
    };

    mockDynamicImport
      .mockResolvedValueOnce({ Canvas: mockThreeComponents.Canvas })
      .mockResolvedValueOnce({
        OrbitControls: mockThreeComponents.OrbitControls,
      });

    const loader = new ThreeJSLoaderService();
    const components = await loader.loadThreeJS();

    expect(mockDynamicImport).toHaveBeenCalledWith("@react-three/fiber");
    expect(mockDynamicImport).toHaveBeenCalledWith("@react-three/drei");
    expect(components.Canvas).toBe(mockThreeComponents.Canvas);
  });
});
```

**Loading State Manager**

```typescript
describe("LoadingStateManager", () => {
  it("should transition states correctly", () => {
    const mockSubscriber = jest.fn();
    const manager = new LoadingStateManager();

    manager.subscribe(mockSubscriber);
    manager.setState("loading");

    expect(mockSubscriber).toHaveBeenCalledWith("loading");
  });
});
```

### 2. Integration Tests (Mock Boundaries)

```typescript
describe("VectorView Integration", () => {
  it("should handle loading failures gracefully", async () => {
    const mockLoader = createMockThreeJSLoader();
    const mockErrorHandler = createMockErrorHandler();

    mockLoader.loadThreeJS.mockRejectedValue(new Error('Failed to load Three.js'));

    render(<VectorViewWithDI
      threeJSLoader={mockLoader}
      errorHandler={mockErrorHandler}
      {...defaultProps}
    />);

    await waitFor(() => {
      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Failed to load Three.js' })
      );
    });
  });
});
```

### 3. Contract Tests

```typescript
describe("VectorView External API Contract", () => {
  it("should maintain identical interface to current implementation", () => {
    const legacyProps: VectorViewProps = {
      credentials: mockCredentials,
      selectedDocument: "doc-1",
      chunkScores: [],
      production: "Local",
    };

    // Both implementations should accept same props
    expect(() => render(<VectorViewLegacy {...legacyProps} />)).not.toThrow();
    expect(() => render(<VectorViewOptimized {...legacyProps} />)).not.toThrow();
  });

  it("should emit identical events and callbacks", async () => {
    const mockCallback = jest.fn();
    const props = { ...defaultProps, onChunkSelect: mockCallback };

    const legacy = render(<VectorViewLegacy {...props} />);
    const optimized = render(<VectorViewOptimized {...props} />);

    // Both should trigger same callback patterns
    // Test implementation details here
  });
});
```

## Mock Strategy

### 1. Three.js Component Mocks

```typescript
// Canvas Mock
const MockCanvas: React.FC<any> = ({ children, ...props }) => (
  <div data-testid="mock-canvas" {...props}>
    {children}
  </div>
);

// OrbitControls Mock
const MockOrbitControls: React.FC = () => (
  <div data-testid="mock-orbit-controls" />
);

// Sphere Mock with interaction testing
const MockSphere: React.FC<SphereProps> = ({
  onClick,
  onPointerEnter,
  onPointerLeave,
  vector,
  ...props
}) => (
  <div
    data-testid="mock-sphere"
    data-vector={JSON.stringify(vector)}
    onClick={onClick}
    onMouseEnter={onPointerEnter}
    onMouseLeave={onPointerLeave}
    {...props}
  />
);
```

### 2. Service Layer Mocks

```typescript
// Vector Fetcher Mock
const createMockVectorFetcher = () => ({
  fetchVectors: jest.fn().mockResolvedValue(mockVectorData),
  fetchChunk: jest.fn().mockResolvedValue(mockChunkData),
});

// Error Handler Mock
const createMockErrorHandler = () => ({
  handleError: jest.fn(),
  reportError: jest.fn(),
  retry: jest.fn(),
});
```

### 3. Dynamic Import Mocks

```typescript
// Mock dynamic imports for testing
const mockDynamicImports = {
  "@react-three/fiber": () =>
    Promise.resolve({
      Canvas: MockCanvas,
      useFrame: jest.fn(),
    }),
  "@react-three/drei": () =>
    Promise.resolve({
      OrbitControls: MockOrbitControls,
      Float: MockFloat,
      PerspectiveCamera: MockPerspectiveCamera,
    }),
  three: () =>
    Promise.resolve({
      Vector3: MockVector3,
      Color: MockColor,
      Mesh: MockMesh,
    }),
};
```

## Implementation Plan

### Phase 1: Contract Definition (TDD Red)

1. Write failing tests for desired loading behavior
2. Define interfaces for all collaborators
3. Create comprehensive mock implementations
4. Establish contract tests for API compatibility

### Phase 2: Minimal Implementation (TDD Green)

1. Create basic loading state management
2. Implement dynamic import wrapper
3. Add progressive rendering logic
4. Wire up dependency injection

### Phase 3: Optimization (TDD Refactor)

1. Optimize bundle splitting strategies
2. Add intelligent preloading based on usage patterns
3. Implement error recovery mechanisms
4. Performance monitoring integration

## Swarm Coordination

### Integration with Other Test Agents

```typescript
// Coordination with integration test agents
describe("Swarm Test Coordination", () => {
  beforeAll(async () => {
    await swarmCoordinator.notifyTestStart({
      agent: "tdd-london-school",
      testSuite: "threejs-optimization",
      contracts: ["ThreeJSLoaderContract", "VectorViewContract"],
    });
  });

  afterAll(async () => {
    await swarmCoordinator.shareResults({
      mockContracts: generatedMockContracts,
      behaviorSpecs: extractedBehaviorSpecs,
      performanceMetrics: loadingPerformanceData,
    });
  });
});
```

### Contract Sharing

```typescript
// Share mock contracts with other agents
const sharedMockContracts = {
  ThreeJSLoaderContract: mockThreeJSLoader,
  VectorFetcherContract: mockVectorFetcher,
  ComponentFactoryContract: mockComponentFactory,
};

export { sharedMockContracts };
```

## Success Criteria

### Performance Goals

- [ ] Initial bundle size reduced by 70%+ (Three.js moved to dynamic chunk)
- [ ] First contentful paint improves by 200ms+
- [ ] Loading state provides immediate feedback
- [ ] Error recovery handles network failures gracefully

### Test Coverage Goals

- [ ] 100% mock coverage for all Three.js dependencies
- [ ] Contract tests verify API compatibility
- [ ] Behavior tests cover all loading state transitions
- [ ] Integration tests validate error handling

### Code Quality Goals

- [ ] Zero coupling to Three.js implementation details
- [ ] Dependency injection enables easy testing
- [ ] Clear separation of concerns between loading and rendering
- [ ] Comprehensive error boundaries with recovery strategies

## Risk Mitigation

### Loading Failures

- Implement fallback 2D visualization
- Provide clear error messages with retry mechanisms
- Log failures for monitoring and improvement

### Bundle Splitting Issues

- Test dynamic imports in multiple environments
- Implement progressive enhancement strategy
- Maintain backwards compatibility during migration

### Performance Regressions

- Benchmark loading performance continuously
- Monitor real user metrics
- A/B test optimization strategies

---

This TDD London School strategy emphasizes behavior-driven design through mock-driven testing, ensuring the Three.js optimization maintains identical external behavior while dramatically improving initial load performance.
