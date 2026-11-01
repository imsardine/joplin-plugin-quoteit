# Quote It — Decision Rationale & Trade-off Record

**Status:** Historical decision companion / implementation handoff\
**Prepared:** 2026-11-01\
**Source baseline:** `Quote-It-SPEC-2026-10-31.md` (also `Quote-It-SPEC.md`), and the available product interview context\
**Purpose:** Preserve the alternatives and reasons actually discussed without inventing an after-the-fact architectural rationale.\
**Not a replacement for:** the normative product/implementation SPEC, implementation design, or formally accepted ADRs.

> **Evidence discipline.** This is a historical reconstruction, **not a verbatim transcript**. Every entry separates (1) confirmed decision, (2) alternatives demonstrably considered, (3) rationale expressed in the discussion, and (4) engineering implications that are *analysis, not a claimed historical reason*. When the original reasoning is not available or not explicitly discussed, it is marked **Not recorded**. The SPEC is authoritative for expected behavior; this document adds context. A superseded alternative does not imply its full design was specified.

> **Later decision:** The provisional choices, including the Round 18D defaults and whitespace-only selection handling, were subsequently accepted for the beta, with the intention of revisiting them using production feedback. This does not change what was or was not decided in the earlier discussion. See [the current specification](./spec.md) for the resulting contract.

## 0. How to use this document

**Evidence tags**

- **[D] Discussed:** the choice, contrast, or reasoning is visible in the supplied conversation history / interview summary.
- **[S] Specified:** the final behavior appears in the October 31 SPEC; the document may not record why.
- **[I] Inference:** plausible implementation consequence, expressly *not* attributed to historical discussion.
- **[U] Unrecorded:** no sufficient evidence for an original argument or for all alternatives being explicitly compared.

**ADR candidacy** is an editorial recommendation, not a retroactive ADR. Use three tests together: difficult to reverse, requires background to interpret, and involves a meaningful trade-off. Suggested candidates are marked **High**, **Medium**, or **Low**. A future ADR should link to its actual implementation/verification evidence and state whether it is a fresh decision or a faithful transcription of a past decision. Do not turn [I] into [D].

## 1. Decision register (at a glance)

| ID | Decision | What was traded off | Evidence | ADR candidacy |
|---|---|---|---|---|
| D01 | Build one-operation quote with attribution, not a citation manager | Lightweight copy workflow vs broader citation/automation features | [D][S] | Medium |
| D02 | Internal / External source modes | Joplin-native navigation vs external shareability | [D][S] | Medium |
| D03 | Freeze selection snapshot before UI, then finish from it | Consistency/predictability vs reacting to later edits or aborting | [D][S] | **High** |
| D04 | Markdown `text/plain` is primary; desktop HTML additional | Portable, controllable output vs rich-paste convenience | [D][S] | **High** |
| D05 | CodeMirror 6 Markdown only; desktop/mobile beta together | Scope and verification load vs legacy/rich-text support | [S], some [D] | Medium |
| D06 | Preserve source selection strictly; quote nesting policy | Fidelity vs visually flatter or repaired markup | [D][S] | Medium |
| D07 | Structured heading analysis + nearest heading anchor | Context precision vs simplicity and imperfect slug compatibility | [D][S] | **High** |
| D08 | Leaf-to-root breadcrumbs + H1 display policy | Informative attribution vs verbosity and title duplication | [D][S] | Low |
| D09 | Inline Markdown formatting in attribution, without nested links | Expressive labels vs valid/safe outer link rendering | [D][S] | Medium |
| D10 | Configure separator and prefix; no arbitrary template engine | Focused customization vs flexibility/maintenance cost | [D][S] | Medium |
| D11 | Human-readable external URLs default ON, conservatively | Readability vs preservation of URL semantics | [D][S] | **High** |
| D12 | Optional Text Fragment default OFF; short snippets | Browser highlight precision vs long/opaque URL and unreliable match | [D][S] | Medium |
| D13 | External anchors: explicit preferred, inferred best effort | Deep linking vs correctness uncertainty | [D][S] | **High** |
| D14 | Prefer content-preserving clipboard fallback over incomplete HTML | Rich clipboard convenience vs semantic fidelity | [D][S] | **High** |
| D15 | Quiet success / scoped Toast warnings | Informing user vs distracting repeated notices | [D][S] | Low |

