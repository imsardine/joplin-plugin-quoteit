# Quote It — Product & Implementation Specification

**Status:** Implementation-ready specification; implementation not started  
**Prepared:** 2026-10-31  
**Target:** Joplin desktop + mobile, CodeMirror 6 Markdown editor only  
**Release:** v0.x beta, ship desktop and mobile together  
**Decision authority:** Prior product interview, including rounds 18–18E and the final Human-readable URLs discussion

> **Decision semantics.** **Confirmed** = explicitly selected/accepted in product discussion. **Provisional** = a safe engineering choice that was not individually settled in the original discussion; these choices were subsequently accepted for the beta and may be revisited using production feedback. **Must test** = behavior that cannot be guaranteed from documentation alone. More recent decisions override earlier ones.

For the historical decision context and recorded trade-offs, see [Decision Rationale & Trade-off Record](./decision-rationale.md). This specification remains authoritative for expected behavior and later decisions.

## 1. Motivation and product boundary

When writing notes in Joplin, it is common to quote material from another note to support a statement or provide context for what comes next. The source might be a previously written note or an article collected from the web.

A useful quotation includes not only the selected passage, but also attribution linking back to the source, preferably to the relevant heading.

However, assembling such a quotation requires gathering several pieces of information from different places: the selected text, the note link or source URL, and potentially a heading anchor. Users must repeatedly copy, paste, switch between notes, and manually put these pieces together.

Because each copy operation typically replaces the previous clipboard contents, users may also need to temporarily store the information they have collected. Clipboard managers can help with this, but they do not eliminate the need to gather and assemble the pieces manually.

**Quote It eliminates this repetitive process by producing a complete, ready-to-paste quotation with source attribution in a single operation.**

Its primary use case is quoting between Joplin notes, whether the source is a previously written note or a clipped web article.

Quote It also makes it easier to share quotations outside Joplin. By using the original web URL for clipped content, quotations can be shared with others or reused in external applications while preserving a link to their source.

Quote It focuses on making quotations easy to copy, reuse, and share, with their source attribution already attached.

**Out of scope:** bibliographic/citation management, automatic insertion into another note, remote web fetching/verification, network downloads, document editing, arbitrary user-authored templates, support for CodeMirror 5 or Rich Text/TinyMCE editor.

## 2. Platform, commands and user interaction

### 2.1 Supported surfaces — Confirmed

- **Desktop:** commands **`Quote It: Internal`** and **`Quote It: External`**, available through Command Palette, configurable keyboard shortcuts, and editor context menu.
- **Mobile:** a single Editor Toolbar button, followed by an Internal/External mode selector.
- **Editor:** CodeMirror 6 **Markdown** editor only; no CM5 compatibility shim or Rich Text implementation.
- Settings and feedback should work on both platforms to the degree supported by their Plugin APIs.

### 2.2 Selection snapshot — Confirmed

Take a **Selection Snapshot** containing: active note ID and title; note source URL metadata; note body/source text required for heading analysis; selection start/end offsets and selected raw Markdown; relevant editor/note identity; and settings needed for output. **On mobile capture this before opening the mode selector.**

Review decision (2026-11-02): read the editor state once, then fetch metadata once for that captured note ID and verify the returned note ID matches. Use those first captured values throughout the operation. Do not reread either source to detect intervening edits, selection changes, navigation, or metadata updates, and do not abort merely because these may have occurred. For the current note-level Internal command, the adapter returns only note ID and selected text; trust the primary range supplied by CM6 rather than exporting the full body and offsets solely for duplicate validation. Capture document text and offsets when heading analysis requires them. This does not claim an atomic transaction across editor and metadata reads.

When the editor has multiple selection ranges, use only its primary range. If the primary range is empty, apply the no-selection behavior even if another range contains text.

If the user navigates away or edits the original note after capture, **complete the operation from the frozen snapshot**, rather than reading a later note/selection or aborting merely because the note changed. Do not silently mix live and frozen data.

