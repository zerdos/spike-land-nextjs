import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

export async function GET() {
  try {
    // Read bolt state from file
    const statePath = join(process.cwd(), ".claude", "bolt-state.json");
    const stateContent = await readFile(statePath, "utf-8");
    const state = JSON.parse(stateContent);

    return NextResponse.json({
      activeTasks: state.activeTasks ?? [],
      config: state.config ?? { wipLimit: 3, autoMerge: false, autoApprove: true },
      metrics: state.metrics ?? { tasksCompleted: 0, tasksFailed: 0 },
      syncStatus: { status: "idle", lastSync: state.metrics?.lastRunAt ?? null },
    });
  } catch {
    return NextResponse.json({
      activeTasks: [],
      config: { wipLimit: 3, autoMerge: false, autoApprove: true },
      metrics: { tasksCompleted: 0, tasksFailed: 0 },
      syncStatus: { status: "unknown", lastSync: null },
    });
  }
}
