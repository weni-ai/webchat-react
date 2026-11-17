# Engineering Spec Quality Checklist: Resolve the VTEX IO `orderFormId` from the checkout API

**Purpose**: Validate the engineering spec before planning or implementation
**Created**: 2026-11-17
**Feature**: [spec.md](../spec.md)

## Origin

- [x] Product Spec is `none`, and the origin section matches the format required by the constitution, field for field
- [x] Problem and acceptance criteria are concrete and observable
- [x] Every acceptance criterion maps to a test in this repository

## Technical Completeness

- [x] Scope in this repository is bounded, and what other repos own is named
- [x] Current state references real paths in this codebase
- [x] Technical approach names the components affected and the flow between them
- [x] Every changed public interface appears in Contracts with its SemVer impact
- [x] Backward compatibility or a deprecation path is stated for each breaking change
- [x] Data model and migration reversibility are covered, or the feature persists nothing
- [x] Peak load is declared as a peak, with its window
- [x] Observability states what is logged, with which context, and which correlation identifier
- [x] Failure handling states timeouts, retriable failures, bounds and idempotency
- [x] The trust boundary and the server-side authorization check are identified

## Verifiability

- [x] Every success or acceptance criterion maps to a test in this repository
- [x] Flow coverage covers complete use cases, not only isolated methods
- [x] Failure paths are covered, not only the success path
- [x] Rollout and rollback are described, and rollback is safe

## Constitution

- [x] Every principle this feature touches has a row in Constitution Alignment
- [x] Every departure from a MUST is justified in the spec, not left to the code
- [x] No obligation of the constitution is left as an unfilled placeholder

## Notes

- Validation passed on the first iteration.
- The feature persists nothing, so `## Data Model and Migrations` was removed from the spec. `## Divergences` was removed because there is no Product Spec. `## Open Questions` was removed because no `[NEEDS CLARIFICATION]` marker was needed.
- `@weni/webchat-service` needs no change: it only forwards the `orderFormId` it receives and never reads `localStorage.orderform`. No prompt for a service spec was produced.
- One claim still needs confirming during `/speckit-plan` (`research.md`): that `vtex.order-manager` seeds its React Context from `localStorage.orderform` before its query resolves. It is the reason Apollo and Context are dropped as sources along with `localStorage`. The decision stands even if it is not confirmed, because the checkout `GET` is the only source bound to the cookie.
