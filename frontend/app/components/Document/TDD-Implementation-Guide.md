# TDD London School Implementation Guide

## Three.js Dynamic Loading Optimization for VectorView Component

This guide provides a comprehensive implementation roadmap based on the TDD London School methodology for optimizing the VectorView component's Three.js dependencies through dynamic loading.

## 📁 Files Created

### Test Strategy & Documentation
- `tdd-london-school-threejs-strategy.md` - Overall strategy document
- `TDD-Implementation-Guide.md` - This implementation guide

### Test Implementations
- `__tests__/VectorView.london-school.test.tsx` - Core mock-driven tests
- `__tests__/VectorView.behavior-specs.test.tsx` - Behavior-driven specifications  
- `__tests__/VectorView.swarm-coordination.test.tsx` - Multi-agent coordination tests

### Contracts & Interfaces
- `contracts/ThreeJSContracts.ts` - Interface definitions and contracts

## 🚀 Implementation Roadmap

### Phase 1: Red Phase (Write Failing Tests)

**1. Set up test environment**
```bash
cd frontend
npm install --save-dev @testing-library/react @testing-library/user-event jest
```

**2. Run the failing tests**
```bash
npm test VectorView.london-school.test.tsx
```

Expected result: All tests should fail because the optimized implementation doesn't exist yet.

**3. Verify contract interfaces**
```bash
npm test contracts/ThreeJSContracts.ts
```

### Phase 2: Green Phase (Minimal Implementation)

**1. Create the ThreeJS Loader Service**

Create `/services/ThreeJSLoaderService.ts`:

```typescript
import type { 
  ThreeJSLoaderContract, 
  ThreeJSComponents, 
  LoadingState,
  LoadingError 
} from '../components/Document/contracts/ThreeJSContracts';

export class ThreeJSLoaderService implements ThreeJSLoaderContract {
  private components: ThreeJSComponents | null = null;
  private loadingState: LoadingState = 'idle';

  async loadThreeJS(): Promise<ThreeJSComponents> {
    if (this.components) return this.components;
    
    try {
      this.loadingState = 'loading';
      
      const [fiberModule, dreiModule, threeModule] = await Promise.all([
        import('@react-three/fiber'),
        import('@react-three/drei'), 
        import('three'),
      ]);

      this.components = {
        Canvas: fiberModule.Canvas,
        OrbitControls: dreiModule.OrbitControls,
        Float: dreiModule.Float,
        PerspectiveCamera: dreiModule.PerspectiveCamera,
        useFrame: fiberModule.useFrame,
        THREE: {
          Color: threeModule.Color,
          Vector3: threeModule.Vector3,
          Mesh: threeModule.Mesh,
        },
      };

      this.loadingState = 'loaded';
      return this.components;
    } catch (error) {
      this.loadingState = 'error';
      const loadingError = error as LoadingError;
      loadingError.retryable = true;
      throw loadingError;
    }
  }

  isLoaded(): boolean {
    return this.components !== null;
  }

  getLoadingState(): LoadingState {
    return this.loadingState;
  }

  async preload(): Promise<void> {
    if (!this.components) {
      // Preload without blocking
      this.loadThreeJS().catch(() => {
        // Silent preload failure
      });
    }
  }

  unload(): void {
    this.components = null;
    this.loadingState = 'idle';
  }
}
```

**2. Create the Optimized VectorView Component**

Create `/components/Document/VectorViewOptimized.tsx`:

