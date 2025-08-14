# React Effects: Practical Guide for Verba

Concrete
- Prefer event-driven updates over `useEffect`. Submit search → set a "submitted" state and let queries derive results (see `DocumentSearch` using `useDocumentsQuery`).
- Derive UI from props/state. Avoid syncing values with effects. Example: total count comes from the query result, not a separate `useEffect`.
- Use queries for async data instead of effects. TanStack Query handles caching, loading, error, and refetch.
- Use refs for imperative DOM-only needs (focus, scroll), not effects that mirror state.
- Lift state up only when multiple children need it. Otherwise, keep it local.

Conceptual
- Effects are for synchronization with external systems (subscriptions, timers, non-React stores) and non-render side-effects. They are not for control flow or data derivation.
- Replace "fetch on mount/update" effects with declarative queries whose keys encode dependencies.
- Replace "mirror state" effects with computed values or memoization.
- Avoid effects that only set other state from existing state/props.

Contextual (in this codebase)
- Introduced `@tanstack/react-query` with a root `QueryClientProvider`.
- Added `useDocumentsQuery`, `useLabelsQuery`, `useRAGConfigQuery`, `useDatacountQuery`, and `useDeleteDocumentMutation` in `app/lib/queries.ts`.
- Refactored `DocumentSearch` to:
  - Remove fetch/useEffect plumbing for list and labels.
  - Use a submitted search term and query keys for pagination and filters.
  - Use a mutation for delete + invalidation.
- Began migrating DaisyUI widgets to shadcn/ui (Radix + Tailwind). Use Kibo UI, Origin UI, and Blocks for layout/interaction inspiration while keeping primitives from shadcn.

When to keep an effect
- Subscribing to WebSockets or external SDKs; remember to return a cleanup.
- Imperative animations that need to run on state changes.
- Syncing non-React state (e.g., `localStorage`) that cannot be derived declaratively.

Checklist
- Is this effect performing a fetch? → Prefer a query hook.
- Does it just set state from props/state? → Compute instead.
- Can an event or form submit trigger the change? → Use handlers.
- Is there a missing dependency because it would "loop"? → Reconsider the effect; it’s likely not needed.

References
- React: You Might Not Need an Effect — https://react.dev/learn/you-might-not-need-an-effect
- shadcn/ui Components — https://ui.shadcn.com/
- Inspiration: https://www.kibo-ui.com/components/ , https://originui.com/ , https://blocks.mvp-subha.me/docs/chatbot/chatbot-ui

