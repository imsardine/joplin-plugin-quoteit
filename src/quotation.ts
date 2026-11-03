import { QuoteConfig } from './config';

function escapeText(text: string): string {
  // Keep title punctuation literal, including & so entity-looking text stays literal.
  return text.replace(/[\\`*_[\]{}()<>!|#~&]/g, '\\$&');
}

function renderLabel(title: string): string {
  const displayTitle = title.trim() || 'Untitled';
  // A link label stays on one line even when the source title contains line breaks.
  const singleLineTitle = displayTitle.replace(/[\r\n]+/g, ' ');
  // Match whole backtick runs so double/triple delimiters stay literal.
  // Only pairs of single backticks with non-empty contents are title inline code.
  const codeSpans = /(`+)([^`]+)(`+)/g;
  const parts: string[] = [];
  let textStart = 0;
  let match: RegExpExecArray;
  while ((match = codeSpans.exec(singleLineTitle)) !== null) {
    parts.push(escapeText(singleLineTitle.slice(textStart, match.index)));
    const [span, opening, , closing] = match;
    const singleBackticks = opening.length === 1 && closing.length === 1;
    parts.push(singleBackticks ? span : escapeText(span));
    textStart = match.index + span.length;
  }

  parts.push(escapeText(singleLineTitle.slice(textStart)));
  const label = parts.join('');

  return label;
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