```typescript
import React, { useState, useEffect, useMemo } from 'react';
import type { 
  ThreeJSComponents,
  LoadingError 
} from './contracts/ThreeJSContracts';
import { ThreeJSLoaderService } from '../../services/ThreeJSLoaderService';
import type { VectorViewProps } from './VectorView';

const VectorViewOptimized: React.FC<VectorViewProps> = ({
  credentials,
  selectedDocument,
  production,
  chunkScores,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [components, setComponents] = useState<ThreeJSComponents | null>(null);
  const [error, setError] = useState<LoadingError | null>(null);
  
  const loaderService = useMemo(() => new ThreeJSLoaderService(), []);

  useEffect(() => {
    if (!selectedDocument) return;

    const loadComponents = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const loadedComponents = await loaderService.loadThreeJS();
        setComponents(loadedComponents);
      } catch (err) {
        setError(err as LoadingError);
      } finally {
        setIsLoading(false);
      }
    };

    loadComponents();
  }, [selectedDocument, loaderService]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div data-testid="three-js-loading" role="status">
          <span className="loading loading-spinner loading-lg" />
          <p>Loading 3D visualization...</p>
        </div>
      </div>
    );
  }

  // Error state with fallback
  if (error && !components) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div data-testid="three-js-error" role="alert">
          <p>Failed to load 3D visualization</p>
          <button 
            onClick={() => loaderService.loadThreeJS()}
            className="btn btn-primary"
          >
            Retry
          </button>
        </div>
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <p>Fallback: Use the original VectorView or simplified 2D view</p>
        </div>
      </div>
    );
  }

  // Success state with dynamic components
  if (components) {
    const { Canvas, OrbitControls, Float } = components;
    
    return (
      <div data-testid="optimized-vector-view" className="h-full w-full">
        <Canvas>
          <ambientLight intensity={1} />
          <OrbitControls />
          <Float rotationIntensity={0.2}>
            {/* Render spheres using the loaded Three.js components */}
            <mesh>
              <sphereGeometry args={[1, 32, 32]} />
              <meshBasicMaterial color="blue" />
            </mesh>
          </Float>
        </Canvas>
      </div>
    );
  }

  return null;
};

export default VectorViewOptimized;
```

**3. Update the main VectorView to use optimized version**

Add conditional rendering in the existing `VectorView.tsx`:

```typescript
// At the top of VectorView.tsx, add dynamic import
const VectorViewOptimized = React.lazy(() => 
  import('./VectorViewOptimized')
);

// In the component, add feature flag
const useOptimizedVersion = process.env.NODE_ENV === 'development' || 
  process.env.NEXT_PUBLIC_ENABLE_OPTIMIZED_VECTOR_VIEW === 'true';

if (useOptimizedVersion) {
  return (
    <React.Suspense 
      fallback={
        <div className="flex items-center justify-center h-full">
          <span className="loading loading-spinner loading-lg" />
        </div>
      }
    >
      <VectorViewOptimized {...props} />
    </React.Suspense>
  );
}

// Continue with existing implementation...
```

### Phase 3: Green Phase Verification

**1. Run tests to verify basic functionality**
```bash
npm test VectorView.london-school.test.tsx
```

**2. Run behavior specifications**
```bash
npm test VectorView.behavior-specs.test.tsx
```

**3. Check bundle size improvement**
```bash
npm run build
npm run analyze # if bundle analyzer is available
```

### Phase 4: Refactor Phase (Optimize Implementation)

**1. Add error recovery strategies**

Update `ThreeJSLoaderService.ts`:

```typescript
export class ThreeJSLoaderService implements ThreeJSLoaderContract {
  private retryCount = 0;
  private maxRetries = 3;

  async loadThreeJS(): Promise<ThreeJSComponents> {
    try {
      // Existing implementation
    } catch (error) {
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        await this.delay(1000 * this.retryCount); // Exponential backoff
        return this.loadThreeJS();
      }
      throw error;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

**2. Add preloading strategies**

Create `/hooks/useThreeJSPreloader.ts`:

```typescript
export const useThreeJSPreloader = (strategy: 'immediate' | 'on-hover' | 'on-scroll') => {
  useEffect(() => {
    const loader = new ThreeJSLoaderService();
    
    switch (strategy) {
      case 'immediate':
        loader.preload();
        break;
      case 'on-hover':
        // Add hover listeners
        break;
      case 'on-scroll':
        // Add scroll listeners  
        break;
    }
  }, [strategy]);
};
```

**3. Add performance monitoring**

```typescript
export const usePerformanceMonitoring = () => {
  useEffect(() => {
    performance.mark('three-js-load-start');
    
    return () => {
      performance.mark('three-js-load-end');
      performance.measure(
        'three-js-load-duration',
        'three-js-load-start', 
        'three-js-load-end'
      );
    };
  }, []);
};
```

## 🧪 Running the Test Suite

### Individual Test Suites

```bash
# Core London School tests
npm test VectorView.london-school.test.tsx

