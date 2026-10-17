/**
 * Anti-Cheat and Scheduling Logic for ScanWake
 * Pure deterministic functions decoupled from UI/DOM for unit testing
 */

export interface AlarmItem {
  id: string;
  hour: number; // 0-23
  minute: number; // 0-59
  label: string;
  daysOfWeek: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  isEnabled: boolean;
  targetTagId: string; // ID of RegisteredTag
  toneId: string;
  snoozeMinutes: number; // 0 = disabled
  isStrictLockout: boolean;
  chainId?: string;
  chainStepIndex?: number;
}

export interface RegisteredTag {
  id: string;
  name: string;
  location: string;
  codeValue: string;
  codeFormat: 'QR_CODE' | 'EAN_13' | 'CODE_128' | 'UPC_A' | 'DATA_MATRIX';
  codeHash: string;
  createdAt: number;
}

export interface ChainStep {
  id: string;
  stepIndex: number;
  label: string;
  targetTagId: string;
  delayMinutesAfterPrev: number; // minutes after previous step dismissal
}

export interface AlarmChain {
  id: string;
  name: string;
  initialAlarmHour: number;
  initialAlarmMinute: number;
  steps: ChainStep[];
  isActive: boolean;
  currentStepIndex: number;
}

/**
 * Computes a simple cryptographic-style deterministic hex hash of a barcode/QR string.
 * Mimics SHA-256 for offline tag verification.
 */
export function computeTagHash(codeValue: string): string {
  const normalized = codeValue.trim();
  let hash = 0x811c9dc5;
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  // Convert to unsigned 32-bit hex and repeat/pad for pseudo 64-char signature
  const p1 = (hash >>> 0).toString(16).padStart(8, '0');
  let hash2 = 0x55555555;
  for (let i = normalized.length - 1; i >= 0; i--) {
    hash2 ^= normalized.charCodeAt(i);
    hash2 = Math.imul(hash2, 0x45d9f3b);
  }
  const p2 = (hash2 >>> 0).toString(16).padStart(8, '0');
  return `sw_${p1}${p2}`;
}

/**
 * Verifies if a scanned barcode value matches the registered tag's hash or value
 */
export function verifyBarcodeMatch(scannedValue: string, expectedHash: string, expectedRawValue?: string): boolean {
  if (!scannedValue) return false;
  const cleanScanned = scannedValue.trim();
  if (expectedRawValue && cleanScanned === expectedRawValue.trim()) {
    return true;
  }
  const computed = computeTagHash(cleanScanned);
  return computed.toLowerCase() === expectedHash.toLowerCase();
}

/**
 * Calculates the next trigger timestamp in milliseconds for an alarm.
 * If repeat days are empty, triggers today if time is in future, or tomorrow.
 * If repeat days are set, triggers on the next matching day of the week.
 */
export function calculateNextTriggerTime(
  hour: number,
  minute: number,
  daysOfWeek: number[],
  nowMs: number = Date.now()
): number {
  const now = new Date(nowMs);
  const target = new Date(nowMs);
  target.setHours(hour, minute, 0, 0);

  if (!daysOfWeek || daysOfWeek.length === 0) {
    // One-time alarm
    if (target.getTime() <= nowMs) {
      target.setDate(target.getDate() + 1);
    }
    return target.getTime();
  }

  // Repeating alarm on specific days of week (0=Sun, 1=Mon, ..., 6=Sat)
  const currentDay = now.getDay();
  let daysUntil = -1;

  // Check if it can ring today
  if (daysOfWeek.includes(currentDay) && target.getTime() > nowMs) {
    return target.getTime();
  }

  // Find the closest next day in the future
  for (let offset = 1; offset <= 7; offset++) {
    const candidateDay = (currentDay + offset) % 7;
    if (daysOfWeek.includes(candidateDay)) {
      daysUntil = offset;
      break;
    }
  }

  if (daysUntil === -1) {
    // Fallback tomorrow if empty
    daysUntil = 1;
  }

  const nextTrigger = new Date(nowMs);
  nextTrigger.setDate(nextTrigger.getDate() + daysUntil);
  nextTrigger.setHours(hour, minute, 0, 0);
  return nextTrigger.getTime();
}

/**
 * Calculates delay in minutes & seconds readable text from now until trigger time
 */
export function formatTimeUntilAlarm(triggerMs: number, nowMs: number = Date.now()): string {
  const diffMs = Math.max(0, triggerMs - nowMs);
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0 && minutes === 0) {
    return 'in less than a minute';
  }
  if (hours === 0) {
    return `in ${minutes}m`;
  }
  return `in ${hours}h ${minutes}m`;
}

/**
 * Anti-Cheat volume guard validator
 * Evaluates volume changes and returns whether to enforce 100% lockout override
 */
export function evaluateVolumeGuard(
  requestedVolume: number, // 0.0 to 1.0
  isAlarmRinging: boolean,
  isStrictLockout: boolean
): { enforcedVolume: number; isGuardTriggered: boolean; warningMessage?: string } {
  if (!isAlarmRinging) {
    return { enforcedVolume: requestedVolume, isGuardTriggered: false };
  }

  if (requestedVolume < 0.85 && isStrictLockout) {
    return {
      enforcedVolume: 1.0,
      isGuardTriggered: true,
      warningMessage: 'Anti-Cheat Guard: Volume override active. Scan physical QR to dismiss.',
    };
  }

  return {
    enforcedVolume: Math.max(0.5, requestedVolume),
    isGuardTriggered: false,
  };
}

/**
 * Sequential Chain Progression
 * Returns the next step or marks chain complete
 */
export function advanceChainStep(
  chain: AlarmChain,
  completedStepIndex: number
): {
  isChainComplete: boolean;
  nextStepIndex: number;
  nextAlarmTriggerMs?: number;
} {
  const nextIndex = completedStepIndex + 1;
  if (nextIndex >= chain.steps.length) {
    return {
      isChainComplete: true,
      nextStepIndex: nextIndex,
    };
  }

  const nextStep = chain.steps[nextIndex];
  const delayMs = nextStep.delayMinutesAfterPrev * 60 * 1000;
  const nextTriggerMs = Date.now() + delayMs;

  return {
    isChainComplete: false,
    nextStepIndex: nextIndex,
    nextAlarmTriggerMs: nextTriggerMs,
  };
}
