#!/usr/bin/env tsx
/**
 * Direct API testing for /my-apps functionality
 * Tests the backend API directly to verify agent response flow
 */

import { setTimeout } from "timers/promises";

const BASE_URL = process.argv.includes("--prod") ? "https://spike.land" : "http://localhost:3000";
const IS_PROD = process.argv.includes("--prod");

interface TestApp {
  name: string;
  prompt: string;
  codespaceId: string;
}

interface AppMessage {
  id: string;
  role: "USER" | "AGENT";
  content: string;
  createdAt: string;
}

interface TestResult {
  success: boolean;
  error?: string;
}

const TEST_APPS: TestApp[] = [
  {
    name: "Click Counter",
    prompt: "Create a simple click counter with a button and display showing the current count",
    codespaceId: `test-counter-${Date.now()}`,
  },
  {
    name: "Todo List",
    prompt: "Build a todo list app with add, delete, and toggle complete functionality",
    codespaceId: `test-todo-${Date.now()}`,
  },
  {
    name: "Color Picker",
    prompt: "Create a color picker app that shows the selected color in hex, rgb, and hsl formats",
    codespaceId: `test-color-${Date.now()}`,
  },
  {
    name: "Calculator",
    prompt: "Build a simple calculator app with basic operations: add, subtract, multiply, divide",
    codespaceId: `test-calc-${Date.now()}`,
  },
  {
    name: "Weather Dashboard",
    prompt:
      "Create a weather dashboard showing temperature, conditions, and a 5-day forecast with mock data",
    codespaceId: `test-weather-${Date.now()}`,
  },
];

console.log(`
╔════════════════════════════════════════════════════════════╗
║  DIRECT API TESTING FOR /MY-APPS                           ║
║  Environment: ${IS_PROD ? "PRODUCTION" : "LOCAL".padEnd(44)} ║
║  Base URL: ${BASE_URL.padEnd(51)} ║
╚════════════════════════════════════════════════════════════╝
`);

console.log("\n⚠️  IMPORTANT: This test requires you to be logged in!");
console.log("Please ensure you have a valid session cookie.\n");

async function testApp(app: TestApp, index: number) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Test ${index + 1}/5: ${app.name}`);
  console.log("=".repeat(60));

  try {
    // Step 1: Create app via API
    console.log(`\n1️⃣  Creating app with codespace ID: ${app.codespaceId}`);
    console.log(`   URL: ${BASE_URL}/api/my-apps`);

    const createResponse = await fetch(`${BASE_URL}/api/my-apps`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `Test: ${app.name}`,
        codespaceId: app.codespaceId,
      }),
      credentials: "include",
    });

    if (!createResponse.ok) {
      console.log(
        `   ❌ Failed to create app: ${createResponse.status} ${createResponse.statusText}`,
      );
      const errorText = await createResponse.text();
      console.log(`   Error: ${errorText.substring(0, 200)}`);
      return { success: false, error: "Failed to create app" };
    }

    const appData = await createResponse.json();
    console.log(`   ✅ App created! ID: ${appData.id}`);

    // Step 2: Send message to agent
    console.log(`\n2️⃣  Sending message to agent...`);
    console.log(`   Message: "${app.prompt.substring(0, 60)}..."`);

    const messageResponse = await fetch(`${BASE_URL}/api/my-apps/${app.codespaceId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: app.prompt,
        role: "USER",
      }),
      credentials: "include",
    });

    if (!messageResponse.ok) {
      console.log(`   ❌ Failed to send message: ${messageResponse.status}`);
      return { success: false, error: "Failed to send message" };
    }

    const messageData = await messageResponse.json();
    console.log(`   ✅ Message sent! ID: ${messageData.id}`);

    // Step 3: Poll for agent response
    console.log(`\n3️⃣  Waiting for agent response (max 120 seconds)...`);

    let agentResponded = false;
    let attempts = 0;
    const maxAttempts = 24; // 24 * 5s = 120s

    while (attempts < maxAttempts && !agentResponded) {
      await setTimeout(5000);
      attempts++;

      // Fetch messages
      const messagesResponse = await fetch(
        `${BASE_URL}/api/my-apps/${app.codespaceId}/messages`,
        {
          credentials: "include",
        },
      );

      if (messagesResponse.ok) {
        const messages: AppMessage[] = await messagesResponse.json();
        const agentMessages = messages.filter((m: AppMessage) => m.role === "AGENT");

        if (agentMessages.length > 0) {
          const lastMessage = agentMessages[agentMessages.length - 1]!;
          agentResponded = true;
          console.log(`   ✅ Agent responded after ${attempts * 5}s!`);
          console.log(`   Message preview: ${lastMessage.content.substring(0, 100)}...`);

          // Check for preview URL
          if (lastMessage.content.includes("testing.spike.land/live/")) {
            console.log(`   ✅ Preview URL found in message!`);
          } else {
            console.log(`   ⚠️  No preview URL found in message`);
          }

          break;
        }
      }

      process.stdout.write(`   ⏳ Waiting... (${attempts * 5}s / 120s)\r`);
    }

    if (!agentResponded) {
      console.log(`\n   ❌ Agent did not respond within 120 seconds`);
      return { success: false, error: "Timeout waiting for agent" };
    }

    // Step 4: Check if preview is accessible
    console.log(`\n4️⃣  Checking preview URL...`);
    const previewUrl = `https://testing.spike.land/live/${app.codespaceId}/`;
    console.log(`   URL: ${previewUrl}`);

    const previewResponse = await fetch(previewUrl);
    if (previewResponse.ok) {
      console.log(`   ✅ Preview is accessible!`);
    } else {
      console.log(`   ⚠️  Preview returned ${previewResponse.status}`);
    }

    console.log(`\n✅ Test ${index + 1} PASSED: ${app.name}`);
    return { success: true };
  } catch (error) {
    console.log(`\n❌ Test ${index + 1} FAILED: ${error}`);
    return { success: false, error: String(error) };
  }
}

async function runTests() {
  const results: Array<TestResult & { app: string; }> = [];

  for (let i = 0; i < TEST_APPS.length; i++) {
    const result = await testApp(TEST_APPS[i]!, i);
    results.push({
      app: TEST_APPS[i]!.name,
      ...result,
    });
  }

  // Print summary
  console.log(`\n\n${"=".repeat(60)}`);
  console.log("TEST SUMMARY");
  console.log("=".repeat(60));

  results.forEach((result, index) => {
    const status = result.success ? "✅ PASS" : "❌ FAIL";
    console.log(`${index + 1}. ${result.app}: ${status}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  const passed = results.filter((r) => r.success).length;
  console.log(`\nOverall: ${passed}/${results.length} tests passed`);
  console.log("=".repeat(60));

  if (passed === results.length) {
    console.log("\n🎉 ALL TESTS PASSED!");
  } else {
    console.log("\n⚠️  SOME TESTS FAILED - Review output above");
  }
}

runTests().catch(console.error);
