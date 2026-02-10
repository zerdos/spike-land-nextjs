const fps = 30;
const transitionFrames = 15;

const SCRIPT_SEGMENTS = [
  {
    id: "scene1",
    durationFrames: 266,
    text: "AI agents are amazing at planning... but there’s a massive gap. You generate code, but you can't see it running. The vibe... is broken.",
  },
  {
    id: "scene2",
    durationFrames: 209,
    text: "Meet the Bridge. BridgeMind for orchestrating the plan, and spike dot land for executing the vision.",
  },
  {
    id: "scene3",
    durationFrames: 206,
    text: "One continuous pipeline. Plan it in your terminal, build it on the edge, and see results instantly in your browser.",
  },
  {
    id: "scene4",
    durationFrames: 347,
    text: "Seven dedicated MCP tools give your agents direct access to the execution layer. Read code, edit with precision, and preview live—with zero manual copy-paste.",
  },
  {
    id: "scene5",
    durationFrames: 238,
    text: "Instant transpilation. Real-time WebSocket updates. It’s the infrastructure that turns 'agentic coding' into 'agentic building'.",
  },
  {
    id: "scene6",
    durationFrames: 231,
    text: "Solo founders are building entire SaaS platforms with this workflow today. It’s open, standardized, and production-ready.",
  },
  {
    id: "scene7",
    durationFrames: 180,
    text: "Bring your agents to life. BridgeMind plus spike dot land. Start building at spike dot land today.",
  },
];

const words = [];
let currentFrame = 0;

for (const segment of SCRIPT_SEGMENTS) {
  const segmentWords = segment.text.split(/\s+/);
  const framesPerWord = segment.durationFrames / segmentWords.length;
  
  segmentWords.forEach((wordText, i) => {
    const startFrame = currentFrame + (i * framesPerWord);
    const endFrame = startFrame + framesPerWord;
    
    words.push({
      text: wordText.replace(/[.,]/g, ""),
      start_time: startFrame / fps,
      end_time: endFrame / fps,
    });
  });
  
  currentFrame += segment.durationFrames + transitionFrames;
}

console.log(JSON.stringify({ words }, null, 2));
