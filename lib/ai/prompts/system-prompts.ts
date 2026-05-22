// ── Mode-Specific Prompt Templates ───────────────────────────────
// Each template produces a production-grade prompt suitable for
// Cursor, Claude, v0, Lovable, or any AI coding assistant.

import type { IntentAnalysis, Requirements } from "@/types";

// ── Helpers ──────────────────────────────────────────────────────

function formatList(items: string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}

function buildRequirementsBlock(requirements: Requirements): string {
  const parts: string[] = [];
  if (requirements.techStack.length > 0) {
    parts.push(
      `### Tech Stack\n${formatList(requirements.techStack)}`,
    );
  }
  if (requirements.features.length > 0) {
    parts.push(`### Features\n${formatList(requirements.features)}`);
  }
  if (requirements.constraints.length > 0) {
    parts.push(
      `### Constraints\n${formatList(requirements.constraints)}`,
    );
  }
  if (requirements.reasoning) {
    parts.push(
      `### Implementation Notes\n${requirements.reasoning}`,
    );
  }
  return parts.join("\n\n");
}

// ── Templates ────────────────────────────────────────────────────

export function frontendPrompt(
  intent: IntentAnalysis,
  requirements: Requirements,
): string {
  return `You are building a frontend component/feature for a modern web application.

## Tech Stack
- React 19 with TypeScript (strict mode enabled)
- Tailwind CSS v4 (utility-first, CSS-based @theme configuration)
- framer-motion v12 for animations and transitions
- shadcn/ui primitives (Button, Card, Input, Dialog, Select, Tabs)
- Lucide React for icons
- Next.js 16 App Router (client components by default for interactive UI)

## Intent
${intent.label} — ${intent.reasoning}

${buildRequirementsBlock(requirements)}

## Architecture Guidelines
- Use Container/Presentational pattern where state logic warrants separation
- State management: React hooks (useState, useReducer, useCallback, useMemo)
- Side effects: useEffect with proper cleanup (AbortController for fetch)
- All props fully typed with exported TypeScript interfaces
- Default exports for pages, named exports for components and utilities
- Co-locate test files alongside the component they test

## Component States
Every component MUST handle all of these:
1. **Loading** — Skeleton or spinner while data is being fetched
2. **Empty** — Meaningful empty-state message with optional CTA
3. **Error** — User-friendly error message with retry mechanism
4. **Edge cases** — Empty strings, null/undefined props, zero-length arrays, rapid re-renders

## Accessibility (Mandatory)
- All interactive elements MUST have accessible names (aria-label or visible label text)
- Keyboard navigation: logical Tab order, Enter/Space to activate, Escape to dismiss overlays
- Focus management: trap focus inside modals/dialogs, return focus to trigger on close
- Live regions: use aria-live="polite" for dynamic content changes
- Color contrast: minimum 4.5:1 ratio for all text (use Zinc palette which meets this)
- Respect users' prefers-reduced-motion: wrap framer-motion animations in a check

## Responsive Strategy
- Mobile-first — start with the smallest viewport and add complexity upward
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Use Tailwind responsive prefixes exclusively (\`sm:\`, \`md:\`, \`lg:\`, \`xl:\`)
- No horizontal scroll on any viewport width
- Touch targets minimum 44×44px on mobile

## Design Tokens
- Colors: Zinc palette (zinc-50 through zinc-950)
- Surface: white / zinc-50 (light) | zinc-950 / zinc-900 (dark)
- Primary text: zinc-900 (light) | zinc-100 (dark)
- Muted text: zinc-500 (light) | zinc-400 (dark)
- Border radius: rounded-lg for cards, rounded-md for buttons, rounded-full for badges/pills
- Shadows: shadow-sm for cards, shadow-lg for elevated surfaces, shadow-xl for dropdowns
- Typography: text-xs (labels), text-sm (body), text-lg (section headers), text-2xl (page titles)
- Transitions: duration-200 ease-in-out for interactive elements

## Data Flow
Describe the data flow for this specific component:
1. Input props / data fetching
2. State transformations
3. User interaction handlers
4. Output / side effects

## Deliverable
Write the complete implementation. Include all TypeScript types, the component(s), and a usage example.`;
}