When selection or critical note metadata cannot be obtained consistently at capture time, abort with an error; **do not overwrite the clipboard**.

### 2.3 User feedback

- On success copy immediately; avoid unnecessary dialogs.
- External mode without a usable `source_url` falls back to Internal, with a Toast.
- A usable external `source_url` is an absolute, parseable HTTP or HTTPS URL; other schemes and unparseable values trigger the same Internal fallback and Toast.
- Inferred external anchors prompt a Toast **only once in the plugin lifetime**, with a setting to reset the warning state.
- If an inferred anchor is unusable, use source URL without a new anchor and Toast.
- Failure to generate/write HTML, or detection of material HTML semantic loss, falls back to Markdown-only and Toast (desktop).
- Invalid state / clipboard failure: show an actionable error; do not claim copying succeeded.
- **Provisional:** Text Fragment successful generation needs no repetitive Toast; its best-effort nature is explained in Settings.

## 3. Output contract

### 3.1 Selected quotation — Confirmed

Selected raw Markdown becomes a Markdown blockquote; a blank quoted line separates quotation and attribution. The final attribution is a Markdown link. Default prefix `-- `, default heading/title separator ` | ` (the `|` must be escaped in Markdown link display text).

```markdown
> Selected text
>
> -- [Nearest Heading \| Note Title](:/0123456789abcdef0123456789abcdef#nearest-heading)
```

External example:

```markdown
> Selected text
>
> -- [Nearest Heading \| Note Title](https://example.com/article#nearest-heading)
```

If no eligible displayed heading remains, link label is **only** the note title (no duplicate separator). `Attribution Prefix` appears **only** with actual selected quotation, not for link-only output.

If the note title is empty or contains only whitespace, use `Untitled` as its display title. Eligible headings may still appear before it in selected-quotation attribution.

### 3.2 No selection — Confirmed

Return **only** `[Note Title](URL)`; do not add `>`, attribution prefix, heading breadcrumbs, or a heading-specific anchor. Preserve any existing fragment in the original source URL. For Internal mode, use note link without heading fragment. For External mode, use external `source_url` if available; otherwise Internal fallback with Toast. Text Fragment is never generated without a selection.

### 3.3 Selection transformations — Confirmed

- Respect selection boundaries exactly. Do not expand to entire paragraphs or “fix” incomplete Markdown syntax.
- If the selection contains incomplete Markdown, preserve it without adding missing syntax. The appended attribution may consequently be parsed as part of that structure; do not show an extra warning for this condition.
- Strip leading/trailing blank lines, preserve internal blank lines and code fence contents.
- Prefix each resulting line with a Markdown blockquote marker while preserving its content; empty lines are `>`; output should parse and remain copyable.
- **Nested Quote Handling:** `Preserve Nesting` (default) or `Flatten Existing Quotes`.
- Flatten **only when every non-empty top-level Markdown block** in the selection is a blockquote, including multiple independent quote blocks. If even one top-level normal paragraph/list/etc. is present, preserve existing nesting for the *entire* selection. Use block parsing to account for lazy blockquote continuation and fenced code; no naïve `^>` regex.
- A selection consisting solely of whitespace after trimming has no substantive quotation (**provisional implementation rule:** treat as no selection, link only; test and document).

### 3.4 Attribution label Markdown — Confirmed

Heading and Note Title use the **same** inline Markdown policy:

- Preserve inline code spans, emphasis, strong and strikethrough, including `*`/`_` variants.
- Flatten pre-existing nested links to their **display content**, retaining supported inline formatting; never nest Markdown links in the outer attribution link.
- Keep original inline code spans independent. If flattening makes two spans directly adjacent, separate them with a space to prevent their backtick delimiters from colliding; do not merge their contents (review decision, 2026-11-03).
- Escape Markdown-sensitive characters for plain text, **always escape `|` and `#`** in label text, including user-supplied separator. Do **not** escape the contents of inline code spans.
- Image syntax, unsafe HTML, and line breaks become readable text instead of retaining dangerous HTML or malformed inline structures.
- Use a Markdown inline AST/structured tokens rather than global regex string replacements.
- Selected quote body is **not** subjected to attribution-label escaping.

