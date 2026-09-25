export interface AppointmentTask {
  businessName: string;
  purpose: string;
  callerName: string;
  callbackNumber: string;
  preferredWindows: string[];
  questions: string[];
  bookIfAvailable: boolean;
  maxTotalPrice?: number;
  timezone?: string;
  notes?: string;
}

export function parseAppointmentTask(value: unknown): AppointmentTask {
  if (!value || typeof value !== "object") {
    throw new Error("task must be an object");
  }
  const input = value as Record<string, unknown>;
  const requiredString = (key: string): string => {
    const v = input[key];
    if (typeof v !== "string" || v.trim() === "") {
      throw new Error(`task.${key} must be a non-empty string`);
    }
    return v.trim();
  };
  const stringArray = (key: string): string[] => {
    const v = input[key];
    if (!Array.isArray(v) || v.length === 0 || v.some((x) => typeof x !== "string" || x.trim() === "")) {
      throw new Error(`task.${key} must be a non-empty array of strings`);
    }
    return v.map((x) => (x as string).trim());
  };
  if (typeof input.bookIfAvailable !== "boolean") {
    throw new Error("task.bookIfAvailable must be true or false");
  }
  if (
    input.maxTotalPrice !== undefined &&
    (typeof input.maxTotalPrice !== "number" || !Number.isFinite(input.maxTotalPrice) || input.maxTotalPrice < 0)
  ) {
    throw new Error("task.maxTotalPrice must be a non-negative number when provided");
  }
  return {
    businessName: requiredString("businessName"),
    purpose: requiredString("purpose"),
    callerName: requiredString("callerName"),
    callbackNumber: requiredString("callbackNumber"),
    preferredWindows: stringArray("preferredWindows"),
    questions: stringArray("questions"),
    bookIfAvailable: input.bookIfAvailable,
    maxTotalPrice: input.maxTotalPrice as number | undefined,
    timezone: typeof input.timezone === "string" ? input.timezone.trim() : undefined,
    notes: typeof input.notes === "string" ? input.notes.trim() : undefined,
  };
}

export function taskInstructions(task: AppointmentTask): string {
  const priceRule = task.maxTotalPrice === undefined
    ? "Do not agree to any payment, deposit, or charge. Collect the price and report it."
    : `You may book only if the total known charge is no more than $${task.maxTotalPrice.toFixed(2)}. Never provide payment.`;
  const bookingRule = task.bookIfAvailable
    ? "You may book one appointment only when it fits an approved window and all material terms are clear."
    : "Do not book. Collect information and available times only.";
  return `You are a calm, concise AI phone assistant calling ${task.businessName} on behalf of ${task.callerName}.
Disclose that you are an AI assistant at the start. Your purpose is: ${task.purpose}.
Callback number: ${task.callbackNumber}.
Approved appointment windows (${task.timezone ?? "local time"}): ${task.preferredWindows.join("; ")}.
Questions to resolve: ${task.questions.join("; ")}.
${bookingRule}
${priceRule}
Never disclose date of birth, insurance identifiers, payment information, passwords, or detailed medical history. Never invent availability, pricing, confirmation numbers, or policies. If asked for information you do not have, say you need to check with the person you represent. Ask the office to repeat the final date, time, address, provider, price, cancellation policy, and confirmation number before treating a booking as complete.
If no approved slot is available, collect the earliest alternatives without booking. If placed on hold, wait patiently. If you reach voicemail, leave a short message with the callback number and purpose, then finish.
Backchannel policy: Use moderate, natural acknowledgments without interrupting.
Interruption policy: Stop speaking when the other person interrupts and listen.
Before ending, briefly recap what was confirmed. Do not claim a booking succeeded until the office explicitly confirms it. End with a concise farewell.
${task.notes ? `Additional authorized notes: ${task.notes}` : ""}`;
}
