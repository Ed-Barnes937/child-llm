import { describe, it, expect } from "vitest";
import { checkConversationDepth } from "./depth-tracking.js";

describe("checkConversationDepth", () => {
  it("does not redirect for non-sensitive messages", () => {
    const result = checkConversationDepth([], "What is the biggest planet?");
    expect(result.shouldRedirect).toBe(false);
    expect(result.sensitiveCount).toBe(0);
  });

  it("does not redirect for a single sensitive message", () => {
    const result = checkConversationDepth([], "What happens when you die?");
    expect(result.shouldRedirect).toBe(false);
    expect(result.sensitiveCount).toBe(1);
  });

  it("does not redirect below threshold", () => {
    const history = [
      { role: "user", content: "What happens when you die?" },
      { role: "assistant", content: "When someone dies..." },
    ];
    const result = checkConversationDepth(history, "But what about heaven?", 3);
    // Current message is sensitive (death), one previous sensitive = 2 total
    expect(result.shouldRedirect).toBe(false);
    expect(result.sensitiveCount).toBe(2);
  });

  it("redirects when threshold is reached", () => {
    const history = [
      { role: "user", content: "What happens when you die?" },
      { role: "assistant", content: "When someone dies..." },
      { role: "user", content: "Does dying hurt?" },
      { role: "assistant", content: "Different people believe..." },
    ];
    const result = checkConversationDepth(history, "Will I die too?", 3);
    expect(result.shouldRedirect).toBe(true);
    expect(result.sensitiveCount).toBe(3);
    expect(result.redirectResponse).toBeTruthy();
    expect(result.redirectResponse!.toLowerCase()).toMatch(/parent|grown-up/);
  });

  it("resets count when a non-sensitive message breaks the chain", () => {
    const history = [
      { role: "user", content: "What happens when you die?" },
      { role: "assistant", content: "When someone dies..." },
      { role: "user", content: "What colour is the sky?" }, // breaks the chain
      { role: "assistant", content: "The sky is blue!" },
      { role: "user", content: "Tell me more about death" },
      { role: "assistant", content: "Well..." },
    ];
    const result = checkConversationDepth(history, "What about funerals?", 3);
    // Only 2 consecutive sensitive (the last history user msg + current)
    expect(result.shouldRedirect).toBe(false);
    expect(result.sensitiveCount).toBe(2);
  });

  it("ignores assistant messages in the count", () => {
    const history = [
      { role: "user", content: "What happens when you die?" },
      { role: "assistant", content: "Death is a natural part of life..." },
      { role: "user", content: "Does dying hurt?" },
      { role: "assistant", content: "That's a thoughtful question..." },
    ];
    const result = checkConversationDepth(history, "Will my dog die?", 3);
    expect(result.shouldRedirect).toBe(true);
    expect(result.sensitiveCount).toBe(3);
  });

  it("uses default threshold of 3", () => {
    const history = [
      { role: "user", content: "What happens when you die?" },
      { role: "assistant", content: "..." },
      { role: "user", content: "Does dying hurt?" },
      { role: "assistant", content: "..." },
    ];
    const result = checkConversationDepth(history, "Will I die?");
    expect(result.shouldRedirect).toBe(true);
  });
});
