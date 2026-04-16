import { describe, expect, it } from 'vitest';
import {
  resolveLanguageFromCandidates,
  resolveSupportedLanguage,
} from '@/lib/language';

describe('language helpers', () => {
  it('normalizes Chinese browser locale variants', () => {
    expect(resolveSupportedLanguage('zh-CN')).toBe('zh');
    expect(resolveSupportedLanguage('zh_Hans')).toBe('zh');
  });

  it('normalizes English browser locale variants', () => {
    expect(resolveSupportedLanguage('en-US')).toBe('en');
    expect(resolveSupportedLanguage('en_GB')).toBe('en');
  });

  it('uses the first supported language from browser candidates', () => {
    expect(resolveLanguageFromCandidates(['fr-FR', 'zh-CN', 'en-US'])).toBe(
      'zh'
    );
    expect(resolveLanguageFromCandidates(['en-US', 'zh-CN'])).toBe('en');
  });
});
