<!--
  SYNC IMPACT REPORT
  ==================
  Version change: 0.0.0 → 1.0.0 (Initial Creation)
  Modified principles:
    - Added Core Principles (I to VI)
  Added sections:
    - Backend Standards
    - Frontend Standards
    - Design System Compliance
    - Governance
  Removed sections: None
  Templates requiring updates:
    - .specify/templates/plan-template.md ✅ updated
    - .specify/templates/spec-template.md ✅ updated
    - .specify/templates/tasks-template.md ✅ updated
  Follow-up TODOs: None

  Amendment Rationale:
  - Initial creation of the Weni AI Webchat React constitution based on the Weni Roadmap constitution.
-->

# Weni AI Webchat React Constitution

## Core Principles

### I. Clean Code & Readability

All code MUST be self-documenting through expressive naming and clear intent. Well-written code does not require extensive comments—it explains itself.

**Non-negotiables**:
- Use self-descriptive names that fit the context of the code
- Follow the Zen of Python for backend: explicit over implicit, simple over complex, flat over nested
- Prefer clear and slightly longer code over terse and cryptic implementations
- Keep functions with a single responsibility
- Limit file length to ~350 lines (frontend) and maintain logical organization
- Organize code by "reading order": relevant actions first, then dependencies and definitions

### II. Code Style Standards

Backend and frontend code MUST adhere to their respective language style guides without exception.

**Universal Standards**:
- NEVER generate trailing whitespace in any file (code, config, documentation, templates)
- All lines MUST end with the line content only—no spaces or tabs after the last visible character
- Empty lines MUST be completely empty (zero characters before the newline)

