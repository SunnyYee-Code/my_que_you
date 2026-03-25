import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fromMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: fromMock,
  },
}));

import { checkBannedWords, invalidateBannedWordsCache, loadBannedWords, validateNoBannedWords } from '@/lib/banned-words';

describe('banned-words', () => {
  beforeEach(() => {
    invalidateBannedWordsCache();
    fromMock.mockReset();
  });

  it('loads words once and reuses cache within ttl', async () => {
    const selectMock = vi.fn().mockResolvedValue({ data: [{ word: '赌博' }, { word: '代打' }] });
    fromMock.mockReturnValue({ select: selectMock });

    const first = await loadBannedWords();
    const second = await loadBannedWords();

    expect(first).toEqual(['赌博', '代打']);
    expect(second).toEqual(['赌博', '代打']);
    expect(fromMock).toHaveBeenCalledTimes(1);
    expect(selectMock).toHaveBeenCalledTimes(1);
  });

  it('matches banned words case-insensitively and returns validation message', async () => {
    fromMock.mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [{ word: 'testbad' }] }),
    });

    await expect(checkBannedWords('hello TESTBAD world')).resolves.toBe('testbad');
    await expect(validateNoBannedWords('hello TESTBAD world')).resolves.toBe('内容包含违禁词「testbad」，请修改后重试');
  });

  it('clears cache after invalidation and reloads latest words', async () => {
    const selectMock = vi
      .fn()
      .mockResolvedValueOnce({ data: [{ word: '旧词' }] })
      .mockResolvedValueOnce({ data: [{ word: '新词' }] });
    fromMock.mockReturnValue({ select: selectMock });

    await expect(loadBannedWords()).resolves.toEqual(['旧词']);
    invalidateBannedWordsCache();
    await expect(loadBannedWords()).resolves.toEqual(['新词']);
    expect(fromMock).toHaveBeenCalledTimes(2);
  });
});