## 4. Heading analysis, display and anchors

### 4.1 Heading detection — Confirmed

- Find the nearest eligible heading preceding selection start; if selection starts on a heading, that heading is the source.
- Handle ATX and Setext headings; ignore heading-looking text inside fenced/indented code and blockquotes.
- If quotation spans headings, bind attribution to the heading at the **start** of selection.
- Resolve heading hierarchy and repeated headings from source document structure, not solely selected text.

### 4.2 Breadcrumbs — Confirmed

`Heading Breadcrumbs` setting: `Nearest` (default), `Last Two`, or `Full Path`. Order is **leaf to root**, followed by Note Title, e.g.:

```text
Lexical this | Arrow Functions | Functions | Programming Notes
```

Separator is the shared Heading/Note Title Separator; no separate breadcrumb separator. **Anchor always targets the nearest source heading**, regardless of display breadcrumb depth. Filter H1 according to H1 policy **before** taking the last two display headings. If none remains, use only Note Title.

`H1 Display Policy`:

1. `Always Skip H1`
2. `Skip If Title Starts With H1` (**default**)
3. `Skip If Identical`
4. `Always Include H1`

Use trim + case-insensitive comparison for starts-with/equality. Display filtering affects label **only**, never anchor resolution.

### 4.3 Internal Joplin links — Confirmed with Must test

Markdown internal URL form is `:/noteId` optionally followed by `#joplin-compatible-anchor`. Derive anchors best-effort, including duplicate headings, Unicode, punctuation and normalization. If unable to derive a defensible anchor, **fall back to note-level link**, rather than invent a broken anchor.

Desktop HTML `href` should use `joplin://x-callback-url/openNote?id=...` for note-level navigation. **Only add a heading target if tested and confirmed supported by the concrete Joplin protocol/version; otherwise HTML internal link remains note-level.** This is one of the specifically approved semantic differences from Markdown.

### 4.4 External anchors — Confirmed

Prefer a real, **explicit** page fragment if present in or associated with the heading:

- Markdown heading link whose destination is a relative `#fragment`, e.g. `## [Install](#install)`.
- Heading-adjacent/associated HTML `<a id="...">` or `<a name="...">`.
- Pandoc style `{#custom-id}`.

A heading link to a **full URL** is *not* an explicit heading fragment.

Otherwise infer a reasonable best-effort slug (including Unicode and duplicate handling). Do not contact the original site to validate it. Show the inferred-anchor warning **only once per plugin lifetime**, persist that state, and offer `Reset Anchor Warning` setting/action. If inference is not possible, fall back to the unmodified base source URL and Toast.

When the `source_url` has a pre-existing fragment and a selected heading-specific fragment is successfully produced, **replace** the existing fragment. Without a selection, preserve the original fragment. If no new heading fragment is available, preserve a usable original URL/fragment rather than discard it without reason (**provisional consistency rule**).

## 5. External URL serialization and safety

### 5.1 Human-readable URLs — Confirmed, **default ON**

A distinct setting `Human-readable URLs` applies to External `source_url` and External heading links, **not** internal Joplin note URLs. It aims to output human-readable Unicode where safely possible, rather than retaining a mass of `%XX` sequences. It is **independent** of the Text Fragment feature.

**Rules:**

