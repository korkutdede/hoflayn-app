# Modules

Each feature (studio, writer, catalog, ...) is a **module**. A module is a
self-contained mini-app that talks to the rest of the system **only** through
`src/db` (schema) and `src/lib` (shared services). Modules never import each
other's internals.

Modules are created **when they ship**, not up front. Do not scaffold empty
module folders.

## Convention (per module)

```
src/app/(dashboard)/<module>/     # routes & UI (App Router)
  _components/                    # module-only components
  _actions/                       # server actions
  _hooks/                         # module-only hooks
  _lib/                           # module-only utilities
  page.tsx
src/modules/<module>/             # (optional) heavier domain logic for the module
```

## Rules

1. No cross-module imports. Shared UI → `src/lib/ui` (or `@/components`),
   shared logic → `src/lib`, data → `src/db`.
2. All AI calls go through the AI abstraction (added in a later stage), never a
   provider SDK directly.
3. Every AI operation is an `ai_jobs` row (queue + cost tracking).
4. Access is gated by entitlements (flag), usage is gated by credits.
