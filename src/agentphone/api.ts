export interface AgentPhoneConfig {
  apiKey: string;
  agentId: string;
  baseUrl: string;
}

export type AgentPhoneCall = Record<string, unknown> & {
  id?: string;
  callId?: string;
  status?: string;
};

export interface CreateCallInput {
  toNumber: string;
  initialGreeting: string;
  systemPrompt: string;
  modelTier?: "turbo" | "balanced" | "max";
}

export class AgentPhoneApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly responseBody: unknown,
  ) {
    super(`AgentPhone API error (${status}): ${message}`);
  }
}

export class AgentPhoneClient {
  constructor(private readonly config: AgentPhoneConfig) {}

  async createCall(input: CreateCallInput): Promise<AgentPhoneCall> {
    return this.request("/v1/calls", {
      method: "POST",
      body: JSON.stringify({
        agentId: this.config.agentId,
        toNumber: input.toNumber,
        initialGreeting: input.initialGreeting,
        systemPrompt: input.systemPrompt,
        modelTier: input.modelTier ?? "max",
        callScreeningIdentity: "AI appointment assistant",
        callScreeningPurpose: "Scheduling an appointment on behalf of a person",
        disableRecording: true,
      }),
    });
  }

  async getCall(callId: string): Promise<AgentPhoneCall> {
    return this.request(`/v1/calls/${encodeURIComponent(callId)}`);
  }

  async getTranscript(callId: string): Promise<unknown> {
    return this.request(`/v1/calls/${encodeURIComponent(callId)}/transcript`);
  }

  async endCall(callId: string): Promise<unknown> {
    return this.request(`/v1/calls/${encodeURIComponent(callId)}/end`, { method: "POST" });
  }

  async getAgent(): Promise<Record<string, unknown>> {
    return this.request(`/v1/agents/${encodeURIComponent(this.config.agentId)}`);
  }

  async listNumbers(): Promise<unknown> {
    return this.request("/v1/numbers");
  }

  private async request(path: string, init: RequestInit = {}): Promise<any> {
    const response = await fetch(`${this.config.baseUrl.replace(/\/$/, "")}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${this.config.apiKey}`,
        "content-type": "application/json",
        ...init.headers,
      },
    });
    const raw = await response.text();
    let body: any = null;
    try {
      body = raw ? JSON.parse(raw) : null;
    } catch {
      body = raw;
    }
    if (!response.ok) {
      const message = body?.error?.message ?? body?.detail ?? response.statusText;
      throw new AgentPhoneApiError(response.status, String(message), body);
    }
    return body;
  }
}

export function callIdFrom(response: AgentPhoneCall): string {
  const nested = response.data && typeof response.data === "object"
    ? response.data as Record<string, unknown>
    : undefined;
  const id = response.id ?? response.callId ?? nested?.id ?? nested?.callId;
  if (typeof id !== "string" || id.length === 0) {
    throw new Error(`AgentPhone did not return a call ID: ${JSON.stringify(response)}`);
  }
  return id;
}

export function callStatusFrom(call: AgentPhoneCall): string {
  const nested = call.data && typeof call.data === "object"
    ? call.data as Record<string, unknown>
    : undefined;
  const status = call.status ?? nested?.status;
  return typeof status === "string" ? status.toLowerCase() : "unknown";
}
