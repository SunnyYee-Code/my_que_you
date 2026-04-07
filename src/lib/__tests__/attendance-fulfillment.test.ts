import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createAttendanceRecord,
  getAttendanceRecord,
  getGroupAttendanceRecords,
  updateAttendanceStatus,
  createFulfillmentRecord,
  getUserFulfillmentRecords,
  getUserNoShowSummary,
  getUserNoShowStats,
  submitFulfillmentAppeal,
  resolveFulfillmentAppeal,
  determineFulfillmentStatus,
} from '@/lib/attendance-fulfillment';
import { supabase } from '@/integrations/supabase/client';

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('attendance-fulfillment', () => {
  const mockGroupId = 'group-1';
  const mockUserId = 'user-1';
  const mockConfirmedBy = 'admin-1';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createAttendanceRecord', () => {
    it('should create attendance record with defaults', async () => {
      const mockRecord = {
        id: 'record-1',
        group_id: mockGroupId,
        user_id: mockUserId,
        status: 'checked_in',
        checked_in_at: new Date().toISOString(),
        confirmed_by: null,
        confirmed_at: new Date().toISOString(),
        notes: null,
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockRecord, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      const result = await createAttendanceRecord(mockGroupId, mockUserId);

      expect(result).toEqual(mockRecord);
      expect(mockChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          group_id: mockGroupId,
          user_id: mockUserId,
          status: 'checked_in',
        })
      );
    });

    it('should create attendance record with custom options', async () => {
      const mockRecord = {
        id: 'record-1',
        group_id: mockGroupId,
        user_id: mockUserId,
        status: 'not_checked_in',
        checked_in_at: null,
        confirmed_by: mockConfirmedBy,
        confirmed_at: new Date().toISOString(),
        notes: 'Late arrival',
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockRecord, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      const result = await createAttendanceRecord(mockGroupId, mockUserId, {
        status: 'not_checked_in',
        confirmedBy: mockConfirmedBy,
        notes: 'Late arrival',
      });

      expect(result).toEqual(mockRecord);
      expect(mockChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'not_checked_in',
          confirmed_by: mockConfirmedBy,
          notes: 'Late arrival',
        })
      );
    });
  });

  describe('getAttendanceRecord', () => {
    it('should fetch attendance record', async () => {
      const mockRecord = {
        id: 'record-1',
        group_id: mockGroupId,
        user_id: mockUserId,
        status: 'checked_in',
        checked_in_at: new Date().toISOString(),
        confirmed_by: null,
        confirmed_at: new Date().toISOString(),
        notes: null,
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockRecord, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      const result = await getAttendanceRecord(mockGroupId, mockUserId);

      expect(result).toEqual(mockRecord);
      expect(mockChain.eq).toHaveBeenCalledWith('group_id', mockGroupId);
      expect(mockChain.eq).toHaveBeenCalledWith('user_id', mockUserId);
    });

    it('should return null when record not found', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      const result = await getAttendanceRecord(mockGroupId, mockUserId);

      expect(result).toBeNull();
    });
  });

  describe('updateAttendanceStatus', () => {
    it('should update attendance status', async () => {
      const mockRecord = {
        id: 'record-1',
        group_id: mockGroupId,
        user_id: mockUserId,
        status: 'checked_in',
        checked_in_at: new Date().toISOString(),
        confirmed_by: mockConfirmedBy,
        confirmed_at: new Date().toISOString(),
        notes: null,
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockRecord, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      const result = await updateAttendanceStatus(
        mockGroupId,
        mockUserId,
        'checked_in',
        mockConfirmedBy
      );

      expect(result).toEqual(mockRecord);
      expect(mockChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'checked_in',
          confirmed_by: mockConfirmedBy,
        })
      );
    });
  });

  describe('createFulfillmentRecord', () => {
    it('should create fulfillment record', async () => {
      const mockRecord = {
        id: 'fulfillment-1',
        group_id: mockGroupId,
        user_id: mockUserId,
        status: 'fulfilled' as const,
        no_show_reason: null,
        notes: null,
        appeal_status: null,
        appeal_reason: null,
        appeal_created_at: null,
        attendance_record_id: null,
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockRecord, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      const result = await createFulfillmentRecord(mockGroupId, mockUserId, 'fulfilled');

      expect(result).toEqual(mockRecord);
      expect(mockChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          group_id: mockGroupId,
          user_id: mockUserId,
          status: 'fulfilled',
        })
      );
    });

    it('should throw error if no_show_reason provided when status is not no_show', async () => {
      await expect(
        createFulfillmentRecord(mockGroupId, mockUserId, 'fulfilled', {
          noShowReason: 'not_checked_in',
        })
      ).rejects.toThrow('no_show_reason只能在status为no_show时设置');
    });

    it('should create no_show record with reason', async () => {
      const mockRecord = {
        id: 'fulfillment-1',
        group_id: mockGroupId,
        user_id: mockUserId,
        status: 'no_show' as const,
        no_show_reason: 'not_checked_in' as const,
        notes: null,
        appeal_status: null,
        appeal_reason: null,
        appeal_created_at: null,
        attendance_record_id: null,
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockRecord, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      const result = await createFulfillmentRecord(mockGroupId, mockUserId, 'no_show', {
        noShowReason: 'not_checked_in',
      });

      expect(result.status).toBe('no_show');
      expect(result.no_show_reason).toBe('not_checked_in');
    });
  });

  describe('getUserFulfillmentRecords', () => {
    it('should fetch user fulfillment records', async () => {
      const mockRecords = [
        {
          id: 'fulfillment-1',
          group_id: mockGroupId,
          user_id: mockUserId,
          status: 'fulfilled' as const,
          no_show_reason: null,
          notes: null,
          appeal_status: null,
          appeal_reason: null,
          appeal_created_at: null,
          attendance_record_id: null,
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: mockRecords, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      const result = await getUserFulfillmentRecords(mockUserId);

      expect(result).toEqual(mockRecords);
      expect(mockChain.eq).toHaveBeenCalledWith('user_id', mockUserId);
    });
  });

  describe('getUserNoShowSummary', () => {
    it('should fetch latest no-show record', async () => {
      const mockRecord = {
        status: 'no_show',
        created_at: new Date().toISOString(),
      };

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockRecord, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      const result = await getUserNoShowSummary(mockUserId);

      expect(result).toEqual(mockRecord);
    });

    it('should return null when no no-show records', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      const result = await getUserNoShowSummary(mockUserId);

      expect(result).toBeNull();
    });
  });

  describe('getUserNoShowStats', () => {
    it('should calculate no-show statistics', async () => {
      const mockRecords = [
        { status: 'no_show' },
        { status: 'no_show' },
        { status: 'no_show' },
      ];

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockResolvedValue({ data: mockRecords, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      const result = await getUserNoShowStats(mockUserId, 90);

      expect(result.totalNoShowCount).toBe(3);
      expect(result.period).toBe('90天');
    });
  });

  describe('submitFulfillmentAppeal', () => {
    it('should submit appeal for fulfillment record', async () => {
      const fulfillmentId = 'fulfillment-1';
      const reason = 'System error';
      const mockRecord = {
        id: fulfillmentId,
        group_id: mockGroupId,
        user_id: mockUserId,
        status: 'no_show' as const,
        no_show_reason: null,
        notes: null,
        appeal_status: 'pending' as const,
        appeal_reason: reason,
        appeal_created_at: new Date().toISOString(),
        attendance_record_id: null,
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockRecord, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      const result = await submitFulfillmentAppeal(fulfillmentId, reason);

      expect(result.appeal_status).toBe('pending');
      expect(result.appeal_reason).toBe(reason);
    });
  });

  describe('resolveFulfillmentAppeal', () => {
    it('should approve appeal', async () => {
      const fulfillmentId = 'fulfillment-1';
      const mockRecord = {
        id: fulfillmentId,
        group_id: mockGroupId,
        user_id: mockUserId,
        status: 'no_show' as const,
        no_show_reason: null,
        notes: null,
        appeal_status: 'approved' as const,
        appeal_reason: 'System error',
        appeal_created_at: new Date().toISOString(),
        attendance_record_id: null,
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockRecord, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      const result = await resolveFulfillmentAppeal(fulfillmentId, true);

      expect(result.appeal_status).toBe('approved');
    });
  });

  describe('determineFulfillmentStatus', () => {
    it('should return fulfilled when checked in', async () => {
      const mockAttendance = {
        id: 'record-1',
        group_id: mockGroupId,
        user_id: mockUserId,
        status: 'checked_in' as const,
        checked_in_at: new Date().toISOString(),
        confirmed_by: null,
        confirmed_at: new Date().toISOString(),
        notes: null,
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Mock getAttendanceRecord
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'attendance_records') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: () =>
                    Promise.resolve({ data: mockAttendance, error: null }),
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      const result = await determineFulfillmentStatus(mockGroupId, mockUserId);

      expect(result).toBe('fulfilled');
    });

    it('should return no_show when no attendance record', async () => {
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'attendance_records') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: () =>
                    Promise.resolve({
                      data: null,
                      error: { code: 'PGRST116' },
                    }),
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      const result = await determineFulfillmentStatus(mockGroupId, mockUserId);

      expect(result).toBe('no_show');
    });
  });
});
