import { QuoteConfig } from './config';
import MarkdownIt = require('markdown-it');

const markdown = new MarkdownIt({ html: false });

function escapeText(text: string): string {
  // Keep label punctuation literal, including & so decoded entities cannot be parsed again.
  const escaped = text.replace(/[\\`*_[\]{}()<>!|#~&]/g, '\\$&');
  // A link label stays on one line even when the source title contains line breaks.
  return escaped.replace(/[\r\n]+/g, ' ');
}

function renderLabel(title: string): string {
  const displayTitle = title.trim() || 'Untitled';
  const inline = markdown.parseInline(displayTitle, {})[0];
  const tokens = inline.children;
  function flattenTokens(items: any[]): any[] {
    const flattened: any[] = [];
    for (const token of items) {
      if (token.type === 'link_open' || token.type === 'link_close') {
        continue;
      }
      if (token.type === 'text' && token.content === '') {
        continue;
      }
      if (token.type === 'image') {
        flattened.push(...flattenTokens(token.children));
      } else {
        flattened.push(token);
      }
    }

    return flattened;
  }

  function render(items: any[]): string {
    const flattened = flattenTokens(items);
    const merged: any[] = [];
    for (const token of flattened) {
      const previous = merged[merged.length - 1];
      // Removing wrappers can join identically formatted spans. Keep them as
      // one span so adjacent closing/opening delimiters cannot become literal.
      const joinsEmphasis = previous?.type === 'em_close' && token.type === 'em_open';
      const joinsStrong = previous?.type === 'strong_close' && token.type === 'strong_open';
      if (joinsEmphasis || joinsStrong) {
        merged.pop();
      } else {
        merged.push(token);
      }
    }

    const renderedTokens = merged.map((token, index) => {
      const previous = merged[index - 1];
      const adjacentCode = previous?.type === 'code_inline' && token.type === 'code_inline';
      const renderedToken = renderToken(token);
      // Keep independent code spans separate after removing link/image wrappers.
      // A space prevents their closing/opening backtick runs from colliding.
      return adjacentCode ? ` ${renderedToken}` : renderedToken;
    });

    return renderedTokens.join('');
  }

  function renderToken(token: any): string {
    switch (token.type) {
      case 'text':
        return escapeText(token.content);
      case 'code_inline': {
        // The parser gives us code contents without the original delimiters.
        // Find consecutive backticks so the new delimiters cannot close early.
        const backtickRuns = token.content.match(/`+/g) || [];
        const runLengths = backtickRuns.map((run) => run.length);
        const longestRun = Math.max(0, ...runLengths);
        // For content a`b, use two backticks on each side: ``a`b``.
        const fence = '`'.repeat(longestRun + 1);
        const content = token.content;
        const touchesBacktick = content.startsWith('`') || content.endsWith('`');
        // Protect real edge spaces from code-span whitespace normalization.
        const hasNonSpaceContent = content.trim().length > 0;
        const hasEdgeSpaces = content.startsWith(' ') && content.endsWith(' ');
        const needsSpacePadding = hasEdgeSpaces && hasNonSpaceContent;
        const padding = touchesBacktick || needsSpacePadding ? ' ' : '';

        return `${fence}${padding}${content}${padding}${fence}`;
      }
      // Flattening links can place emphasis inside a word. Asterisks retain
      // formatting there, whereas underscore delimiters become literal text.
      case 'em_open':
      case 'em_close':
        return '*';
      case 'strong_open':
      case 'strong_close':
        return '**';
      case 's_open':
      case 's_close':
        return token.markup;
      case 'softbreak':
      case 'hardbreak':
        return ' ';
      default:
        throw new Error(`Unsupported attribution token: ${token.type}`);
    }
  }

  return render(tokens);
}

export interface QuotationSource {
  noteId: string;
  title: string;
  selection: string;
}

export function renderQuotation(
  source: Readonly<QuotationSource>,
  options: Readonly<QuoteConfig>,
): string {
  const link = `[${renderLabel(source.title)}](:/${source.noteId})`;
  if (!source.selection.trim()) {
    return link;
  }

  // Treat CRLF as one line ending, while accepting LF and CR too.
  const lines = source.selection.split(/\r\n|\n|\r/);
  // Ignore outer blank lines accidentally included when selecting a passage (spec §3.3).
  // This keeps the quotation from starting with empty quote lines.
  while (lines.length && !lines[0].trim()) {
    lines.shift();
  }
  // Exclude trailing selection padding from the quote body.
  // Internal blank lines still preserve paragraph structure.
  while (lines.length && !lines[lines.length - 1].trim()) {
    lines.pop();
  }

  const quotedLines = lines.map((line) => (line ? `> ${line}` : '>'));
  const body = quotedLines.join('\n');
  const attribution = `> ${options.attributionPrefix}${link}`;

  return `${body}\n>\n${attribution}`;
}
