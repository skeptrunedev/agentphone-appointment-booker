import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { AppointmentTask } from "./task.js";
import type { AgentPhoneCall } from "./agentphone/api.js";

export interface SavedCallResult {
  callId: string;
  destination: string;
  task: AppointmentTask;
  call: AgentPhoneCall;
  transcript: unknown;
}

export function saveCallResult(resultsDir: string, result: SavedCallResult): string {
  const dir = resolve(resultsDir);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const business = result.task.businessName
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "appointment";
  const path = resolve(dir, `${stamp}-${business}.json`);
  writeFileSync(path, JSON.stringify({ savedAt: new Date().toISOString(), ...result }, null, 2), {
    mode: 0o600,
  });
  return path;
}