## 2. Individual decision histories

### D01 — One-operation copyable quotation rather than a citation manager

**Decision [D][S].** Select text in a Joplin note and obtain a ready-to-paste Markdown quotation with attribution in one operation. No-selection yields a source-note link. The product is *not* bibliographic reference management or automatic destination-note editing.\
**Alternatives/context actually discussed [D].** Manually collect selection, note URL/original web URL, and heading anchor; switch between notes; stage interim data; use a clipboard manager. The interview explicitly contrasted clipboard managers with solving the assembly problem.\
**Recorded reason [D].** Scattered source components and sequential clipboard overwrites make manual quotation assembly repetitive. Clipboard history mitigates loss but does not assemble a usable quote.\
**Not recorded [U].** No detailed comparative evaluation of specific citation-management products or automatic note-insertion implementations.\
**Implementation implications [I].** Keep copy semantics and deterministic output at the center of architecture rather than building a note editor or bibliographic database.\
**Source:** SPEC §1, §3.

### D02 — Internal and External modes

**Decision [D][S].** Two desktop commands (`Quote It: Internal`, `Quote It: External`); one mobile toolbar entry followed by mode selection. External uses clipped article `source_url`; absent source URL falls back to Internal with a Toast.\
**Alternatives/context [D].** Quoting between Joplin notes versus sharing quotations with non-Joplin readers; a Joplin note link is unsuitable as a generally usable web citation.\
**Recorded reason [D].** Different destination audiences need different targets: Joplin-native recall vs the original external source.\
**Not recorded [U].** No definitive historical reason for why *desktop* uses two independent commands while *mobile* uses a selector, beyond the selected interaction contract.\
**Implications [I].** Model link resolution as a strategy rather than duplicating quotation formatting.\
**Source:** SPEC §1–§3.

### D03 — Freeze a coherent Selection Snapshot before UI

**Decision [D][S].** Capture selected raw Markdown, selection offsets, note/source metadata, body used for headings, and relevant settings consistently; on mobile, before opening mode choice. If note changes or navigation occurs after capture, finish from the captured state. If capture itself is inconsistent, abort without clipboard mutation.\
**Alternatives actually considered [D].** Re-read live selection/note after the mode picker; abort on a changed note/selection; proceed from a frozen snapshot. A later user choice explicitly selected the frozen snapshot over abort-on-change.\
**Recorded reason [D].** The selection must refer to the content the user acted on, particularly when the mode picker creates time for focus/editor changes. Snapshot consistency prevents mixing different notes or revisions.\
**Not recorded [U].** A formal concurrency model, maximum snapshot size, exact editor transaction boundaries, or memory/performance benchmarking.\
**Trade-off / implications [I].** Deterministic result may refer to text no longer present in the *current* note; snapshotting a large note/body may carry memory cost. Do not quietly re-query current state.\
**ADR:** **High**. Changes here alter observable correctness and require a cross-platform event-order rationale.\
**Source:** SPEC §2.2, §8–§9.

### D04 — Markdown clipboard authoritative, HTML additive on Desktop

