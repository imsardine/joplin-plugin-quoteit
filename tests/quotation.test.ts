import { describe, test } from 'node:test';
import * as assert from 'node:assert/strict';
import { renderQuotation, QuotationSource } from '../src/quotation';
import type { QuoteConfig } from '../src/config';

const options: Readonly<QuoteConfig> = { attributionPrefix: '-- ' };

const sourceDefaults: QuotationSource = {
  noteId: 'a'.repeat(32),
  title: 'Note',
  selection: '',
};

describe('Link-only output', () => {
  test('no selection produces only the note link', () => {
    const selection = '';
    const source = { ...sourceDefaults, selection };
    const output = renderQuotation(source, options);

    assert.equal(output, '[Note](:/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa)');
  });

  test('whitespace-only selection produces only the note link', () => {
    const selection = [' ', '\t'].join('\n');
    const source = { ...sourceDefaults, selection };
    const output = renderQuotation(source, options);

    assert.equal(output, '[Note](:/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa)');
  });
});

describe('Selected quotation body', () => {
  test('preserves incomplete Markdown without repairing it', () => {
    const selection = '**unfinished';
    const expected = [
      '> **unfinished',
      '>',
      '> -- [Note](:/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa)',
    ].join('\n');

    const source = { ...sourceDefaults, selection };
    const output = renderQuotation(source, options);

    assert.equal(output, expected);
  });

  test('removes outer blank lines from the selected passage', () => {
    const selection = ['', '', 'Passage', '', ''].join('\n');
    const expected = ['> Passage', '>', '> -- [Note](:/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa)'].join(
      '\n',
    );

    const source = { ...sourceDefaults, selection };
    const output = renderQuotation(source, options);

    assert.equal(output, expected);
  });

  test('preserves blank lines between paragraphs', () => {
    const selection = ['First paragraph', '', 'Second paragraph'].join('\n');
    const expected = [
      '> First paragraph',
      '>',
      '> Second paragraph',
      '>',
      '> -- [Note](:/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa)',
    ].join('\n');

    const source = { ...sourceDefaults, selection };
    const output = renderQuotation(source, options);
    assert.equal(output, expected);
  });

  test('preserves existing quote nesting', () => {
    const selection = '> nested';
    const expected = ['> > nested', '>', '> -- [Note](:/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa)'].join(
      '\n',
    );

    const source = { ...sourceDefaults, selection };
    const output = renderQuotation(source, options);
    assert.equal(output, expected);
  });

  test('preserves fenced code contents and indentation', () => {
    const selection = ['```', '  x', '```'].join('\n');
    const expected = [
      '> ```',
      '>   x',
      '> ```',
      '>',
      '> -- [Note](:/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa)',
    ].join('\n');

    const source = { ...sourceDefaults, selection };
    const output = renderQuotation(source, options);
    assert.equal(output, expected);
  });

  test('preserves the language marker on a fenced code block', () => {
    // prettier-ignore
    const selection = [
      '```typescript',
      'const value: number = 1;',
      '```'
    ].join('\n');
    const expected = [
      '> ```typescript',
      '> const value: number = 1;',
      '> ```',
      '>',
      '> -- [Note](:/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa)',
    ].join('\n');

    const source = { ...sourceDefaults, selection };
    const output = renderQuotation(source, options);
    assert.equal(output, expected);
  });

  for (const [name, lineEnding] of [
    ['LF', '\n'],
    ['CRLF', '\r\n'],
    ['CR', '\r'],
  ]) {
    test(`normalizes ${name} selection line endings to LF`, () => {
      // prettier-ignore
      const selection = [
        'First',
        '', 
        'Last'
      ].join(lineEnding);
      const expected = [
        '> First',
        '>',
        '> Last',
        '>',
        '> -- [Note](:/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa)',
      ].join('\n');

      const source = { ...sourceDefaults, selection };
      const output = renderQuotation(source, options);
      assert.equal(output, expected);
    });
  }

  test('preserves whitespace inside substantive selected lines', () => {
    // prettier-ignore
    const selection = [
      '  indented  ',
      ' \t',
      'last '
    ].join('\n');
    const expected = [
      '>   indented  ',
      '>  \t',
      '> last ',
      '>',
      '> -- [Note](:/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa)',
    ].join('\n');

    const source = { ...sourceDefaults, selection };
    const output = renderQuotation(source, options);

    assert.equal(output, expected);
  });
});

describe('Note title labels (spec §3.4)', () => {
  test('preserves single-backtick inline code without escaping its contents', () => {
    const source = { ...sourceDefaults, title: 'Understanding `Array<T> | undefined`' };
    const output = renderQuotation(source, options);

    assert.equal(
      output,
      '[Understanding `Array<T> | undefined`](:/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa)',
    );
  });

  for (const { behavior, title, label } of [
    { behavior: 'uses Untitled for an empty title', title: '', label: 'Untitled' },
    { behavior: 'uses Untitled for a blank title', title: ' \t', label: 'Untitled' },
    { behavior: 'trims outer title whitespace', title: '  Note  ', label: 'Note' },
    {
      behavior: 'keeps emphasis and strikethrough markers literal',
      title: '*italic* _word_ ~~removed~~',
      label: '\\*italic\\* \\_word\\_ \\~\\~removed\\~\\~',
    },
    {
      behavior: 'preserves brackets and parentheses in an ordinary title',
      title: '[草稿] TypeScript (筆記)',
      label: '\\[草稿\\] TypeScript \\(筆記\\)',
    },
    {
      behavior: 'keeps HTML literal',
      title: '<b>text</b>',
      label: '\\<b\\>text\\</b\\>',
    },
    { behavior: 'does not decode entity text', title: '&amp;copy;', label: '\\&amp;copy;' },
    {
      behavior: 'escapes the separator and tag punctuation',
      title: '#tag | value',
      label: '\\#tag \\| value',
    },
    {
      behavior: 'replaces line breaks without interpreting hard-break syntax',
      title: ['first  ', 'last'].join('\n'),
      label: 'first   last',
    },
    {
      behavior: 'keeps multiple single-backtick spans',
      title: '`a` and `b`',
      label: '`a` and `b`',
    },
    {
      behavior: 'keeps double-backtick syntax literal',
      title: '``code``',
      label: '\\`\\`code\\`\\`',
    },
    {
      behavior: 'keeps triple-backtick syntax literal',
      title: '```code```',
      label: '\\`\\`\\`code\\`\\`\\`',
    },
    {
      behavior: 'keeps mismatched backtick runs literal',
      title: '`code``',
      label: '\\`code\\`\\`',
    },
    { behavior: 'keeps an unmatched backtick literal', title: '`code', label: '\\`code' },
    {
      behavior: 'preserves spaces inside single-backtick code',
      title: '`  padded  `',
      label: '`  padded  `',
    },
  ]) {
    test(`note title ${behavior}`, () => {
      const source = { ...sourceDefaults, title };
      const output = renderQuotation(source, options);

      assert.equal(output, `[${label}](:/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa)`);
    });
  }
});

describe('Output configuration', () => {
  test('uses the supplied attribution prefix', () => {
    const customOptions: QuoteConfig = { attributionPrefix: 'Source: ' };
    // prettier-ignore
    const expected = [
      '> text', 
      '>', 
      '> Source: [Note](:/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa)'
    ].join('\n');

    const source = { ...sourceDefaults, selection: 'text' };
    const output = renderQuotation(source, customOptions);

    assert.equal(output, expected);
  });
});
