import { describe, expect, it } from 'vitest';
import {
  attentionDetections,
  calculatePropagationForecast,
  emergencyMessage,
  isFreshDetection,
  nearestReference,
  projectFire,
  requiresAttention,
} from '@/lib/fire-operations';
import { liveIncident } from '@/lib/nasa-data';
describe('operational safety', () => {
  const now = Date.parse('2026-10-23T00:00:00Z');
  const fresh = liveIncident('real', -17.3895,-66.1568,'2026-10-22T12:00:00Z','VIIRS','Cochabamba');
  it('measures proximity to the named point, not an invented boundary', () => { expect(nearestReference(-17.3895,-66.1568,'comunidad')?.km).toBe(0); });
  it('does not sound real alarms for demo data', () => { expect(requiresAttention([{...fresh,live:false}],now)).toBe(false); });
  it('flags a recent real detection within 5km', () => { expect(requiresAttention([fresh],now)).toBe(true); });
  it('never triggers a proximity warning from EONET catalog events', () => { expect(requiresAttention([{...fresh, source:'EONET'}], now)).toBe(false); });
  it('does not flag old or future satellite observations', () => { expect(isFreshDetection({...fresh,date:'2026-10-20T00:00:00Z'},now)).toBe(false); expect(isFreshDetection({...fresh,date:'2026-10-24T00:00:00Z'},now)).toBe(false); });
  it('never raises warnings without a real FIRMS/EONET detection', () => { expect(requiresAttention([],now)).toBe(false); expect(attentionDetections([{...fresh,date:'2026-10-19T00:00:00Z'}],now)).toHaveLength(0); });
  it('projects horizons 1h, 3h and 6h downwind rather than upwind', () => {
    const w = {temp:30,rh:0,wind:10,windDir:'N',windDeg:0};
    expect(projectFire(-17,-66,w,1).km).toBeCloseTo(0.3);
    expect(projectFire(-17,-66,w,3).km).toBeCloseTo(0.9);
    expect(projectFire(-17,-66,w,6).km).toBeCloseTo(1.8);
    expect(projectFire(-17,-66,w,1).bearing).toBe(180);
  });
  it('keeps a calm-wind envelope at zero', () => { expect(projectFire(-17,-66,{temp:32,rh:15,wind:0,windDir:'NE',windDeg:45},6).km).toBe(0); });
  it('puts precise GPS and uncertainty in the SOS', () => { expect(emergencyMessage(-17.123456,-66.123456,12,'Humo')).toContain('-17.123456, -66.123456 (±12 m)'); });
  it('computes propagation forecast downwind with rate of spread and 3 horizons', () => {
    const forecast = calculatePropagationForecast(-17.3, -66.2, 45, 25);
    expect(forecast.bearingTo).toBe(225); // Wind from NE (45°) blows towards SW (225°)
    expect(forecast.windCardinalTo).toBe('SO');
    expect(forecast.rateOfSpreadKmH).toBeGreaterThan(0.5);
    expect(forecast.cone30Min.length).toBeGreaterThan(3);
    expect(forecast.cone1Hour.length).toBeGreaterThan(3);
    expect(forecast.cone2Hours.length).toBeGreaterThan(3);
    expect(forecast.centralVector).toHaveLength(2);
    expect(forecast.impactAdvisory).toContain('SO');
  });
});