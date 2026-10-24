import test from 'node:test';
import assert from 'node:assert/strict';
import { seasonForDate } from '../src/assets/seasons.js';

test('season boundaries follow Montana midnight rather than UTC or visitor timezone', () => {
  for (const [before, after, oldSeason, newSeason] of [
    ['2026-03-01T06:59:59Z','2026-03-01T07:00:00Z','winter','spring'],
    ['2026-06-01T05:59:59Z','2026-06-01T06:00:00Z','spring','summer'],
    ['2026-09-01T05:59:59Z','2026-09-01T06:00:00Z','summer','fall'],
    ['2026-12-01T06:59:59Z','2026-12-01T07:00:00Z','fall','winter'],
  ]) {
    assert.equal(seasonForDate(new Date(before)), oldSeason, before);
    assert.equal(seasonForDate(new Date(after)), newSeason, after);
  }
});

test('winter spans the year boundary and leap day', () => {
  for (const date of ['2026-12-31T20:00:00Z','2027-01-01T20:00:00Z','2028-02-29T20:00:00Z']) {
    assert.equal(seasonForDate(new Date(date)), 'winter');
  }
});
