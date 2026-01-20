# Manual My-Apps Testing Script

This script guides you through manual testing of /my-apps functionality on both local and production environments.

## Current Setup Status

✅ Local dev server running (`yarn dev`)
✅ Local agent poll running (`yarn agent:poll`)
✅ Environment variables configured (checked `.env.local`)

## Pre-Flight Checks

Run these commands to verify your setup:

```bash
# 1. Check dev server is running
curl -s http://localhost:3000/api/health | jq

# 2. Check agent poll is active
ps aux | grep "agent:poll" | grep -v grep

# 3. Check Redis connectivity
yarn agent:poll --stats

# 4. Verify database connection
yarn db:validate
```

## Test Session: Local Environment

### Test 1: Simple Counter App (5 minutes)

**Goal**: Verify end-to-end app creation and preview

1. **Open browser**: Navigate to http://localhost:3000/my-apps

2. **Create new app**:
   - Click "Create New App" button (or go to `/my-apps/new`)
   - System redirects to `/my-apps/{random-id}` (e.g., `swift.forge.launch.x7k2`)

3. **Enter prompt**:
   ```
   Create a simple counter app with a big number display and increment/decrement buttons. Use colorful gradients.
   ```

4. **Send message**: Press Enter or click "Start"

5. **Observe**:
   - [ ] "Agent Working" badge appears in header
   - [ ] Agent Progress Indicator shows stages (initialize → processing → complete)
   - [ ] User message appears in chat (right side, teal background)
   - [ ] Agent streams response (left side, white background with typing indicator)
   - [ ] MiniPreview component renders below agent message
   - [ ] Preview iframe loads and shows working counter app
   - [ ] Counter buttons (+/-) are functional

6. **Check console logs**:
   - Open DevTools (F12) → Console
   - Look for "[MyApps]" or "[codeSpace]" log messages
   - Should see SSE connection established

7. **Verify network**:
   - DevTools → Network tab
   - Look for EventSource connection to `/api/apps/{id}/messages/stream`
   - Status should be "pending" (active connection)

**Success Criteria**: ✅ Counter app appears in preview iframe within 60 seconds and is fully functional

---

### Test 2: Colorful Calculator (5 minutes)

**Goal**: Test more complex UI generation with multiple components

1. **Create another app**: Go to http://localhost:3000/my-apps/new

2. **Prompt**:
   ```
   Build a colorful calculator with buttons for digits 0-9, operations (+, -, *, /), equals, and clear. Use a vibrant gradient background and make buttons large and easy to tap.
   ```

3. **Verify**:
   - [ ] Calculator UI renders with all buttons
   - [ ] Display shows "0" initially
   - [ ] Clicking numbers updates display
   - [ ] Operations work correctly (e.g., 5 + 3 = 8)
   - [ ] Clear button resets display
   - [ ] Gradient background is visually appealing

**Success Criteria**: ✅ Calculator works correctly with all operations

---

### Test 3: Todo List with State (5 minutes)

**Goal**: Verify state management and form handling

1. **Create app** with prompt:
   ```
   Create a todo list app where I can add tasks, mark them complete with checkboxes, and delete them. Use Tailwind CSS for a modern look.
   ```

2. **Test functionality**:
   - [ ] Add 3 tasks: "Buy milk", "Call dentist", "Finish report"
   - [ ] Check off first task - verify it shows as complete (strikethrough or different color)
   - [ ] Uncheck it - verify it returns to active state
   - [ ] Delete second task - verify it disappears from list
   - [ ] Add another task to verify input resets

**Success Criteria**: ✅ Todo app has working add, check, and delete functionality

---

### Test 4: Image-to-Code (10 minutes)

**Goal**: Test image attachment and vision capabilities

1. **Prepare an image**:
   - Find a simple UI screenshot or mockup (e.g., screenshot of a button, card, or form)
   - Or use this test image: Take a screenshot of a colorful button from any website

2. **Create app** with initial prompt:
   ```
   I'll upload a UI mockup for you to recreate
   ```

3. **After app is created**:
   - Click the image attachment icon (📷)
   - Select your test image
   - Send message: "Create this exact UI in React with Tailwind CSS"

4. **Verify**:
   - [ ] Image uploads successfully (preview thumbnail appears)
   - [ ] Agent acknowledges the image in response
   - [ ] Generated UI matches the mockup visually
   - [ ] Colors and layout are similar

**Success Criteria**: ✅ Generated UI resembles uploaded mockup

---

### Test 5: Iterative Refinement (10 minutes)

**Goal**: Verify multi-turn conversation and code versioning

1. **Start with**: "Create a simple timer app with start/stop buttons"

2. **Wait for response**, then send:
   ```
   Make the timer display larger and change the buttons to be blue and green
   ```

