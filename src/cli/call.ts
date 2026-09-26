import "dotenv/config";
import { readFileSync } from "node:fs";
import { AgentPhoneApiError, AgentPhoneClient, callIdFrom, callStatusFrom } from "../agentphone/api.js";
import { loadConfig } from "../config.js";
import { saveCallResult } from "../result.js";
import { parseAppointmentTask, taskInstructions } from "../task.js";

interface Args {
  to: string;
  taskFile: string;
}

function parseArgs(argv: string[]): Args {
  let to: string | undefined;
  let taskFile = "task.json";

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] ?? "";
    if (arg === "--task") {
      const val = argv[++i];
      if (!val) throw new Error("--task requires a JSON file path");
      taskFile = val;
    } else if (arg.startsWith("--task=")) {
      taskFile = arg.slice("--task=".length);
    } else if (!to) {
      to = arg;
    }
  }
  if (!to) throw new Error("missing phone number");
  return { to, taskFile };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function renderTranscript(value: unknown): void {
  const data = value && typeof value === "object" && "data" in value
    ? (value as { data: unknown }).data
    : value;
  const turns = Array.isArray(data)
    ? data
    : data && typeof data === "object" && "transcripts" in data && Array.isArray((data as any).transcripts)
      ? (data as any).transcripts
      : [];
  if (turns.length === 0) return;
  console.log("\nTranscript:");
  for (const turn of turns) {
    if (!turn || typeof turn !== "object") continue;
    const item = turn as Record<string, unknown>;
    if (typeof item.role === "string" && typeof item.content === "string") {
      console.log(`[${item.role}] ${item.content}`);
      continue;
    }
    if (typeof item.transcript === "string") console.log(`[office] ${item.transcript}`);
    if (typeof item.response === "string") console.log(`[assistant] ${item.response}`);
  }
}

async function main(): Promise<void> {
  let args: Args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    console.error("usage: pnpm call +1XXXXXXXXXX --task task.json");
    process.exit(1);
  }
  if (!/^\+\d{6,15}$/.test(args.to)) {
    console.error(`"${args.to}" is not E.164. Expected format: +13125550123`);
    process.exit(1);
  }
  let task;
  try {
    task = parseAppointmentTask(JSON.parse(readFileSync(args.taskFile, "utf8")));
  } catch (e) {
    console.error(`Could not read task file ${args.taskFile}:`, e);
    process.exit(1);
  }

  const config = loadConfig();
  const client = new AgentPhoneClient(config.agentPhone);
  const created = await client.createCall({
    toNumber: args.to,
    initialGreeting: `Hello, I am an AI assistant calling on behalf of ${task.callerName} about ${task.purpose}. Is now a good time?`,
    systemPrompt: taskInstructions(task),
    modelTier: config.agentPhone.modelTier,
  });
  const callId = callIdFrom(created);
  console.log(`Call started: ${callId}`);

  const deadline = Date.now() + config.callTimeoutMs;
  let call = created;
  let lastStatus = "";
  while (Date.now() < deadline) {
    call = await client.getCall(callId);
    const status = callStatusFrom(call);
    if (status !== lastStatus) {
      console.log(`Status: ${status}`);
      lastStatus = status;
    }
    if (status === "completed" || status === "failed") break;
    await sleep(config.pollIntervalMs);
  }
  if (Date.now() >= deadline) throw new Error(`Timed out waiting for call ${callId} to finish.`);

  const transcript = await client.getTranscript(callId);
  renderTranscript(transcript);
  const resultPath = saveCallResult(config.resultsDir, {
    callId,
    destination: args.to,
    task,
    call,
    transcript,
  });
  console.log(`\nSaved result: ${resultPath}`);
}

main().catch((e) => {
  if (e instanceof AgentPhoneApiError && e.status === 402) {
    console.error(`${e.message}\nAgentPhone requires sufficient balance or a payment method before outbound calls. No charge was attempted by this app.`);
  } else {
    console.error(e instanceof Error ? e.message : e);
  }
  process.exit(1);
});
