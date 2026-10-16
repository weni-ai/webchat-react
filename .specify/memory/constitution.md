<!--
  SYNC IMPACT REPORT
  ==================
  Version change: 1.1.0 → 2.0.0 (MAJOR — principles redefined and sections removed)

  Modified principles:
    - I. Clean Code & Readability → VII. Code as Documentation (merged with the
      frontend base article; Python-specific guidance dropped)
    - II. Code Style Standards → X. Code Style & Formatting (frontend only;
      pre-commit commands aligned with real npm scripts)
    - III. Naming Conventions → XI. Naming Conventions (explicit file-naming
      exception for React components, hooks, and utilities)
    - IV. Testing & Quality Assurance → Quality Standards > Testing (behavior-
      focused testing rules from the frontend base added)
    - V. Semantic HTML & Accessibility → Quality Standards > Accessibility &
      Semantic HTML and Quality Standards > Internationalization (Romanian
      locale added to the parity list)
    - VI. Pre-Commit Compliance → Development Workflow > Local Quality Gate
    - Backend Standards > Commit Standards → VI. Commit Messages (root format
      `<type>: <description>`; `style` type and scopes removed)
    - Frontend Standards > Component Guidelines → XII. Component Architecture
    - Design System Compliance → XIII. Styling, BEM & Design Tokens (Unnnic is
      the visual reference; tokens live in `src/styles/variables.scss`)

  Added principles:
    - I. Version Control and Review
    - II. Security and Secrets
    - III. Observability
    - IV. Versioned Contracts
    - V. Specification Traceability & No Silent Divergence
    - VIII. Type Safety
    - IX. Single Responsibility
    - XIV. State Management
    - XV. Async State Correctness
    - XVI. API Integration & Data Boundaries
    - Quality Standards > Performance, Defensive Programming, Maintainability
    - Development Workflow > Changelog Maintenance

  Removed sections:
    - Backend Standards (Python/Django guidance; this repository is frontend only)
    - Python items from Code Style, Naming, and Pre-Commit articles

  Templates requiring updates:
    - .specify/templates/spec-template.md ⚠ pending: lacks the mandatory
      "Inheritance from Product Spec" section (Principle V)
    - .specify/templates/plan-template.md ✅ no changes needed (Constitution
      Check reads this file)
    - .specify/templates/tasks-template.md ✅ no changes needed

  Follow-up TODOs:
    - TODO(TYPESCRIPT_TOOLCHAIN): add `tsconfig.json` (strict), Babel/Jest
      TypeScript support, `ts`/`tsx` in Jest `moduleFileExtensions` and
      coverage, and `--ext .ts,.tsx` in `npm run lint`. Until then new
      TypeScript files cannot be built or tested (Principle VIII).
    - TODO(CHANGELOG): create `CHANGELOG.md` in Keep a Changelog format; the
      package is published to npm and currently relies only on generated
      GitHub release notes (Development Workflow > Changelog Maintenance).
    - TODO(PRE_COMMIT_HOOKS): no git hook runner is configured; the local
      quality gate is enforced by convention and CI only.
    - TODO(BRANCH_PROTECTION): confirm GitHub branch protection on `main`
      requires one approval plus green `Linting on Push` and
      `Run tests and upload coverage` checks (Principle I).
    - TODO(SPEC_INHERITANCE): specs 001–005 under `specs/` predate Principle V
      and lack the inheritance section; new specs MUST include it.

  Provenance:
    - Source: weni-ai/vtex-cx-engineering-constitutions (main)
    - Bases: base-constitution.md, frontend/base-constitution.md
    - Domains: frontend
    - Project layer: preserved and adapted from constitution 1.1.0
-->

# Weni AI Webchat React Constitution

## Core Principles

### I. Version Control and Review

All code MUST enter `main` through a pull request. A merge MUST require at least
one approved review from a code owner listed in `.github/CODEOWNERS` and a green
CI run of `Linting on Push` (`npm run lint`) and `Run tests and upload coverage`
(Jest with the coverage gate). Direct pushes to `main` MUST be blocked through
GitHub branch protection.

**Rationale:** the policy is only real when the platform enforces it, not when
it depends on trust. Peer review and a protected `main` keep history auditable
and stop unreviewed changes from reaching the CDN bundle and the npm package.

