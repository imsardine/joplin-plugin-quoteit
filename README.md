# Quote It

When writing a note, you may want to quote something from another note to support a point or provide context. That source might be something you wrote earlier or an article you clipped from the web. A useful quotation includes a link back to its source, ideally to the relevant heading.

Putting that quotation together by hand means gathering the passage, the note link or original web address, and sometimes a heading anchor. That can involve repeated copying, pasting, and switching between notes. Since each copy can replace the previous clipboard contents, you may also need somewhere to hold the pieces while you assemble them. A clipboard manager can help hold them, but you still have to collect and put them together.

Quote It brings those pieces together in one operation, producing a quotation with source attribution ready to paste. Use it to quote between your Joplin notes, or use the original web address of a clipped article to share a quotation outside Joplin while keeping a link to its source.

> **Under development:** This README describes the intended product experience. Implementation is in progress; some features are not yet available.

## Quoting with attribution

Select a passage in a note and copy a Markdown blockquote with a link back to its source. When a suitable heading is available, the attribution can also identify the relevant section.

- **Internal** links point back to the Joplin note, making them useful when quoting between your own notes.
- **External** links use the original web address of a clipped article, making quotations easier to share outside Joplin. If no usable web address is available, Quote It falls back to an internal note link.
- With no text selected, copy a link to the note rather than a quotation.

For example, a quotation with an internal source link looks like this:

```markdown
> Selected text
>
> -- [Nearest Heading \| Note Title](:/0123456789abcdef0123456789abcdef#nearest-heading)
```

Settings include heading breadcrumbs, how existing blockquotes are nested, and an optional text-highlight link for supported browsers. Text highlighting is best effort: the original page and browser determine whether a passage can be found.

## Project status

The beta targets Joplin desktop and mobile with the CodeMirror 6 Markdown editor. Support on each platform still needs to be tested.

For build information, see [GENERATOR_DOC.md](./GENERATOR_DOC.md).
