# Implementation Plan: Agent Control Interface

## Context

We need to implement the "Agent Control Interface" which allows users to
interact with their Browser Agents. This interface combines a conversational
chat UI with a live VNC view of the isolated desktop environment.

## Visual Reference

The design mocks are available at:
`https://raw.githubusercontent.com/zerdos/spike-land-nextjs/main/public/mockups/agent_control_interface.png`

## Requirements

### 1. UI Layout (Split View)

- **Left Panel (40%)**: Chat interface.
  - Message history bubble list (User vs Agent).
  - Input area with variable height text area.
  - Send button.
- **Right Panel (60%)**: Live Session View.
  - Iframe or Canvas to render the NoVNC stream (use `connectionUrl` from Box
    model).
  - "Live Session" header.

### 2. Actions & Controls (Top Bar)

- **Status Indicator**: Green (Running), Red (Stopped), Yellow (Starting).
- **Control Buttons**:
  - `Pause` (Stop execution but keep container warm? Or just standard `STOP`
    action).
  - `Restart` (Trigger `RESTART` action).
  - `Debug` (Toggle developer tools or logs - placeholder for now).

### 3. Integration Points

- **Page**: `src/app/boxes/[id]/page.tsx` (or similar detail view).
- **Data**: Fetch `Box` details to get `connectionUrl`.
- **API**: Use `/api/boxes/[id]/action` for control buttons.
- **Mocking**: For Phase 1, the chat messages can be mocked or echoed back. The
  VNC URL can be a placeholder if not real.

## Implementation Steps

1. **Create `AgentControlPanel` component**
   - Path: `src/components/boxes/agent-control-panel.tsx`
   - Props: `box: Box` (Prisma model).
   - State: `messages[]`, `isTyping`, `boxStatus`.

2. **Implement Chat UI**
   - Use `ScrollArea` for message history.
   - Style message bubbles (Glassmorphism as per mockup).

3. **Implement VNC/Browser View**
   - Render an `iframe` pointing to `box.connectionUrl`.
   - Handle cases where `connectionUrl` is null (show "Connecting..." state).

4. **Connect Actions**
   - Wire up "Pause" to `STOP` action.
   - Wire up "Restart" to `RESTART` action.
   - Use `sonner` for toast notifications.

## Deliverables

- `src/components/boxes/agent-control-panel.tsx`
- Updates to `src/app/boxes/[id]/page.tsx` to include the panel.
