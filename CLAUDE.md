# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Inventory Management System (IMS) — a React Native / Expo app that renders a 3D truck model using Three.js. Users rotate the truck via touch gestures, tap compartments to zoom in and open them, then manage inventory items stored in an on-device SQLite database.

## Commands

```bash
npm install          # install dependencies
npx expo start       # start Expo dev server
npx expo start --android   # launch on Android
npx expo start --ios       # launch on iOS
```

No test runner, linter, or formatter is currently configured.

## Branch Strategy

- **develop** — active development branch
- **main** — production branch
- Feature branches merge into develop; develop merges into main for releases.

## Architecture

**Entry:** `index.ts` → `App.tsx` (registers root component via Expo).

### 3D Scene (`src/three/`)
- `createTruckScene.ts` — scene factory: sets up Three.js scene/camera/renderer/lighting inside Expo-GL, loads the truck model, runs the render loop, and returns a `TruckSceneController` that the React layer uses to rotate the truck, handle taps, open/close compartments, and dispose resources.
- `loadTruckModel.ts` — loads the `.glb` truck asset and returns the model + animation clips.
- `animations/cameraZoom.ts` and `animations/truckRotation.ts` — frame-by-frame tween helpers (ease-out cubic). Each exposes a state interface, a `create*` factory that snapshots the current value, and an `advance*` function called every frame by the render loop.

The scene communicates back to React via an `onCompartmentOpened` callback (fires once zoom/rotation animations finish).

### Gestures (`src/gestures/`)
- `createTruckPanResponder.ts` — wraps React Native's PanResponder. Drag rotates the truck; short-distance releases count as taps and raycast into the 3D scene. Both drag and tap are disabled while a compartment is open.

All rotation state is stored in refs (not React state) to avoid re-renders during continuous gesture updates.

### Database (`src/database/`)
- `database.ts` — opens/caches the SQLite DB and runs the schema (three tables in 2NF):
  - `compartments` (compartmentId PK, compartmentName UNIQUE)
  - `items` (itemId PK, itemName UNIQUE, itemUrl)
  - `compartment_items` (composite PK compartmentId+itemId, itemQuantity DEFAULT 1, FKs with CASCADE)
- `inventory.ts` — `saveInventoryItem()` upserts across all three tables in a transaction; `listCompartmentItems()` joins to return item names + quantities for a compartment.

Schema uses `IF NOT EXISTS` but UNIQUE constraints require a fresh DB if changed. Delete/reinstall the app to pick up schema changes during development.

### UI (`src/ui/`)
- `panels/InventoryPanel.tsx` — fullscreen overlay (90%) that scale+fade animates in after compartment zoom completes. Fetches and displays a FlatList of items from SQLite; re-fetches after saves.
- `panels/addPanel.tsx` — form for adding an item (compartmentName read-only, itemName, itemUrl optional, itemQuantity). Calls `saveInventoryItem` via the parent.
- `buttons/add.tsx`, `buttons/save.tsx` — reusable styled Pressable buttons.

### Data Flow (tap → panel → save)
1. User taps screen → PanResponder detects tap → `controller.handleScreenTap()` raycasts
2. Hit compartment → plays open animation, starts truck rotation + camera zoom
3. Camera zoom finishes → `onCompartmentOpened` callback fires → React sets state → InventoryPanel mounts
4. Panel queries SQLite for existing items, renders list
5. "Add Item" opens AddPanel → user fills form → Save calls `saveInventoryItem` → list refreshes
6. "Close" calls `controller.closeCompartment()` → plays close animation, zooms camera back, re-enables gestures

## Key Patterns

- **Scene controller pattern**: `createTruckScene` returns a plain object with methods rather than a class. The render loop runs via `requestAnimationFrame`; animations are driven by per-frame `advance*` calls, not timers.
- **Ref-based mutable state**: truck rotation, gesture start positions, and the scene controller itself are stored in `useRef` to avoid React re-renders during 60fps updates.
- **Expo-GL canvas mock**: Three.js expects a DOM canvas; the renderer receives a minimal shim (`{ width, height, style: {}, addEventListener: () => {} }`) cast to `any`.

## TypeScript

Strict mode is enabled (`tsconfig.json` extends `expo/tsconfig.base`). No custom path aliases.
