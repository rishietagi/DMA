import { describe, expect, it } from "vitest";
import { formatConfidence, formatDelta, formatIndex, formatMean, formatPct, formatScore } from "./format";
import { roundHalf, toIndex } from "./math";

describe("format (presentation-layer rounding)", () => {
  it("formatScore rounds to half-points", () => {
    expect(formatScore(3.25)).toBe("3.5");
    expect(formatScore(3.24)).toBe("3.0");
    expect(formatScore(1)).toBe("1.0");
    expect(formatScore(null)).toBe("—");
  });
  it("formatMean shows one decimal", () => expect(formatMean(2.2619)).toBe("2.3"));
  it("formatPct", () => expect(formatPct(9 / 21)).toBe("43%"));
  it("formatDelta is signed in half-points", () => {
    expect(formatDelta(-1.5)).toBe("−1.5");
    expect(formatDelta(0.3)).toBe("+0.5");
    expect(formatDelta(0.1)).toBe("0.0");
  });
  it("index 0–100", () => {
    expect(toIndex(1)).toBe(0);
    expect(toIndex(5)).toBe(100);
    expect(formatIndex(toIndex(2.5))).toBe("38");
  });
  it("confidence %", () => expect(formatConfidence(0.756)).toBe("76%"));
  it("roundHalf clamps", () => {
    expect(roundHalf(0.2)).toBe(1);
    expect(roundHalf(5.7)).toBe(5);
  });
});