1. Parse URL into scheme/authority/path/query/fragment and preserve the target's semantics. **Never run blanket `decodeURIComponent()` on the whole URL.**
2. Safely decode well-formed UTF-8 percent-encoded Unicode (e.g. `%E4%B8%AD` → `中`) where displaying raw Unicode does not change the URL meaning. Also decode safely encoded unreserved ASCII (e.g. `%7E` → `~`).
3. Preserve structural/reserved encodings such as `%2F`, `%23`, `%3F`, `%26`, `%25` and ambiguous cases; preserve `%20` as `%20` by default, rather than converting it globally to `+`.
4. `+` is only equivalent to space in appropriate **form-style query-value interpretation**, not generically in paths or fragments. **Do not rewrite existing `%20` to `+` automatically** unless an explicitly verified component-specific encoding contract permits it; ordinary Quote It implementation should simply preserve `%20`.
5. Don't double-encode existing `%` sequences, break URL components, collapse distinct path/query values, alter signature-sensitive query bytes, or normalize query argument order merely for display.
6. Escape/serialize the **resulting Markdown link destination** safely (particularly parentheses, whitespace, `<`, `>`, backslashes and control characters) without changing navigational meaning. Browser APIs may percent-encode Unicode on navigation even when Markdown source appears human readable.
7. If parsing, decoding or safe serialization is uncertain, **fall back to the original link string**, with only mandatory Markdown destination escaping; do not risk broken links for readability.
8. Setting OFF: retain `source_url`'s original percent-encoding as much as practicable while still constructing a valid Markdown link and adding any heading anchor.
9. No network verification. Preserve security properties; for external HTML links sanitize protocol and attributes.

**Required safety tests:** `%20`, `%2B`, literal `+`, `%2F`, `%23`, `%3F`, `%26`, `%25`, percent-encoded Unicode, invalid UTF-8, double encodings, existing fragments, signed URLs, query parameters, and Markdown-significant parentheses. A clean human-readable display is never more important than an intact link target.

### 5.2 Text Fragment — Confirmed, **default OFF**

Optional `Enable Text Fragment` setting for **External mode with selection only**. It appends a standards-compliant `:~:text=` directive enabling supporting browsers to scroll to/highlight the quotation in the *original* web page, when text matches. Best effort; never claim match verification.

**Confirmed generation choices:**

- Derive visible plain text after rendering/parsing selected Markdown; strip Markdown control syntax, not meaningful human-visible wording.
- For long selections, use **leading and trailing snippets** rather than full text.
- `Text Fragment Length` is adjustable in Settings, with **default 20 Unicode characters per end** (the later acceptance supersedes the earlier 40/80 proposals).
- If short enough, use `text=start` with the whole selected text, **without `,end`**.
- For multi-block selections take the beginning from the **first visible text block** and the end from the **last visible text block**; don't let either individual snippet straddle block boundaries.
- Use percent-encoding required by the Text Fragment grammar; **do not** substitute `+` for encoded spaces. This is independent of `Human-readable URLs` and explicitly overrides it for directive contents.
- If a reliable fragment cannot be constructed, fall back to heading anchor, or source URL when no heading anchor exists. No clipboard failure just because Text Fragment was unavailable.
- If the feature is disabled, do not generate a new `:~:text=` directive.
- When disabled, do not add or modify an existing Text Fragment merely because it is present in `source_url`. Preserve the original fragment when no selection exists or no new heading fragment is available; a successfully generated heading fragment replaces the entire original fragment, including any existing directive.

**Provisional implementation details (Round 18D questions were not individually answered; the defaults below were subsequently accepted for the beta):**

- Whitespace: normalize sequences of visible whitespace to single spaces for fragment extraction; preserve punctuation/letter order. Do not alter displayed quote Markdown.
- Source blocks: attempt when enough visible text exists, including code/tables where possible, but skip image-only/alt-only or unreliable source mappings rather than guessing.
- Short snippets near a word boundary may be adjusted *within* the limit if possible; handle Unicode grapheme clusters, emoji and CJK appropriately.
- Avoid using the feature if selected text was visibly altered by clipping, but because no network fetch is allowed, this can be inferred only from locally obvious syntax/structure. Browser-side match may still fail.
- Existing `#heading` and `:~:text=`: preserve/replace fragment components according to URL grammar; prevent duplicate/conflicting directives. In particular, do **not** simply concatenate a new `#` or multiple `:~:` markers. Test examples `#heading:~:text=start,end` and existing directive-bearing URLs.
- Require finite bounds on settings, robust empty-text handling, and URL length guards; no new user-facing length settings beyond the one confirmed knob.

