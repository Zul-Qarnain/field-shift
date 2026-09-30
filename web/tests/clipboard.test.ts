import { describe, expect, it, vi } from "vitest";
import { copyToClipboard } from "@/lib/clipboard";

describe("copyToClipboard", () => {
  it("reports copied only after writeText resolves", async () => {
    let settled = false;
    const clipboard = { writeText: () => new Promise<void>((resolve) => setTimeout(() => { settled = true; resolve(); }, 5)) };
    const pending = copyToClipboard("hello", clipboard);
    expect(settled).toBe(false);
    expect(await pending).toBe("copied");
    expect(settled).toBe(true);
  });

  it("reports failed when the browser refuses the write", async () => {
    const clipboard = { writeText: vi.fn().mockRejectedValue(new Error("NotAllowedError")) };
    expect(await copyToClipboard("hello", clipboard)).toBe("failed");
    expect(clipboard.writeText).toHaveBeenCalledWith("hello");
  });

  it("reports failed when there is no clipboard at all, without touching anything", async () => {
    expect(await copyToClipboard("hello", undefined)).toBe("failed");
  });

  it("never leaves an unhandled rejection", async () => {
    const unhandled: unknown[] = [];
    const onRejection = (reason: unknown) => unhandled.push(reason);
    process.on("unhandledRejection", onRejection);
    await copyToClipboard("x", { writeText: () => Promise.reject(new Error("denied")) });
    await new Promise((resolve) => setTimeout(resolve, 10));
    process.off("unhandledRejection", onRejection);
    expect(unhandled).toEqual([]);
  });
});
