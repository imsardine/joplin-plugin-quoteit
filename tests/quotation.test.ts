import { describe, test } from 'node:test';
import * as assert from 'node:assert/strict';
import { renderQuotation, QuotationSource } from '../src/quotation';
import type { QuoteConfig } from '../src/config';
import MarkdownIt = require('markdown-it');

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

describe('Attribution labels (spec §3.4)', () => {
  for (const { title, label } of [
    { title: '_a_*b*', label: '*ab*' },
    { title: '__a__**b**', label: '**ab**' },
    { title: '_a_[_b_](https://example.com)', label: '*ab*' },
  ]) {
    test(`preserves adjacent formatting in title ${title}`, () => {
      const source = { ...sourceDefaults, title };
      const output = renderQuotation(source, options);

      assert.equal(output, `[${label}](:/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa)`);
    });
  }

  test('retains emphasis next to a flattened link', () => {
    const source = { ...sourceDefaults, title: '[a](https://example.com)_b_' };
    const output = renderQuotation(source, options);

    assert.equal(output, '[a*b*](:/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa)');
  });

  test('retains punctuation-leading emphasis next to a flattened link', () => {
    const source = { ...sourceDefaults, title: '[a](https://example.com)*!b*' };
    const output = renderQuotation(source, options);

    // Spec §3.4 requires retained formatting, not merely retained delimiter text.
    // Parse the output here because flattening changes Markdown delimiter boundaries.
    const markdown = new MarkdownIt({ html: false });
    const rendered = markdown.renderInline(output);

    assert.equal(rendered, '<a href=":/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa">a<em>!b</em></a>');
  });

  test('preserves literal entity text in the attribution label', () => {
    const source = { ...sourceDefaults, title: '&amp;copy;' };
    const output = renderQuotation(source, options);

    assert.equal(output, '[\\&copy;](:/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa)');
  });

  test('blank note title is displayed as Untitled', () => {
    const source = { ...sourceDefaults, title: ' ' };
    const output = renderQuotation(source, options);

    assert.equal(output, '[Untitled](:/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa)');
  });

  test('retains formatting but flattens links in labels', () => {
    const source = { ...sourceDefaults, title: '**Bold** [ref](https://example.com) | #tag' };
    const output = renderQuotation(source, options);

    assert.equal(output, '[**Bold** ref \\| \\#tag](:/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa)');
  });

  test('image labels become readable alt text while retaining inline formatting', () => {
    const source = {
      ...sourceDefaults,
      title: 'See ![**diagram**](https://example.com/image.png)',
    };
    const output = renderQuotation(source, options);

    assert.equal(output, '[See **diagram**](:/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa)');
  });

  test('preserves adjacent inline code when a title link is flattened', () => {
    const source = { ...sourceDefaults, title: '`a`[`b`](https://example.com)' };
    const output = renderQuotation(source, options);

    assert.equal(output, '[`a` `b`](:/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa)');
  });

  test('keeps backtick-containing inline code separate after link flattening', () => {
    const source = { ...sourceDefaults, title: '``a`b``[`c`](https://example.com)' };
    const output = renderQuotation(source, options);

    assert.equal(output, '[``a`b`` `c`](:/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa)');
  });

  for (const { title, expected } of [
    {
      title: '`` `edge` ``',
      expected: '[`` `edge` ``](:/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa)',
    },
    {
      title: '`  padded  `',
      expected: '[`  padded  `](:/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa)',
    },
    {
      // MarkdownIt 14 normalizes this all-space code content to one space.
      title: '`   `',
      expected: '[` `](:/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa)',
    },
    {
      title: '`plain`',
      expected: '[`plain`](:/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa)',
    },
    {
      title: '``a`b``',
      expected: '[``a`b``](:/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa)',
    },
    {
      title: '```a``b```',
      expected: '[```a``b```](:/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa)',
    },
    {
      title: '`#tag | value`',
      expected: '[`#tag | value`](:/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa)',
    },
  ]) {
    test(`preserves inline code in title ${title}`, () => {
      const source = { ...sourceDefaults, title };
      const output = renderQuotation(source, options);
      assert.equal(output, expected);
    });
  }

  // Spec §3.4 applies the same inline Markdown policy to note titles and headings.
  for (const { behavior, title, label } of [
    { behavior: 'preserves asterisk emphasis', title: '*italic*', label: '*italic*' },
    { behavior: 'preserves underscore emphasis', title: '_italic_', label: '*italic*' },
    { behavior: 'preserves underscore strong emphasis', title: '__bold__', label: '**bold**' },
    { behavior: 'preserves strikethrough', title: '~~removed~~', label: '~~removed~~' },
    { behavior: 'flattens existing links', title: '[name](https://example.com)', label: 'name' },
    {
      behavior: 'uses image alt text',
      title: '![alt](https://example.com/image.png)',
      label: 'alt',
    },
    {
      behavior: 'omits images with empty alt text',
      title: '![](https://example.com/image.png)',
      label: '',
    },
    {
      behavior: 'replaces soft line breaks with spaces',
      title: ['first', 'last'].join('\n'),
      label: 'first last',
    },
    {
      behavior: 'replaces hard line breaks with spaces',
      title: ['first  ', 'last'].join('\n'),
      label: 'first last',
    },
    { behavior: 'escapes literal HTML', title: '<b>text</b>', label: '\\<b\\>text\\</b\\>' },
    { behavior: 'trims title whitespace', title: '  trimmed  ', label: 'trimmed' },
    { behavior: 'uses Untitled for empty titles', title: '', label: 'Untitled' },
    {
      behavior: 'escapes literal Markdown punctuation',
      title: '[literal] #tag | value',
      label: '\\[literal\\] \\#tag \\| value',
    },
  ]) {
    test(`title label ${behavior} (spec §3.4)`, () => {
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