**Important browser caveats:** Text fragments are user-agent-dependent, match original page visible text, and may fail for clipped/normalized content, unsupported browsers, dynamic DOM, iframes or sites opting out. Start/end snippets must each reside within a single block-level element; combined match may span blocks. This should be accurately explained in settings/help, not shown as a Toast every operation.

## 6. Settings — confirmed configuration

| Setting (suggested label) | Values / default | Scope |
|---|---|---|
| Nested Quote Handling | `Preserve Nesting` (**default**), `Flatten Existing Quotes` | Selection |
| Heading/Note Title Separator | String, **` | `** | Attribution label + breadcrumbs |
| Attribution Prefix | String, **`-- `** | Selected attribution only |
| H1 Display Policy | `Always Skip H1`; `Skip If Title Starts With H1` (**default**); `Skip If Identical`; `Always Include H1` | Display label only |
| Heading Breadcrumbs | `Nearest` (**default**); `Last Two`; `Full Path` | Display label only |
| Human-readable URLs | Boolean, **ON** | External URLs, independent of Text Fragment |
| Enable Text Fragment | Boolean, **OFF** | External with selection |
| Text Fragment Length | Positive Unicode character/grapheme limit, **20 per end** | Used only when Text Fragment ON |
| Reset Anchor Warning | One-shot reset action/settings mechanism | External inferred-anchor toast |

**UI wording must explicitly distinguish the independent settings:**

**Human-readable URLs** — “Convert percent-encoded characters into readable text when safe (for example, `%E4%B8%AD` → `中`). This changes how external source URLs are written, not where they point.” Supplement: “Applies to external source URLs, whether or not Text Fragment is enabled.” Default ON.

**Enable Text Fragment** — “Add a text highlight directive (`:~:text=`) to external source URLs, so supported browsers can jump to and highlight the quoted passage. This may make URLs longer and does not guarantee a match.” Supplement: “Works independently of Human-readable URLs. When disabled, regular source and heading links are used.” Default OFF.

**Text Fragment Length** — “Maximum number of characters from each end of the quotation to include in the text highlight link. Used only when Text Fragment is enabled.” Default 20. Prefer placing underneath or near its parent feature, possibly disabled/hidden when OFF.

**No custom template system**: separator and attribution prefix replace prior exploration of freeform templates.

## 7. Clipboard, Markdown and HTML

### 7.1 Output fidelity — Confirmed

`text/plain` containing Markdown is **authoritative** on all platforms. On desktop write both `text/plain` and HTML (`text/html`) where supported and possible. On mobile write Markdown text only if multi-format clipboard cannot be supported; this is not itself an error and no Toast is necessary.

Desktop HTML is a safe rendering of the selection's Markdown blockquote and its final attribution, retaining block structure, links, inline formatting, fenced code and semantic content. `<blockquote>` must include attribution **last**. All content must be escaped/sanitized against injection.

### 7.2 HTML images and link differences — Confirmed

- HTTP(S) images in HTML may render as `<img src="...">` (sanitized), retaining useful alt text.
- Joplin-local resource links and file images must **not** be exposed as broken/unsafe external image references; render readable alt text only. No base64/data URLs or downloading.
- For HTML Internal attribution, note-level `joplin://x-callback-url/openNote?id=...` is acceptable when Markdown carries heading link and the x-callback protocol cannot be confirmed to support heading targeting.

### 7.3 Semantic equivalence / fallback — Confirmed

