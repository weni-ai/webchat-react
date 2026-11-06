# Research: Back-in-stock logic and request in the service

## How local development resolves the service

**Decision**: Leave `peerDependencies["@weni/webchat-service"]` at `1.19.2`. Do not add it to `dependencies`. Use `npm link`.

**Rationale**: The service work is unpublished. `package.json` is a peer, not a direct dependency (`package.json` line 32). `npm link @weni/webchat-service` puts the local checkout at `node_modules/@weni/webchat-service`, and Vite resolves the peer from there. The lockfile entry for `1.19.2` stays. CI `npm ci` still installs `1.19.2`.

**Alternatives considered**:

- Bump the peer to `1.20.0`. That needs a published release, which this spec excludes.
- `file:../webchat-service` in `package.json`. That changes the lockfile and fails for anyone who does not have that relative path.

## Which build actually contains the new methods

**Decision**: Verify with `npm run dev` and `npm run build:standalone`. Do not treat `npm run build` as proof that the new service code is bundled.

**Rationale**: `vite.config.js` marks `@weni/webchat-service` external for the library build (`src/index.js` → `dist/index.esm.js` and CJS). That build keeps a bare import, so the host's copy of the service is what runs. `vite.config.standalone.js` sets `external: []`, so `webchat.umd.js` inlines the linked `dist/index.esm.js`. The dev server (`vite`, mode `development`) also resolves the link. Vite follows symlinks by default, so `npm link` needs no `preserveSymlinks` change.

The linked ESM build leaves `libphonenumber-js/max` external (service plan). This repo already depends on `libphonenumber-js`, so the standalone bundle and the dev server resolve that import to the copy already in this repo.

**Alternatives considered**: Bundle the service into the library build. That would change the package contract for every consumer and duplicate the peer.

## Tests and the link

**Decision**: Jest keeps `moduleNameMapper` pointing `@weni/webchat-service` at `test/__mocks__/@weni/webchat-service.js`. Hook tests keep using the local `mockService` object. Neither loads the link. The link is checked with a one-off Node import, documented in `quickstart.md`, not with a Jest test.

**Rationale**: A Jest test that imported the real package would fail in CI, where the peer is `1.19.2` and the link is absent. The spec says hook and view tests mock the service so CI stays green.

**Alternatives considered**: Drop the mapper when the link is present. That makes CI and laptops run different suites.

## Sales channel default

**Decision**: `getSalesChannel()` returns the raw channel string or `null`. It no longer returns `'1'`. The service applies `'1'`.

**Rationale**: The spec puts defaults in the service so the widget does not keep a second copy of the rule. Call sites are the notify submit path and `availabilityNotify.test.js`.

**Alternatives considered**: Keep returning `'1'` from the widget and also default in the service. Two owners for one rule.
