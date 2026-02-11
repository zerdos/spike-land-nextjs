export type StreamEvent =
  | { type: "agent"; name: string; model: string; }
  | { type: "status"; message: string; }
  | {
    type: "complete";
    slug: string;
    url: string;
    title: string;
    description: string;
    relatedApps: string[];
    agent?: string;
  }
  | { type: "error"; message: string; codespaceUrl?: string; };