**Decision [D][S].** `text/plain` holds Markdown and is the authoritative copy format. Desktop attempts `text/html` alongside; mobile may silently copy Markdown only when multi-format clipboard is not available.\
**Alternatives/context [D].** Markdown-only clipboard vs multi-format Markdown+HTML to support applications accepting rich paste. This was part of explicit clipboard-output discussion.\
**Recorded reason [D].** Quote It promises a pasteable Markdown quotation and cross-application reuse; HTML improves richness only when it does not compromise the core result.\
**Not recorded [U].** No recorded experiment comparing specific consumer applications or Clipboard API reliability at decision time.\
**Trade-off [I].** Rich HTML needs rendering/sanitization and may not paste consistently; primary Markdown creates a stable acceptance target.\
**ADR:** **High**. Central contract, difficult to change without breaking consumers/tests.\
**Source:** SPEC §7.

### D05 — CM6 Markdown editor only; ship Desktop+Mobile beta together

**Decision [S].** CodeMirror 6 Markdown editor only, no CM5 or Rich Text implementation; beta released after desktop and mobile flows are tested together.\
**Alternatives documented [S].** Supporting CM5/Rich Text; shipping a desktop-only milestone. These alternatives are discernible from explicit exclusions, but the full conversation arguments are **not documented here [U]**.\
**Reason status [U].** Selection is clear; a detailed, attributable comparison of compatibility costs vs adoption is not preserved in the available record.\
**Implications [I].** Lower editor-adapter surface area but no support for users operating in excluded editors; mobile validation becomes a release gate.\
**ADR:** Medium if supporting another editor becomes a roadmap item; otherwise scope decision.\
**Source:** SPEC §2.1, §9–§10.

### D06 — Literal selection boundaries and nested-quote options

**Decision [D][S].** Respect exact selection; trim outer blank lines but preserve internal content, including partial Markdown and fenced code. Default preserve existing quote nesting. Optional flatten only when **all** non-empty top-level Markdown blocks are blockquotes (including separate quote blocks); mixed blocks preserve nesting.\
**Alternatives [D].** Always preserve quotes vs flatten existing quotation markers; flatten mixed content selectively vs only flatten an entirely quote-structured selection; repair/expand partial Markdown vs keep user's selection.\
**Recorded reason [D].** Preserve content semantics and avoid accidentally treating a paragraph/code line as a blockquote. Structural parsing is necessary for lazy continuation and fenced regions.\
**Unrecorded [U].** Formal scoring of visual readability vs literal fidelity.\
**Implications [I].** Requires Markdown block AST; regex stripping leading `>` is insufficient.\
**Source:** SPEC §3.3.

### D07 — Heading-aware attribution and link targeting

**Decision [D][S].** Attribute a selection to its nearest preceding/selected heading, using its **selection start** even if the selection crosses several headings. Support ATX/Setext; ignore headings in code/quotes. Heading URL targets nearest heading; display may include ancestors.\
**Alternatives [D].** Note-only links vs heading-specific links; linking to a later/end heading vs the selection-start context; rendering broader breadcrumbs vs nearest only.\
**Recorded reason [D].** Relevant heading context makes quotations more directly traceable without manual anchor assembly.\
**Unrecorded [U].** No guaranteed correct heading-slug algorithm across all Joplin/browser variants. The SPEC explicitly requires testing/fallback.\
**Implications [I].** Heading resolution is parser- and renderer-dependent; anchor quality must be surfaced as best effort rather than claimed exact.\
**ADR:** **High** for anchor/slug compatibility strategy, especially once supported Joplin versions are empirically defined.\
**Source:** SPEC §4, §9–§10.

### D08 — Breadcrumb display and H1 policies

**Decision [D][S].** Breadcrumb modes: Nearest (default), Last Two, Full Path; order leaf→root→Note Title. Independent H1 display choices: Always Skip; Skip If Title Starts With H1 (default); Skip If Identical; Always Include. H1 policy affects text only, not target anchor.\
**Alternatives [D].** Different breadcrumb depths and H1 inclusion criteria explicitly offered as choices.\
**Recorded reason [D].** Avoid unnecessary H1/title repetition while allowing more context when needed.\
**Implications [I].** Apply H1 filtering before choosing last-N breadcrumbs; use one configurable separator.\
**Source:** SPEC §4.2, §6.

