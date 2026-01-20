#!/usr/bin/env tsx
/**
 * Manual testing script for /my-apps functionality
 * Tests both local and production environments
 *
 * Usage:
 *   tsx scripts/test-my-apps-manual.ts          # Test local
 *   tsx scripts/test-my-apps-manual.ts --prod   # Test production
 */

import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const isProd = process.argv.includes("--prod");
const BASE_URL = isProd ? "https://spike.land" : "http://localhost:3000";

const APP_REQUESTS = [
  "Create a simple click counter with a button and display showing the current count",
  "Build a todo list app with add, delete, and toggle complete functionality",
  "Create a color picker app that shows the selected color in hex, rgb, and hsl formats",
  "Build a simple calculator app with basic operations: add, subtract, multiply, divide",
  "Create a weather dashboard showing temperature, conditions, and a 5-day forecast with mock data",
];

console.log(`
========================================
Testing /my-apps Functionality
========================================
Environment: ${isProd ? "PRODUCTION" : "LOCAL"}
Base URL: ${BASE_URL}
Agent Polling: Must be running separately
  Local:  yarn agent:poll
  Prod:   yarn agent:poll:prod
========================================
`);

console.log("📋 Test Plan:");
console.log("1. Open browser to: " + BASE_URL + "/my-apps");
console.log("2. Login if needed");
console.log("3. For each app request below:");
console.log("   - Create new app");
console.log("   - Enter the request in the chat");
console.log("   - Wait for agent response");
console.log("   - Verify preview shows up");
console.log("   - Verify preview URL is visible");
console.log("");

console.log("🚀 App Requests to Test:");
APP_REQUESTS.forEach((request, index) => {
  console.log(`\n${index + 1}. ${request}`);
  console.log(`   Expected codespace: app-${index + 1}-*`);
});

console.log("\n\n✅ Success Criteria:");
console.log("- Agent responds to all 5 requests");
console.log("- Each app shows preview iframe");
console.log("- Preview URLs are visible in agent messages");
console.log("- No errors in browser console");
console.log("- Agent working indicator shows/hides correctly");

console.log("\n\n⚠️  Before Testing:");
console.log("1. Make sure agent polling is running:");
console.log(`   ${isProd ? "yarn agent:poll:prod" : "yarn agent:poll"}`);
console.log("2. Make sure you're logged in");
console.log("3. Open browser developer tools (F12)");
console.log("4. Monitor network tab for SSE events");

console.log("\n\n🌐 Open this URL in your browser:");
console.log("   " + BASE_URL + "/my-apps");
console.log("\n========================================\n");
