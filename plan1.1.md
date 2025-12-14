# Phase 1.1: Extension Scaffold

## Goal
Setup Chrome extension with Manifest V3, TypeScript, and basic structure.

## Tasks

### 1. Project Setup
- [x] Initialize package.json with `bun init`
- [x] Add TypeScript config
- [x] Add build script (esbuild or tsup for bundling)

### 2. Manifest V3
- [x] Create `manifest.json` with:
   - name: "Ad Scanner"
   - version: "0.0.1"
   - permissions: `activeTab`, `scripting`, `storage`
   - host_permissions: `<all_urls>`
   - action (popup)
   - content_scripts entry
   - service_worker (background)

### 3. Core Files
- [x] `src/popup/popup.html` - basic UI shell
- [x] `src/popup/popup.ts` - popup logic stub
- [x] `src/content/content.ts` - content script stub
- [x] `src/background/background.ts` - service worker stub
- [x] `src/types.ts` - shared types

### 4. Build & Load
- [x] Build script outputs to `dist/`
- [x] Verify extension loads in chrome://extensions (ready to load)
- [x] Console.log from each script to confirm wiring

## Output Structure
```
adscanner/
├── dist/                 # built extension
├── src/
│   ├── background/
│   │   └── background.ts
│   ├── content/
│   │   └── content.ts
│   ├── popup/
│   │   ├── popup.html
│   │   └── popup.ts
│   └── types.ts
├── manifest.json
├── package.json
├── tsconfig.json
└── build.ts
```

## Success Criteria
- `bun run build` produces working dist/
- Extension loads in Chrome without errors
- All 3 scripts log to console on activation