Rendering failure, write failure, or material semantic loss must produce **Markdown-only** fallback and a Toast (unless Markdown write itself fails). Determine material loss via testable semantic checks: selected content present/in order, attribution present/last, code contents, links and substantive structure. Do not demand byte-for-byte identity or identical styling. Explicitly allowed differences are the Joplin HTML note-level target and local image alt-only behavior. Test receiving-app paste behavior but do not claim to control it.

If Markdown clipboard write fails, report failure. A failed operation before any write must preserve prior clipboard contents; write order/atomicity on desktop requires platform testing, with a conservative strategy to avoid presenting a partially successful operation as success.

## 8. Processing architecture (implementation plan, not code)

Recommended pipeline:

1. `CaptureSnapshot` (first CM6 state + one metadata read for its note ID, frozen for reuse).
2. `ParseDocument` (block AST for heading hierarchy, quotes, inline AST for labels).
3. `ResolveAttribution` (source heading, breadcrumb policy, H1 display filtering).
4. `ResolveDestination` (Internal / External fallback, explicit/inferred anchor, source URL fragment handling).
5. `SerializeExternalUrl` (human-readable safe decoding and Markdown destination safety when enabled).
6. `BuildTextFragment` (optional external, from visible selected text, with graceful fallback).
7. `RenderMarkdownQuote` (selection-preserving blockquote, separator, prefix, escaped display label).
8. `RenderSafeHtml` + `CheckSemanticEquivalence` (desktop only).
9. `WriteClipboard` (choose supported formats; report success/fallback without false confirmation).
10. `NotifyUser` (toasts/errors and persisted one-shot warnings).

Suggested pure modules: `snapshot`, `markdown-structure`, `heading-resolver`, `label-renderer`, `blockquote-transform`, `internal-links`, `external-anchors`, `url-serializer`, `text-fragment`, `html-renderer`, `clipboard-adapter`, `settings`, `notifications`. Keep platform-specific editor and clipboard adapters narrow; shared pure logic should be cross-platform testable.

## 9. Acceptance criteria / automated test matrix

### 9.1 Behavior examples

| Input | Expected |
|---|---|
| Selected plain paragraph, Internal | `> ...` plus blank quote line and Internal attribution link |
| No selection, Internal | `[Note Title](:/id)` only |
| No selection, External, `source_url` exists with original `#frag` | `[Note Title](source_url#frag)`; no added heading or Text Fragment |
| External, `source_url` missing | Internal output + Toast |
| Selection begins inside heading | Heading at selection start is source |
| Selection crosses two headings | Uses heading associated with selection start |
| No eligible display heading after H1 policy | Label contains Note Title only |
| Breadcrumbs Full Path | Leaf-to-root headings, then Note Title, one shared separator |
| Separator ` | ` in link label | Escaped `\|`, including custom separator |
| Nested Markdown links in title/heading | Flatten nested link; retain allowed inline formatting |
| All top-level selected blocks are quotes | Flatten only if setting enabled |
| Mixed quote + normal paragraph | Preserve entire selection's quote nesting |
| Fenced code with `>` in literal contents | Preserved faithfully, correctly quoted |
| Explicit fragment `#custom` | Preferred to inferred slug |
| Duplicate headings | Reasonable Joplin-compatible/website-aware best effort; test actual navigation |
| Inferred external slug | One-time warning, resettable |
| Unusable inferred slug | Source URL fallback + Toast |
| External safe UTF-8 `%E4...` and readable URLs ON | Display as Unicode if no navigational change |
| Encoded `%2F`, `%23`, `%20` | Preserve when decoding would be unsafe |
| Text Fragment OFF | No `:~:text=` directive |
| Text Fragment ON, short text | `:~:text=start` |
| Text Fragment ON, long multi-block quote | First/last block snippets, default 20 Unicode chars each |
| Invalid selection/note snapshot | No clipboard overwrite; error |
| Desktop HTML semantic loss | Markdown-only + Toast |
| Mobile multi-format unavailable | Markdown-only silently |

### 9.2 Test tiers

