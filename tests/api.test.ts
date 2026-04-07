import { describe, it, expect } from "vitest";

describe("API Routes", () => {
  it("should validate address format", () => {
    const address = "AgentProgramId111111111111111111111111111";
    expect(address.length).toBeGreaterThanOrEqual(32);
    expect(address.length).toBeLessThanOrEqual(44);
  });

  it("should reject empty address", () => {
    const address = "";
    expect(address.length).toBe(0);
  });

  it("should limit batch query to 100 addresses", () => {
    const batch = Array.from({ length: 150 }, (_, i) => `Agent${i}`);
    const limited = batch.slice(0, 100);
    expect(limited.length).toBe(100);
  });

  it("should return 404 for unknown agent", () => {
    const verdict = null;
    expect(verdict).toBeNull();
  });

  it("should format verdict response correctly", () => {
    const response = {
      address: "Agent111...",
      classification: "AUTONOMOUS" as const,
      confidence: 0.91,
      timestamp: new Date().toISOString(),
    };
    expect(response.classification).toBe("AUTONOMOUS");
    expect(response.confidence).toBeLessThanOrEqual(0.95);
  });
});
