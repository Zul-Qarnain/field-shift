export type ChatMessage = { role: "user" | "assistant"; content: string };

export const SYSTEM =
  "You are the Field Shift helper. Field Shift gives Bangladeshi farmers crop-rotation advice " +
  "(Aman/Boro/Aus rice, rabi crops, salinity, monsoon onset) from NASA data. " +
  "Answer in the language the user writes in (Bangla or English). Keep replies short and practical. " +
  "If you are unsure, say so and suggest the Plan or Quick pages of the site.";

const MAX_TURNS = 20;
const MAX_CHARS = 2000;

/** Validates an untrusted request body; returns null if anything is off. */
export function parseMessages(body: unknown): ChatMessage[] | null {
  const msgs = (body as { messages?: unknown } | null)?.messages;
  if (!Array.isArray(msgs) || msgs.length === 0 || msgs.length > MAX_TURNS) return null;
  for (const m of msgs) {
    if (m?.role !== "user" && m?.role !== "assistant") return null;
    if (typeof m.content !== "string" || !m.content.trim() || m.content.length > MAX_CHARS) return null;
  }
  if (msgs[0].role !== "user" || msgs[msgs.length - 1].role !== "user") return null;
  return msgs.map((m) => ({ role: m.role, content: m.content }));
}
