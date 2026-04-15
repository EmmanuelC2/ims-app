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
- `createTruckScene.ts` — scene factory: sets up Three.js scene/camera/renderer/lighting inside Expo-GL, loads the truck model, runs the render loop, and returns a `TruckSceneController` that the React layer uses to rotate the truck, handle taps, open/close compartments, and dispose resources. The controller also snapshots the initial camera position/lookAt so `closeCompartment()` can animate the camera back to the default view.
- `loadTruckModel.ts` — loads the `.glb` truck asset (via Expo `Asset.fromModule`) and returns the model + animation clips.
- `animations/cameraZoom.ts` and `animations/truckRotation.ts` — frame-by-frame tween helpers (ease-out cubic). Each exposes a state interface, a `create*` factory that snapshots the current value, and an `advance*` function called every frame by the render loop.

The scene communicates back to React via an `onCompartmentOpened` callback (fires once the camera zoom settles, which is the shared duration marking the end of the reveal).

Compartment orientation math: `handleScreenTap` computes a target truck Y rotation so the tapped compartment's outward normal faces world +Z, and uses the shortest angular path so accumulated user rotations don't cause the truck to spin the long way around.

### Gestures (`src/gestures/`)
- `createTruckPanResponder.ts` — wraps React Native's PanResponder. Drag rotates the truck; short-distance releases count as taps and raycast into the 3D scene. Drag is disabled while a compartment is open, but tap-release still fires so the user can tap another compartment without closing the panel first.

All rotation state is stored in refs (not React state) to avoid re-renders during continuous gesture updates.

### Database (`src/database/`)
- `database.ts` — opens/caches the SQLite DB and runs the schema (three tables in 2NF):
  - `compartments` (compartmentId PK, compartmentName UNIQUE)
  - `items` (itemId PK, itemName UNIQUE, itemUrl, itemImage)
  - `compartment_items` (composite PK compartmentId+itemId, itemQuantity DEFAULT 1, FKs with CASCADE)
  Includes a runtime migration that `ALTER TABLE`s `itemImage` onto older databases, since `CREATE TABLE IF NOT EXISTS` does not alter pre-existing tables.
- `inventory.ts`:
  - `saveInventoryItem()` — upserts compartment + item + junction in a transaction
  - `listCompartmentItems()` — joins all three tables to return rows for one compartment
  - `removeCompartmentItem()` — deletes only the junction row, keeping item/compartment rows reusable
  - `updateInventoryItem()` — edits name/url/image/quantity, including moving the item to a different compartment (delete + upsert junction)
  - `listAllCompartmentNames()` — feeds the edit panel's compartment dropdown

Schema uses `IF NOT EXISTS`. If UNIQUE constraints change, delete/reinstall the app during development. Column additions should follow the `itemImage` pattern: edit `SCHEMA_SQL` **and** add an `ALTER TABLE` backfill in `getDatabase()`.

### UI (`src/ui/`)
- `Button.tsx` — single reusable pressable with `variant` (`primary` | `success` | `danger`) and `compact` props. Replaces what used to be separate add/save/remove button files.
- `defaultItemIcon.ts` — shared fallback image reference (`src/images/icon-default.png`) used when an item has no user-picked image.
- `panels/InventoryPanel.tsx` — fullscreen overlay (90%) that scale+fade animates in after compartment zoom completes. Fetches a `FlatList` of items from SQLite; each row shows the item image (or default icon), name, quantity, and a DEL button. Tapping a row opens the EditPanel. Re-fetches after saves, edits, and deletes.
- `panels/addPanel.tsx` — form for adding an item (compartment read-only, itemName, image picker with preview + clear, itemUrl optional, itemQuantity). Wrapped in `KeyboardAvoidingView` + `ScrollView`.
- `panels/editPanel.tsx` — edit form with a custom compartment dropdown (Pressable trigger + `ScrollView.map`, **not** FlatList, to avoid "VirtualizedLists should never be nested" errors). Pre-fills all fields including the current image.

Text inputs set `autoComplete="off"` and `importantForAutofill="no"` to suppress Samsung Pass / Android autofill prompts.

### Data Flow (tap → panel → save/edit/delete)
1. User taps screen → PanResponder detects tap → `controller.handleScreenTap()` raycasts
2. Hit compartment → plays open animation, starts truck rotation + camera zoom
3. Camera zoom finishes → `onCompartmentOpened` fires → React sets state → InventoryPanel mounts
4. Panel queries SQLite for existing items, renders list with images
5. "Add Item" → AddPanel → user fills form (optionally picks an image via `expo-image-picker`) → Save calls `saveInventoryItem` → list refreshes
6. Tap a row → EditPanel → user edits fields/compartment/image → Update calls `updateInventoryItem` → list refreshes
7. DEL button → `removeCompartmentItem` → list refreshes
8. "Close" → `controller.closeCompartment()` → plays close animation, camera zooms back to default, re-enables gestures

## Key Patterns

- **Scene controller pattern**: `createTruckScene` returns a plain object with methods rather than a class. The render loop runs via `requestAnimationFrame`; animations are driven by per-frame `advance*` calls, not timers.
- **Ref-based mutable state**: truck rotation, gesture start positions, and the scene controller itself are stored in `useRef` to avoid React re-renders during 60fps updates.
- **Expo-GL canvas shim**: Three.js expects a DOM canvas; the renderer receives a minimal shim (`{ width, height, style: {}, addEventListener, removeEventListener, clientWidth, clientHeight }`) cast to `any`.
- **Scroll-safe dropdowns**: custom dropdowns inside a `ScrollView` use `.map()`, not nested `FlatList`, to avoid the nested-virtualized-list warning.
- **Image storage**: picked images are stored as local `file://` URIs on the `items.itemImage` column. `defaultItemIcon` is the single source of truth for the fallback.

## TypeScript

Strict mode is enabled (`tsconfig.json` extends `expo/tsconfig.base`). No custom path aliases.
