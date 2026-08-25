import { describe, expect, it } from '@jest/globals';

import { mapError } from '@/lib/errors';
import { escapeHtml } from '@/lib/html';
import { resolveMaterialCommunityIconName } from '@/lib/material-community-icons';
import {
  normalizeOptionalText,
  normalizeSearchText,
  normalizeText,
} from '@/lib/strings';

describe('string utilities', () => {
  it('normalizes Unicode and repeated whitespace', () => {
    expect(normalizeText('  Cafe\u0301 \n   receipt  ')).toBe('Café receipt');
    expect(normalizeSearchText('  FOOD & Drink  ')).toBe('food & drink');
  });

  it('maps an empty optional value to null', () => {
    expect(normalizeOptionalText(' \n ')).toBeNull();
    expect(normalizeOptionalText('  Taxi  ')).toBe('Taxi');
  });
});

describe('dynamic icon resolution', () => {
  it('keeps valid names and replaces invalid persisted values', () => {
    const supportedNames = new Set(['bank', 'wallet']);

    expect(
      resolveMaterialCommunityIconName('bank', 'wallet', supportedNames),
    ).toBe('bank');
    expect(
      resolveMaterialCommunityIconName(
        'removed-legacy-icon',
        'wallet',
        supportedNames,
      ),
    ).toBe('wallet');
  });
});

describe('error mapping', () => {
  it('keeps recognized application codes', () => {
    const error = mapError(
      { code: 'CLAIM_LOCKED', message: 'internal detail' },
      'DATABASE_WRITE_FAILED',
    );

    expect(error.code).toBe('CLAIM_LOCKED');
    expect(error.title).toBe('Claim is locked');
    expect(JSON.stringify(error)).not.toContain('internal detail');
  });

  it('uses a recoverable fallback without exposing technical errors', () => {
    const error = mapError(
      new Error('SQLiteException: database is locked'),
      'DATABASE_WRITE_FAILED',
    );

    expect(error).toEqual({
      code: 'DATABASE_WRITE_FAILED',
      message: "We couldn't save your changes. Try again.",
      title: 'Changes not saved',
    });
    expect(JSON.stringify(error)).not.toContain('SQLiteException');
  });
});

describe('HTML escaping', () => {
  it('escapes text and attribute-significant characters', () => {
    expect(escapeHtml(`Tom & <b>"Jerry's"</b>`)).toBe(
      'Tom &amp; &lt;b&gt;&quot;Jerry&#39;s&quot;&lt;/b&gt;',
    );
  });

  it('escapes existing entity markers rather than trusting input HTML', () => {
    expect(escapeHtml('&amp;')).toBe('&amp;amp;');
  });
});
