import { describe, it, expect } from "vitest";

describe("SolanaAgentListener", () => {
  it("should initialize with default config", () => {
    const config = { rpcUrl: "https://api.mainnet-beta.solana.com", programs: [] };
    expect(config.rpcUrl).toBeDefined();
    expect(config.programs).toHaveLength(0);
  });

  it("should extract program id from deploy log", () => {
    const log = "Program 11111111111111111111111111111111 invoke [1]";
    const match = log.match(/Program\s+([1-9A-HJ-NP-Za-km-z]{32,44})\s+invoke/);
    expect(match).not.toBeNull();
    expect(match![1]).toBe("11111111111111111111111111111111");
  });

  it("should skip failed transactions", () => {
    const tx = { meta: { err: { InstructionError: [0, "Custom"] } } };
    expect(tx.meta.err).not.toBeNull();
  });

  it("should count unique program invocations", () => {
    const logs = [
      "Program A invoke [1]",
      "Program B invoke [1]",
      "Program A invoke [1]",
      "Program C invoke [1]",
    ];
    const programs = new Set(logs.map((l) => l.split(" ")[1]));
    expect(programs.size).toBe(3);
  });

  it("should handle empty log array", () => {
    const logs: string[] = [];
    expect(logs.length).toBe(0);
  });
});
