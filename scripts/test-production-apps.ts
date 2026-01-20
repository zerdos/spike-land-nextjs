#!/usr/bin/env tsx
/**
 * Script to test production /my-apps by creating apps via API
 * and monitoring agent responses
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

// Load environment
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

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

// Find or create test user
async function getTestUser() {
  // Look for an existing user (preferably admin or test user)
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { contains: "zerdos" } },
        { email: { contains: "test" } },
        { role: "ADMIN" },
      ],
    },
  });

  if (!user) {
    console.error("❌ No user found. Please sign in to spike.land first.");
    process.exit(1);
  }

  return user;
}

async function createApp(userId: string, prompt: string, name: string) {
  const codespaceId = `test-${name.toLowerCase().replace(/\s+/g, "-")}-${Date.now().toString(36)}`;

  console.log(`\n📝 Creating: ${name}`);
  console.log(`   Codespace: ${codespaceId}`);
  console.log(`   Prompt: "${prompt}"`);

  const app = await prisma.app.create({
    data: {
      userId,
      name: `Test: ${name}`,
      codespaceId,
      codespaceUrl: `https://testing.spike.land/live/${codespaceId}/`,
      status: "WAITING",
      messages: {
        create: {
          role: "USER",
          content: prompt,
        },
      },
    },
    include: {
      messages: true,
    },
  });

  console.log(`   ✅ App created: ${app.id}`);
  console.log(`   🔗 URL: https://spike.land/my-apps/${codespaceId}`);

  return app;
}

async function waitForAgentResponse(appId: string, maxWaitMs = 60000) {
  const startTime = Date.now();
  console.log(`   ⏳ Waiting for agent response (max ${maxWaitMs / 1000}s)...`);

  while (Date.now() - startTime < maxWaitMs) {
    const messages = await prisma.appMessage.findMany({
      where: { appId },
      orderBy: { createdAt: "desc" },
    });

    const agentMessage = messages.find(m => m.role === "AGENT");
    if (agentMessage) {
      console.log(`   ✅ Agent responded in ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
      console.log(`   📝 Response preview: ${agentMessage.content.substring(0, 100)}...`);
      return agentMessage;
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log(`   ❌ No agent response after ${maxWaitMs / 1000}s`);
  return null;
}

async function verifyCodespace(codespaceUrl: string) {
  try {
    const response = await fetch(`${codespaceUrl}session.json`);
    if (!response.ok) {
      console.log(`   ⚠️  Codespace not accessible yet (${response.status})`);
      return false;
    }

    const data = await response.json();
    console.log(`   ✅ Codespace accessible`);
    console.log(`   📦 Code length: ${data.code?.length || 0} chars`);
    return true;
  } catch (error) {
    console.log(`   ❌ Codespace error: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

async function main() {
  const isProd = process.argv.includes("--prod");
  const baseUrl = isProd ? "https://spike.land" : "http://localhost:3000";

  console.log(`\n🧪 Testing ${isProd ? "PRODUCTION" : "LOCAL"} /my-apps`);
  console.log(`   URL: ${baseUrl}/my-apps`);
  console.log(`   Database: ${process.env.DATABASE_URL?.split("@")[1]?.split("/")[0]}`);
  console.log(`=`.repeat(70));

  // Get test user
  const user = await getTestUser();
  console.log(`\n👤 Using user: ${user.email} (${user.id})`);

  // Create all test apps
  const results = [];

  for (const test of TEST_APPS) {
    try {
      const app = await createApp(user.id, test.prompt, test.name);

      // Wait for agent response
      const agentResponse = await waitForAgentResponse(app.id);

      // Verify codespace
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for code to be written
      const codespaceOk = await verifyCodespace(app.codespaceUrl!);

      results.push({
        name: test.name,
        appId: app.id,
        codespaceId: app.codespaceId,
        url: `${baseUrl}/my-apps/${app.codespaceId}`,
        agentResponded: !!agentResponse,
        codespaceAccessible: codespaceOk,
        success: !!agentResponse && codespaceOk,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`   ❌ Error: ${errorMessage}`);
      results.push({
        name: test.name,
        success: false,
        error: errorMessage,
      });
    }
  }

  // Print summary
  console.log(`\n${"=".repeat(70)}`);
  console.log(`📊 RESULTS SUMMARY`);
  console.log(`${"=".repeat(70)}\n`);

  results.forEach((result, i) => {
    const icon = result.success ? "✅" : "❌";
    console.log(`${i + 1}. ${icon} ${result.name}`);
    if (result.url) {
      console.log(`   URL: ${result.url}`);
      console.log(
        `   Agent: ${result.agentResponded ? "✅" : "❌"} | Codespace: ${
          result.codespaceAccessible ? "✅" : "❌"
        }`,
      );
    }
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  const successCount = results.filter(r => r.success).length;
  console.log(`\n${successCount}/${results.length} apps created successfully`);

  if (successCount === results.length) {
    console.log(`\n🎉 All tests passed!`);
  } else {
    console.log(`\n⚠️  Some tests failed. Check agent polling logs.`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