### D09 — Preserve inline formatting in attribution labels, never nest links

**Decision [D][S].** Preserve code, emphasis/strong/strike in both heading and note title; flatten any embedded links to display content; escape Markdown-sensitive plain text (always `|`, `#`), not code-span contents; turn images/unsafe HTML into readable text.\
**Alternatives [D].** Strip formatting from labels vs preserve supported inline styling; globally escape text vs token-aware formatting; retain nested links vs flatten their display text.\
**Recorded reason [D].** Preserve readable source names without emitting invalid Markdown nested links or damaging code formatting.\
**Implications [I].** Shared inline AST serializer needed; regex global escaping is unsafe.\
**Source:** SPEC §3.4.

### D10 — Small customization surface vs arbitrary template engine

**Decision [D][S].** Configure attribution prefix (`-- `) and heading/title separator (` | `); do not ship a custom template language.\
**Alternatives [D].** Earlier exploration of custom/freeform templates was explicitly superseded by two focused string settings.\
**Recorded reason status [U].** The record establishes the chosen simplification; it does not preserve a full argument or quantified maintenance comparison.\
**Implications [I].** Fewer template parsing/security/backwards compatibility concerns but less formatting freedom.\
**Source:** SPEC §3.1, §6.

### D11 — Human-readable external URL serialization, default ON

**Decision [D][S].** Human-readable URLs is independent from Text Fragment and defaults ON. Decode safely representable UTF-8 Unicode and unreserved ASCII but retain semantics-sensitive encodings; `%20` generally remains `%20`, not `+`. Only External URLs; use original URL if equivalence is uncertain.\
**Alternatives actually discussed [D].** Preserve source URL untouched; broadly decode percent escapes; replace `%20` with `+`; conservative component-aware decoding. A dedicated toggle was proposed and accepted.\
**Recorded reason [D].** User wanted fewer opaque `%XX` sequences, especially for Chinese, but correctness must not be sacrificed. The discussion explicitly noted that `+` is not a universal space replacement; reserved encodings can change route/query/fragment meaning.\
**Trade-off [I].** Distinct URL strings can be equivalent—or unexpectedly not, especially with signature-sensitive applications. Require component-specific tests and conservative fallback.\
**ADR:** **High**. Link integrity, cross-platform serialization and irreversible link breakage justify recording exact invariants.\
**Source:** SPEC §5.1, §6. **Normative references:** RFC 3986 §2.1–2.4, https://www.rfc-editor.org/rfc/rfc3986 ; MDN `URLSearchParams`, https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams .

### D12 — Text Fragment feature: available but default OFF

**Decision [D][S].** Optional on External selections. Text snippets use Markdown-rendered visible plain text; from first and last visible blocks; for short content use `text=start`; adjustable length, default 20 Unicode characters **per end**. Standard encoding within `:~:text=`; fallback to heading/source link when not reliable. Feature ultimately default OFF.\
**Alternatives actually discussed [D].** No Text Fragment; optional default ON; optional default OFF; full selection vs start/end snippets; fixed 40/80 characters vs user-adjustable length; default 40/80 vs 20; standard encoded URL vs more readable but less reliable `+` / raw Unicode; abort vs graceful fallback.\
**Recorded reason [D].** Deep-link highlighting would improve precision, but makes URLs long/opaque, and web-clipped text may not match original pages. After experimenting with URL appearance, user explicitly reversed default ON to OFF because generated URLs were too complicated.\
**Unrecorded [U].** Round 18D choices (whitespace normalization; code/table/image handling; Toast frequency) were asked but **not answered** before the conversation shifted. These remain provisional in the SPEC, *not historical final choices*. Exact handling of existing directives also requires testing.\
**Implications [I].** Isolate the optional enhancement from normal External URL generation; its settings should clearly state how it differs from Human-readable URLs.\
**ADR:** Medium; document standards interactions once implementation behavior is verified.\
**Source:** SPEC §5.2, §6. **Normative reference:** MDN Text Fragments, https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Fragment/Text_fragments .

