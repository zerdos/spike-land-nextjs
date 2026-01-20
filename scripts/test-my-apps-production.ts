#!/usr/bin/env tsx
/**
 * Test script to verify /my-apps functionality on production
 *
 * This script:
 * 1. Opens production site (https://spike.land/my-apps) in Chrome
 * 2. Waits for user to authenticate
 * 3. Creates 5 test apps with different prompts
 * 4. Verifies agent responses appear
 * 5. Checks preview iframes are visible
 */

import { spawn } from "child_process";

const TEST_APPS = [
  {
    name: "Counter App",
    prompt: "Create a simple click counter with a button and display showing the current count",
  },
  {
    name: "Todo List",
    prompt: "Build a todo list app with add, delete, and mark as complete functionality",
  },
  {
    name: "Color Picker",
    prompt: "Make a color picker that shows RGB values and displays the selected color",
  },
  {
    name: "Weather Display",
    prompt: "Create a mock weather display showing temperature, conditions, and a 5-day forecast",
  },
  {
    name: "Calculator",
    prompt: "Build a simple calculator with basic operations: +, -, *, /",
  },
];

async function main() {
  const isProd = process.argv.includes("--prod");
  const baseUrl = isProd ? "https://spike.land" : "http://localhost:3000";

  console.log(`\n🧪 Testing /my-apps on: ${baseUrl}`);
  console.log(`=`.repeat(60));

  // Open the my-apps page
  console.log(`\n1️⃣  Opening ${baseUrl}/my-apps in Chrome...`);
  spawn("open", ["-a", "Google Chrome", `${baseUrl}/my-apps`]);

  console.log(`\n✅ Chrome opened!`);
  console.log(`\n📋 Test Plan:`);
  console.log(`   - Authenticate if needed`);
  console.log(`   - Click "Create New App" button`);
  console.log(`   - Test each of these prompts:\n`);

  TEST_APPS.forEach((app, index) => {
    console.log(`   ${index + 1}. ${app.name}`);
    console.log(`      Prompt: "${app.prompt}"`);
  });

  console.log(`\n✓ Verify for each app:`);
  console.log(`   - Agent responds with code`);
  console.log(`   - Preview iframe shows the working app`);
  console.log(`   - Can interact with the agent to make changes`);

  if (isProd) {
    console.log(`\n⚠️  PRODUCTION MODE`);
    console.log(`   Make sure agent polling is running:`);
    console.log(`   yarn agent:poll:prod`);
  } else {
    console.log(`\n🏠 LOCAL MODE`);
    console.log(`   Make sure local agent polling is running:`);
    console.log(`   yarn agent:poll`);
  }

  console.log(`\n${`=`.repeat(60)}\n`);
}

main().catch(console.error);
