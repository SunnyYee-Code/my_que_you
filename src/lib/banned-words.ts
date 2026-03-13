/**
 * Chinese banned words filter - loads from database
 */
import { supabase } from '@/integrations/supabase/client';

let cachedWords: string[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function loadBannedWords(): Promise<string[]> {
  const now = Date.now();
  if (cachedWords && now - cacheTime < CACHE_TTL) return cachedWords;

  const { data } = await supabase.from('banned_words').select('word');
  cachedWords = (data || []).map(d => d.word.toLowerCase());
  cacheTime = now;
  return cachedWords;
}

/** Invalidate cache after admin changes */
export function invalidateBannedWordsCache() {
  cachedWords = null;
  cacheTime = 0;
}

/**
 * Check if text contains any banned words
 * @returns The first matched banned word, or null if clean
 */
export async function checkBannedWords(text: string): Promise<string | null> {
  if (!text) return null;
  const words = await loadBannedWords();
  const lower = text.toLowerCase();
  for (const word of words) {
    if (lower.includes(word)) {
      return word;
    }
  }
  return null;
}

/**
 * Validate text and return error message if banned word found
 */
export async function validateNoBannedWords(text: string): Promise<string | null> {
  const found = await checkBannedWords(text);
  if (found) {
    return `内容包含违禁词「${found}」，请修改后重试`;
  }
  return null;
}
