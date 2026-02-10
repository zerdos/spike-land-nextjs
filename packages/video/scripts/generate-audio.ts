import { synthesizeSpeech } from "../../../src/lib/tts/elevenlabs-client";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// Load env vars from root .env.local or .env
const envPath = fs.existsSync(path.join(__dirname, "../../../.env.local")) 
  ? path.join(__dirname, "../../../.env.local")
  : path.join(__dirname, "../../../.env");
dotenv.config({ path: envPath });

const SCRIPT = [
  {
    id: "scene1",
    text: "AI agents are amazing at planning... but there’s a massive gap. You generate code, but you can't see it running. The vibe... is broken.",
  },
  {
    id: "scene2",
    text: "Meet the Bridge. BridgeMind for orchestrating the plan, and spike dot land for executing the vision.",
  },
  {
    id: "scene3",
    text: "One continuous pipeline. Plan it in your terminal, build it on the edge, and see results instantly in your browser.",
  },
  {
    id: "scene4",
    text: "Seven dedicated MCP tools give your agents direct access to the execution layer. Read code, edit with precision, and preview live—with zero manual copy-paste.",
  },
  {
    id: "scene5",
    text: "Instant transpilation. Real-time WebSocket updates. It’s the infrastructure that turns 'agentic coding' into 'agentic building'.",
  },
  {
    id: "scene6",
    text: "Solo founders are building entire SaaS platforms with this workflow today. It’s open, standardized, and production-ready.",
  },
  {
    id: "scene7",
    text: "Bring your agents to life. BridgeMind plus spike dot land. Start building at spike dot land today.",
  },
];

const OUTPUT_DIR = path.join(__dirname, "../public/audio");

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  for (const segment of SCRIPT) {
    console.log(`Generating audio for ${segment.id}...`);
    try {
      const buffer = await synthesizeSpeech(segment.text);
      const filePath = path.join(OUTPUT_DIR, `bridgemind-${segment.id}.mp3`);
      fs.writeFileSync(filePath, buffer);
      console.log(`Saved to ${filePath}`);
    } catch (error) {
      console.error(`Failed to generate ${segment.id}:`, error);
    }
  }
}

main();
