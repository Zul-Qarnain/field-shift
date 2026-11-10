import { describe, expect, it } from "vitest";
import { parseMessages } from "@/lib/chat";

describe("parseMessages", () => {
  it("accepts a valid conversation", () => {
    const messages = [
      { role: "user", content: "hi" },
      { role: "assistant", content: "hello" },
      { role: "user", content: "what after Aman?" },
    ];
    expect(parseMessages({ messages })).toEqual(messages);
  });

  it("rejects bad input", () => {
    expect(parseMessages(null)).toBeNull();
    expect(parseMessages({ messages: "hi" })).toBeNull();
    expect(parseMessages({ messages: [] })).toBeNull();
    expect(parseMessages({ messages: [{ role: "system", content: "x" }] })).toBeNull();
    expect(parseMessages({ messages: [{ role: "user", content: "  " }] })).toBeNull();
    expect(parseMessages({ messages: [{ role: "user", content: "x".repeat(2001) }] })).toBeNull();
    expect(parseMessages({ messages: [{ role: "assistant", content: "x" }] })).toBeNull();
    expect(parseMessages({ messages: Array(21).fill({ role: "user", content: "x" }) })).toBeNull();
  });
});