3. **After update**, send:
   ```
   Add a reset button that sets the timer back to 0
   ```

4. **Verify version history**:
   - [ ] First agent message shows "v1" badge
   - [ ] Second shows "v2"
   - [ ] Third shows "v3 (latest)"
   - [ ] Clicking "v1" opens modal with original version preview
   - [ ] Latest version has all three features: timer, start/stop, reset

**Success Criteria**: ✅ All 3 versions are preserved and viewable

---

## Test Session: Production Environment

### Prerequisites

1. **Start production agent polling**:
   ```bash
   yarn agent:poll:prod
   ```

2. **Verify it's running**:
   ```bash
   # Should show "Environment: PRODUCTION" in output
   # API URL: https://spike.land
   ```

### Test 6: Production Smoke Test (5 minutes)

1. **Open**: https://spike.land/my-apps

2. **Sign in** (if not authenticated)

3. **Create app**:
   ```
   Create a hello world app with a big heading that says "Hello World!" and a colorful button that shows an alert when clicked
   ```

4. **Verify**:
   - [ ] App creates successfully
   - [ ] Agent responds within 60 seconds
   - [ ] Preview iframe loads from `https://testing.spike.land/live/{codespace-id}/`
   - [ ] Button click shows alert popup
   - [ ] URL is shareable: Copy URL and open in incognito - app should load

**Success Criteria**: ✅ Production app works end-to-end

---

### Test 7: Multi-User Concurrent (15 minutes)

**Goal**: Verify production agent handles multiple concurrent requests

1. **Open 5 browser tabs** (use different browsers or incognito for different users):
   - Tab 1 (Chrome): Create "counter app"
   - Tab 2 (Firefox): Create "calculator"
   - Tab 3 (Safari): Create "todo list"
   - Tab 4 (Chrome incognito): Create "timer"
   - Tab 5 (Firefox incognito): Create "color picker"

2. **Submit all prompts within 30 seconds** of each other

3. **Monitor**:
   - [ ] All 5 apps process independently
   - [ ] No tab shows errors
   - [ ] All receive agent responses within 3 minutes
   - [ ] All previews load correctly

4. **Check agent stats**:
   ```bash
   yarn agent:poll:prod --stats
   ```
   Should show queue processing

**Success Criteria**: ✅ All 5 apps complete successfully without blocking

---

## Debugging Commands

### If agent is not responding:

```bash
# Check if agent poll is running
ps aux | grep agent:poll

# View agent logs (if running in terminal)
# Look for "Processing app:" messages

# Check Redis queue status
yarn agent:poll --stats

# Test Claude CLI directly
echo "Create a hello world React app" | claude --print
```

### If preview not loading:

```bash
# Test backend worker directly
curl https://testing.spike.land/live/{codespace-id}/

# Check if code was transpiled
curl https://testing.spike.land/live/{codespace-id}/status
```

### If SSE not working:

```bash
# Test SSE endpoint (local)
curl -N http://localhost:3000/api/apps/{app-id}/messages/stream

# Should keep connection open and stream events
```

## Results Report Template

After completing all tests, fill out:

### Local Testing Results (Tests 1-5)

- [ ] ✅ Test 1: Counter App - PASSED / FAILED
  - Notes: _______
- [ ] ✅ Test 2: Calculator - PASSED / FAILED
  - Notes: _______
- [ ] ✅ Test 3: Todo List - PASSED / FAILED
  - Notes: _______
- [ ] ✅ Test 4: Image-to-Code - PASSED / FAILED
  - Notes: _______
- [ ] ✅ Test 5: Iterative Refinement - PASSED / FAILED
  - Notes: _______

### Production Testing Results (Tests 6-7)

- [ ] ✅ Test 6: Production Smoke Test - PASSED / FAILED
  - Notes: _______
- [ ] ✅ Test 7: Multi-User Concurrent - PASSED / FAILED
  - Notes: _______

### Issues Found

List any issues encountered:

1. Issue: _______________
   - Environment: Local / Production
   - Reproduction: _______________
   - Screenshot: _______________

### Performance Metrics

- Average agent response time (local): _____ seconds
- Average agent response time (prod): _____ seconds
- Preview load time: _____ seconds
- SSE connection time: _____ seconds

### Browser Compatibility

- [ ] Chrome - PASSED / FAILED
- [ ] Firefox - PASSED / FAILED
- [ ] Safari - PASSED / FAILED
- [ ] Mobile Chrome - PASSED / FAILED
- [ ] Mobile Safari - PASSED / FAILED

---

## Next Steps

If all tests pass:
✅ Mark task as complete
✅ Create demo video showcasing the 5 apps
✅ Update documentation with production URL

If tests fail:
❌ Create GitHub issues for each failure
❌ Attach logs, screenshots, network traces
❌ Assign to @zerdos with `my-apps` label
