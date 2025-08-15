# Verba Frontend UI – Product Requirements Document (PRD)

## 1. Purpose and Vision

Verba is an open-source AI assistant UI focused on chat and RAG (retrieve-augment-generate) workflows with document management. The frontend should provide a fast, polished experience that reflects Verba’s brand, making it easy to:

- Chat with a backend deployment
- Import and manage documents
- Explore document content
- Configure settings

This PRD defines expected behaviors, flows, visuals, and acceptance criteria to guide automated test planning and visual regression.

## 2. In-Scope Features

- Navbar navigation: Chat, Documents, Import Data, Settings, RAG
- Health/connection gating with auto-connect for local dev
- Chat view
- Documents view
  - Sidebar list with pagination, labels, delete
  - Content explorer for selected document
- Import Data flow (basic UI presence)
- Settings view (basic UI presence)
- RAG tab presence
- Theming and branding application (colors, spacing, typography)

Out of Scope (for this PRD): Backend data correctness, model quality, complex import flows, auth management.

## 3. Target Users / Personas

- Developer running Verba locally for experimentation
- Contributor iterating on UI/branding and testing visual regressions

## 4. Platforms and Dependencies

- Next.js 15, React 19
- Tailwind CSS 4 + DaisyUI
- Playwright for e2e visual testing (dev runtime uses next dev)
- Biome for lint/format (no ESLint/Prettier)

## 5. Navigation & Global UI

- Navbar shows buttons (Chat, Documents, Import Data, Settings, RAG) via `NavbarComponent` and `NavbarButton` > `VerbaButton`.
- GitHub star count badge visible (mockable)
- Current page highlighted in navbar (selected state)
- On successful health + connect, main content fades in: container `.verba-layout` transitions from `opacity-0` to `opacity-100`.

Acceptance Criteria

- Selected tab shows active style
- Layout container `.verba-layout.opacity-100` visible post-login
- All 5 tabs rendered

## 6. Documents View – Detailed

Layout (from `DocumentView`):

- Document sidebar (left) and content area (right)
- When no document selected: sidebar full-width on mobile, content hidden
- When document selected: sidebar visible on md+, content visible on md+

Sidebar Search/List (`DocumentSearch`):

- Uses selectors for tests:
  - List wrapper: `.verba-document-list`
  - Each item: `.verba-document-item`
- Shows document titles, labels, pagination controls
- Delete action available (may be mocked)

Content Explorer (`DocumentExplorer`):

- Renders selected document content/preview
- Handles loading/empty states

Acceptance Criteria

- Clicking Documents tab shows a list under `.verba-document-list`
- At least one `.verba-document-item` visible when data exists
- Selecting an item toggles content pane visibility rules (per breakpoints)

## 7. Chat View – Summary

- Message area and input composer
- Basic send interaction present (backend can be mocked)

Acceptance Criteria

- Chat layout renders with input visible

## 8. Import Data – Summary

- UI components/buttons visible for upload/import
- Non-functional import may be mocked for tests

Acceptance Criteria

- Import Data tab renders expected controls

## 9. Settings – Summary

- Theme toggles or configuration fields visible as available

Acceptance Criteria

- Settings tab renders at least one configurable control

## 10. RAG Tab – Summary

- Presence of the RAG tab and landing content

Acceptance Criteria

- RAG tab renders a distinct view (even if minimal)

## 11. Theming & Branding

- Use Tailwind/DaisyUI classes to reflect Verba colors and spacing
- `VerbaButton` adds `verba-nav-button` class and `active` when selected

Acceptance Criteria

- Navbar/primary buttons use Verba brand styles
- No unstyled default HTML buttons in nav

## 12. States & Errors

- Health check failure: shows connection/login gating
- On successful connect: layout fades in, navbar visible
- Network calls may be mocked for tests (`/api/health`, `/api/connect`, `/api/get_all_documents`)

Acceptance Criteria

- With mocked healthy/connect responses, UI must auto-render main layout without manual login

## 13. Performance & Non-Functional

- Initial paint under 2s on dev environment
- No console errors in happy-path flows
- Responsive on mobile and desktop breakpoints

Acceptance Criteria

- Visual test waits for layout fade-in before interacting
- Key selectors stable to ensure reliable automation

## 14. Testability & Visual Regression

- Playwright e2e tests run with `next dev -p 3025`
- Baseline screenshots captured after UI stabilization
- Deterministic UI: avoid random animations interfering with snapshots

Acceptance Criteria

- Test `Documents view` captures full-page screenshot `documents-view.png`
- Stable selectors:
  - `.verba-layout.opacity-100` for readiness
  - `.verba-document-list .verba-document-item` for documents

## 15. Environment & Mocking

- Local dev: `next dev -p 2025` (manual)
- E2E: `next dev -p 3025` (automated by Playwright)
- Mock endpoints:
  - `/api/health` → healthy + deployments
  - `/api/connect` → success
  - `/api/get_all_documents` → two sample docs
  - GitHub stars API → returns fixed count

## 16. Acceptance Criteria Summary

- __Navbar__ shows 5 tabs; active tab styled; GH stars visible
- __Fade-in__: `.verba-layout.opacity-100` becomes visible post-connect
- __Documents__ tab: list renders with at least one `.verba-document-item`
- __Content pane__ visibility matches selection and breakpoints
- __Playwright__ screenshot saved and used for regression

## 17. Out-of-Scope / Future

- Authentication flows
- Advanced import pipelines
- Deep chat features (tools, history management)
- CI integration for Playwright visual tests

---
This PRD is optimized for TestSprite ingestion to auto-generate a UI test plan and visual checks for the Verba frontend.
