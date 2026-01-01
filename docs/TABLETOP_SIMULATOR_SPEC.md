# Tabletop Simulator - Complete Specification

> **Status:** ~50% implemented, requires integration work
> **Target:** Multiplayer card & dice game platform with real-time sync

---

## Table of Contents

1. [Overview](#1-overview)
2. [Technology Stack](#2-technology-stack)
3. [Architecture](#3-architecture)
4. [Data Models](#4-data-models)
5. [Feature Specifications](#5-feature-specifications)
6. [Implementation Status](#6-implementation-status)
7. [Critical Gaps to Fix](#7-critical-gaps-to-fix)
8. [Development Tasks](#8-development-tasks)
9. [API Reference](#9-api-reference)
10. [Testing Requirements](#10-testing-requirements)

---

## 1. Overview

### 1.1 Product Vision

A browser-based virtual tabletop where players can:

- Play card games with a standard 52-card deck
- Roll various dice (d4, d6, d8, d10, d12, d20)
- See other players via video chat
- Sync game state in real-time (P2P, no central server)

### 1.2 Core User Flows

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER JOURNEY                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. CREATE ROOM                                                 │
│     User visits /apps/tabletop-simulator                        │
│     → Clicks "Create Room"                                      │
│     → Redirected to /apps/tabletop-simulator/room/[roomId]      │
│     → Shares room link or peer ID with friends                  │
│                                                                 │
│  2. JOIN ROOM                                                   │
│     Friend opens shared link                                    │
│     → Enters peer ID to connect (manual exchange currently)     │
│     → P2P connection established                                │
│     → Game state syncs via CRDT                                 │
│                                                                 │
│  3. PLAY GAME                                                   │
│     - Draw cards from deck → cards go to hand                   │
│     - Play cards from hand → cards appear on table              │
│     - Flip cards face up/down                                   │
│     - Roll dice → physics simulation → result shown             │
│     - Video chat with other players                             │
│                                                                 │
│  4. END GAME                                                    │
│     - Close browser tab                                         │
│     - State persisted locally (IndexedDB)                       │
│     - Reconnect to same room to resume                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack

| Layer       | Technology                   | Purpose                   |
| ----------- | ---------------------------- | ------------------------- |
| Framework   | Next.js 15 (App Router)      | Server/client rendering   |
| 3D Engine   | React Three Fiber + Three.js | WebGL rendering           |
| Physics     | @react-three/rapier (Rapier) | Rigid body simulation     |
| Animation   | @react-spring/three          | Smooth transitions        |
| Gestures    | @use-gesture/react           | Touch/mouse interactions  |
| State Sync  | Yjs (CRDT)                   | Conflict-free replication |
| Persistence | y-indexeddb                  | Local storage             |
| Networking  | PeerJS (WebRTC)              | P2P connections           |
| Styling     | Tailwind CSS                 | UI styling                |
| IDs         | nanoid                       | Unique identifiers        |

---

## 3. Architecture

### 3.1 Directory Structure

```
apps/tabletop-simulator/
├── types/                      # TypeScript interfaces
│   ├── game.ts                 # GameState, Player, TurnState
│   ├── card.ts                 # Card, Suit, Rank, DeckState
│   └── dice.ts                 # DiceState, DiceType
│
├── components/
│   ├── GameScene.tsx           # Main 3D canvas container
│   ├── objects/
│   │   ├── Card.tsx            # 3D card with animation
│   │   ├── Deck.tsx            # Card deck stack
│   │   └── Dice.tsx            # Physics-enabled dice
│   ├── scene/
│   │   ├── Camera.tsx          # Orbit controls
│   │   ├── Lighting.tsx        # Ambient + directional
│   │   └── TableSurface.tsx    # Table mesh + colliders
│   ├── ui/
│   │   ├── ControlsPanel.tsx   # Action buttons
│   │   ├── HandDrawer.tsx      # Player's hand view
│   │   ├── RadialMenu.tsx      # Context actions
│   │   └── VideoOverlay.tsx    # Video chat feeds
│   └── providers/
│       └── GameProvider.tsx    # React context
│
├── hooks/
│   ├── useGameRoom.ts          # Orchestrates networking
│   ├── usePeer.ts              # PeerJS initialization
│   ├── usePeerConnection.ts    # Connection management
│   ├── usePeerDataChannel.ts   # Yjs update broadcast
│   ├── useYjsSync.ts           # CRDT document + IndexedDB
│   ├── useDicePhysics.ts       # Rapier integration
│   ├── useCardGestures.ts      # Drag/flip gestures
│   ├── useGameMedia.ts         # WebRTC video/audio
│   └── useTouchControls.ts     # Interaction mode toggle
│
└── lib/
    ├── crdt/
    │   └── game-document.ts    # Yjs structure & mutations
    ├── game-logic/
    │   ├── deck.ts             # Deck operations
    │   └── visibility.ts       # Card visibility rules
    └── physics/
        ├── deterministic-random.ts  # Seeded PRNG
        └── dice-simulation.ts       # Roll physics

src/app/apps/tabletop-simulator/
├── page.tsx                    # Lobby/create room
└── room/[roomId]/
    ├── page.tsx                # Server wrapper
    └── RoomClient.tsx          # Client game container
```

### 3.2 Data Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                           CLIENT A                                    │
│                                                                       │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────┐  │
│  │   GameUI    │───▶│  GameScene  │───▶│  3D Objects (Card/Dice) │  │
│  │  (buttons)  │    │  (Canvas)   │    │                         │  │
│  └──────┬──────┘    └──────┬──────┘    └────────────┬────────────┘  │
│         │                  │                        │                │
│         │                  │                        │                │
│         ▼                  ▼                        ▼                │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    GameProvider (Context)                    │    │
│  │                                                              │    │
│  │   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │    │
│  │   │  Yjs Doc     │◀──▶│  useYjsSync  │◀──▶│  IndexedDB   │  │    │
│  │   │  (CRDT)      │    │              │    │  (persist)   │  │    │
│  │   └──────┬───────┘    └──────────────┘    └──────────────┘  │    │
│  │          │                                                   │    │
│  │          │ Binary updates                                    │    │
│  │          ▼                                                   │    │
│  │   ┌──────────────────────────────────────────────────────┐  │    │
│  │   │              usePeerDataChannel                       │  │    │
│  │   │   - Listens to doc.on('update')                       │  │    │
│  │   │   - Broadcasts Uint8Array to all peers                │  │    │
│  │   │   - Receives updates and applies Y.applyUpdate()      │  │    │
│  │   └──────────────────────────┬───────────────────────────┘  │    │
│  │                              │                               │    │
│  └──────────────────────────────┼───────────────────────────────┘    │
│                                 │                                     │
└─────────────────────────────────┼─────────────────────────────────────┘
                                  │
                                  │ WebRTC Data Channel
                                  │
┌─────────────────────────────────┼─────────────────────────────────────┐
│                                 │                                     │
│                           CLIENT B                                    │
│                                 │                                     │
│                                 ▼                                     │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │              usePeerDataChannel                               │    │
│  │   - Receives Uint8Array                                       │    │
│  │   - Y.applyUpdate(doc, update)                                │    │
│  │   - Local doc triggers re-render                              │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

---

## 4. Data Models

### 4.1 Game State (Yjs Document Structure)

```typescript
// Root Yjs Document Structure
Y.Doc {
  players: Y.Map<string, Player>     // Key: playerId
  deck: Y.Array<Card>                // All cards (deck + table)
  dice: Y.Array<DiceState>           // Active dice on table
}
```

### 4.2 Player

```typescript
interface Player {
  id: string; // Unique player ID (nanoid)
  peerId: string; // PeerJS connection ID
  name: string; // Display name
  hand: Card[]; // Cards in player's hand
  position: "north" | "south" | "east" | "west"; // Seat at table
  isHost: boolean; // Can start game, kick players
  audioEnabled: boolean; // Mic on/off
  videoEnabled: boolean; // Camera on/off
}
```

### 4.3 Card

```typescript
type Suit = "hearts" | "diamonds" | "clubs" | "spades";
type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";

interface Card {
  id: string; // Unique card ID
  suit: Suit;
  rank: Rank;
  faceUp: boolean; // true = face visible to all
  ownerId: string | null; // null = on table, string = in hand
  position: Vector3; // World position {x, y, z}
  rotation: Vector3; // Euler rotation {x, y, z}
  zIndex: number; // Stack order (higher = on top)
}

interface DeckState {
  cards: Card[]; // Cards in the deck
  isShuffling: boolean; // Animation flag
}
```

### 4.4 Dice

```typescript
type DiceType = "d4" | "d6" | "d8" | "d10" | "d12" | "d20";

interface DiceState {
  id: string; // Unique dice ID
  type: DiceType; // Determines geometry & max value
  value: number; // Current face value (after settle)
  position: Vector3; // World position
  rotation: Vector3; // Current rotation
  isRolling: boolean; // Physics active flag
  seed: number; // Deterministic PRNG seed
  ownerId: string | null; // Who rolled it (for display)
}
```

### 4.5 Turn State

```typescript
interface TurnState {
  currentPlayerId: string; // Whose turn it is
  phase: "draw" | "action" | "end"; // Current phase
}

interface GameState {
  roomId: string;
  players: Map<string, Player>;
  deck: DeckState;
  dice: DiceState[];
  turn: TurnState;
}
```

---

## 5. Feature Specifications

### 5.1 Room Management

#### Create Room

- **Trigger:** User clicks "Create Room" on lobby page
- **Action:** Generate random 6-char room ID, redirect to `/room/[roomId]`
- **Result:** User becomes host, PeerJS initialized with random peer ID

#### Join Room

- **Trigger:** User navigates to room URL or enters room code
- **Action:** Initialize PeerJS, prompt for host's peer ID
- **Result:** WebRTC connection established, Yjs syncs game state

#### Share Room

- **UI Element:** "Copy Room Link" button + "Copy Peer ID" button
- **Data:** Full URL + Peer ID displayed for manual sharing

### 5.2 Deck Operations

#### Initialize Deck

```
When: Game starts or host clicks "New Deck"
Action: createStandardDeck() creates 52 cards
Result: Cards added to Yjs deck array, all face-down at position (6, 0.1, 0)
```

#### Shuffle Deck

```
When: User clicks shuffle button on deck
Action:
  1. Generate deterministic seed (Date.now() or shared seed)
  2. shuffleDeck(cards, seed) using Fisher-Yates
  3. Update Yjs deck array
Result: All connected clients see same shuffle order
```

#### Draw Card

```
When: User clicks on deck or "Draw" button
Action:
  1. dealCards(deck, 1, playerId)
  2. Card.ownerId = playerId
  3. Card added to player's hand
  4. Update Yjs
Result: Card appears in player's HandDrawer
```

#### Play Card (from hand to table)

```
When: User drags card from hand to table
Action:
  1. Card.ownerId = null
  2. Card.position = drop position on table
  3. Update Yjs
Result: Card visible on table for all players
```

### 5.3 Card Interactions

#### Flip Card

```
When: User taps/clicks card on table
Action:
  1. flipCard(doc, cardId)
  2. Card.faceUp = !Card.faceUp
Result: Card flips with animation, all players see new state
```

#### Move Card

```
When: User drags card on table
Action:
  1. Raycast from mouse to table plane (y=0)
  2. moveCard(doc, cardId, newPosition)
Result: Card moves smoothly, position synced to all
```

#### Peek Card (own card only)

```
When: User long-presses own face-down card
Action: Show RadialMenu with "Peek" option
Result: Card briefly shown face-up only to owner (not synced)
```

### 5.4 Dice Rolling

#### Roll Dice

```
When: User clicks dice button (d6 by default)
Action:
  1. Generate seed = Date.now()
  2. Create DiceState { id, type, seed, isRolling: true, position: (0, 2, 0) }
  3. Add to Yjs dice array
  4. Physics engine applies impulse + torque from seed
Result: Dice flies onto table with physics
```

#### Dice Settles

```
When: Dice velocity < threshold (0.01)
Action:
  1. Compute face value from orientation
  2. DiceState.value = computed value
  3. DiceState.isRolling = false
  4. Update Yjs
Result: All players see same final value
```

#### Clear Dice

```
When: User clicks "Clear Dice" or rolls new dice
Action: Remove DiceState from Yjs array
Result: Dice disappears from table
```

### 5.5 Video Chat

#### Enable Camera/Mic

```
When: User clicks camera/mic toggle
Action:
  1. getUserMedia({ video: true, audio: true })
  2. Store in useGameMedia state
  3. Display in VideoOverlay (local feed)
Result: User sees own video preview
```

#### Call Other Players

```
When: Peer connection established
Action:
  1. peer.call(remotePeerId, localStream)
  2. Wait for answer
  3. Add remote stream to VideoOverlay
Result: Video feeds shown for all connected players
```

#### Answer Incoming Call

```
When: peer.on('call') event fires
Action:
  1. call.answer(localStream)
  2. call.on('stream') → add to remoteStreams
Result: Bidirectional video established
```

### 5.6 Camera Controls

#### Orbit Mode (default)

```
Controls: Click + drag to rotate, scroll to zoom
Limits:
  - Polar angle: 0 to ~85 degrees (can't look under table)
  - Distance: 2 to 20 units
```

#### Interaction Mode

```
When: User clicks mode toggle (📷 ↔ ✋)
Action: Disable orbit controls, enable object interaction
Result: Clicks/drags affect cards/dice, not camera
```

---

## 6. Implementation Status

### 6.1 Working Features

| Feature                           | File                      | Status      |
| --------------------------------- | ------------------------- | ----------- |
| 3D Table rendering                | `TableSurface.tsx`        | ✅ Complete |
| Camera orbit controls             | `Camera.tsx`              | ✅ Complete |
| Lighting & shadows                | `Lighting.tsx`            | ✅ Complete |
| Yjs document structure            | `game-document.ts`        | ✅ Complete |
| CRDT mutations (move, flip, roll) | `game-document.ts`        | ✅ Complete |
| Deck create/shuffle/deal          | `deck.ts`                 | ✅ Complete |
| Deterministic RNG                 | `deterministic-random.ts` | ✅ Complete |
| Visibility rules                  | `visibility.ts`           | ✅ Complete |
| PeerJS initialization             | `usePeer.ts`              | ✅ Complete |
| Yjs IndexedDB persistence         | `useYjsSync.ts`           | ✅ Complete |
| Touch mode toggle                 | `useTouchControls.ts`     | ✅ Complete |

### 6.2 Partially Working

| Feature          | File                    | Issue                                         |
| ---------------- | ----------------------- | --------------------------------------------- |
| Card component   | `Card.tsx`              | Renders but not connected to game state       |
| Dice component   | `Dice.tsx`              | Renders but value always 1                    |
| Deck component   | `Deck.tsx`              | Visual only, click handlers not wired         |
| Card gestures    | `useCardGestures.ts`    | Works but callbacks not connected             |
| Dice physics     | `useDicePhysics.ts`     | Physics works but face detection missing      |
| Peer connections | `usePeerConnection.ts`  | Connects but no auto-discovery                |
| Data broadcast   | `usePeerDataChannel.ts` | Sends updates but error handling weak         |
| Video overlay    | `VideoOverlay.tsx`      | Shows local only, incoming calls not answered |
| Controls panel   | `ControlsPanel.tsx`     | Buttons exist but actions log to console      |
| Hand drawer      | `HandDrawer.tsx`        | UI works but always shows empty array         |

### 6.3 Not Implemented

| Feature                               | Priority | Notes                                    |
| ------------------------------------- | -------- | ---------------------------------------- |
| **Render cards/dice from Yjs state**  | P0       | Critical - nothing appears on table      |
| **Wire dice roll button to CRDT**     | P0       | Currently just console.log               |
| **Dice face value detection**         | P0       | Always returns 1                         |
| **Signaling server / peer discovery** | P0       | Can't connect without manual ID exchange |
| **Answer incoming video calls**       | P1       | peer.on('call') not hooked               |
| **Hand management (draw/play)**       | P1       | Player.hand never updated                |
| **Deck draw/shuffle buttons**         | P1       | Click handlers empty                     |
| **RadialMenu integration**            | P2       | Component exists but never shown         |
| **Proper dice geometry**              | P2       | All dice are cubes                       |
| **Card textures (suit/rank)**         | P2       | Currently just colored boxes             |
| **Turn management**                   | P3       | TurnState defined but unused             |
| **Sound effects**                     | P3       | No audio                                 |
| **Error handling**                    | P3       | Silent failures everywhere               |

---

## 7. Critical Gaps to Fix

### 7.1 GAP: GameScene doesn't render game objects

**Current State:**

```typescript
// GameScene.tsx line 21-24
<Physics>
  <TableSurface />
  {/* Cards and dice will be rendered here */}
</Physics>;
```

**Required Change:**

```typescript
// GameScene.tsx - needs to receive and render game state
interface GameSceneProps {
  cards: Card[];
  dice: DiceState[];
  onCardMove: (id: string, pos: Vector3) => void;
  onCardFlip: (id: string) => void;
  onDiceSettle: (id: string, value: number) => void;
}

export default function GameScene(
  { cards, dice, onCardMove, onCardFlip, onDiceSettle }: GameSceneProps,
) {
  return (
    <Canvas>
      <Physics>
        <TableSurface />
        {cards.filter(c => !c.ownerId).map(card => (
          <Card
            key={card.id}
            card={card}
            isOwner={false}
            onMove={(pos) => onCardMove(card.id, pos)}
            onFlip={() => onCardFlip(card.id)}
          />
        ))}
        {dice.map(die => (
          <Dice
            key={die.id}
            state={die}
            onSettle={(value) => onDiceSettle(die.id, value)}
          />
        ))}
      </Physics>
    </Canvas>
  );
}
```

### 7.2 GAP: Dice roll button does nothing

**Current State:**

```typescript
// RoomClient.tsx line 25-28
const handleDiceRoll = (type: string) => {
  // TODO: Wire up to CRDT rollDice function
  console.log("Rolling", type);
};
```

**Required Change:**

```typescript
const handleDiceRoll = (type: string) => {
  if (!game?.doc) return;

  const seed = Date.now();
  const diceState: DiceState = {
    id: nanoid(),
    type: type as DiceType,
    value: 0,
    position: { x: 0, y: 2, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    isRolling: true,
    seed,
    ownerId: game.peerId,
  };

  const diceArray = getDiceArray(game.doc);
  diceArray.push([diceState]);
};
```

### 7.3 GAP: Dice always returns value 1

**Current State:**

```typescript
// useDicePhysics.ts - settle callback
onSettle(state.id, 1); // Hardcoded!
```

**Required Change:**

```typescript
// Need to compute face value from quaternion
function getDiceFaceValue(quaternion: THREE.Quaternion, diceType: DiceType): number {
  // For d6: check which axis is pointing up
  const up = new THREE.Vector3(0, 1, 0);
  const localUp = up.clone().applyQuaternion(quaternion.clone().invert());

  // Map local up direction to face value
  const faces = [
    { dir: new THREE.Vector3(0, 1, 0), value: 1 }, // top
    { dir: new THREE.Vector3(0, -1, 0), value: 6 }, // bottom
    { dir: new THREE.Vector3(1, 0, 0), value: 3 }, // right
    { dir: new THREE.Vector3(-1, 0, 0), value: 4 }, // left
    { dir: new THREE.Vector3(0, 0, 1), value: 2 }, // front
    { dir: new THREE.Vector3(0, 0, -1), value: 5 }, // back
  ];

  let maxDot = -1;
  let faceValue = 1;
  for (const face of faces) {
    const dot = localUp.dot(face.dir);
    if (dot > maxDot) {
      maxDot = dot;
      faceValue = face.value;
    }
  }
  return faceValue;
}
```

### 7.4 GAP: No signaling for peer connections

**Current State:** Users must manually exchange PeerJS IDs

**Options:**

1. **PeerJS Cloud (Quickest)**
   ```typescript
   const peer = new Peer({
     host: "0.peerjs.com",
     port: 443,
     secure: true,
     key: "peerjs", // or your API key
   });
   ```

2. **Self-hosted PeerServer**
   ```bash
   npm install peer
   npx peerjs --port 9000
   ```
   ```typescript
   const peer = new Peer({ host: "your-server.com", port: 9000 });
   ```

3. **Room-based discovery via Yjs provider**
   - Use y-webrtc with signaling server
   - Or use existing Yjs cloud providers (e.g., Liveblocks, Partykit)

### 7.5 GAP: Incoming video calls not answered

**Current State:** `peer.on('call')` not hooked

**Required Change in useGameMedia.ts:**

```typescript
useEffect(() => {
  if (!peer) return;

  peer.on("call", (call) => {
    // Auto-answer with local stream
    call.answer(localStream);

    call.on("stream", (remoteStream) => {
      setRemoteStreams(prev => new Map(prev).set(call.peer, remoteStream));
    });
  });

  return () => peer.off("call");
}, [peer, localStream]);
```

---

## 8. Development Tasks

### Phase 1: Core Game Loop (Week 1)

| #    | Task                                     | Files                                | Effort |
| ---- | ---------------------------------------- | ------------------------------------ | ------ |
| 1.1  | Wire GameScene to render cards from Yjs  | `GameScene.tsx`, `RoomClient.tsx`    | M      |
| 1.2  | Wire GameScene to render dice from Yjs   | `GameScene.tsx`, `RoomClient.tsx`    | M      |
| 1.3  | Connect dice roll button to CRDT         | `RoomClient.tsx`, `game-document.ts` | S      |
| 1.4  | Implement dice face detection            | `useDicePhysics.ts`                  | M      |
| 1.5  | Connect card move gesture to CRDT        | `Card.tsx`, `useCardGestures.ts`     | M      |
| 1.6  | Connect card flip gesture to CRDT        | `Card.tsx`, `useCardGestures.ts`     | S      |
| 1.7  | Wire deck draw button                    | `Deck.tsx`, `RoomClient.tsx`         | S      |
| 1.8  | Wire deck shuffle button                 | `Deck.tsx`, `RoomClient.tsx`         | S      |
| 1.9  | Implement hand management (draw to hand) | `HandDrawer.tsx`, `game-document.ts` | M      |
| 1.10 | Implement play from hand (drag to table) | `HandDrawer.tsx`, `game-document.ts` | M      |

### Phase 2: Networking (Week 2)

| #   | Task                                         | Files                  | Effort |
| --- | -------------------------------------------- | ---------------------- | ------ |
| 2.1 | Set up PeerJS signaling (cloud or self-host) | `usePeer.ts`, config   | M      |
| 2.2 | Add "Copy Room Link" button                  | `RoomClient.tsx`       | S      |
| 2.3 | Add peer connection status indicator         | `RoomClient.tsx`       | S      |
| 2.4 | Implement incoming call handler              | `useGameMedia.ts`      | M      |
| 2.5 | Add connection error handling                | `usePeerConnection.ts` | M      |
| 2.6 | Add auto-reconnection logic                  | `usePeerConnection.ts` | L      |
| 2.7 | Show "Waiting for players..." state          | `RoomClient.tsx`       | S      |

### Phase 3: Polish (Week 3)

| #    | Task                                         | Files                      | Effort |
| ---- | -------------------------------------------- | -------------------------- | ------ |
| 3.1  | Add card textures (suit/rank images)         | `Card.tsx`, assets         | M      |
| 3.2  | Add proper dice geometry (d4/d8/d10/d12/d20) | `Dice.tsx`                 | L      |
| 3.3  | Add dice face numbers                        | `Dice.tsx`                 | M      |
| 3.4  | Implement RadialMenu on long-press           | `RadialMenu.tsx`, gestures | M      |
| 3.5  | Add shuffle animation                        | `Deck.tsx`                 | M      |
| 3.6  | Add deal animation                           | `Card.tsx`                 | M      |
| 3.7  | Add sound effects (roll, flip, shuffle)      | New audio system           | M      |
| 3.8  | Mobile touch optimization                    | All gesture files          | L      |
| 3.9  | Error toast notifications                    | UI system                  | S      |
| 3.10 | Loading states                               | All components             | S      |

### Phase 4: Production (Week 4)

| #   | Task                                        | Files             | Effort |
| --- | ------------------------------------------- | ----------------- | ------ |
| 4.1 | E2E tests with Playwright                   | `e2e/features/`   | L      |
| 4.2 | Integration tests for networking            | `hooks/*.test.ts` | L      |
| 4.3 | Performance optimization                    | All               | M      |
| 4.4 | Accessibility (ARIA labels)                 | UI components     | M      |
| 4.5 | Security review (anti-cheat considerations) | All               | M      |

**Effort Key:** S = Small (< 2 hours), M = Medium (2-4 hours), L = Large (4-8 hours)

---

## 9. API Reference

### 9.1 CRDT Operations (game-document.ts)

```typescript
// Document creation
createGameDocument(): Y.Doc

// Getters
getPlayersMap(doc: Y.Doc): Y.Map<Player>
getDeckArray(doc: Y.Doc): Y.Array<Card>
getDiceArray(doc: Y.Doc): Y.Array<DiceState>

// Mutations
addPlayer(doc: Y.Doc, player: Player): void
updatePlayer(doc: Y.Doc, id: string, updates: Partial<Player>): void
moveCard(doc: Y.Doc, cardId: string, position: Vector3, rotation?: Vector3): void
flipCard(doc: Y.Doc, cardId: string): void
rollDice(doc: Y.Doc, diceId: string, seed: number): void
```

### 9.2 Game Logic (deck.ts)

```typescript
createStandardDeck(): Card[]
shuffleDeck(cards: Card[], seed: number): Card[]
dealCards(cards: Card[], count: number, playerId: string): { dealt: Card[], remaining: Card[] }
```

### 9.3 Physics (deterministic-random.ts)

```typescript
class DeterministicRandom {
  constructor(seed: number);
  next(): number; // [0, 1)
  range(min: number, max: number): number; // [min, max)
  rangeInt(min: number, max: number): number; // [min, max]
}
```

### 9.4 React Hooks

```typescript
// Networking
useGameRoom(roomId: string): {
  doc: Y.Doc;
  peer: Peer;
  peerId: string | null;
  connections: Map<string, PeerConnection>;
  connectToPeer: (id: string) => void;
  isSynced: boolean;
}

// Media
useGameMedia(peer: Peer, connections: Map): {
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  enableMedia: () => Promise<void>;
  callAll: () => void;
}

// Physics
useDicePhysics(state: DiceState, onSettle: (id: string, value: number) => void): {
  rigidBodyRef: RefObject<RapierRigidBody>;
}

// Gestures
useCardGestures(onMove: (pos: Vector3) => void, onFlip: () => void): {
  bind: () => GestureHandlers;
}

// Controls
useTouchControls(): {
  mode: "orbit" | "interaction";
  toggleMode: () => void;
}
```

---

## 10. Testing Requirements

### 10.1 Unit Tests (Required: 100% coverage)

| Module            | Test File                      | Key Cases                                                       |
| ----------------- | ------------------------------ | --------------------------------------------------------------- |
| Deck operations   | `deck.test.ts`                 | 52 cards created, deterministic shuffle, deal removes from deck |
| Visibility        | `visibility.test.ts`           | Owner can peek, face-up visible to all                          |
| CRDT mutations    | `crdt.test.ts`                 | Player add, card move, flip, dice roll                          |
| Deterministic RNG | `deterministic-random.test.ts` | Same seed = same sequence                                       |
| Dice physics      | `dice-simulation.test.ts`      | Impulse vectors generated                                       |

### 10.2 Component Tests

| Component     | Test File                | Key Cases                          |
| ------------- | ------------------------ | ---------------------------------- |
| GameScene     | `GameScene.test.tsx`     | Renders without crash, shows cards |
| Card          | `Card.test.tsx`          | Renders, responds to gestures      |
| Dice          | `Dice.test.tsx`          | Renders, physics applied           |
| ControlsPanel | `ControlsPanel.test.tsx` | Buttons trigger callbacks          |
| HandDrawer    | `HandDrawer.test.tsx`    | Shows cards, drag to play          |

### 10.3 E2E Tests (Playwright + Cucumber)

```gherkin
# e2e/features/tabletop-game.feature

Feature: Tabletop Simulator

  Scenario: Create and join room
    Given I am on the tabletop lobby page
    When I click "Create Room"
    Then I should see a shareable room link
    And I should see my peer ID

  Scenario: Roll dice
    Given I am in a game room
    When I click the dice roll button
    Then I should see a dice appear on the table
    And the dice should settle with a value between 1 and 6

  Scenario: Draw and play card
    Given I am in a game room with a deck
    When I click on the deck
    Then a card should appear in my hand
    When I drag the card to the table
    Then the card should appear on the table

  Scenario: Multiplayer sync
    Given Player A and Player B are in the same room
    When Player A moves a card
    Then Player B should see the card in the new position
```

---

## Appendix A: File-by-File Implementation Checklist

```
[ ] apps/tabletop-simulator/components/GameScene.tsx
    [ ] Add props for cards, dice, callbacks
    [ ] Map over cards array to render Card components
    [ ] Map over dice array to render Dice components
    [ ] Pass callbacks for move/flip/settle

[ ] src/app/apps/tabletop-simulator/room/[roomId]/RoomClient.tsx
    [ ] Subscribe to Yjs arrays for cards and dice
    [ ] Pass game state to GameScene
    [ ] Implement handleDiceRoll with CRDT mutation
    [ ] Implement handleCardMove with CRDT mutation
    [ ] Implement handleCardFlip with CRDT mutation
    [ ] Implement handleDiceSettle with CRDT mutation
    [ ] Wire HandDrawer to player.hand from Yjs

[ ] apps/tabletop-simulator/hooks/useDicePhysics.ts
    [ ] Implement getDiceFaceValue() function
    [ ] Call with actual quaternion on settle

[ ] apps/tabletop-simulator/hooks/useGameMedia.ts
    [ ] Add peer.on('call') listener
    [ ] Auto-answer with local stream
    [ ] Track remote streams by peer ID

[ ] apps/tabletop-simulator/hooks/usePeer.ts
    [ ] Configure PeerJS with signaling server
    [ ] Add error handling

[ ] apps/tabletop-simulator/components/ui/ControlsPanel.tsx
    [ ] Add deck operation buttons (draw, shuffle)
    [ ] Add dice type selector (d4, d6, d8, etc.)

[ ] apps/tabletop-simulator/components/ui/HandDrawer.tsx
    [ ] Receive actual hand from props
    [ ] Implement drag-to-play gesture
    [ ] Call onPlayCard callback

[ ] apps/tabletop-simulator/components/objects/Deck.tsx
    [ ] Wire onClick to onDraw prop
    [ ] Wire shuffle button to onShuffle prop
```

---

## Appendix B: Environment Setup

```bash
# Install dependencies
yarn install

# Run development server
yarn dev

# Run tests
yarn test:coverage

# Run E2E tests
yarn test:e2e:local

# Build for production
yarn build
```

### Required Environment Variables

Currently none required. If using self-hosted PeerServer:

```env
NEXT_PUBLIC_PEER_HOST=your-peer-server.com
NEXT_PUBLIC_PEER_PORT=9000
NEXT_PUBLIC_PEER_SECURE=true
```

---

_Document Version: 1.0_
_Last Updated: 2026-01-01_
_Author: Claude Code_