### D13 — External heading anchors: explicit first, inferred best-effort

**Decision [D][S].** Prefer explicit Markdown/HTML/Pandoc anchor near a heading; otherwise infer page-compatible slug from heading text/duplicates. Do not fetch original site to validate. Replace existing fragment with heading-specific target when selected; retain original fragment if no selection. Warn once per plugin lifetime on inferred-anchor use; if unusable fallback to base source URL and warn.\
**Alternatives [D].** Explicit-only/headingless link vs inferred heading slug; always notify vs once-only warning; online verification vs local best effort.\
**Recorded reason [D].** Prefer deep links where possible, but clipping and website-specific slug rules make inference uncertain; users should not be misled into thinking matches are verified.\
**Implications [I].** Keep anchor provenance (`explicit` vs `inferred`) in resolver result for both warning and tests.\
**ADR:** **High** if URL-compatibility strategies become complex.\
**Source:** SPEC §4.4, §5.2.

### D14 — Desktop HTML only if meaning is preserved

**Decision [D][S].** Safe HTML `<blockquote>` plus attribution last; `text/plain` Markdown primary. HTTP(S) images can remain remote `<img>`; local Joplin/file resources are rendered as readable alt text. If HTML generation/write loses substantive quote content, code, links, or attribution, copy Markdown-only and Toast. HTML note link may target note level when heading x-callback compatibility is unverified.\
**Alternatives [D].** Enforce rendered HTML even when imperfect vs fallback to reliable Markdown; embed local data/download images vs alt-only; require byte-identical HTML vs semantically equivalent output.\
**Recorded reason [D].** A rich format is helpful only if it does not silently corrupt/reorder selected meaning or expose inaccessible local resources. Semantic checks should validate content/order rather than layout identity.\
**Unrecorded [U].** Which clipboard write sequence is truly atomic on each desktop target is not historically settled; SPEC requires platform tests.\
**ADR:** **High** where clipboard consistency/failure semantics define the user contract.\
**Source:** SPEC §7, §9–§10.

### D15 — Quiet, targeted feedback

**Decision [D][S].** Copy on success without dialog. Warn on missing `source_url` fallback, inferred or failed anchors, HTML→Markdown fallback, and invalid selection/failure. Inferred anchor warning only once in plugin lifetime, with reset.\
**Alternatives [D].** Repeated vs once-only inferred-slug warning; silent vs notified fallback.\
**Recorded reason [D].** Inform users when link fidelity may suffer without turning a repetitive copy operation into repeated interruption.\
**Unrecorded [U].** Specific Toast durations/strings, persistence mechanism for lifetime warning.\
**Source:** SPEC §2.3, §6.

## 3. Explicit reversals and superseded proposals

This chronology is especially useful when earlier documents or agent memories disagree:

1. **Selection changes after capture:** user settled on **continue from frozen snapshot**, not abort if note changed after the UI opened. A capture-time inconsistency is still an error. [D]
2. **Custom output templates:** earlier template exploration was superseded by **separator + attribution prefix** settings. [D]
3. **Text Fragment default:** earlier **ON** was explicitly reversed to **OFF** due to complicated/encoded URLs. This does not affect normal External links. [D]
4. **Text Fragment length:** earlier proposals of 40/80 and larger snippets gave way to **configurable, default 20 per end**. [D]
5. **URL aesthetics:** previously retaining Web Clipper URL verbatim was revised to **conservative, readable decoding default ON**; replacing `%20` universally with `+` was *rejected*. [D]
6. **Human-readable URLs vs Text Fragment:** independent toggles with explanatory Settings copy: **ON** and **OFF** respectively. [D]
7. **Round 18D was not finalized:** options about whitespace normalization, unusual content, and warning policy must **not** be described as approved in a later ADR. [U]

