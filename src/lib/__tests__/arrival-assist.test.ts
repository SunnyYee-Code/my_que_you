import { describe, it, expect } from 'vitest';
import {
  parseVenueHint,
  hasVenueHint,
  validateVenueHint,
  getQuickMessages,
  HOST_QUICK_MESSAGES,
  MEMBER_QUICK_MESSAGES,
  COMMON_QUICK_MESSAGES,
  VENUE_HINT_MAX,
} from '../arrival-assist';

// ── parseVenueHint ────────────────────────────────────────────────────────────

describe('parseVenueHint', () => {
  it('returns null for null / non-object input', () => {
    expect(parseVenueHint(null)).toBeNull();
    expect(parseVenueHint(undefined)).toBeNull();
    expect(parseVenueHint('string')).toBeNull();
    expect(parseVenueHint(42)).toBeNull();
  });

  it('returns null when all fields are empty/missing', () => {
    expect(parseVenueHint({})).toBeNull();
    expect(parseVenueHint({ entrance: '', floor: '  ' })).toBeNull();
  });

  it('parses a full hint correctly', () => {
    const raw = { entrance: '南门', floor: '3楼', contact: '微信 xxx', notes: '免费停车' };
    const hint = parseVenueHint(raw);
    expect(hint).toEqual(raw);
  });

  it('ignores non-string fields', () => {
    const hint = parseVenueHint({ entrance: 123, floor: '3楼' });
    expect(hint?.entrance).toBeUndefined();
    expect(hint?.floor).toBe('3楼');
  });

  it('trims whitespace from field values', () => {
    const hint = parseVenueHint({ entrance: '  南门  ' });
    expect(hint?.entrance).toBe('南门');
  });

  it('returns partial hint when only some fields present', () => {
    const hint = parseVenueHint({ floor: '2楼' });
    expect(hint).toEqual({ floor: '2楼' });
  });
});

// ── hasVenueHint ──────────────────────────────────────────────────────────────

describe('hasVenueHint', () => {
  it('returns false for null/undefined', () => {
    expect(hasVenueHint(null)).toBe(false);
    expect(hasVenueHint(undefined)).toBe(false);
  });

  it('returns false for empty hint', () => {
    expect(hasVenueHint({})).toBe(false);
  });

  it('returns true when any field is set', () => {
    expect(hasVenueHint({ entrance: '南门' })).toBe(true);
    expect(hasVenueHint({ floor: '3楼' })).toBe(true);
    expect(hasVenueHint({ contact: 'xxx' })).toBe(true);
    expect(hasVenueHint({ notes: '备注' })).toBe(true);
  });
});

// ── validateVenueHint ─────────────────────────────────────────────────────────

describe('validateVenueHint', () => {
  it('returns null for valid hint', () => {
    expect(validateVenueHint({ entrance: '南门', floor: '3楼' })).toBeNull();
    expect(validateVenueHint({})).toBeNull();
  });

  it('returns error when entrance exceeds max length', () => {
    const longStr = 'a'.repeat(VENUE_HINT_MAX + 1);
    const err = validateVenueHint({ entrance: longStr });
    expect(err).not.toBeNull();
    expect(err?.field).toBe('entrance');
  });

  it('returns error when floor exceeds max length', () => {
    const longStr = '楼'.repeat(VENUE_HINT_MAX + 1);
    const err = validateVenueHint({ floor: longStr });
    expect(err?.field).toBe('floor');
  });

  it('returns error when contact exceeds max length', () => {
    const longStr = 'x'.repeat(VENUE_HINT_MAX + 1);
    const err = validateVenueHint({ contact: longStr });
    expect(err?.field).toBe('contact');
  });

  it('returns error when notes exceeds max length', () => {
    const longStr = 'n'.repeat(VENUE_HINT_MAX + 1);
    const err = validateVenueHint({ notes: longStr });
    expect(err?.field).toBe('notes');
  });

  it('accepts values exactly at max length', () => {
    const maxStr = 'a'.repeat(VENUE_HINT_MAX);
    expect(validateVenueHint({ entrance: maxStr })).toBeNull();
  });
});

// ── getQuickMessages ──────────────────────────────────────────────────────────

describe('getQuickMessages', () => {
  it('returns host messages + common messages for host', () => {
    const msgs = getQuickMessages(true);
    const ids = msgs.map(m => m.id);
    HOST_QUICK_MESSAGES.forEach(m => expect(ids).toContain(m.id));
    COMMON_QUICK_MESSAGES.forEach(m => expect(ids).toContain(m.id));
    MEMBER_QUICK_MESSAGES.forEach(m => expect(ids).not.toContain(m.id));
  });

  it('returns member messages + common messages for non-host', () => {
    const msgs = getQuickMessages(false);
    const ids = msgs.map(m => m.id);
    MEMBER_QUICK_MESSAGES.forEach(m => expect(ids).toContain(m.id));
    COMMON_QUICK_MESSAGES.forEach(m => expect(ids).toContain(m.id));
    HOST_QUICK_MESSAGES.forEach(m => expect(ids).not.toContain(m.id));
  });

  it('all messages have non-empty id, label, and content', () => {
    [...getQuickMessages(true), ...getQuickMessages(false)].forEach(msg => {
      expect(msg.id).toBeTruthy();
      expect(msg.label).toBeTruthy();
      expect(msg.content).toBeTruthy();
    });
  });
});
