export type StreamEvent =
  | { type: "status"; message: string; }
  | {
    type: "complete";
    slug: string;
    url: string;
    title: string;
    description: string;
    relatedApps: string[];
  }
  | { type: "error"; message: string; };
