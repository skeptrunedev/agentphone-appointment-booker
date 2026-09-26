import "dotenv/config";

function required(key: string): string {
  const v = process.env[key];
  if (!v || v.trim() === "") {
    throw new Error(`Missing required env var: ${key}. Copy .env.example to .env and fill it in.`);
  }
  return v;
}

function optional(key: string, fallback: string): string {
  const v = process.env[key];
  return v && v.trim() !== "" ? v : fallback;
}

export interface AppConfig {
  agentPhone: {
    apiKey: string;
    agentId: string;
    baseUrl: string;
    modelTier: "turbo" | "balanced" | "max";
  };
  resultsDir: string;
  pollIntervalMs: number;
  callTimeoutMs: number;
}

export function loadConfig(): AppConfig {
  const modelTier = optional("AGENTPHONE_MODEL_TIER", "turbo");
  if (modelTier !== "turbo" && modelTier !== "balanced" && modelTier !== "max") {
    throw new Error("AGENTPHONE_MODEL_TIER must be turbo, balanced, or max");
  }
  return {
    agentPhone: {
      apiKey: required("AGENTPHONE_API_KEY"),
      agentId: required("AGENTPHONE_AGENT_ID"),
      baseUrl: optional("AGENTPHONE_API_BASE_URL", "https://api.agentphone.ai"),
      modelTier,
    },
    resultsDir: optional("CALL_RESULTS_DIR", "call-results"),
    pollIntervalMs: Number.parseInt(optional("CALL_POLL_INTERVAL_MS", "3000"), 10),
    callTimeoutMs: Number.parseInt(optional("CALL_TIMEOUT_MS", "900000"), 10),
  };
}
