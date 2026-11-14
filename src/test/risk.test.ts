import { describe, expect, it } from "vitest";
import { ignitionRisk, riskLabel } from "@/lib/centinela-data";
describe("ignition risk", () => {
  it("32°C, 40 km/h, 15% HR is 85% Muy Alto", () => {
    expect(ignitionRisk(32, 40, 15)).toBe(85);
    expect(riskLabel(85).label).toBe("Muy Alto");
  });
});