## 4. Possible future ADR backlog — not yet ADRs

**Priority 1 — draft only when an implementation-level choice becomes concrete**

- **ADR candidate: Snapshot consistency across CM6/mobile modal lifecycle.** Define captured fields, transaction revision, post-navigation behavior and failure behavior. Record measured resource costs and reproducible editor lifecycle tests. Origin: D03.
- **ADR candidate: Clipboard format authority and atomic/fallback semantics.** Define success criterion, clipboard write ordering per platform, semantic equivalence tests, and irreversible partial write limits. Origin: D04 + D14.
- **ADR candidate: Safe external link serialization.** Define canonical test vectors and semantic equivalence under path/query/fragment, Unicode, signed URLs, and Markdown destination escaping. Origin: D11.
- **ADR candidate: Anchor derivation and compatibility policy.** Explicit vs inferred provenance, exact Joplin/browser behavior found experimentally, supported versions and fallback. Origin: D07 + D13.

**Priority 2 — if a real conflict or expansion arises**

- CM6-only vs future editor support (D05); Text Fragment standard and browser interoperability (D12); extensible templates vs limited custom fields (D10); inline Markdown label policy (D09).

**Not recommended as standalone ADR right now:** defaults for breadcrumb depth, H1 display, button labeling, or warning frequency. These are clear product settings rather than hard-to-reverse architecture choices, unless implementation discovers a cross-cutting constraint.

## 5. Known gaps requiring answers or tests rather than fabricated rationale

1. **Joplin platform checks:** CM6 and mobile hook availability, minimum supported Joplin version, note/heading internal link behavior, `joplin://x-callback-url` heading support, and desktop/mobile clipboard APIs. [S][U]
2. **Selection capture:** atomicity of note metadata, body, and editor selection under concurrent edits; how to detect incomplete capture. [S][U]
3. **URL serialization:** examples with site-specific signed URLs, malformed encodings, existing fragments/directives; can the readable representation preserve exact semantics? [S][U]
4. **Text Fragment:** unanswered Round 18D details; overlap of start/end in short selections; CJK/emoji word/grapheme handling; existing `:~:` directives; how to cap excessively long output. [S][U]
5. **Clipboard:** reliable dual-format write, rich-paste interoperability, semantic comparator definition and rollback/partial-write behavior on each platform. [S][U]
6. **No-selection edge case:** SPEC treats whitespace-only selection as a provisional no-selection rule, not an interview-confirmed choice. [S][U]
7. **Reconstruction limitation:** not every past GrillMe round appears as a timestamped primary transcript here. Specific reasons not corroborated by the interview summary or current visible messages remain labeled unrecorded. [U]

## 6. Evidence and references

**Primary product evidence**

- `Quote-It-SPEC-2026-10-31.md` — normative expected behavior. Sections cited individually above; especially §§1–7, 9–10.
- Product interview decisions as preserved in the available conversation record; especially the final rounds regarding Text Fragment, `%20` vs `+`, safe URL decoding, and setting independence. This record is *not* an exported full transcript.

**Technical background — explanatory, not proof of what participants historically thought**

- Joplin Plugin API: https://joplinapp.org/api/references/plugin_api/
- Joplin CodeMirror 6 plugin tutorial: https://joplinapp.org/help/api/tutorials/cm6_plugin/
- RFC 3986, URI Generic Syntax: https://www.rfc-editor.org/rfc/rfc3986
- MDN Text Fragments: https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Fragment/Text_fragments
- MDN URLSearchParams: https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams
- Michael Nygard, *Documenting Architecture Decisions* (ADR concept): https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions

---

**Handoff rule:** An implementing agent should treat the SPEC as the requirements contract, this file as a *qualified history of choice and trade-off*, and future ADRs as independently reviewed engineering commitments. It should **not** present unrecorded motives or provisional choices as participant-approved historical facts.
