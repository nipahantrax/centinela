import { describe, expect, it } from "vitest";
import { BOLIVIA_BBOX, REGIONS, departmentAt, gibsUrl, inBolivia, parseEonet, parseFirms, parsePower, regionalIncidents } from "@/lib/nasa-data";
describe("NASA Bolivia", () => {
  it("uses the requested Bolivia bounding box", () => {
    expect(BOLIVIA_BBOX).toEqual([-69.6, -22.9, -57.4, -9.6]);
    expect(inBolivia(-22.9, -69.6)).toBe(true);
    expect(inBolivia(-9.59, -60)).toBe(false);
  });
  it("covers all nine departments and Bolivia", () => {
    expect(REGIONS.map(r => r.id)).toEqual(["all", "Santa Cruz", "Beni", "Cochabamba", "La Paz", "Tarija", "Pando", "Chuquisaca", "Oruro", "Potosí"]);
  });
  it("converts POWER wind m/s to km/h and ignores fill values", () => {
    const r = parsePower({ properties: { parameter: { T2M: { "20261018": 32, "20261019": -999 }, RH2M: { "20261018": 15 }, WS10M: { "20261018": 10 }, WD10M: { "20261018": 45 } } } });
    expect(r.weather).toEqual({ temp: 32, rh: 15, wind: 36, windDeg: 45, windDir: "NE" });
    expect(r.date).toBe("2026-10-18");
    expect(parsePower({}).weather).toBeNull();
  });
  it("filters EONET to open Bolivia geometry, without invented logistics", () => {
    const rows = parseEonet([{ id: "EONET_1", title: "Fire", closed: null, geometry: [{ type: "Point", coordinates: [-66.2, -17.31], date: "2026-10-20T00:00:00Z" }] }, { id: "EONET_2", title: "Outside", geometry: [{ type: "Point", coordinates: [-50, -10], date: "2026-10-20T00:00:00Z" }] }]);
    expect(rows).toHaveLength(1); expect(rows[0]?.frp).toBeNull(); expect(rows[0]?.route.state).toBe("No verificada");
  });
  it("parses FIRMS CSV and rejects out-of-box rows", () => {
    const rows = parseFirms("latitude,longitude,acq_date,acq_time,confidence,frp\n-17.31,-66.2,2026-10-20,0450,n,12.4\n-10,-50,2026-10-20,0500,h,20", "VIIRS");
    expect(rows).toHaveLength(1); expect(rows[0]?.frp).toBe(12.4); expect(rows[0]?.confidence).toBeNull(); expect(rows[0]?.date).toBe("2026-10-20T04:50:00Z");
    expect(() => parseFirms("Invalid MAP_KEY", "VIIRS")).toThrow();
  });
  it("filters departments with real polygons and excludes neighboring countries", () => {
    expect(departmentAt(-17.3935, -66.157)).toBe("Cochabamba");
    expect(departmentAt(-17.78, -63.18)).toBe("Santa Cruz");
    expect(departmentAt(-10, -58)).toBeNull();
    const rows = parseFirms("latitude,longitude,acq_date,acq_time,confidence,frp\n-17.3935,-66.157,2026-10-20,0450,90,10", "MODIS");
    expect(regionalIncidents(rows, "Cochabamba")).toHaveLength(1); expect(regionalIncidents(rows, "Beni")).toHaveLength(0);
  });
  it("uses verified GIBS image/vector tile formats", () => {
    expect(gibsUrl("viirs", "2026-10-21")).toContain("GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpeg");
    expect(gibsUrl("modis", "2026-10-21")).toContain("GoogleMapsCompatible_Level7/{z}/{y}/{x}.mvt");
    expect(gibsUrl("viirsThermal", "2026-10-22")).toContain("VIIRS_SNPP_Thermal_Anomalies_375m_All/default/2026-10-22/GoogleMapsCompatible_Level8/{z}/{y}/{x}.mvt");
  });
});