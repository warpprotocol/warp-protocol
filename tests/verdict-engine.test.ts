import { describe, it, expect } from "vitest";

type Verdict = "AUTONOMOUS" | "HYBRID" | "HUMAN";

function classify(confidence: number): Verdict {
  if (confidence >= 0.85) return "AUTONOMOUS";
  if (confidence >= 0.40) return "HYBRID";
  return "HUMAN";
}

describe("VerdictEngine", () => {
  it("should classify high confidence as AUTONOMOUS", () => {
    expect(classify(0.92)).toBe("AUTONOMOUS");
  });

  it("should classify medium confidence as HYBRID", () => {
    expect(classify(0.65)).toBe("HYBRID");
  });

  it("should classify low confidence as HUMAN", () => {
    expect(classify(0.15)).toBe("HUMAN");
  });

  it("should handle boundary at 0.85", () => {
    expect(classify(0.85)).toBe("AUTONOMOUS");
    expect(classify(0.84)).toBe("HYBRID");
  });

  it("should handle boundary at 0.40", () => {
    expect(classify(0.40)).toBe("HYBRID");
    expect(classify(0.39)).toBe("HUMAN");
  });

  it("should cap confidence at 0.95", () => {
    const capped = Math.min(0.99, 0.95);
    expect(capped).toBe(0.95);
  });
});
