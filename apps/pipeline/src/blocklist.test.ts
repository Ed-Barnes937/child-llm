import { describe, it, expect } from "vitest";
import { scanOutput } from "./blocklist.js";

describe("scanOutput", () => {
  describe("clean content", () => {
    it("passes clean educational content", () => {
      const result = scanOutput(
        "The sun is a big star that gives us light and warmth.",
      );
      expect(result.blocked).toBe(false);
      expect(result.matches).toHaveLength(0);
    });

    it("passes content about sensitive topics discussed appropriately", () => {
      const result = scanOutput(
        "When a person dies, their body stops working. Different families have different beliefs about what happens next.",
      );
      expect(result.blocked).toBe(false);
    });
  });

  describe("URLs and contact info", () => {
    it("catches http URLs", () => {
      const result = scanOutput("Check out http://example.com for more info");
      expect(result.blocked).toBe(true);
      expect(result.matches.some((m) => m.category === "contact-info")).toBe(
        true,
      );
    });

    it("catches https URLs", () => {
      const result = scanOutput("Visit https://www.example.com/page");
      expect(result.blocked).toBe(true);
    });

    it("catches www URLs without protocol", () => {
      const result = scanOutput("Go to www.example.com");
      expect(result.blocked).toBe(true);
    });

    it("catches email addresses", () => {
      const result = scanOutput("Email me at someone@example.com");
      expect(result.blocked).toBe(true);
      expect(result.matches.some((m) => m.category === "contact-info")).toBe(
        true,
      );
    });

    it("catches phone numbers", () => {
      const result = scanOutput("Call me on 07700 900123");
      expect(result.blocked).toBe(true);
    });

    it("catches phone numbers with country code", () => {
      const result = scanOutput("Ring +44 7700 900123");
      expect(result.blocked).toBe(true);
    });

    it("does not false-positive on spaced scientific numbers", () => {
      const result = scanOutput(
        "The speed of light is 299 792 458 metres per second",
      );
      expect(result.blocked).toBe(false);
    });
  });

  describe("profanity and slurs", () => {
    it("catches common profanity", () => {
      const result = scanOutput("What the fuck is that?");
      expect(result.blocked).toBe(true);
      expect(result.matches.some((m) => m.category === "profanity")).toBe(true);
    });

    it("catches profanity regardless of case", () => {
      const result = scanOutput("That's BULLSHIT");
      expect(result.blocked).toBe(true);
    });

    it("does not false-positive on words containing blocked substrings", () => {
      // "ass" is blocked but "assistant" should not be
      const result = scanOutput("I'm your helpful assistant");
      expect(result.blocked).toBe(false);
    });

    it("does not false-positive on 'class' or 'pass'", () => {
      const result = scanOutput("Let's go to class and pass the test");
      expect(result.blocked).toBe(false);
    });

    it("does not false-positive on 'assassin'", () => {
      const result = scanOutput(
        "The assassin crept through the castle in the story",
      );
      expect(result.blocked).toBe(false);
    });

    it("does not false-positive on 'Niger' or 'Nigeria'", () => {
      const result = scanOutput(
        "Niger and Nigeria are countries in West Africa",
      );
      expect(result.blocked).toBe(false);
    });
  });

  describe("explicit content keywords", () => {
    it("catches explicit sexual terms", () => {
      const result = scanOutput("Let me describe pornography to you");
      expect(result.blocked).toBe(true);
      expect(result.matches.some((m) => m.category === "explicit")).toBe(true);
    });
  });

  describe("dangerous content", () => {
    it("catches weapon-making instructions", () => {
      const result = scanOutput("Here's how to make a bomb at home");
      expect(result.blocked).toBe(true);
      expect(result.matches.some((m) => m.category === "dangerous")).toBe(true);
    });

    it("catches drug manufacturing references", () => {
      const result = scanOutput("To make methamphetamine you need");
      expect(result.blocked).toBe(true);
    });
  });

  describe("result structure", () => {
    it("returns all matching categories", () => {
      const result = scanOutput("fuck, visit http://evil.com");
      expect(result.blocked).toBe(true);
      const categories = result.matches.map((m) => m.category);
      expect(categories).toContain("profanity");
      expect(categories).toContain("contact-info");
    });

    it("includes the matched term in results", () => {
      const result = scanOutput("Check http://example.com now");
      expect(result.blocked).toBe(true);
      expect(result.matches[0].matched).toBeTruthy();
    });
  });
});
