import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { httpsUrl, isHttpsUrl, safeHref } from './urls';

const rejected = [
  'javascript:alert(1)',
  'javascript:alert(document.cookie)',
  'data:text/html,<script>alert(1)</script>',
  'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
  'vbscript:msgbox(1)',
  'file:///etc/passwd',
  'http://example.com',
  'HTTPS://example.com',
  'https:example.com',
  'ftp://example.com',
];

const accepted = [
  'https://example.com',
  'https://x.com/handle',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'https://github.com/elie222/botdirectory.ai',
];

describe('isHttpsUrl', () => {
  for (const value of rejected) {
    it(`rejects ${value}`, () => {
      assert.equal(isHttpsUrl(value), false);
    });
  }

  for (const value of accepted) {
    it(`accepts ${value}`, () => {
      assert.equal(isHttpsUrl(value), true);
    });
  }
});

describe('httpsUrl schema', () => {
  for (const value of rejected) {
    it(`rejects ${value}`, () => {
      assert.equal(httpsUrl.safeParse(value).success, false);
    });
  }

  for (const value of accepted) {
    it(`accepts ${value}`, () => {
      assert.equal(httpsUrl.safeParse(value).success, true);
    });
  }
});

describe('safeHref', () => {
  it('returns https URLs unchanged', () => {
    assert.equal(safeHref('https://x.com/handle'), 'https://x.com/handle');
  });

  it('drops javascript: URLs', () => {
    assert.equal(safeHref('javascript:alert(1)'), undefined);
  });

  it('drops missing values', () => {
    assert.equal(safeHref(undefined), undefined);
    assert.equal(safeHref(null), undefined);
    assert.equal(safeHref(''), undefined);
  });
});
