import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeTagHash,
  verifyBarcodeMatch,
  calculateNextTriggerTime,
  evaluateVolumeGuard,
  advanceChainStep,
  to12Hour,
  to24Hour,
  formatTime12Hour,
} from './antiCheatRules.ts';
import type { AlarmChain } from './antiCheatRules.ts';

test('computeTagHash generates consistent deterministic hashes', () => {
  const hash1 = computeTagHash('BATHROOM_TOOTHPASTE_4920');
  const hash2 = computeTagHash('BATHROOM_TOOTHPASTE_4920');
  const hashDifferent = computeTagHash('KITCHEN_COFFEE_BEANS_881');

  assert.equal(typeof hash1, 'string');
  assert.equal(hash1, hash2);
  assert.notEqual(hash1, hashDifferent);
  assert.equal(hash1.startsWith('sw_'), true);
});

test('12-hour and 24-hour conversions work accurately for AM/PM edge cases', () => {
  // Midnight (0:30 -> 12:30 AM)
  assert.deepEqual(to12Hour(0), { hour12: 12, period: 'AM' });
  assert.equal(to24Hour(12, 'AM'), 0);
  assert.equal(formatTime12Hour(0, 30).fullText, '12:30 AM');

  // Morning (6:15 -> 06:15 AM)
  assert.deepEqual(to12Hour(6), { hour12: 6, period: 'AM' });
  assert.equal(to24Hour(6, 'AM'), 6);
  assert.equal(formatTime12Hour(6, 15).fullText, '06:15 AM');

  // Noon (12:00 -> 12:00 PM)
  assert.deepEqual(to12Hour(12), { hour12: 12, period: 'PM' });
  assert.equal(to24Hour(12, 'PM'), 12);
  assert.equal(formatTime12Hour(12, 0).fullText, '12:00 PM');

  // Evening (19:45 -> 07:45 PM)
  assert.deepEqual(to12Hour(19), { hour12: 7, period: 'PM' });
  assert.equal(to24Hour(7, 'PM'), 19);
  assert.equal(formatTime12Hour(19, 45).fullText, '07:45 PM');
});

test('verifyBarcodeMatch validates correct barcode and rejects fraudulent codes', () => {
  const code = '7622210449283';
  const expectedHash = computeTagHash(code);

  assert.equal(verifyBarcodeMatch(code, expectedHash, code), true);
  assert.equal(verifyBarcodeMatch(code, expectedHash), true);
  assert.equal(verifyBarcodeMatch('9999999999999', expectedHash), false);
  assert.equal(verifyBarcodeMatch('', expectedHash), false);
});

test('calculateNextTriggerTime schedules future alarm today if time not passed', () => {
  const fakeNow = new Date('2026-10-17T07:00:00Z').getTime();
  const next = calculateNextTriggerTime(8, 30, [], fakeNow);
  const nextDate = new Date(next);

  assert.equal(nextDate.getHours(), 8);
  assert.equal(nextDate.getMinutes(), 30);
  assert.equal(next > fakeNow, true);
});

test('calculateNextTriggerTime rolls over to next day if time has passed', () => {
  const fakeNow = new Date('2026-10-17T10:00:00Z').getTime();
  const next = calculateNextTriggerTime(6, 0, [], fakeNow);
  const nextDate = new Date(next);

  assert.equal(nextDate.getHours(), 6);
  assert.equal(nextDate.getMinutes(), 0);
  assert.equal(next > fakeNow, true);
});

test('evaluateVolumeGuard enforces 100% volume and alerts when volume is dropped during strict lockout', () => {
  const result1 = evaluateVolumeGuard(0.2, false, true);
  assert.equal(result1.enforcedVolume, 0.2);
  assert.equal(result1.isGuardTriggered, false);

  const result2 = evaluateVolumeGuard(0.1, true, true);
  assert.equal(result2.enforcedVolume, 1.0);
  assert.equal(result2.isGuardTriggered, true);
  assert.equal(result2.warningMessage?.includes('Anti-Cheat'), true);
});

test('advanceChainStep advances sequential wake-up chain until completion', () => {
  const chain: AlarmChain = {
    id: 'chain_morning',
    name: 'Full Wakeup Sequence',
    initialAlarmHour: 6,
    initialAlarmMinute: 30,
    isActive: true,
    currentStepIndex: 0,
    steps: [
      {
        id: 's1',
        stepIndex: 0,
        label: 'Bathroom Toothpaste',
        targetTagId: 'tag_bath',
        delayMinutesAfterPrev: 0,
      },
      {
        id: 's2',
        stepIndex: 1,
        label: 'Kitchen Coffee',
        targetTagId: 'tag_kitchen',
        delayMinutesAfterPrev: 10,
      },
    ],
  };

  const step0Result = advanceChainStep(chain, 0);
  assert.equal(step0Result.isChainComplete, false);
  assert.equal(step0Result.nextStepIndex, 1);
  assert.equal(typeof step0Result.nextAlarmTriggerMs, 'number');

  const step1Result = advanceChainStep(chain, 1);
  assert.equal(step1Result.isChainComplete, true);
  assert.equal(step1Result.nextStepIndex, 2);
});
