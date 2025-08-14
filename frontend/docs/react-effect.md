# React Effect Patterns & Best Practices

## Core Principles

### 1. You Might Not Need an Effect
Based on React's official documentation, many effects can be replaced with:
- **Event handlers** for user interactions
- **Derived state** calculated during render
- **State updates** during event handlers

### 2. Common Anti-Patterns to Avoid

#### ❌ Setting State Based on Props
```tsx
// Bad
useEffect(() => {
  setFilteredItems(items.filter(item => item.active));
}, [items]);

// Good - Calculate during render
const filteredItems = items.filter(item => item.active);
```

#### ❌ Fetching Data Without Cleanup
```tsx
// Bad
useEffect(() => {
  fetch('/api/data').then(setData);
}, []);

// Good - Use TanStack Query or proper cleanup
useEffect(() => {
  let cancelled = false;
  fetch('/api/data')
    .then(res => res.json())
    .then(data => {
      if (!cancelled) setData(data);
    });
  return () => { cancelled = true; };
}, []);
```

#### ❌ Transforming Data in Effects
```tsx
// Bad
useEffect(() => {
  setFormattedData(formatData(rawData));
}, [rawData]);

// Good - Use memo for expensive calculations
const formattedData = useMemo(() => formatData(rawData), [rawData]);
```

### 3. When to Use Effects

✅ **Synchronizing with External Systems**
- WebSocket connections
- Third-party libraries
- Browser APIs (localStorage, etc.)
- Analytics tracking

✅ **Cleanup Operations**
- Removing event listeners
- Clearing timers
- Canceling subscriptions

### 4. TanStack Query Integration

Replace data fetching effects with TanStack Query:

```tsx
// Before - Using useEffect
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
  let cancelled = false;
  setLoading(true);
  fetch('/api/data')
    .then(res => res.json())
    .then(data => {
      if (!cancelled) {
        setData(data);
        setLoading(false);
      }
    })
    .catch(err => {
      if (!cancelled) {
        setError(err);
        setLoading(false);
      }
    });
  return () => { cancelled = true; };
}, []);

// After - Using TanStack Query
const { data, isLoading, error } = useQuery({
  queryKey: ['data'],
  queryFn: () => fetch('/api/data').then(res => res.json())
});
```

### 5. Performance Optimizations

#### Use Proper Dependencies
- Include all reactive values
- Use ESLint exhaustive-deps rule
- Consider useCallback/useMemo for stable references

#### Batch State Updates
```tsx
// Good - React batches these automatically
const handleClick = () => {
  setCount(c => c + 1);
  setFlag(f => !f);
  // Both updates happen in one render
};
```

#### Debounce Expensive Operations
```tsx
const [query, setQuery] = useState('');
const [debouncedQuery, setDebouncedQuery] = useState('');

useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedQuery(query);
  }, 500);
  return () => clearTimeout(timer);
}, [query]);
```

### 6. Custom Hooks for Reusability

Extract effect logic into custom hooks:
```tsx
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  
  return debouncedValue;
}
```

### 7. Migration Checklist

- [ ] Replace data fetching effects with TanStack Query
- [ ] Move calculations from effects to render or useMemo
- [ ] Extract event handlers from effects
- [ ] Add proper cleanup functions
- [ ] Remove unnecessary effects that set state based on props
- [ ] Create custom hooks for reusable effect logic
- [ ] Use React 18 features (Suspense, transitions) where appropriate