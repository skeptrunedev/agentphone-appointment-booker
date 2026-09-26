import { AgentPhoneClient } from "../agentphone/api.js";
import { loadConfig } from "../config.js";

function numberList(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) return value as Array<Record<string, unknown>>;
  if (!value || typeof value !== "object") return [];
  const body = value as Record<string, unknown>;
  for (const key of ["data", "items", "numbers"]) {
    if (Array.isArray(body[key])) return body[key] as Array<Record<string, unknown>>;
  }
  return [];
}

async function main(): Promise<void> {
  const config = loadConfig();
  const client = new AgentPhoneClient(config.agentPhone);
  const [agent, rawNumbers] = await Promise.all([client.getAgent(), client.listNumbers()]);
  const numbers = numberList(rawNumbers).filter((number) => number.agentId === config.agentPhone.agentId);
  const active = numbers.filter((number) => number.status === "active");

  if (agent.id !== config.agentPhone.agentId) throw new Error("Configured agent ID did not match the API response.");
  if (active.length === 0) throw new Error("The configured agent has no active phone number.");

  console.log("AgentPhone is ready.");
  console.log(`Agent: ${String(agent.name ?? agent.id)}`);
  console.log(`Hosted voice: ${agent.voiceMode === "hosted" ? "yes" : "per-call override"}`);
  console.log(`Call model tier: ${config.agentPhone.modelTier}`);
  console.log(`Active number: ${String(active[0]?.phoneNumber ?? active[0]?.number ?? "available")}`);
  console.log("No call was placed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
