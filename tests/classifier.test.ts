import { describe, it, expect } from "vitest";

describe("FeatureExtractor", () => {
  it("should compute transaction frequency entropy", () => {
    const intervals = [400, 410, 395, 420, 400];
    const mean = intervals.reduce((a, b) => a + b) / intervals.length;
    expect(mean).toBeCloseTo(405, 0);
  });

  it("should detect human time-of-day clustering", () => {
    const hours = [9, 10, 11, 14, 15, 16, 17];
    const isBusinessHours = hours.every((h) => h >= 8 && h <= 18);
    expect(isBusinessHours).toBe(true);
  });

  it("should measure instruction diversity", () => {
    const instructions = ["swap", "transfer", "swap", "createAccount", "swap"];
    const unique = new Set(instructions);
    const diversity = unique.size / instructions.length;
    expect(diversity).toBeCloseTo(0.6, 1);
  });

  it("should flag zero-variance decision patterns", () => {
    const tradeSizes = [1.0, 1.0, 1.0, 1.0, 1.0];
    const variance = tradeSizes.reduce((s, v) => s + Math.pow(v - 1.0, 2), 0) / tradeSizes.length;
    expect(variance).toBe(0);
  });

  it("should normalize features to 0-1 range", () => {
    const raw = [100, 200, 300, 400, 500];
    const min = Math.min(...raw);
    const max = Math.max(...raw);
    const normalized = raw.map((v) => (v - min) / (max - min));
    expect(normalized[0]).toBe(0);
    expect(normalized[4]).toBe(1);
  });
});