### II. Security and Secrets

Secrets MUST never be committed. CI credentials (AWS, Codecov, Jira) MUST come
from GitHub Actions secrets and be injected at runtime; `.npmrc` MUST NOT hold
registry tokens. Access MUST follow least privilege. Dependencies MUST come only
from the npm registry or trusted sources and MUST be checked for known
vulnerabilities (`npm audit`) before release. Any HTML coming from messages or
external sources MUST be sanitized through `src/utils/sanitizeHtml.js`
(DOMPurify) before rendering.

**Rationale:** the widget runs inside third-party storefronts, so leaked
credentials, compromised dependencies, or unsanitized HTML expose every host page
at once. Prevention is far cheaper than remediation.

### III. Observability

Logs MUST be structured and MUST never contain secrets or sensitive personal data
(phone numbers, emails, addresses, cart or order contents). Debug statements
(`console.log`) MUST NOT ship in production code; intentional error reporting
MUST use `console.error` or `console.warn` with a stable, searchable message.
Errors MUST be traceable across components by including the identifiers already
available in the session context (for example, the channel UUID or session ID
from `@weni/webchat-service`).

**Rationale:** the widget's console output appears inside customer storefronts.
Structured, privacy-safe logs make incidents diagnosable without leaking end-user
data into third-party pages.

### IV. Versioned Contracts

The public interface of this project MUST follow SemVer. It includes the
`@weni/webchat-template-react` package exports, the `window.WebChat` API and
`init` options of the standalone UMD bundle, documented CSS custom properties,
and the `weni-` class names that host pages may override. Changes MUST be
backward compatible or ship with an announced deprecation path. Silent breaking
changes MUST NOT be introduced. Updating the pinned `@weni/webchat-service`
peer dependency MUST be treated as a contract change.

**Rationale:** storefronts load `v3/webchat-latest.umd.js` directly, so a breaking
change reaches every customer the moment it is released. Explicit versioning and
deprecations give consumers a predictable way to adapt without outages.

### V. Specification Traceability & No Silent Divergence

Every engineering spec under `specs/<feature>/` MUST derive from exactly one
approved product spec and MUST reference it through an immutable, pinned version
(commit or tag); a mutable URL or ID alone MUST NOT be used. The product spec
MUST exist and be tagged before its engineering spec is created. An engineering
spec MUST NOT redefine the "what" it inherits: problem, scope, success criteria,
and binding decisions belong to the product spec. A technical architecture
document SHOULD be produced for non-trivial features; when it exists it MUST be
linked from the engineering spec and pinned by commit or tag, but its absence
MUST NOT block the engineering spec.

Every engineering spec MUST open with an inheritance section in exactly this
format:

```
## Inheritance from Product Spec
- Product Spec: <title> — <URL>
- Pinned version: <commit/tag>
- Architecture doc: <none | URL + commit/tag>
- Inherited binding decisions: <short list>
- Scope of this spec: <slice implemented by this repo>
- Divergences: <none | link to amendment>
```

When a technical need contradicts scope, success criteria, or a binding decision
inherited from the product spec, the divergence MUST NOT be implemented silently.
It MUST be raised as an amendment in the product repository and recorded in the
`Divergences` field with a link to that amendment. Once the amendment is approved
and tagged, `Pinned version` MUST be updated to the new tag. A technical choice
that contradicts nothing inherited is an implementation decision and MUST be
recorded in the engineering spec.

**Rationale:** pinning the product spec ensures every team implements the same
version of a feature. Routing divergences through amendments keeps intent and
implementation aligned and leaves an audit trail. A single inheritance format
keeps the link machine-checkable across repositories.

### VI. Commit Messages

Commits MUST follow Conventional Commits in the form `<type>: <description>`.
Allowed types are `feat`, `fix`, `docs`, `refactor`, `test`, and `chore`; version
bumps use `chore` (for example, `chore: bump version to 2.14.0`). The description
MUST be imperative, specific, and no longer than 50 characters. Commits MUST be
atomic, with one logical change per commit.

**Rationale:** conventional commits enable automated changelogs and semantic
versioning. Atomic commits simplify bisecting, reverting, and reviewing.