**Backend (Python) Standards**:
- Follow [PEP 8](https://peps.python.org/pep-0008/) for formatting, naming, and layout
- Group imports: (1) standard library, (2) third-party, (3) local—separated by blank lines
- Use type annotations for all function signatures and variables
- Apply SOLID principles for maintainable, refactorable code
- Run Black and Flake8 via pre-commit hooks
- NEVER use f-strings without placeholders—use regular strings instead
- Remove unused imports before committing (caught by Flake8 F401)
- Avoid debug statements (`print`, `console.log`) in production code
- **Docstring Requirements (D401 compliance)**:
  - Start all docstrings with imperative mood verbs: "Return", "Calculate", "Validate", "Handle"
  - ✅ Good: `"""Return the user's full name."""`
  - ❌ Bad: `"""Returns the user's full name."""` or `"""User's full name."""`
  - For fixtures/test helpers: "Return mock data..." or "Provide test fixture..."
  - Rationale: Imperative mood makes function purpose immediately clear and follows PEP 257

**Frontend (Vue/TypeScript/React) Standards**:
- Use 2-space indentation consistently (enforced by ESLint and Prettier)
- Always use semicolons at statement ends
- Use single quotes for strings (except HTML attributes)
- Use spaces inside object braces: `{ foo: bar }` not `{foo: bar}`
- Use parentheses around single arrow function parameters: `(x) => x`
- Use trailing commas in multiline structures
- For multi-attribute elements, place one attribute per line with `>` on its own line
- Write all code in English (except domain-specific Portuguese terms)
- NEVER use `any` type—use `unknown` with type guards or specific types
- Remove unused imports and variables before committing
- Use underscore prefix for intentionally unused parameters: `_paramName`
- **ESLint/Prettier Integration (CRITICAL)**:
  - ESLint config MUST include `eslint-config-prettier` as the LAST config in the extends array
  - NEVER define formatting rules in ESLint that conflict with Prettier (indent, quotes, semi, etc.)
  - Run Prettier FIRST, then ESLint with `--fix`: `npm run format && npm run lint -- --fix`
  - If ESLint/Prettier conflict, Prettier wins—remove the conflicting ESLint rule
  - Rationale: Prettier is an opinionated formatter; ESLint is for code quality, not formatting

### III. Naming Conventions

Consistent naming patterns MUST be applied across the codebase to ensure navigability and understanding.

**Backend**:
- Follow PEP 8 naming: `snake_case` for functions, variables, modules; `PascalCase` for classes
- Use descriptive names that convey purpose without requiring comments

**Frontend**:
- Use `camelCase` for variables and functions
- Use `PascalCase` for component names (e.g., `AppHeader`, `UserProfile`)
- Use BEM methodology for CSS classes: `.block__element--modifier` (if not using utility-first CSS)
- Prefix event handlers with `on` (e.g., `onUserEmailChange`)
- Prefix state update methods with `handle` (e.g., `handleUserPermissions`)
- Name states clearly (e.g., `isLoadingUser`, `errorStatusUser`)

### IV. Testing & Quality Assurance

Testing is MANDATORY and MUST achieve minimum 80% code coverage **for all metrics** (statements, branches, functions, lines). Quality gates block untested code.

**Requirements**:
- All features MUST include unit tests before code review
- Unit tests MUST NOT depend on external services—mock all dependencies
- Test execution MUST be fast and reliable
- Pre-commit hooks MUST run: linters (Black, Flake8, ESLint), formatters, and unit tests
- CI pipeline MUST validate all tests and linting on push/PR
- Frontend MUST use ESLint, Prettier, and Stylelint (if applicable) for consistent code quality

**Coverage Requirements (80% minimum for ALL metrics)**:
- **Statements**: 80% of all code statements executed
- **Branches**: 80% of all conditional branches tested
- **Functions**: 80% of all functions/methods called (CRITICAL: often overlooked)
- **Lines**: 80% of all lines executed
- Rationale: Function coverage ensures all exported functions are tested, not just the code within them

**Component Testing Best Practices**:
- Use helper functions to mount components consistently with proper stubs
- Mock `localStorage`, `IntersectionObserver`, `ResizeObserver` in test setup
- Test both happy path and error scenarios for all user-facing functions
- Test loading states, error states, and success states for async operations
- For lifecycle hooks, verify they trigger expected behavior
- Avoid `any` types in test code—use proper TypeScript types for test helpers

### V. Semantic HTML & Accessibility

Frontend code MUST use semantic HTML to improve accessibility, SEO, and maintainability.

**Requirements**:
- Use semantic tags (`header`, `nav`, `main`, `section`, `article`, `aside`, `footer`) appropriately
- Maintain proper heading hierarchy (h1 → h6) for accessibility and SEO
- Avoid non-semantic structures (excessive `div` nesting)
- Add descriptive classes to elements even without styling for clarity
- Avoid inline styles; use external stylesheets with BEM methodology or utility-first framework

### VI. Pre-Commit Compliance

All code MUST pass pre-commit hooks before committing. Hooks validate formatting, linting, and basic quality checks.

**Pre-Commit Workflow** (CRITICAL ORDER):
1. Write code following constitution standards
2. Run formatters in this EXACT order (prevents conflicts):
   - **Backend**:
     1. `black .` (auto-formats code)
     2. `isort .` (sorts imports)
     3. `flake8 .` (checks for violations)
     4. Fix any remaining Flake8 errors manually (e.g., D401 docstrings)
   - **Frontend**:
     1. `npm run format` (Prettier formats code)
     2. `npm run lint -- --fix` (ESLint auto-fixes)
     3. `npm run lint:check` (verify no ESLint errors)
     4. `npm run stylelint:check` (verify CSS rules, if applicable)
     5. `npm test` (run tests and verify coverage ≥80%)
3. Stage all changes: `git add -A`
4. Attempt commit: `git commit -m "your message"`
5. If hooks fail:
   - Review error messages carefully
   - Let auto-fixers run (trailing-whitespace, end-of-file-fixer)
   - Re-stage modified files: `git add -u`
   - Re-attempt commit: `git commit` (reuses message)
6. NEVER use `--no-verify` (bypasses hooks) except emergency hotfixes with approval

**When Hooks Fail**:
- Review error messages carefully—they indicate exactly what to fix
- Let auto-fixers run (trailing-whitespace, end-of-file-fixer, Black)
- Re-stage files after auto-fixes: `git add -u`
- Re-attempt commit: `git commit` (reuses your message)
- NEVER use `--no-verify` except for urgent hotfixes (requires tech lead approval)

## Backend Standards

Backend development follows Weni's quality process lifecycle.

**API Development**:
- Create mock APIs with frontend before development (using Postman or similar)
- Mock MUST simulate: HTTP verbs, query params/body, response data, status codes, headers
- Final implementation MUST match mock contract exactly
- Notify frontend immediately if contract changes are required

**Code Quality Gates**:
- Pre-commit: Black, Flake8, unit tests, app-specific validations
- CI: All pre-commit checks in controlled environment
- PR: Must be self-descriptive and concise for efficient review
- Changelog and semantic versioning for all releases

**Commit Standards**:
- Use Conventional Commits format: `<type>(<scope>): <description>`
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- Keep commit messages under 50 characters
- Use imperative mood: "Add", "Remove", "Update"

## Frontend Standards

Frontend development follows Weni's coding conventions for consistency across all modules.

**File Guidelines**:
- Keep lines under 80 characters where possible
- Maintain logical code organization by "reading order"
- Keep template logic minimal—move complex conditionals to computed properties/hooks
- Use lowercase for directory and file names (or PascalCase for React component files if preferred by the team, but be consistent)
- Avoid excessive folder nesting (reduces cognitive complexity)

**Component Guidelines**:
- Name components descriptively with scope prefixes
- Group related components in folders
- Avoid abbreviations; prioritize clarity over brevity
- Document non-trivial logic with concise comments explaining "why" not "what"

## Design System Compliance

All user interfaces MUST use the **Unnnic Design System** as the single source of truth for visual components and patterns.

**Design System Reference**: https://unnnic.stg.cloud.weni.ai/

**Requirements**:
- Use Unnnic components for all UI elements (buttons, inputs, cards, modals, etc.)
- Follow Unnnic spacing, typography, and color tokens
- Do not create custom components when Unnnic equivalents exist
- Extend Unnnic components through composition, not modification
- Report missing components or patterns to the design system team

## Governance

This constitution supersedes all other coding practices within the Weni AI Webchat React project. All team members and contributors MUST comply.

**Amendment Process**:
1. Propose changes via PR to `.specify/memory/constitution.md`
2. Changes require review and approval from tech lead
3. Document version bump rationale (MAJOR/MINOR/PATCH)
4. Update dependent templates if principles change

**Versioning Policy**:
- MAJOR: Backward-incompatible principle changes or removals
- MINOR: New principles or materially expanded guidance
- PATCH: Clarifications, wording improvements, typo fixes

**Compliance Review**:
- All PRs MUST verify alignment with constitution principles
- Code reviews MUST check coding conventions compliance
- Complexity additions MUST be justified in PR description
- Runtime guidance: Reference this constitution for development decisions

**Version**: 1.0.0 | **Ratified**: 2026-02-13 | **Last Amended**: 2026-02-19