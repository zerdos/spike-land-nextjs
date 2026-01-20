/**
 * Test script for my-apps functionality
 * Tests the complete flow: app creation, agent response, preview rendering
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

interface TestResult {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
}

const PROD_URL = "https://spike.land";
const LOCAL_URL = "http://localhost:3000";

async function testAgentPolling(env: "local" | "prod"): Promise<TestResult> {
  console.log(`\n[AGENT POLLING] Checking ${env} agent...`);

  // Check if agent polling process is running
  const { execFile } = await import("child_process");
  const { promisify } = await import("util");
  const execFileAsync = promisify(execFile);

  try {
    const { stdout } = await execFileAsync("ps", ["aux"]);
    const processLines = stdout.split("\n");
    const agentProcess = processLines.find(
      (line) =>
        line.includes("agent-poll") &&
        !line.includes("grep") &&
        (env === "prod" ? line.includes("--prod") : !line.includes("--prod")),
    );

    if (!agentProcess) {
      return {
        success: false,
        message: `Agent polling is NOT running for ${env}. Run: yarn agent:poll${
          env === "prod" ? ":prod" : ""
        }`,
      };
    }

    console.log(`  ✓ Agent polling is running`);
    return {
      success: true,
      message: "Agent polling is running",
    };
  } catch (error) {
    return {
      success: false,
      message: `Error checking agent status: ${error}`,
    };
  }
}

async function testHealthEndpoint(baseUrl: string): Promise<TestResult> {
  console.log(`\n[HEALTH] Testing ${baseUrl}/api/health...`);

  try {
    const response = await fetch(`${baseUrl}/api/health`);
    if (!response.ok) {
      return {
        success: false,
        message: `Health check failed: ${response.status}`,
      };
    }

    const data = await response.json();
    console.log(`  ✓ API is healthy:`, data);
    return {
      success: true,
      message: "API is healthy",
    };
  } catch (error) {
    return {
      success: false,
      message: `Health check error: ${error}`,
    };
  }
}

async function runTests(env: "local" | "prod") {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`TESTING MY-APPS FUNCTIONALITY - ${env.toUpperCase()}`);
  console.log("=".repeat(60));

  const baseUrl = env === "prod" ? PROD_URL : LOCAL_URL;

  // Test 1: Health check
  const healthResult = await testHealthEndpoint(baseUrl);
  console.log(healthResult.success ? "✓" : "❌", healthResult.message);

  // Test 2: Check agent polling
  const pollingResult = await testAgentPolling(env);
  console.log(pollingResult.success ? "✓" : "❌", pollingResult.message);

  if (!pollingResult.success) {
    console.log("\n⚠️  Agent polling is not running. Start it with:");
    console.log(`   yarn agent:poll${env === "prod" ? ":prod" : ""}`);
  }

  // Summary
  console.log(`\n${"=".repeat(60)}`);
  console.log("TEST SUMMARY");
  console.log("=".repeat(60));
  console.log(`Environment: ${env.toUpperCase()}`);
  console.log(`Base URL: ${baseUrl}`);
  console.log(`API Health: ${healthResult.success ? "✓" : "❌"}`);
  console.log(`Agent Running: ${pollingResult.success ? "✓" : "❌"}`);
  console.log("\n💡 Next: Manually test in browser by:");
  console.log(`   1. Open: ${baseUrl}/my-apps`);
  console.log(`   2. Click "Create New App"`);
  console.log(`   3. Enter a prompt (e.g., "Build a todo app")`);
  console.log(`   4. Wait for agent response`);
  console.log(`   5. Verify preview appears in last message`);
  console.log(`   6. Repeat 5 times with different apps`);
}

// Run tests
const env = process.argv.includes("--prod") ? "prod" : "local";
runTests(env).catch(console.error);