### VII. Code as Documentation

All code MUST be written in English, including identifiers, comments, and
documentation. Domain terms or acronyms that only make sense in the original
language MAY stay untranslated. Code MUST favor readability over brevity, with
self-descriptive names that fit their context. Code MUST be organized in reading
order: the relevant actions first, then their dependencies and definitions.
Non-trivial decisions MUST be documented with concise comments that explain the
"why", never the "what".

**Rationale:** a globally readable codebase allows cross-team and open-source
contribution. Self-explanatory code reduces onboarding cost, and comments about
reasoning protect invariants that the code cannot show.

### VIII. Type Safety

All new files MUST be written in TypeScript, and TypeScript strict mode MUST be
enabled. Existing `.js`/`.jsx` files SHOULD only be modified for bug fixes or
small changes; substantial modifications SHOULD include migration to TypeScript.
Type definitions MUST be explicit. `any` MUST NOT be used; at untyped
external-library boundaries use `unknown` with type guards or a local type
declaration. Until a component is migrated, its props MUST stay declared with
`prop-types`.

The TypeScript toolchain is not configured yet (see `TODO(TYPESCRIPT_TOOLCHAIN)`).
The first feature that adds a TypeScript file MUST include that setup: a strict
`tsconfig.json`, Babel/Jest support, `ts`/`tsx` in Jest coverage, and lint
coverage for `.ts`/`.tsx`.

**Rationale:** static typing catches errors at compile time, improves tooling,
and documents the code inline. Incremental migration enables adoption without
blocking delivery.

### IX. Single Responsibility

Each file SHOULD contain no more than 350 lines. Each function MUST have one
responsibility. Rendering logic MUST be moved out of JSX into derived variables,
memoized values, or custom hooks under `src/hooks/` so the markup stays
declarative. Complex conditional rendering MUST be expressed through descriptive
boolean variables (for example,
`const shouldShowMediaActions = !isVoiceModeActive && hasNoTextInput`).

**Rationale:** small, focused units are easier to test, review, and refactor.
Readable JSX makes a component's visual structure immediately apparent.

### X. Code Style & Formatting

Formatting MUST be delegated to Prettier, and code quality to ESLint through
`@weni/eslint-config/react16.js` (`eslint.config.mjs`). ESLint MUST NOT define
formatting rules that conflict with Prettier; if they conflict, Prettier wins and
the ESLint rule MUST be removed.

- Files MUST NOT contain trailing whitespace, and empty lines MUST be empty.
- Code MUST use 2-space indentation, semicolons, single quotes (except in JSX
  attributes), spaces inside object braces, parentheses around single arrow
  parameters, and trailing commas in multiline structures.
- Multi-attribute JSX elements MUST place one attribute per line.
- Lines SHOULD stay under 80 characters where practical.
- Unused imports and variables MUST be removed; intentionally unused parameters
  MUST use the `_` prefix (`argsIgnorePattern: '^_'`).
- Object maps MUST replace `switch` statements that map inputs to outputs or
  route to handlers (`const HANDLERS = { key: fn }; HANDLERS[value]?.()`).

**Rationale:** a single opinionated formatter removes style debates from review.
Object maps keep dispatch flat, testable, and easy to extend.

### XI. Naming Conventions

Variables and functions MUST use `camelCase`. Components MUST use `PascalCase`.
Abbreviations MUST be avoided unless universally understood; clarity takes
precedence over brevity.

**Project exception to the frontend base (lowercase file names):** React
component files and their folders MUST use `PascalCase`, matching the component
they export (`src/components/Chat/Chat.jsx`, `Chat.scss`, `Chat.test.jsx`).
Hooks, utilities, services, and contexts MUST use `camelCase` file names matching
their primary export (`useVoiceMode.js`, `vtexCustomFields.js`). Other
directories (`src/hooks`, `src/utils`, `src/services/voice`) MUST be lowercase.
Justification: this is the established React convention throughout the codebase;
renaming would break imports and churn history with no benefit to readers.

**Rationale:** consistent, predictable naming lowers cognitive load and keeps
files searchable by the symbol they contain.

### XII. Component Architecture