**Unit:** block/inline Markdown AST cases, heading detection and H1/breadcrumbs, quote nesting and lazy continuations, Unicode escaping, URL round-trip equivalence, Text Fragment grammar, XSS sanitization, semantic HTML assertions, and one-shot warning persistence.

**Integration:** real Joplin Editor Plugin/CM6 command registration, Desktop context menu/keyboard palette, Mobile toolbar + selector snapshot race, note navigation during selector, note metadata retrieval, dual-format clipboard, fallback clipboard states.

**Manual acceptance:** Joplin Desktop and Mobile on supported OSes; paste into Joplin Markdown editor, other Markdown editors and rich-text apps; real Web Clipper articles with explicit and inferred anchors, CJK headings, repeated headings, emoji, lists, tables, code blocks and image links; validate in-Joplin link navigation and external browsers.

**Compatibility gating:** determine minimum Joplin version **empirically**, not by guess; investigate CM6 availability and mobile plugin API version, editor toolbar support, clipboard support, and `joplin://x-callback-url` heading behavior. Desktop and mobile core flows must both pass before beta release.

## 10. Implementation readiness and deliberate open items

**Ready to implement:** main UX, snapshot contract, quotation transformation, heading labels, settings and defaults, fallback policy, and Text Fragment opt-in scope are all defined sufficiently for a beta implementation.

**Must verify during development, not invent:**

1. Concrete Joplin APIs for mobile CM6 snapshots, mode selection and clipboard write; min supported Joplin release.
2. Joplin's actual heading slug and duplicate-heading navigation logic (internal), and x-callback heading support.
3. Desktop dual-format clipboard write semantics and semantic HTML paste in recipients.
4. Safe human-readable URL serialization round-trip across unusual encodings and signed/legacy source URLs.
5. Text Fragment snippet segmentation / Unicode boundary behavior and pre-existing fragment directives; benchmark clipped webpage mismatch.
6. **Round 18D defaults**: whitespace normalization, handling of code/tables/image-only selections, and Text Fragment reliability feedback were not individually decided in that round. The provisional defaults in §5.2 were subsequently accepted for the beta and can be revisited based on production feedback.

**Release posture:** `v0.x` beta; shared release for Desktop+Mobile. Do not quietly drop mobile or claim guaranteed anchors/text highlighting. Fix acceptance-blocking incompatibilities first. No implementation began as part of preparing this document.

## 11. Primary technical references

1. Joplin — Extending Joplin / Plugin API: https://joplinapp.org/help/api/
2. Joplin — Creating a CodeMirror 6 Markdown editor plugin: https://joplinapp.org/help/api/tutorials/cm6_plugin/
3. Joplin — Editor Commands (Desktop and Mobile): https://joplinapp.org/help/dev/spec/editor_commands/
4. Joplin — `joplin.commands` Plugin API: https://joplinapp.org/api/references/plugin_api/classes/joplincommands.html
5. Joplin — Plugins (Desktop and Mobile): https://joplinapp.org/help/apps/plugins/
6. Joplin Forum — Mobile Plugin Support (historical, verify against current API): https://discourse.joplinapp.org/t/mobile-plugin-support/35262
7. MDN — Text Fragments: https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Fragment/Text_fragments
8. WICG — Scroll to Text Fragment: https://wicg.github.io/scroll-to-text-fragment/
9. RFC 3986 — URI syntax, reserved characters and percent-encoding: https://www.rfc-editor.org/rfc/rfc3986
10. WHATWG — URL Standard: https://url.spec.whatwg.org/

---

**Change summary of most recent decisions:** Text Fragment default **OFF** (overrides earlier ON), optional length setting default **20** chars/end, and Human-readable URLs default **ON** with explanatory setting descriptions distinguishing readability from in-page highlighting. Source URL may be safely Unicode-decoded; `%20` is **not** globally replaced with `+`. This specification incorporates the agreed prior core design and these final overrides.
