import { describe, expect, it } from 'vitest';
import { isAuthorizedReminderSchedulerRequest } from '../../../supabase/functions/_shared/group-start-reminder';

describe('group-start-reminder scheduler auth', () => {
  it('accepts requests signed with the service-role bearer token', () => {
    expect(
      isAuthorizedReminderSchedulerRequest('Bearer service-role-secret', 'service-role-secret'),
    ).toBe(true);
  });

  it('rejects missing or mismatched authorization headers', () => {
    expect(isAuthorizedReminderSchedulerRequest(null, 'service-role-secret')).toBe(false);
    expect(isAuthorizedReminderSchedulerRequest('Bearer wrong-secret', 'service-role-secret')).toBe(false);
    expect(isAuthorizedReminderSchedulerRequest('service-role-secret', 'service-role-secret')).toBe(false);
  });
});