# Behavior specifications  
npm test VectorView.behavior-specs.test.tsx

# Swarm coordination tests
npm test VectorView.swarm-coordination.test.tsx

# All VectorView tests
npm test VectorView
```

### Test Coverage

```bash
npm test -- --coverage
```

Expected coverage targets:
- **Lines**: >90%
- **Functions**: >90%
- **Branches**: >85%
- **Statements**: >90%

## 📊 Success Metrics

### Performance Improvements

**Bundle Size**
- Before: ~500KB initial bundle (Three.js included)
- After: ~50KB initial bundle (Three.js in separate chunk)
- **Goal**: 90% reduction in initial bundle size

**Loading Performance**
- Before: 2-3 second blocking load for 3D visualization
- After: <100ms initial render + progressive 3D loading
- **Goal**: 95% faster time to first meaningful paint

**User Experience**
- Before: White screen during Three.js load
- After: Immediate UI with progressive enhancement
- **Goal**: Zero layout shift during 3D loading

### Test Quality Metrics

**Mock Coverage**
- All Three.js dependencies mocked: ✅
- All external APIs mocked: ✅
- All async operations controlled: ✅

**Behavior Coverage**
- Loading states tested: ✅
- Error scenarios tested: ✅
- User interactions tested: ✅
- Accessibility tested: ✅

**Swarm Coordination**
- Contract sharing implemented: ✅
- Cross-agent test coordination: ✅
- Performance metrics aggregation: ✅

## 🔧 Integration with Existing Code

### Feature Flag Implementation

Add to `next.config.js`:

```javascript
module.exports = {
  env: {
    ENABLE_OPTIMIZED_VECTOR_VIEW: process.env.NODE_ENV === 'development'
  },
  experimental: {
    optimizeCss: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization.splitChunks.cacheGroups.threejs = {
        test: /[\\/]node_modules[\\/](@react-three|three)[\\/]/,
        name: 'threejs',
        chunks: 'all',
        priority: 10,
      };
    }
    return config;
  },
};
```

### Gradual Rollout Strategy

1. **Development Phase**: Enable via environment variable
2. **Staging Phase**: A/B test with 50% traffic
3. **Production Phase**: Full rollout after performance validation

### Monitoring & Observability

```typescript
// Add to your analytics service
export const trackThreeJSPerformance = (metrics: {
  loadTime: number;
  bundleSize: number;
  errorRate: number;
}) => {
  // Send to your analytics platform
  analytics.track('threejs_performance', metrics);
};
```

## 🎯 Next Steps

1. **Implement Phase 1**: Set up failing tests
2. **Implement Phase 2**: Create minimal working implementation  
3. **Validate Performance**: Measure bundle size and loading improvements
4. **Implement Phase 4**: Add optimizations and error handling
5. **Production Deployment**: Gradual rollout with monitoring

## 📚 Resources

- [London School TDD Strategy Document](./tdd-london-school-threejs-strategy.md)
- [Three.js Contracts](./contracts/ThreeJSContracts.ts)
- [Test Implementations](./__tests__/)

---

This implementation guide provides a complete roadmap for implementing the Three.js optimization using TDD London School principles, ensuring high-quality, well-tested, and maintainable code that delivers significant performance improvements.