This is a comprehensive rewriting and extension of the provided specification.

**Key Extensions and Changes in this Version:**

1. **Architectural Pivot (Networking):** The previous reliance on manual Peer ID exchange is replaced with a defined Signaling Server architecture using WebSockets within Next.js. This is critical for a usable UX.
2. **Data Model Refactoring (CRDT Best Practices):** Shifted from monolithic arrays (`Y.Array<Card>`) to flat maps with unique IDs (`Y.Map<string, CardState>`). Player hands now only store arrays of Card IDs, not full card objects. This reduces data duplication and merge conflicts.
3. **Feature Expansion:** Added concepts of "Zones" (Deck zone, Hand zone, Table zone, Discard zone) to structure the gameplay area better than just "on table" vs "in hand."
4. **Transition Plan:** Added a specific section addressing how to move from the current 50% status to this new specification.

---

# Tabletop Simulator - Complete Specification (v2.0)

> **Status:** Specification for Target Architecture (v2.0)
> **Current Implementation State:** ~90% (v1.5 release). Core functionality complete, see Section 8 for remaining items.
> **Target:** Robust, P2P multiplayer card & dice platform with seamless onboarding.

---

## Table of Contents

1. [Overview](https://www.google.com/search?q=%231-overview)
2. [Technology Stack](https://www.google.com/search?q=%232-technology-stack)
3. [Architecture & Networking](https://www.google.com/search?q=%233-architecture--networking)
4. [Data Models (CRDT Structure)](https://www.google.com/search?q=%234-data-models-crdt-structure)
5. [Feature Specifications](https://www.google.com/search?q=%235-feature-specifications)
6. [System Components & API](https://www.google.com/search?q=%236-system-components--api)
7. [Testing Strategy](https://www.google.com/search?q=%237-testing-strategy)
8. [Transition Plan (v1.0 to v2.0)](https://www.google.com/search?q=%238-transition-plan-v10-to-v20)

---

## 1. Overview

### 1.1 Product Vision

A browser-based virtual tabletop focused on immediate accessibility and tactile feel. It allows users to instantiate standard game components (cards, dice) in a 3D space and interact with them physically in real-time with friends via WebRTC video and data channels.

### 1.2 Core Principles

1. **P2P First:** Game state and video travel directly between clients to minimize latency and server costs.
2. **Seamless Connection:** No manual exchange of technical IDs. Room URLs manage discovery automatically.
3. **Tactile 3D:** Interactions should feel physical—throwing dice, flipping cards—driven by a physics engine, not just abstract data changes.
4. **CRDT Truth:** The Yjs document is the single source of truth. The 3D scene is merely a reactive renderer of that state.

### 1.3 User Journey (Revised)

```mermaid
sequenceDiagram
    participant Host
    participant Server (Next.js API)
    participant Guest
    Host->>Server: Create Room POST /api/room
    Server-->>Host: Room ID (e.g., "XYZA")
    Host->>Host: Redirect to /room/XYZA
    Host->>Server: WS Connect (Room XYZA)
    Guest->>Guest: Opens /room/XYZA
    Guest->>Server: WS Connect (Room XYZA)
    Server-->>Host: Guest Connected event
    Server-->>Guest: Host Connected event
    Note over Host, Guest: Signaling via WS exchanged
    Host<->Guest: WebRTC Data/Media connection established
    Host->>Guest: Yjs Initial State Sync
    Guest->>Guest: Render 3D Scene
```

---

## 2. Technology Stack

| Layer                   | Technology                        | Purpose                                   |
| ----------------------- | --------------------------------- | ----------------------------------------- |
| **Full Stack**          | Next.js 15 (App Router)           | React framework, API routes for signaling |
| **Rendering**           | React Three Fiber (R3F)           | Declarative 3D scene management           |
| **Physics**             | @react-three/rapier               | Deterministic rigid body physics (WASM)   |
| **State Sync**          | **Yjs (CRDT)**                    | The core decentralized state engine       |
| **Networking (Data)**   | **simple-peer** (or PeerJS)       | WebRTC abstraction for data/media         |
| **Networking (Signal)** | **Socket.io** (Next.js API route) | Lightweight signaling for peer discovery  |
| **Persistence**         | y-indexeddb                       | Offline capability and faster reloads     |
| **Interactions**        | @use-gesture/react                | Unified touch/mouse drag & drop inputs    |
| **Styling**             | Tailwind CSS + shadcn/ui          | 2D UI overlays (hud, menus)               |

---

## 3. Architecture & Networking

This revised architecture addresses the critical gap of peer discovery by introducing a lightweight signaling server integrated into the Next.js backend.

### 3.1 Directory Structure (Revised)

```
src/
├── app/
│   ├── api/socket/route.ts     # WebSocket signaling server endpoint
│   ├── page.tsx                # Lobby
│   └── room/[roomId]/page.tsx  # Game container entry
├── components/
│   ├── canvas/                 # R3F 3D components
│   │   ├── GameScene.tsx       # Main R3F Canvas
│   │   ├── Table.tsx
│   │   ├── CardObject.tsx      # 3D representation of a card state
│   │   ├── DiceObject.tsx      # 3D representation of a dice state
│   │   └── Zones.tsx           # Visual areas (deck placement, discard)
│   ├── hud/                    # 2D React UI overlays
│   │   ├── BottomBar.tsx       # Hand view drawer, macro buttons
│   │   ├── TopNav.tsx          # Room sharing link, settings
│   │   └── VideoGrid.tsx       # WebRTC video feeds
│   └── providers/
│       └── GameRoomProvider.tsx# Manages socket, peers, and Yjs doc lifetime
├── hooks/
│   ├── networking/
│   │   ├── useSignaling.ts     # Socket.io connection management
│   │   ├── useWebRTC.ts        # simple-peer management & media streams
│   │   └── useYjsDataSync.ts   # Binds Yjs doc to WebRTC data channels
│   ├── logic/
│   │   ├── useCardActions.ts   # High-level actions (draw, shuffle)
│   │   └── useDiceActions.ts   # High-level actions (roll, clear)
│   └── simulation/
│       ├── useDicePhysics.ts   # Rapier integration & face detection
│       └── useObjectDrag.ts    # gesture-to-physics integration
└── lib/
    ├── constants.ts
    ├── utils.ts
    └── yjs-schema.ts           # TypeScript definitions of CRDT structure
```

### 3.2 The Networking Stack Diagram

The application uses a hybrid networking approach. A central server is used _only_ for initial discovery (signaling). Once peers connect, all game data and video flows directly between them.

```
[Next.js Server (Socket.io)]
       ^  ^
(Signal)|  |(Signal)
        v  v
   [Client A] <===(WebRTC Data Channel: Yjs Updates) IN PROGRESS===> [Client B]
   [Y.Doc A]  <===(WebRTC Media Channel: Video/Audio) IN PROGRESS===> [Y.Doc B]
```

---

## 4. Data Models (CRDT Structure)

The data model is refactored for CRDT efficiency. Instead of monolithic arrays, we use Maps with unique IDs to prevent index-based merge conflicts.

### 4.1 Root Document

```typescript
// lib/yjs-schema.ts

export type RootDoc = {
  // Global Game State
  gameState: Y.Map<string, any>; // e.g., { turnPhase: 'action', activePlayerId: 'xyz' }

  // The entities
  players: Y.Map<PlayerId, PlayerState>;
  cards: Y.Map<CardId, CardState>;
  dice: Y.Map<DiceId, DiceState>;
};
```

### 4.2 Entity States

```typescript
export type PlayerId = string; // nanoid

export interface PlayerState {
  id: PlayerId;
  name: string;
  color: string; // Hex code for UI identification
  hand: CardId[]; // Ordered list of Card IDs in their hand
  seatIndex: number; // 0-3 for table positioning
  cursorPos: { x: number, y: number, z: number } | null; // For shared cursors
}

export type CardId = string;
export type ZoneId = 'deck' | 'discard' | 'table' | string; // 'table' or playerID for hand

export interface CardState {
  id: CardId;
  // Intrinsic properties (immutable usually)
  suit: 'H' | 'D' | 'C' | 'S';
  rank: 'A' | '2' | ... | 'K';

  // Mutable State
  faceUp: boolean;
  zone: ZoneId; // Where is the card logically?
  ownerId: PlayerId | null; // If in hand, who owns it? (redundant with zone but useful)

  // 3D Transform (only relevant if zone === 'table')
  position: [x: number, y: number, z: number];
  rotation: [x: number, y: number, z: number, w: number]; // Quaternion
  lastInteractedBy: PlayerId | null; // For highlighting who moved it last
}

export type DiceId = string;
export type DiceType = 'd6' | 'd20';

export interface DiceState {
  id: DiceId;
  type: DiceType;
  // The result value. If isRolling is true, this is stale.
  resultValue: number | null;
  isRolling: boolean;
  rolledBy: PlayerId;

  // Physics state required for late-joiners to sync simulation
  position: [number, number, number];
  rotation: [number, number, number, number];
  // Optional: store linear/angular velocity if needed for extremely precise sync
}
```

---

## 5. Feature Specifications

### 5.1 Room Lifecycle (Revised)

1. **Host:** Landing page -> `POST /api/room` -> receives Room ID -> redirects to room url. Socket connects, joins room channel.
2. **Guest:** Opens URL. Socket connects, joins room channel.
3. **Signaling:** Socket server notifies existing peers of new peer. They exchange WebRTC offers/answers via the socket server.
4. **Sync:** Once WebRTC data channel opens, Yjs protocol performs initial sync. The 3D scene hydrates from the Y.Doc.

### 5.2 Card System (Zones & Hands)

The concept of "Zones" governs card behavior.

#### The "Deck" Zone

- **Visual:** A stack of cards at a fixed table location.
- **Logic:** Cards with `zone: 'deck'` and `faceUp: false`. They are stacked visually based on their Y.Map key order or a separate ordering array.
- **Action - Shuffle:** A player clicks "Shuffle". The client generates a new random ordering for the cards currently in the 'deck' zone and updates the shared state. A brief animation plays.

#### The "Hand" Zone (Private)

- **Visual:** A 2D UI drawer at the bottom of the screen, or 3D cards floating near the camera, visible only to the owner.
- **Logic:** Cards where `zone === currentPlayerId`.
- **Visibility Rule:** If a card's zone is a playerId, and that ID matches the local client's ID, render the card face. Otherwise, render a generic card back or hide it entirely (depending on desired level of secrecy).

#### Action: Drawing a Card

1. User clicks the Deck stack.
2. Logic identifies the top card in the 'deck' zone.
3. **CRDT Transaction:**

- Update card's `zone` to `currentPlayerId`.
- Update card's `ownerId` to `currentPlayerId`.
- Append card ID to player's `hand` array.

4. **Reactive Render:** The card model disappears from the 3D deck stack and appears in the player's 2D Hand HUD.

#### Action: Playing a Card (Drag & Drop)

1. User drags a card from their 2D Hand HUD onto the 3D table.
2. Raycaster determines the drop position on the table plane (y=0).
3. **CRDT Transaction:**

- Update card's `zone` to `'table'`.
- Update card's `ownerId` to `null`.
- Remove card ID from player's `hand` array.
- Set `position` to drop coordinates.

4. **Reactive Render:** Card removed from 2D HUD, a new `CardObject` is instantiated in the 3D scene at the drop location.

### 5.3 Dice Physics & Synchronization

Dice represent a challenge because physics simulations must be synced.

1. **Action: Roll Dice:** User clicks "Roll D20".
2. **CRDT Transaction:** A new `DiceState` is added to the `dice` Y.Map.

- `isRolling: true`
- `position`: A spawn point above the table.
- `rotation`: Random initial rotation.
- `rolledBy`: Current player ID.

3. **Simulation Start (All Clients):**

- The R3F scene detects a new entry in the dice map.
- It instantiates a `DiceObject` with a Rapier rigid body.
- Because `isRolling` is true, it applies a random initial impulse and torque (derived deterministically from the Dice ID or a provided seed to ensure everyone sees roughly the same throw direction, though exact path may vary slightly due to floating point differences).

4. **Simulation End (Authority Client):**

- The client that initiated the roll (the "authority" for this specific dice) monitors the rigid body's velocity.
- When velocity nears zero, it calculates the face value based on the final quaternion rotation ("up" vector dot product against face normals).

5. **CRDT Finalize:**

- The authority client updates the Y.Doc: `isRolling: false`, `resultValue: X`, final `position`/`rotation`.

6. **Reactive Settle:** Other clients see `isRolling: false`. They stop their physics simulation for that object and snap it to the final authoritative position/rotation defined in the Y.Doc to ensure uniform state.

---

## 6. System Components & API

### React Context Structure

```tsx
// GameRoomProvider wraps the entire room page
<GameRoomProvider>
  {/* Manages Socket.io, WebRTC connections, Media Streams */}
  <YjsProvider>
    {/* Initializes Y.Doc, binds to WebRTC data channel, handles IndexedDB */}
    <GameStateProvider>
      {/* Provides easy hooks to access maps: usePlayers(), useCards() */}
      <Layout>
        <HudLayer /> {/* 2D UI */}
        <Canvas>
          <Physics>
            <GameScene /> {/* 3DContent */}
          </Physics>
        </Canvas>
      </Layout>
    </GameStateProvider>
  </YjsProvider>
</GameRoomProvider>;
```

### Key Hook APIs

#### `useGameState()`

Access the raw Yjs maps.

```typescript
const { cardsMap, playersMap, diceMap, transaction } = useGameState();

// Example: Move a card
const moveCard = (cardId: string, newPos: Vector3) => {
  transaction(() => {
    const card = cardsMap.get(cardId);
    if (card) {
      cardsMap.set(cardId, { ...card, position: newPos.toArray() });
    }
  });
};
```

#### `useObjectSync(id, mapType)`

Used by individual 3D objects to bind themselves to their Yjs state representation.

```typescript
// Inside CardObject.tsx
const { state, updateState } = useObjectSync<CardState>(props.id, 'cards');

// Update Yjs when drag ends
const bind = useDrag(({ offset: [x, y], last }) => {
   if (last) {
      updateState({ position: [x, 0, y] });
   }
});

// Render based on synced state
return <mesh position={state.position} {...bind()} ... />
```

---

## 7. Testing Strategy

Given the complexity of networked physics and state, testing is crucial.

### 7.1 Unit Tests (Jest/Vitest)

Focus on deterministic logic and CRDT manipulations, mocking the network and 3D engine.

- **Deck Logic:** Test shuffling algorithms with fixed seeds. Test dealing logic ensures cards move correctly between conceptual arrays.
- **CRDT Schema:** Test that data can be written to and read from the Yjs maps correctly according to the TypeScript interfaces.
- **Dice Math:** Test the function that takes a quaternion rotation and returns the correct dice face value for different dice types (d6, d20).

### 7.2 Integration Tests (React Testing Library)

Test the 2D UI components and hooks.

- **Hand HUD:** Ensure cards added to a player's hand state render correctly in the 2D drawer.
- **Room Hook:** Mock the signaling server and test that `useWebRTC` correctly attempts to initiate peer connections when signaling messages are received.

### 7.3 End-to-End Tests (Playwright)

Crucial for testing multi-client synchronization.

- **Scenario 1: Connection:** Spin up two browser contexts. Have Client A create a room. Have Client B join URL. Assert both clients report 2 peers connected.
- **Scenario 2: Card Sync:** Client A drags a card. Assert Client B sees the card reach the same final coordinates.
- **Scenario 3: Private Hands:** Client A draws a card. Assert Client A sees the card face. Assert Client B sees card removed from table but cannot see its face in the DOM (or sees a hidden placeholder).

---

## 8. Transition Plan (v1.0 to v2.0)

This section tracks progress from the initial prototype to the target architecture.

**Phase 1: The Networking Foundation (COMPLETE)**

- [x] **Goal:** Replace manual Peer ID exchange with automatic discovery.
- [x] PeerJS-based peer connections with URL parameter sharing (`?host=peerId`).
- [x] Room URLs automatically include host peer ID for easy sharing.
- [x] WebRTC data channels for Yjs state synchronization.
- [x] Verify two clients can auto-connect in the same room URL.

**Phase 2: Data Model Migration & Wiring (COMPLETE)**

- [x] **Goal:** Connect the disconnected 3D components to a robust Yjs structure.
- [x] `game-document.ts` with Y.Array-based card and dice state management.
- [x] Standard 52-card deck initialization with shuffle support.
- [x] `GameScene.tsx` renders cards based on Yjs state, filtering by owner.
- [x] `Card.tsx` component with 3D mesh, HTML labels, and grab/release visuals.

**Phase 3: Interaction Implementation (COMPLETE)**

- [x] **Goal:** Make things movable and playable.
- [x] `useCardGestures` hook with @use-gesture for drag interactions.
- [x] `drawCard(playerId)` and `playCard(cardId, position)` CRDT operations.
- [x] 2D Hand HUD (`HandDrawer.tsx`) showing cards owned by local player.
- [x] Click-to-play cards from hand back to table.

**Phase 4: Physics & Polish (COMPLETE)**

- [x] **Goal:** Fix dice and add visuals.
- [x] Dice rolling with physics simulation and deterministic random seeds.
- [x] Face value detection using quaternion rotation analysis.
- [x] Procedural card textures (CSS-based face/back patterns).
- [x] Procedural table felt texture with wooden border.

**Phase 5: UI & UX Enhancements (COMPLETE)**

- [x] Top App Bar with room code, connection status, player count.
- [x] Right Sidebar with Players, Chat, and Library tabs.
- [x] Mobile-optimized controls with large touch targets.
- [x] Camera/Interaction mode toggle for mobile gesture conflicts.
- [x] Visual locking feedback (glow, nameplate) when grabbing objects.
- [x] Glass-morphism UI styling.

**Remaining Items:**

- [ ] Socket.io signaling server for improved peer discovery (currently uses PeerJS cloud).
- [ ] Y.Map-based data model (currently uses Y.Array - functional but less optimal).
- [ ] Zone-based card organization (deck/discard/table zones).
- [ ] Drag-from-HUD-to-canvas for playing cards (currently click-to-play).
