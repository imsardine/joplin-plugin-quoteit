# Issue #2 validation

## Hunk correction: preserve independent code spans (2026-11-03)

The developer rejected merging adjacent inline code contents: the original spans must remain independent, with a separating space if needed after link flattening. This supersedes the merging implementation and expectations recorded below. Updated spec §3.4 to record the accepted rule.

Changed the two source-to-Markdown examples to expect independent spans:

```markdown
[`a` `b`](:/…)
[``a`b`` `c`](:/…)
```

Ran `npm run test:compile` followed by `node --test --test-name-pattern='adjacent inline code|backtick-containing inline code' .test-build/tests/quotation.test.js`: both failed against the merging implementation for the intended output differences. Removed code-token merging and inserted a space only between directly adjacent code tokens during serialization; rerunning the same commands passed both cases. Each span retains its own contents and safe delimiter.

The developer also approved fail-fast handling of unknown attribution tokens. The serializer now throws an error containing the unsupported token type instead of escaping its possibly empty content. The existing command error handler reports generation failures before the clipboard write. No supported parser output currently reaches this branch; no fabricated parser output was added to test it. The two `lines.length` checks remain unchanged pending the separate discussion.

Validation: `npm test` passed formatting, lint and typechecking, then reported **53 source tests passed, 1 failed** (the previously requested emphasis reproduction, still unfixed); it did not proceed to integration. Separately ran `npm run test:integration`: production build and all **5 bundle tests passed** against the current code. `git diff --check` passed. No new real desktop/mobile runtime checks, staging or commits.

## Hunk review follow-up (2026-11-03)

The developer requested a regression test confirming punctuation-adjacent emphasis loss, a TDD fix for adjacent inline code, and removal of the redundant `inline.children` fallback. Fail-fast handling of unknown tokens and removal of the two `lines.length` checks remain discussion proposals; neither was changed.

- **Adjacent inline code (spec §3.4):** added a source-to-Markdown test for title `` `a`[`b`](https://example.com) `` expecting one code span containing `ab`. `npm run test:unit` first failed on the actual output containing two extra backticks. After merging adjacent code-token contents before choosing their delimiter, the same command passed all 52 source tests and `npm run typecheck` passed. A subsequent case checks that joined content containing a literal backtick gets a safe delimiter; this is retrospective coverage, not another test-first cycle. An initial version of that extra fixture unintentionally included a significant trailing space; corrected the fixture rather than changing production whitespace handling.
- **Parser-contract cleanup:** removed `inline.children || []` in favor of `inline.children`. No artificial dependency output was introduced to exercise an unreachable fallback. After this cleanup and the extra code-span case, `npm test` passed formatting, lint, typechecking, 53 source tests, production build, and 5 bundle tests.
- **Emphasis reproduction only (spec §3.4):** added a test for `[a](https://example.com)*!b*`. It parses the resulting Markdown to check retained emphasis, because merely asserting delimiter text would miss this failure. The expected label is `a` followed by emphasized `!b`; the actual label is literal `a*!b*`. No emphasis fix was requested in this review reply, so this test remains active and failing. The final `npm test` passes format, lint and typechecking, then reports **53 source tests passed, 1 failed** and stops before integration. The preceding successful bundle run covers the same production code; only the reproduction test was added afterward.

`git diff --check` passed. No new real Joplin desktop or mobile runtime validation was performed. These changes remain unstaged and uncommitted for developer testing. The failing emphasis test is an explicit unresolved review item, not a successful complete-suite result.

## UI-only command scope decision (2026-11-03)

The developer rejected guarding programmatic calls that bypass the command's UI condition. Removed the TinyMCE boolean-result branch and its two simulated host-result cases, along with the unused boolean replay/collection-response fixture plumbing. The desktop `enabledCondition` is now the supported entry gate. Direct programmatic invocation in an unsupported editor is outside this flow; no fallback is promised for it. This supersedes the retained-boolean-guard decision recorded in the earlier review sections below.

This is removal of an unwanted behavior, not a new test-first feature. `npm test` passed formatting, lint, typechecking, 51 source tests, production build, and 5 bundle tests; `git diff --check` passed. Clipboard-write rejection still has an Error Toast/no-modal bundle test. The enabled-condition registration tests verify desktop configuration and its omission on mobile, not real host UI evaluation.

**Manual acceptance for the current build:** reload the development plugin; confirm the command cannot be invoked from the palette/context menu in Rich Text or viewer-only layout; return to the Markdown editing pane and verify selected quotation and link-only output. These current UI checks remain pending. Do not use unsupported-editor invocation to test Toast now: that operation should be unavailable. The earlier successful Rich Text Toast/clipboard test describes the previous build only. Real clipboard-write failure has no deterministic manual trigger supplied by the product; controlled failure reporting remains covered by bundle tests.

## Desktop command availability review (2026-11-03)

Added desktop-only command `enabledCondition` using the actual desktop context keys, following the neighboring Paste It implementation and [Joplin's command API](https://joplinapp.org/api/references/plugin_api/interfaces/command.html#enabledcondition). The condition requires `markdownEditorPaneVisible`, `oneNoteSelected`, `noteIsMarkdown`, and either no modal or the Command Palette (`gotoAnythingVisible`). Copying does not modify the source, so it deliberately does not require `!noteIsReadOnly`. `versionInfo().platform` prevents applying desktop-only variables to mobile. This replaces the earlier choice to leave the command unconditionally available after the unsuitable `editorType == markdown` condition failed.

The desktop registration test first failed because the condition was absent. After implementation, `npm test` passed format, lint, typechecking, 51 source tests, build, and 7 bundle tests. The mobile registration fixture verifies no desktop condition is supplied; this does not establish a working mobile UX. The established boolean-result handling at the host boundary remains in place.

**New runtime check pending:** reload the current development build, verify Internal is available in CM6's palette/context menu and unavailable in Rich Text or a viewer-only layout, then confirm selected/link-only copies still work. Earlier DEV clipboard/Toast tests below predate this enabled-condition change. The current computer-use view did not provide a usable DEV window for completing this new check; no runtime success is claimed for it.

## Desktop DEV runtime retest (2026-11-03)

Manual validation through the Joplin UI on macOS 26.5.2. The visible window identified the DEV profile at `~/.config/joplindev-desktop`; the installed application metadata identifies Joplin 3.7.21. Used notebook `test` and the source note `你好`. This is runtime evidence for these actions on this desktop environment, not a repeatable automated test or a minimum-version/mobile compatibility claim.

| Action | Observed result |
| --- | --- |
| Seed the clipboard with `quoteit-clipboard-check-20261103`, invoke Internal from the palette in Rich Text | Error Toast instructed use of the CodeMirror 6 Markdown editor; no modal or internal `trim` error |
| Reopen the palette and paste the clipboard without executing its contents | The seeded text remained present after the failed copy |
| Switch to Markdown, select the first line of the source, invoke Internal | Pasting into a separate DEV note produced the selected Markdown as a blockquote, a blank quoted separator, and linked attribution; preview displayed the quotation and attribution |
| Collapse the source selection and invoke Internal again | Clipboard contained only `[你好](:/7cce10ef63e84194a72aabdbf3796d08)` |

Kept the pasted quotation in `Quote It runtime check 2026-11-03` in the DEV notebook for developer inspection. Left the DEV window in Markdown mode on that result note; the clipboard contains the link-only result. No text was typed into the source note. The automatic title of an initially empty result note was replaced with the explicit test title.

These observations confirm the new Toast, clipboard preservation for the tested Rich Text failure, CM6 command registration, and selected/link-only copying after switching editors. Actual assigned-keyboard-shortcut invocation, other operating systems, Mobile, and other unavailable-command outcomes remain untested. No production code changed during this retest; no automated tests were rerun for this documentation-only update.

## Rich Text failure follow-up (2026-11-03)

The developer tested the command in Rich Text and supplied a screenshot of an Error Toast containing `Cannot read properties of undefined (reading 'trim')`. This establishes that the failing operation reached Toast reporting, not that unsupported-editor handling was correct. The developer's test used a development profile; the screenshot did not independently establish app/OS versions or clipboard preservation.

Read-only inspection of the installed `/Applications/Joplin.app/Contents/Resources/app.asar` identifies Joplin 3.7.21. In `gui/NoteEditor/NoteBody/TinyMCE/TinyMCE.js`, the wrapper's `execCommand` calls TinyMCE for `editor.execCommand` and returns `true`; without its editor it returns `false`. `gui/NoteEditor/utils/useWindowCommandHandler.js` returns the wrapper result. These booleans are command-handling results, not our CM6 callback's `{ noteId, selection }`. The plugin previously trusted them as snapshots and continued with an undefined note ID.

The delivery-bundle regression fixture replays this boolean result and a notes-collection response for a missing note ID. Before the fix, `npm run test:integration` reproduced the screenshot's exact `reading 'trim'` error. The collection response is a controlled host fixture, not a captured response from the developer's runtime. The verified wrapper contract and matching symptom identify the host result/snapshot mismatch; no personal note contents were logged.

`src/index.ts` now rejects boolean results at the host boundary before metadata retrieval, with `Open the source note in the CodeMirror 6 Markdown editor and retry.` The existing command error handler displays this as an Error Toast. This is supported by the inspected host contract, unlike the earlier speculative empty-result branch. Snapshot/quotation modules retain their existing typed contracts and no empty-result fallback was restored.

The original `true` regression was observed red before implementation and green afterward. An additional `false` case covers the installed wrapper's no-editor result retrospectively. Both assert an actionable Toast, no modal, no metadata request, and no clipboard write; existing CM6 delivery tests still pass. Final `npm test` passed format, lint, typechecking, 51 source tests, production build, and 5 delivery-bundle tests. `git diff --check` passed. No temporary diagnostic logging remains, and no staging/commit actions were performed.

The Desktop DEV runtime retest above now confirms the instruction Toast, clipboard preservation, and selected/link-only CM6 copying after switching editors. Mobile and unavailable-command outcomes other than the tested Rich Text path remain unverified.

## Current review outcome (2026-11-02)

The current implementation uses one editor capture and one metadata read, checks matching note IDs, and copies Markdown with note-level attribution. These developer decisions supersede older race-abort and range-validation descriptions below. Fixtures use typed defaults with object spread. Error reporting uses an Error Toast.

Follow-up fixes preserve literal entity text in labels and emphasis after flattening links. Labels serialize emphasis with asterisks and merge adjacent spans of the same formatting to prevent delimiter collisions; quotation body Markdown remains untouched. Entity, link-adjacency, and mixed-delimiter regressions each failed for the intended output difference before their fixes. Additional strong/flattened-span cases extend that coverage retrospectively. The later review removed redundant HTML-rendering assertions: these cases assert the public Markdown output directly, without retesting MarkdownIt rendering. Fresh-context Standards review subsequently identified the missing-result branch as an unverified defensive assumption. Removed that branch and its injected-undefined test; capture now follows the declared EditorSnapshot contract. Rejections still reach the existing command error handler before clipboard writes. Removing this speculative behavior is not a new test-first behavior cycle.

| Issue #2 requirement | Current evidence |
| --- | --- |
| Blockquote, separator, attribution; link-only whitespace/empty selection; Untitled | Quotation source tests and delivery-bundle tests |
| Primary selection and captured source identity | CM6 source test, command identity-mismatch/frozen-source tests, simulated bundle command bridge |
| Selection Markdown fidelity and outer blank lines | Quotation tests for incomplete Markdown, paragraphs, nesting, code, whitespace, and line endings |
| Failure before writing and clipboard rejection feedback | Command host-failure tests and delivery-bundle Error Toast/no-modal case |
| Desktop palette/context menu/shortcut configuration | Earlier Desktop 3.7.21 runtime record below; bundle registration assertions cover current delivery wiring |

No new runtime success is claimed for the latest build. Real CM6 initialization, Toast appearance, unsupported-editor dispatch, shortcut invocation, mobile compatibility, and minimum supported versions remain pending where noted below. Standards and Spec agent review found fixture-guidance drift, a misleading boolean expression, and link-adjacency formatting loss; all were corrected, and focused re-review reported no remaining findings. Final `npm test` passed formatting, lint, typechecking, 51 source tests, production archive build, and 3 bundle tests. `git diff --check` passed. Changes remain unstaged/uncommitted relative to the pre-existing index pending developer acceptance; the agent did not modify staging state or close the issue.

Automated: Node tests cover quotation formatting, empty titles/selections, inline label formatting, preservation of partial Markdown/code/nesting, frozen capture, editor inconsistency and clipboard failure. Typechecking and plugin archive build pass.

Runtime (2026-11-01): Joplin Desktop 3.7.21 on macOS 26.5.2, development plugin loaded from this checkout and restarted. Verified Internal command appears in Command Palette; selected two-paragraph passage pasted as quotation with blank quoted separator and source attribution pointing to the test note. Verified general-text editor context menu entry; invoking it with an empty selection pasted only `[Quote It integration test](:/4a82b98db7d04a44b71a9949c23c6536)`. Keyboard Shortcuts lists a Change shortcut control for Quote It: Internal (no shortcut assigned during test). Test note retained in Playground.

The initial `editorType == markdown` enabled condition hid the command on this runtime; removed it and verified the command after restart. Capture failures reach the command's error handler, but the host's behavior for unsupported editors has not been established. Rich Text, actual shortcut invocation, mobile, other OSes, and cross-application paste remain untested. Mobile not tested; mobile workflow is outside issue #2 and remains a shared beta release gate. The manifest's existing minimum version and platform declarations have not been empirically certified.

Desktop procedure: load this project as a development plugin, restart Joplin, select a passage in a disposable CM6 Markdown note, run Quote It: Internal from palette and context menu, paste and verify the note link. Check the shortcut settings entry, empty selection, whitespace selection, Untitled title and unsupported Rich Text behavior. Record Joplin/OS versions and observed output. Do not infer runtime success from the build.

API reference: https://joplinapp.org/help/api/tutorials/cm6_plugin/ (content script registration and editor command bridge).

## Pending editor-command failure contract verification

**Unverified assumption:** `joplin.commands.execute('editor.execCommand', { name: 'quoteItSnapshot' })` may resolve without a value when no usable editor command is available. It may instead reject, or behave differently across editor types and app versions. No observed runtime result currently establishes which occurs. A missing return value does not establish that the Markdown editor is closed. The local `readEditor` type promises `EditorSnapshot`; capture now follows that contract without a speculative missing-value fallback. Runtime verification is still needed to establish unavailable-command behavior at the host boundary.

The content script's registered callback returns a snapshot on its normal path. Its early return during setup only skips registration; it does not specify how Joplin executes a missing command. The local API declaration (`api/JoplinCommands.d.ts`) permits `Promise<any | void>` but does not document the meaning of `void` for this command.

**Where to verify:** the real Joplin host boundary in `src/index.ts`, around the `editor.execCommand` call, using temporary development instrumentation that records resolution versus rejection without logging note content. Test Desktop first; repeat on Mobile when its command workflow is implemented. A simulated host cannot establish this contract.

| Runtime scenario | Evidence to record (all pending) |
| --- | --- |
| Open CM6 Markdown note | Capture command registration and a resolved snapshot |
| Open Rich Text editor | Whether the command is reachable; if invoked, resolution value/type or rejection type/message |
| No active note/editor, where the UI permits it | Command reachability and resolution or rejection |
| CM6 with a deliberately unregistered capture-command name | Actual missing-command behavior, independently of editor type |
| Switch note/editor after the first capture | The original captured source is used without rereading; metadata is requested for its ID |

Record Joplin and OS versions, actions, command availability, and the exact failure outcome. Before each failure test, seed the clipboard with known text and verify it remains unchanged, with no success indication. If an operation remains pending, record that rather than classifying it as a missing value.

**Current automated limits:** source tests exercise a rejected editor read and metadata failure; these establish controlled error handling, not the host conditions that trigger rejection. The earlier injected-undefined case and dedicated fallback branch were removed after fresh-context review because that result contract was unverified. The bundle tests simulate successful editor-command dispatch and clipboard failure, not missing-command behavior. After runtime verification, make the adapter's result/error contract explicit, align its types and test names, and use a CM6-specific message only when editor support has actually been determined. The initial entry recorded a documentation-only follow-up. The later fresh-context review removed production code and its speculative test; the full automated checks then passed as recorded in the current review outcome. No new runtime validation was performed.

## Test execution setup

Tests are TypeScript and import source modules via `../src/...`. The shared `tsconfig.json` includes source and tests so `npm run typecheck` checks both. `npm test` overrides the output location on the compiler command line, compiles both trees together, and runs Node's built-in test runner on the generated tests. Relative imports stay valid in the generated tree; behavioral tests do not name `.test-build/`. That ignored directory remains disposable compiler output, separate from Webpack's `dist/` bundles. There is no separate test tsconfig or added runner dependency.

This migration preserves the existing Node test runner requirement; the repository does not yet declare a minimum development Node version. Execution was verified on Node 24.14.0; this is a tested version, not a newly established minimum. Test setup changes do not alter plugin runtime behavior or extend platform compatibility claims.

## Source and delivery artifact coverage

All tests are authored in TypeScript. `npm test` runs typechecking, source behavior tests, then a fresh production build followed by bundle integration tests. `npm run test:unit` provides the faster source-level loop; `npm run test:integration` rebuilds the delivery artifacts before testing them.

The three tests in `tests/integration/bundle.test.ts` execute `dist/index.js` in an isolated VM with a simulated Joplin host. They load the content script at the path registered by the actual main bundle and invoke the actual registered command. Assertions cover command label, context-menu registration, CM6 command bridging, Markdown quotation and link-only output, and clipboard failure reporting. No source implementation is imported into these tests. This checks the JavaScript delivered by the normal archive build; it does not load the archive through Joplin or establish real CM6/clipboard compatibility. The earlier desktop runtime record remains separate.

Validation after this change: 12 source behavior tests and 3 bundle integration tests pass, including typechecking and the production archive build.

## Automated code style checks

The import-block spacing rule requires a blank line after the final import while allowing adjacent imports. Verification on 2026-11-02: enabling the rule made `npm run lint` fail on five missing separators; `npm run lint -- --fix` inserted them and passed. The rule uses ESLint's existing core `padding-line-between-statements`, deprecated but available in the installed ESLint 10; migration is required before ESLint 11.

`npm run format` formats handwritten TypeScript and the style-tool configuration with Prettier. `npm run format:check` checks formatting without edits. `npm run lint` runs ESLint's JavaScript/TypeScript recommended rules plus required control-flow braces, `no-var`, `prefer-const`, and unused-variable checks. Parameters intentionally unused by a host callback start with `_`. TypeScript handles undefined names; explicit `any` remains allowed at existing untyped host/parser boundaries.

`npm test` starts with format and lint checks before typechecking, behavior tests, and bundle tests. Generated Joplin API files and build outputs are excluded. Formatting tools cannot establish meaningful names, clear intent, or adequate explanations of complex expressions; those remain review requirements in AGENTS.md.

The style tools require development Node `^20.19.0 || ^22.13.0 || >=24` (ESLint 10 engine requirement); the full checks were run on Node 24.14.0. This requirement applies to development commands, not the Joplin plugin runtime. TypeScript `import = require()` is allowed for the current CommonJS configuration; bare `require()` imports remain disallowed.

## First-capture policy review (2026-11-02)

The developer selected first-capture behavior: read the editor once and retrieve metadata once using its captured note ID. Retain the editor/note ID match and validation of range/text within that captured body. Remove repeated editor/metadata reads and rejection based on later changes. This supersedes earlier consistency/race-abort descriptions and mutation-audit expectations below; spec §2.2 records the updated policy. The original issue #2 wording has not been edited remotely.

The new command-boundary test offers different values on subsequent reads, expects the first source quotation with no error, and checks one read per source. `npm run test:unit` failed that case before implementation because the old change detection prevented copying. Replaced obsolete temporal-change rejection cases; retained identity mismatch, invalid captured range/text, and host failure cases. After implementation, `npm test` passed all format, lint, typecheck, build, 54 source tests and 3 bundle tests; `git diff --check` passed. No real desktop or mobile runtime validation was performed for this policy change.

## Existing-logic coverage audit (2026-11-02)

Review follow-up: removed the local note-ID format regex. Note IDs are supplied by the host; capture still verifies matching identities between the captured editor and its note metadata and reports data API failures. Replaced the invalid-format rejection case with a command-boundary case that does not impose an ID format (a test fixture, not a claim that Joplin creates such IDs). `npm run test:unit` first failed that case because no clipboard write occurred; removing the regex made the full `npm test` pass with 59 source tests and 3 bundle tests. No new Joplin runtime validation was performed for this change.

The suite now contains 54 source behavior tests and 3 delivery-bundle integration tests. Additional source cases cover emphasis variants, strikethrough, image alt text (including empty alt), title line breaks and literal HTML, title trimming/fallback, custom attribution prefix, preserved whitespace, invalid stable ranges, note identity/source URL changes, disappearing editors, non-Error failures and unsupported editor adapters.

V8 execution coverage was inspected on the compiled source tests. Remaining unexecuted handwritten branches are the missing-inline-children fallback and unknown-token default in label rendering; no synthetic parser tokens were injected to manufacture coverage. Compiler-generated async helpers also contain unexecuted paths. This audit is not a claim of complete branch or condition coverage, nor a substitute for Joplin runtime testing.

Temporary mutation checks confirmed that removing metadata consistency checks causes 4 failures; removing stable range/text validation causes 6; removing inline formatting causes 6; ignoring the supplied attribution prefix causes 1. All mutations were restored before the final full format/lint/typecheck/build/test run, which passed. These are retrospective coverage checks, not evidence that the original implementation followed TDD.

## Minimal editor snapshot review (2026-11-02)

The current note-level Internal workflow needs only the editor note ID and selected text. TypeScript Language Service reference lookup confirmed that the exported body/from/to fields were used only by duplicate snapshot validation. Removed these fields from EditorSnapshot and content-script output, plus the range and selection-reconstruction checks. CM6 still supplies the primary range inside the adapter for sliceString; heading analysis can introduce document/offset data when it needs it. Retained editor/note identity verification and host-error handling. This supersedes the captured-range validation policy described above.

A command-boundary test for copying adapter-supplied selection failed before the change because the duplicate check prevented writing. Removed six obsolete invalid-range/text fixture cases. No new desktop/mobile runtime validation was performed.

## CM6 registration guard review (2026-11-02)

Replaced the speculative editor/noteIdFacet existence guard with the documented `control.cm6` check from [Joplin’s CM6 tutorial](https://joplinapp.org/help/api/tutorials/cm6_plugin/#make-the-codemirror-6-content-script-only-load-in-codemirror-6). The purpose is specifically to avoid registering a CM6-only command on a non-CM6 wrapper, not to detect an empty current note. Once in CM6, use the CodeMirrorControl API contract directly. Replaced three artificial missing-property cases with a missing-CM6-marker case; it failed before the implementation because the old guard registered the command. Updated source and bundle host fixtures to expose the CM6 marker. Real desktop/mobile initialization and unavailable-command dispatch remain unverified for this change.

## Error Toast review (2026-11-02)

Replaced the modal showMessageBox error reporter with showToast({ message, type: ToastType.Error }), matching the requested nonmodal feedback. The method and ToastType.Error exist in the local API declarations and the [official dialogs reference](https://joplinapp.org/api/references/plugin_api/classes/joplinviewsdialogs.html#showtoast); the reference does not mark showToast desktop-only. This establishes API availability in the documented surface, not tested desktop/mobile compatibility or a minimum version.

The delivery-bundle clipboard-failure case now separately records modal calls and Toast messages, requires Error severity, and asserts no modal was opened. `npm run test:integration` first failed because the old implementation opened a modal. Real Toast appearance, duration, and desktop/mobile receiving behavior remain untested.