export function saasPrompt(
  intent: IntentAnalysis,
  requirements: Requirements,
): string {
  return `You are building a SaaS feature for a modern web application.

## Tech Stack
- Next.js 16 App Router with React 19 and TypeScript (strict mode)
- Tailwind CSS v4 for styling
- shadcn/ui primitives for UI components
- framer-motion for micro-interactions
- Lucide React for icons
- Zod for runtime validation
- IndexedDB via the idb library for client-side persistence

## Intent
${intent.label} — ${intent.reasoning}

${buildRequirementsBlock(requirements)}

## SaaS-Specific Considerations
- **Authentication-aware**: Assume a user context exists; mention where auth checks are needed
- **Data persistence**: Use IndexedDB (idb library) for client-side storage
- **Error boundaries**: Wrap each major section in a React error boundary
- **Loading states**: Skeleton screens for data-dependent sections
- **Empty states**: First-run experience for new users with no data
- **Optimistic updates**: Where applicable, update UI before server confirmation

## Architecture Guidelines
- Server components for data fetching (when applicable), client components for interactivity
- API-adjacent patterns: separate data access from presentation
- All forms must include client-side validation with Zod schemas
- Export all TypeScript interfaces; keep them in a types/ folder or co-located

## Component States
Every component MUST handle:
1. **Loading** — Skeleton placeholder while data resolves
2. **Empty** — First-use / no-data state with onboarding CTA
3. **Error** — Error display with retry capability
4. **Success** — Confirmation feedback (toast, animation, or inline message)

## Accessibility (Mandatory)
- All interactive elements must have accessible names
- Keyboard navigation for all features
- Focus management in modals and multi-step flows
- Color contrast 4.5:1 minimum
- prefers-reduced-motion respected

## Responsive Strategy
- Mobile-first: single column on small screens, multi-column on desktop
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Tables/data-grids: horizontal scroll on mobile with sticky first column

## Design Tokens
- Zinc color palette (dark-first: dark surfaces, light text)
- Card-based layout with consistent spacing (p-4 to p-8)
- Primary actions: filled buttons, secondary: outline/ghost
- Feedback colors: green (success), red (error), amber (warning), blue (info)

## Deliverable
Write the complete implementation. Include types, component(s), data layer integration, and usage example.`;
}

export function automationPrompt(
  intent: IntentAnalysis,
  requirements: Requirements,
): string {
  return `You are building an automation workflow / pipeline for a modern web application.

## Tech Stack
- TypeScript (strict mode) for all logic
- Node.js-compatible patterns (runs in browser via Web Workers or main thread)
- Zod for input validation and schema enforcement
- IndexedDB (idb library) for workflow state persistence
- framer-motion for progress visualization

## Intent
${intent.label} — ${intent.reasoning}

${buildRequirementsBlock(requirements)}

## Workflow Architecture
- Each workflow is a series of steps executed sequentially
- Steps are cancelable mid-execution via AbortController
- Each step yields progress updates for UI rendering
- Workflow state persists to IndexedDB at each completed step
- Retry logic: each step can be retried up to 3 times on failure

## Automation Patterns to Follow
- **Event-driven**: Use EventTarget or custom event emitters for decoupled communication
- **Idempotency**: Each step should be safe to re-run without side effects
- **Logging**: Each step records start, end, and duration for debugging
- **Timeouts**: Each step has a configurable timeout (default 30s)
- **Error handling**: Failed steps log the error and continue or abort based on config

## Component States (UI)
The UI for this automation must handle:
1. **Idle** — Workflow not started, configuration visible
2. **Running** — Animated progress indicator, current step highlighted
3. **Paused** — Workflow paused mid-execution (future)
4. **Completed** — Success state with summary of what ran
5. **Failed** — Error state with which step failed and why

## Accessibility
- Progress indicators must have aria-valuenow, aria-valuemin, aria-valuemax
- Status changes announced via aria-live regions
- All controls keyboard accessible

## Design Tokens
- Zinc palette with progress colors: emerald (success), red (error), amber (running)
- Step indicators: numbered circles connected by lines
- Progress bar: animated with transition-all

## Deliverable
Write the complete implementation. Include types, workflow engine, step definitions, UI components, and usage example.`;
}