Components MUST be named descriptively and reflect their purpose, using scope
prefixes where helpful (for example, `ChatPresentation`, `ConnectionStatusBanner`).
Related components MUST be grouped in a folder under `src/components/`, and
screens MUST live under `src/views/`. Props MUST have descriptive names
(`userName`, `userEmail`). Event props MUST be prefixed with `on`
(`onUserEmailChange`). Handlers that update state SHOULD be prefixed with
`handle` (`handleUserPermissions`). State variables MUST say what they represent
(`isLoadingUser`, `errorStatusUser`).

Existing shared components in `src/components/common/` (`Button`, `Icon`,
`Avatar`, `Dropdown`, `Tooltip`, and others) MUST be used instead of raw elements
(`<button>`, `<i>`) for the same UI pattern. When a shared component does not
fully match a design, it MUST be extended through `className` and SCSS overrides,
not bypassed.

**Rationale:** predictable component structure keeps the codebase navigable.
Shared components carry design-system consistency, accessibility defaults, and
interaction patterns that raw elements would lose.

### XIII. Styling, BEM & Design Tokens

CSS selectors MUST use classes only; IDs are reserved for JavaScript targeting
when no alternative exists. Inline styles MUST NOT be used except for values
computed at runtime (such as theme CSS custom properties). Nested selectors
SHOULD be avoided. Class names MUST follow BEM with the `weni-` block prefix:
blocks are independent components (`.weni-chat-header`), elements use double
underscores (`.weni-chat-header__title`), modifiers use double hyphens
(`.weni-widget--bottom-right`), and elements MUST NOT be nested in names
(`.block__elem`, not `.block__elem1__elem2`). Styles are scoped under
`.weni-widget` by `postcss-prefix-selector`, and new global selectors MUST NOT
bypass that scoping.

