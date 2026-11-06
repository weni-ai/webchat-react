# Research: Back-in-stock only mode (`shoppingAssistantDisabled`)

## TypeScript toolchain, and nothing else

**Decision**: Add the toolchain the constitution already requires for the first TypeScript file, and do not migrate existing JavaScript.

- `typescript` and `@babel/preset-typescript` as devDependencies.
- `tsconfig.json` with `strict: true`, `noEmit: true`, `moduleResolution: "bundler"`, `jsx: "react-jsx"`, `baseUrl: "."`, and `paths` for `@/*`. `include` is `src/**/*.ts` and `src/**/*.tsx`. `exclude` is `src/**/*.test.ts` and `src/**/*.test.tsx`, so `tsc` does not follow imports into the existing JSX.
- `babel.config.js`: add `@babel/preset-typescript` last in the `presets` array, so Babel runs it before `preset-react` and `preset-env`.
- `jest.config.js`: add `ts` and `tsx` to `moduleFileExtensions` and to `collectCoverageFrom`. The transform regex already matches them.
- `package.json`: `lint` becomes `eslint src --ext .js,.jsx,.ts,.tsx`. Add `typecheck`: `tsc --noEmit`.
- No Vite change. `@vitejs/plugin-react` already strips types through esbuild, for `npm run dev`, `npm run build`, and `npm run build:standalone`.

**Rationale**: Principle VIII and `TODO(TYPESCRIPT_TOOLCHAIN)` say the first feature that adds a `.ts` file owns this setup. ESLint 9.39 still accepts `--ext` (`npx eslint --help`), and `@weni/eslint-config/react16.js` already parses files with `@typescript-eslint/parser`. `eslint.config.mjs` already lists `**/*.{js,jsx,ts,tsx}`. The gap is the lint script, Jest's extension list, Babel, and `tsc`. Excluding tests from `tsc` keeps the check on `shoppingAssistantMode.ts`, which imports nothing from JSX. Jest still runs the `.test.ts` files through Babel.

**Alternatives considered**:

- Typecheck the whole `src/` tree with `allowJs`. That fails on the existing JavaScript and is a migration, not this feature.
- Skip `tsc` and rely on Babel. Babel strips types and does not enforce `strict`.
- A new ESLint parser block. The shared config already sets the TypeScript parser.

## Where the mode is applied

**Decision**: `applyShoppingAssistantMode` runs inside `ChatProvider`, on the merged config, before `new WeniWebchatService`. `standalone.jsx` records the flag for `send` and `setConversationStarters`, and `init` warns, but it does not export `mapConfig`.

**Rationale**: The service constructor throws when `socketUrl` or `channelUuid` is missing (`validateConfig` in the linked service). `ChatProvider` is the only place that constructs it, for both `WebChat.init` and a host that renders `Widget` directly. Applying the mode there covers both entries. `mapConfig` stays private. The standalone bundle is a UMD library whose entry is `src/standalone.jsx` (`vite.config.standalone.js`). Adding a named export next to `export default WebChat` makes Rollup return a namespace object and assign that to the `WebChat` global, which breaks `window.WebChat.init`. The explicit `window.WebChat = { default: WebChat }` inside the module does not win: the UMD wrapper assigns the factory's return value afterwards.

`send` and `setConversationStarters` do not see React state. `init` stores the flag in a module variable, next to `widgetInstance`.

**Alternatives considered**:

- Export `mapConfig` for the tests. Rejected because of the UMD return value.
- Apply the mode only in `mapConfig`. A host using the React entry would still construct the service with empty connection values and throw.

## The service never connects in this mode

**Decision**: Force `connectOn: 'manual'` and do not add a service change. Fill a missing `socketUrl` with `wss://shopping-assistant-disabled.invalid` and a missing `channelUuid` with `shopping-assistant-disabled`. Keep values the host actually passed.

**Rationale**: In the linked service, `init` connects only when `mode === 'live'` and `connectOn` is `'mount'`, or `'demand'` with a queued message (`src/index.js`). `runQueue` connects on its own only for `'demand'`. `'manual'` does neither. `validateConfig` only checks that both strings are non-empty. `hideWhenNotConnected` is stored on the widget config and is not read by the service or by any component, so it does not hide the widget. The widget hides through the render gate in `WidgetContent`, not through that flag.

The `.invalid` host cannot resolve. A future service that connected despite `'manual'` would fail locally instead of reaching Weni.

**Alternatives considered**:

- A headless mode in the service. The developer chose placeholders.
- Leaving `connectOn` as given and skipping `connect()` in the widget. `init` and `runQueue` would still connect.

## What stays mounted while the widget draws nothing

**Decision**: `ChatProvider` and `ConversationStartersProvider` stay mounted. `WidgetContent` returns `null` until `isBackInStockNotify` is true, or the chat is open on `back-in-stock-notify`.

**Rationale**: `useConversationStartersCore` runs inside the provider (`src/contexts/ConversationStartersContext.jsx`), above `WidgetContent`. Returning `null` from `WidgetContent` does not stop PDP detection. The offer can appear later without a second init. `isBackInStockNotify` is already on that context, and `WidgetContent` already calls `useConversationStarters`.

## Closing the chat instead of showing the conversation

**Decision**: "Not now", the header back button, and a pathname change call `setIsChatOpen(false)` and `clearPageHistory()`. Both are already on the chat context. The offer flag is left set, so the bubble and launcher remain.

**Rationale**: `goBack` and `clearPageHistory` alone pop the page stack and reveal `MessagesList`. Closing is what removes the panel. Leaving `isBackInStockNotify` set matches today's bubble, which stays until navigation.

## Changelog file

**Decision**: Create `CHANGELOG.md` if it is still absent, with one Unreleased Added entry for this option. Do not backfill older releases.

**Rationale**: The constitution requires a Keep a Changelog file and an entry for every user-facing change. The file does not exist (`TODO(CHANGELOG)`). This feature is the first user-facing change that has to satisfy that, so the file starts here. History before this stays in the GitHub release notes.
