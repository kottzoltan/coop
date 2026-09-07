import { describe, expect, it } from 'vitest';
import {
  gpsTavolsagMeter,
  jelenletCheckinEllenorzes,
  jelenletIdoEngedelyezett,
} from './jelenlet-checkin.js';

describe('jelenlet-checkin', () => {
  it('elutasítja a túl korai érkezést', () => {
    const r = jelenletIdoEngedelyezett(
      { datum: '2026-07-20', kezdet: '10:00', vege: '18:00' },
      'erkezes',
      new Date('2026-07-20T08:00:00'),
    );
    expect(r.ok).toBe(false);
  });

  it('engedélyezi az érkezést a nyitási ablakban', () => {
    const r = jelenletIdoEngedelyezett(
      { datum: '2026-07-20', kezdet: '10:00', vege: '18:00' },
      'erkezes',
      new Date('2026-07-20T09:30:00'),
    );
    expect(r.ok).toBe(true);
  });

  it('GPS távolságot mér és elutasít távolról', () => {
    const tav = gpsTavolsagMeter(47.5, 19.05, 47.51, 19.05);
    expect(tav).toBeGreaterThan(1000);
    const r = jelenletCheckinEllenorzes(
      {
        datum: '2026-07-20',
        kezdet: '10:00',
        vege: '18:00',
        helyLat: '47.5',
        helyLng: '19.05',
        gpsSugarM: 300,
      },
      'erkezes',
      { lat: '47.51', lng: '19.05' },
      new Date('2026-07-20T10:00:00'),
    );
    expect(r.ok).toBe(false);
    expect(r.gps.ok).toBe(false);
  });
});
