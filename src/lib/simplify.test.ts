import { describe, expect, it } from "vitest";
import { rangeFor } from "./analytics";
import { fitLogo, validateLogoFile } from "./orgLogo";

describe("Quartal & Logo", () => {
  it("Quartalszeitraum", () => {
    expect(rangeFor("quartal", "2026-05-14")).toEqual({ from: "2026-04-01", to: "2026-06-30" });
    expect(rangeFor("quartal", "2026-12-31")).toEqual({ from: "2026-10-01", to: "2026-12-31" });
  });
  it("Logo bleibt proportional in der Box", () => {
    expect(fitLogo({ width: 600, height: 150 }, 50, 22)).toEqual({ w: 50, h: 12.5 });
    expect(fitLogo({ width: 100, height: 200 }, 50, 22)).toEqual({ w: 11, h: 22 });
  });
  it("Logodatei wird geprüft", () => {
    expect(validateLogoFile({ type: "image/gif", size: 10 })).not.toBeNull();
    expect(validateLogoFile({ type: "image/png", size: 3 * 1024 * 1024 })).not.toBeNull();
    expect(validateLogoFile({ type: "image/png", size: 1000 })).toBeNull();
  });
});
