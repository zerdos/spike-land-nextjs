# /my-apps Testing Status & Action Plan

## Current Status

### ✅ Completed Setup

1. **Development Server**: Running on `http://localhost:3000`
2. **Production Agent Polling**: Running (`yarn agent:poll:prod`)
3. **Local Agent Polling**: Running (`yarn agent:poll`)
4. **Playwright Installation**: Chromium browser installed for testing
5. **Test Documentation**: Created manual testing guide at `docs/MANUAL_MY_APPS_TEST.md`
6. **E2E Test Script**: Created automated test script at `scripts/test-my-apps-e2e.ts`

### 🔄 Current Services Status

**Running Processes:**

- ✅ Next.js Dev Server (localhost:3000)
- ✅ Production Agent Polling (`agent-poll.ts --prod`)
- ✅ Local Agent Polling (`agent-poll.ts`)

**Verification Commands:**

```bash
# Check dev server
curl -I http://localhost:3000

# Check agent polling processes
ps aux | grep "agent-poll.ts"
```

## Testing Instructions

### Option 1: Manual Testing (Recommended for Visual Verification)

**Chrome is already open at:** `http://localhost:3000/my-apps`

1. **Create Test App #1 - Todo List**
   - Click "Create New App"
   - Wait for redirect to `/my-apps/[codespace-id]`
   - Type prompt: "Create a simple todo list app with add, delete, and mark as complete. Use colorful gradients."
   - Click Send
   - **Wait 30-60 seconds** for agent response
   - **Verify:**
     - ✅ Agent responds with code
     - ✅ Preview URL appears: `https://testing.spike.land/live/[codespace-id]/`
     - ✅ Preview opens and works

2. **Repeat for 4 More Apps:**
   - Color Picker Tool
   - Countdown Timer
   - Random Quote Generator
   - Simple Calculator

   (See `docs/MANUAL_MY_APPS_TEST.md` for detailed prompts)

3. **Test Production** (https://spike.land/my-apps)
   - Repeat the same 5 apps
   - Compare behavior with local

### Option 2: Automated Testing

```bash
# Test local environment
yarn agent:test-my-apps:local

# Test production environment
yarn agent:test-my-apps:prod

# Test both (requires production login)
yarn agent:test-my-apps
```

**Note:** Automated tests will:

- Open Chrome in headed mode (visible)
- Create 5 different apps automatically
- Take screenshots of results
- Generate report files

## Key Features to Verify

### For Each App Created:

1. **Agent Response**
   - [ ] Responds within 60 seconds
   - [ ] Provides React/TypeScript code
   - [ ] Code is properly formatted
   - [ ] No error messages

2. **Preview**
   - [ ] Preview URL format: `https://testing.spike.land/live/[id]/`
   - [ ] Preview URL is clickable in chat
   - [ ] Preview loads without errors
   - [ ] App functionality matches request

3. **Chat Interface**
   - [ ] Messages appear in order
   - [ ] Proper styling for user/agent messages
   - [ ] Timestamps visible
   - [ ] Scrolling works

4. **App Status**
   - [ ] Status changes: WAITING → DRAFTING → BUILDING → LIVE
   - [ ] Progress indicator visible
   - [ ] Status updates in real-time

5. **Navigation**
   - [ ] Can return to /my-apps
   - [ ] App appears in app list
   - [ ] Can reopen app from list
   - [ ] Chat history persists

## Critical Differences: Local vs Production

### Local Environment (`localhost:3000`)

- **Auth**: May bypass authentication in dev mode
- **Database**: Local PostgreSQL
- **Worker**: Local Cloudflare Worker (testing.spike.land)
- **Agent Poll**: Reads from local API (`http://localhost:3000`)

### Production Environment (`spike.land`)

- **Auth**: Requires valid login
- **Database**: Production PostgreSQL
- **Worker**: Production Cloudflare Worker (testing.spike.land)
- **Agent Poll**: Reads from production API (`https://spike.land`)

## Expected Agent Behavior

### When User Sends Message:

1. **Frontend** (`/my-apps/[codeSpace]`):
   - Creates app record in database
   - Sets status to WAITING
   - Saves user message
   - Shows "Agent is working..." indicator

2. **Agent Polling Service**:
   - Detects app with WAITING status
   - Fetches chat history
   - Calls Claude API with MCP tools
   - Receives agent response with code

3. **Agent Updates**:
   - Saves agent response as new message
   - Updates app status to LIVE
   - Saves code to Cloudflare Worker
   - Generates preview URL

4. **Frontend Updates**:
   - Receives agent message via polling
   - Displays code and preview URL
   - Shows preview iframe/link
   - Updates status indicator

## Troubleshooting

### Issue: Agent Not Responding

**Check:**

```bash
# Verify agent polling is running
ps aux | grep agent-poll

# Check logs
tail -f /private/tmp/agent-poll-prod.log  # Production
# Or check local process logs

# Verify database connection
yarn db:studio
```

**Common Causes:**

- Agent polling service not running
- Database connection error
- Claude API rate limit
- Invalid API keys

### Issue: Preview Not Loading

**Check:**

```bash
# Test preview URL directly
curl -I https://testing.spike.land/live/[codespace-id]/

# Check Cloudflare Worker logs
```

**Common Causes:**

- Code not saved to worker
- Transpilation error
- CORS issues
- Worker not deployed

### Issue: Chat Not Updating

**Check:**

- WebSocket connection (if used)
- Polling interval
- Database updates
- Frontend re-render logic

## Success Criteria

### ✅ Test Passes If:

1. **Local Environment:**
   - All 5 apps created successfully
   - Agent responds to each within 60 seconds
   - All previews load and work
   - No errors in browser console
   - No errors in server logs

2. **Production Environment:**
   - All 5 apps created successfully
   - Agent responds to each within 60 seconds
   - All previews load and work
   - Matches local behavior
   - No differences in functionality

3. **Consistency:**
   - Local and production behavior is identical
   - Agent response quality is consistent
   - Preview reliability is >= 95%
   - No critical bugs found

## Next Steps

1. ✅ **Setup Complete** - All services running
2. 🔄 **Manual Testing** - Create 5 apps locally (in progress)
3. ⏳ **Verify Results** - Check agent responses and previews
4. ⏳ **Production Testing** - Repeat on spike.land
5. ⏳ **Document Findings** - Record any issues or differences
6. ⏳ **Report Results** - Complete testing checklist

## Files Created

- `docs/MANUAL_MY_APPS_TEST.md` - Detailed manual testing guide
- `docs/MY_APPS_TESTING_STATUS.md` - This file
- `scripts/test-my-apps-e2e.ts` - Automated testing script
- `package.json` - Added `agent:test-my-apps:*` scripts

## Commands Reference

```bash
# Development
yarn dev                          # Start Next.js dev server
yarn agent:poll                   # Start local agent polling
yarn agent:poll:prod             # Start production agent polling

# Testing
yarn agent:test-my-apps          # Automated test (both environments)
yarn agent:test-my-apps:local    # Automated test (local only)
yarn agent:test-my-apps:prod     # Automated test (production only)

# Monitoring
tail -f /private/tmp/agent-poll-prod.log  # Watch production logs
ps aux | grep agent-poll                   # Check running processes

# Database
yarn db:studio                   # Open Prisma Studio
```

## Current Browser Windows

Chrome is currently open with:

- **Tab 1**: `http://localhost:3000/my-apps` - Ready for testing

**You can now:**

1. Click "Create New App" to start testing
2. Or review the manual testing guide first
3. Or run the automated tests

---

**Status:** Ready for manual testing 🚀
**Last Updated:** 2026-01-20 16:30