The **Unnnic Design System** (https://unnnic.stg.cloud.weni.ai/) is the visual
reference for components, spacing, typography, and color. Because Unnnic ships
Vue components, this React project implements its own components using the
equivalent SCSS tokens in `src/styles/variables.scss`. Raw pixel or color values
MUST NOT be used where a token exists; the only exceptions are decorative values
with no close token (such as `2px` borders or a `9999px` pill radius). For values
between tokens, use SCSS arithmetic (`$spacing-10 + $spacing-1` for 44px).
Missing patterns SHOULD be reported to the design system team.

| Token | Values |
|-------|--------|
| `$spacing-*` | `0`(0), `1`(4px), `2`(8px), `3`(12px), `4`(16px), `5`(20px), `6`(24px), `7`(28px), `8`(32px), `10`(40px) |
| `$border-radius-*` | `0`(0), `1`(4px), `2`(8px), `3`(12px), `4`(16px), `full`(100%) |
| `$icon-size-*` | `2`(8px), `3`(12px), `4`(16px), `5`(20px), `6`(24px), `7`(32px), `10`(40px) |
| `$font-*` | `$font-emphasis`, `$font-body`, etc. |
| Colors | `$gray-*`, `$teal-*`, `$green-*`, `$blue-*`, `$purple-*`, … (`50`–`950`) |

**Rationale:** the widget is embedded in arbitrary host pages, so BEM with a
`weni-` prefix and selector scoping prevent style collisions in both directions.
Tokens are the single source of truth for the visual language and keep the widget
aligned with Unnnic.

### XIV. State Management

Shared state MUST be managed through React Context providers in `src/contexts/`
(`ChatContext`, `ConversationStartersContext`, `MessagesScrollContext`,
`OrderFormContext`). Chat and session state MUST come from `@weni/webchat-service`
through `useWeniChat`, and MUST NOT be mirrored in component state. State MUST NOT
be duplicated across components or contexts. Related state SHOULD be grouped in
cohesive objects or contexts. Local component state SHOULD be preferred when data
does not need to be shared.

**Rationale:** a single owner for each piece of state prevents synchronization
bugs and keeps data flow traceable. Context boundaries that mirror features make
testing simpler.

### XV. Async State Correctness

Async operations (network calls, voice sessions, media capture) MUST track
loading, success, and error states consistently. Silent failures MUST NOT occur;
errors MUST be surfaced to the user or logged according to Principle III.
Contradictory states (for example, loading and error at the same time) MUST be
prevented. Double submissions MUST be guarded against. State MUST be rolled back
when an operation fails after an optimistic update.

**Rationale:** incorrect async state is one of the most common sources of broken
UX. Users must always know what is happening.

### XVI. API Integration & Data Boundaries

HTTP calls MUST be encapsulated in dedicated service or integration modules
(`src/services/`, or existing integration modules such as `src/utils/vtex.js`,
`src/utils/vtexCustomFields.js`, and `src/utils/availabilityNotify.js`), not in
components. New code MUST NOT call `fetch` directly from components, views, or
contexts. Error handling MUST be explicit; API errors MUST NOT surface as
unhandled exceptions, and loading and error states MUST be reflected in the UI.

Backend contracts MUST stay at the service boundary. Internal code MUST use
`camelCase`; `snake_case` fields from Weni or VTEX APIs MUST be normalized in the
adapter layer and MUST NOT leak into contexts, business logic, or components.
DTOs or raw API types that intentionally represent the backend contract MAY keep
the backend naming.

**Rationale:** isolating integrations enables reuse, simplifies mocking in tests,
and keeps components focused on rendering. Normalizing at the edge decouples the
UI from backend implementation details.

## Quality Standards

### Testing

Every feature MUST include unit tests before code review. Components, hooks, and
utilities with business logic MUST be tested. New test files MUST be colocated
with the code they test as `<name>.test.js(x)` siblings; the legacy `test/` tree
MAY be maintained but MUST NOT receive tests for new modules. Tests MUST verify
behavior and outcomes through `@testing-library/react` and
`@testing-library/user-event`, not implementation details. Tests MUST NOT be
added only to raise coverage; a test that would still pass after a regression
MUST be fixed or removed.

- Coverage MUST stay at or above 80% for statements, branches, functions, and
  lines. CI enforces this through `COVERAGE_THRESHOLD` in `unit-tests.yaml`.
- Unit tests MUST NOT depend on external services. Network calls, the
  `@weni/webchat-service` package (`test/__mocks__/@weni/webchat-service.js`),
  `localStorage`, `IntersectionObserver`, and `ResizeObserver` MUST be mocked.
- Happy paths, error paths, and loading, error, and success states of async
  operations MUST be covered.
- Components using `useTranslation` rely on the centralized
  `test/__mocks__/react-i18next.js` mapped in `jest.config.js`, which resolves
  keys from the English locale. Custom translation overrides MUST use an inline
  `jest.mock('react-i18next', ...)` following `src/views/Cart.test.jsx`.

**Rationale:** colocated, behavior-focused tests survive refactors and catch real
regressions. The coverage gate across all four metrics, including functions,
prevents exported code from shipping untested.

### Accessibility & Semantic HTML

Interactive elements MUST be keyboard accessible and MUST have visible focus
states. Form inputs MUST have associated labels. Color MUST NOT be the only means
of conveying information. Images MUST have meaningful `alt` text or `alt=""` when
decorative. Markup MUST use semantic tags (`header`, `nav`, `main`, `section`,
`article`, `aside`, `footer`, `hgroup`) and keep a correct heading hierarchy
instead of nested `div`s. `<section>` SHOULD replace `<div>` for meaningful
grouped content. Interactive elements such as `<button>` MUST contain only
phrasing content (`<span>`), never `<p>` or `<div>`. Elements SHOULD carry
descriptive BEM classes even when unstyled.

**Rationale:** accessibility is a legal requirement in many jurisdictions and
improves usability for every shopper using the widget.

### Performance

Unused dependencies MUST be removed. Heavy computations triggered by frequent
events (typing, scrolling, streaming, viewport resize) MUST be memoized,
throttled, or debounced. Images, icons, and fonts MUST be optimized; SVG icons
MUST be imported through `vite-plugin-svgr`. The bundle-size impact of a new
dependency SHOULD be evaluated before it is added, because the standalone UMD
bundle (with injected CSS) loads on every host page. Initial load SHOULD
prioritize the launcher and above-the-fold content.

**Rationale:** the widget competes with the host storefront for bandwidth and
main-thread time. A lean bundle protects the customer's page performance and
conversion.

### Internationalization

User-facing strings MUST NOT be hardcoded; they MUST use `react-i18next`
(`useTranslation` and `t()`). This applies to visible text and to `aria-label`,
`aria-labelledby`, `title`, and `placeholder`. Every new key MUST be added to all
locale files in `src/i18n/locales/` (`en.json`, `pt.json`, `es.json`, `ro.json`)
before merge. Error messages from service layers MAY keep English strings as
internal fallbacks and MUST be translated at the UI layer using i18n keys with
`defaultValue`. Dates, numbers, and currencies MUST be formatted with the
user's locale (see `src/utils/currency.js` and `src/utils/formatters.js`).

**Rationale:** externalized strings make translation possible without code
changes, and the localization workflow opens tickets from locale diffs.
Locale-aware formatting builds trust with international shoppers.

### Defensive Programming

Defensive guards (null checks, fallback branches, runtime assertions) SHOULD only
be added when the invalid state is realistically reachable, which includes
host-page data such as the VTEX order form or the PDP product data. Root causes
MUST be fixed rather than masked. Guards MUST follow the patterns already
established in the surrounding code.

**Rationale:** unnecessary guards obscure the real logic. Fixing root causes
produces more robust code than adding layers of protection.

### Maintainability

Business rules MUST NOT be duplicated; they MUST be centralized in a single
source of truth (for example, constants in `src/utils/constants.js` or a single
integration module). Local duplication of utility code MAY exist when extraction
would create unnecessary coupling. Abstractions SHOULD only be created when a
clear pattern repeats across multiple use cases.

**Rationale:** premature abstraction creates coupling worse than the duplication
it removes. Centralize business rules and tolerate incidental duplication.

## Development Workflow

### Local Quality Gate

Before pushing, contributors MUST run the gate in this order and fix every
failure:

1. `npx prettier --write <changed files>` (format first to avoid lint conflicts)
2. `npm run lint -- --fix`, then `npm run lint` with zero errors
3. `npm test -- --coverage`, with all four metrics at or above 80%

If git hooks are introduced (see `TODO(PRE_COMMIT_HOOKS)`), they MUST NOT be
bypassed with `--no-verify`, except for an urgent hotfix approved by a code
owner.

**Rationale:** running the CI checks locally keeps pull requests green and review
focused on behavior rather than formatting.

### Changelog Maintenance

Because `@weni/webchat-template-react` is a published library, it MUST maintain
`CHANGELOG.md` in Keep a Changelog format (see `TODO(CHANGELOG)`). Every
user-facing change MUST be listed under the correct category (Added, Changed,
Deprecated, Removed, Fixed, Security). Version bumps MUST follow SemVer through
`npm version` (tags without the `v` prefix, as configured in `.npmrc`), and
the changelog entry MUST be part of the release PR.

**Rationale:** a maintained changelog tells integrators what changed and
complements the generated GitHub release notes. SemVer alignment sets
predictable upgrade expectations.

## Governance

This constitution supersedes all other coding practices in the Weni AI Webchat
React project. All contributors MUST comply. Plans MUST pass the Constitution
Check in `.specify/templates/plan-template.md`, and `/speckit.analyze` treats any
conflict with a `MUST` as CRITICAL. Base articles come from
`weni-ai/vtex-cx-engineering-constitutions`: the root constitution prevails over
the frontend base, and the frontend base prevails over this project layer unless
an article states an explicit, justified exception.

**Amendment Process**:
1. Propose changes through a PR that edits `.specify/memory/constitution.md`.
2. Changes require approval from a code owner.
3. Record the version bump and rationale in the Sync Impact Report.
4. Update dependent Speckit templates when principles change.

**Versioning Policy**:
- MAJOR: backward-incompatible principle changes, redefinitions, or removals
- MINOR: new principles or sections, or materially expanded guidance
- PATCH: clarifications, wording improvements, typo fixes

**Compliance Review**:
- Every PR MUST verify alignment with these principles.
- Code reviews MUST check convention compliance.
- Added complexity MUST be justified in the PR description.

**Version**: 2.0.0 | **Ratified**: 2026-02-13 | **Last Amended**: 2026-10-01
