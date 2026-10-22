import { describe, expect, it } from 'vitest';
import { evaluateReadingQuality, isRuleTriggered } from '../src/services/readingQuality.js';

const ingestedAt = new Date('2026-10-19T18:00:00.000Z');

describe('evaluateReadingQuality', () => {
  it('marks missing metrics as invalid', () => {
    expect(
      evaluateReadingQuality({
        temperatureC: null,
        vibrationMmS: 2,
        recordedAt: ingestedAt,
        ingestedAt,
        latestRecordedAt: null,
        staleAfterSeconds: 30,
      }),
    ).toBe('invalid');
  });

  it('marks out-of-range values as invalid', () => {
    expect(
      evaluateReadingQuality({
        temperatureC: 240,
        vibrationMmS: 2,
        recordedAt: ingestedAt,
        ingestedAt,
        latestRecordedAt: null,
        staleAfterSeconds: 30,
      }),
    ).toBe('invalid');
  });

  it('marks older-than-latest timestamps as out_of_order', () => {
    expect(
      evaluateReadingQuality({
        temperatureC: 60,
        vibrationMmS: 2,
        recordedAt: new Date('2026-10-19T17:59:00.000Z'),
        ingestedAt,
        latestRecordedAt: new Date('2026-10-19T18:00:00.000Z'),
        staleAfterSeconds: 30,
      }),
    ).toBe('out_of_order');
  });

  it('marks delayed timestamps as stale', () => {
    expect(
      evaluateReadingQuality({
        temperatureC: 60,
        vibrationMmS: 2,
        recordedAt: new Date('2026-10-19T17:59:00.000Z'),
        ingestedAt,
        latestRecordedAt: null,
        staleAfterSeconds: 30,
      }),
    ).toBe('stale');
  });

  it('marks current valid readings as fresh', () => {
    expect(
      evaluateReadingQuality({
        temperatureC: 60,
        vibrationMmS: 2,
        recordedAt: ingestedAt,
        ingestedAt,
        latestRecordedAt: new Date('2026-10-19T17:59:50.000Z'),
        staleAfterSeconds: 30,
      }),
    ).toBe('fresh');
  });
});

describe('isRuleTriggered', () => {
  const tempRule = {
    metric: 'temperature_c',
    operator: 'gt',
    threshold: 70,
  };

  it('triggers numeric rules on fresh readings', () => {
    expect(
      isRuleTriggered(tempRule, {
        reading: { quality: 'fresh', temperatureC: 72, vibrationMmS: 2 },
        now: ingestedAt,
        lastFreshAt: ingestedAt,
        lastIngestedAt: ingestedAt,
      }),
    ).toBe(true);
  });

  it('does not trigger numeric rules for invalid readings', () => {
    expect(
      isRuleTriggered(tempRule, {
        reading: { quality: 'invalid', temperatureC: 90, vibrationMmS: null },
        now: ingestedAt,
        lastFreshAt: ingestedAt,
        lastIngestedAt: ingestedAt,
      }),
    ).toBe(false);
  });

  it('triggers stale_seconds when the last fresh reading is too old', () => {
    expect(
      isRuleTriggered(
        { metric: 'stale_seconds', operator: 'gt', threshold: 30 },
        {
          reading: { quality: 'invalid', temperatureC: null, vibrationMmS: 1 },
          now: ingestedAt,
          lastFreshAt: new Date('2026-10-19T17:59:00.000Z'),
          lastIngestedAt: ingestedAt,
        },
      ),
    ).toBe(true);
  });
});