export function designPrompt(
  intent: IntentAnalysis,
  requirements: Requirements,
): string {
  return `You are building a design system component for a modern web application.

## Tech Stack
- React 19 with TypeScript (strict mode)
- Tailwind CSS v4 with @theme custom properties
- framer-motion for animation primitives
- shadcn/ui as the base component library
- Class Variance Authority (cva) for component variants

## Intent
${intent.label} — ${intent.reasoning}

${buildRequirementsBlock(requirements)}

## Design System Principles
- **Atomic Design**: Build from atoms → molecules → organisms
- **Composition over configuration**: Favor React composition patterns over prop-heavy APIs
- **Consistent API surface**: Every component follows the same prop pattern (variant, size, className, ...rest)
- **Forward refs**: Every interactive component uses React.forwardRef
- **Polymorphism**: Use asChild / polymorphic patterns where a component needs to render as a different element

## Component Requirements
1. **Variants**: Define at least 3 visual variants (default, secondary, ghost/outline) where applicable
2. **Sizes**: Support sm, md, lg sizes with consistent scaling
3. **States**: Default, hover, active, focus, disabled, loading
4. **Animation**: Entrance/exit animations using framer-motion
5. **Dark mode**: Every variant must work in both light and dark themes

## Token Design
Define these design tokens for the component:
- Background colors (light + dark)
- Text colors (light + dark)
- Border colors and widths
- Shadow levels
- Border radius scale
- Spacing scale (padding, margin, gap)
- Transition durations and easings
- Font sizes and weights

## Accessibility Requirements
- WAI-ARIA guidelines followed for the component type
- Keyboard interaction spec documented
- Focus indicator visible and customizable
- Screen reader text for icon-only variants

## Responsive Behavior
- Document how the component behaves across breakpoints
- If the component is layout-aware, provide responsive variants

## Deliverable
Write the complete implementation. Include:
1. TypeScript types and interfaces
2. Component implementation with cva variants
3. Design token documentation as CSS @theme entries
4. Usage examples for each variant
5. Storybook-style documentation comments

Export all variants, sizes, and the component as named exports.`;
}

export function fullstackPrompt(
  intent: IntentAnalysis,
  requirements: Requirements,
): string {
  return `You are building a full-stack feature for a modern web application.

## Tech Stack
### Frontend
- React 19 with TypeScript (strict mode)
- Next.js 16 App Router
- Tailwind CSS v4 with @theme configuration
- framer-motion v12 for animations
- shadcn/ui primitives for UI
- Lucide React for icons
- Zod for client-side validation

### Client-Side Persistence
- IndexedDB via the idb library
- Session storage for ephemeral state

### Testing
- Vitest or Jest for unit tests
- React Testing Library for component tests

## Intent
${intent.label} — ${intent.reasoning}

${buildRequirementsBlock(requirements)}

## Architecture
### Frontend Layer
- Client components for interactive UI
- Custom hooks for reusable logic (prefix with "use")
- Utility functions in lib/ directory
- TypeScript types co-located or in types/ directory

### Data Layer
- IndexedDB for structured persistence (idb library)
- Schema design with named stores and indexes
- CRUD operations wrapped in typed functions
- LRU eviction for storage limits

## Full-Stack Patterns
- **Data flow**: User action → hook → DB operation → state update → re-render
- **Error handling**: Every DB operation wrapped in try/catch, errors surfaced to UI
- **Loading states**: Skeleton loading for data-dependent views
- **Optimistic updates**: Update UI immediately, reconcile on async completion
- **Offline resilience**: All data operations work without network

## Component States
Every component in this feature MUST handle:
1. **Loading** — Skeleton or spinner
2. **Empty** — Meaningful empty state
3. **Error** — Error display with retry
4. **Edge cases** — Boundary values, rapid interactions, concurrent operations

## Accessibility (Mandatory)
- All interactive elements must have accessible names
- Keyboard navigation for all features
- Focus management in modals and multi-step flows
- Color contrast 4.5:1 minimum
- prefers-reduced-motion respected for all animations

## Responsive Strategy
- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Data tables: horizontal scroll on mobile
- Forms: single column on mobile, multi-column on desktop

## Design Tokens
- Zinc color palette (dark-first)
- Consistent spacing: p-4 (card padding), gap-4 (grid gaps), space-y-4 (stack spacing)
- Typography: text-xs (labels), text-sm (body), text-lg (h3), text-xl (h2), text-3xl (h1)
- Border radius: rounded-lg (cards), rounded-md (buttons), rounded-full (pills)
- Shadows: shadow-sm (cards), shadow-lg (modals)

## Data Flow Specification
\`\`\`
User Action → Hook → Validation (Zod) → DB Operation → State Update → UI Re-render
                 ↓                       ↓
            Error State            Loading State
\`\`\`

## Deliverable
Write the complete implementation. Include:
1. TypeScript types and interfaces
2. Database schema and CRUD operations
3. Custom hooks for data access
4. UI components with all states
5. Usage example showing the full data flow

Export all types, hooks, components, and utilities as named exports.`;
}

// ── Template Router ──────────────────────────────────────────────

export const promptTemplates: Record<
  string,
  (intent: IntentAnalysis, requirements: Requirements) => string
> = {
  frontend: frontendPrompt,
  saas: saasPrompt,
  automation: automationPrompt,
  design: designPrompt,
  fullstack: fullstackPrompt,
};

/** Resolve the correct template for a given mode, with a fallback */
export function getPromptTemplate(
  mode: string,
): (intent: IntentAnalysis, requirements: Requirements) => string {
  return promptTemplates[mode] ?? frontendPrompt;
}
