# Issue #3: Mobile quotation flow

## Scope and status (2026-11-04)

Implemented on `feature/issue-3-mobile-quotation`, based on `main` at `41ffb738d341b0753300eba14b3d35f883d61f79` after #2 was merged. The mobile command registers one Quote It Editor Toolbar button and an Internal/External/Cancel dialog. Internal uses the shared note-level Markdown quotation renderer and text clipboard writer. External is labelled `External (coming soon)` and reports that it is unavailable without writing to the clipboard; external quotation generation belongs to later work.

Capture reads CM6 once, retrieves metadata once for that captured note ID, and checks matching identities before opening the selector. Rendering uses that frozen source and the existing immutable output configuration after the user chooses Internal. As agreed in spec §2.2, note-level Internal needs the primary selected text and note identity, not a document/offset export for future heading analysis. Later edits, navigation and title changes do not replace the captured source. No live source is read after the selector opens.

Cancel and host dismissal do not write or show errors. Capture, selector and clipboard failures use an Error Toast. Mobile deliberately writes Markdown text only, without a format warning. Desktop keeps its existing Internal palette/shortcut/context-menu command and enabled condition; it does not gain the mobile dialog or toolbar button.

## API and access investigation

Checked the local API declarations and the following official references/source on 2026-11-04:

- [ToolbarButtonLocation](https://joplinapp.org/api/references/plugin_api/enums/toolbarbuttonlocation.html): `EditorToolbar` is available; `NoteToolbar` is desktop-only.
- [Editor Commands](https://joplinapp.org/help/dev/spec/editor_commands/): `editor.execCommand` dispatches shared CM6 commands in the mobile editor WebView.
- [Dialogs API](https://joplinapp.org/api/references/plugin_api/classes/joplinviewsdialogs.html): custom dialog creation, HTML, buttons, opening and Toast feedback.
- [Mobile PluginDialogWebView](https://github.com/laurent22/joplin/blob/dev/packages/app-mobile/components/plugins/dialogs/PluginDialogWebView.tsx): custom button responses are returned by ID.
- [WebviewController](https://github.com/laurent22/joplin/blob/dev/packages/lib/services/plugins/WebviewController.ts): closing or reopening a dialog can resolve its pending response with `null`; the adapter treats dismissal as Cancel.
- [Mobile toolbar command list](https://github.com/laurent22/joplin/blob/dev/packages/app-mobile/components/EditorToolbar/utils/allToolbarCommandNamesFromState.ts) includes plugin Editor Toolbar commands. [Toolbar selection](https://github.com/laurent22/joplin/blob/dev/packages/app-mobile/components/EditorToolbar/utils/selectedCommandNamesFromState.ts) respects the user's saved toolbar list; if Quote It is absent, enable it from toolbar settings. [Mobile Icon](https://github.com/laurent22/joplin/blob/dev/packages/app-mobile/components/Icon.tsx) accepts the `fas fa-quote-right` icon syntax.
- [Plugin installation](https://joplinapp.org/help/apps/plugins/#installing-a-plugin): Android supports `.jpl` installation through Plugins → Advanced settings → Install from file. The App Store iOS app accepts only recommended plugins, so this unpublished plugin cannot be assumed installable there. iOS validation needs a suitable development build or an approved distribution route; this is an access blocker, not a decision to remove iOS support.

These establish documented API contracts and source-level plausibility, not tested platform/version compatibility. Source links target upstream `dev`, not an empirically supported release. No new dependency or platform/minimum-version declaration was introduced. The existing manifest minimum `3.7` remains unverified for mobile and must not be advertised as an empirically established minimum.

## TDD evidence

The existing, already agreed boundaries from `docs/agents/testing.md` were used: command capture/clipboard flow, quotation source/options to Markdown output, and delivery bundles with a simulated Joplin host. No new private-helper test boundary was introduced.

| Slice | Red observed before implementation | Green observed |
| --- | --- | --- |
| Capture before mode selection and use original source after navigation/edits | Command-file test failed because the selector was never opened | Awaiting the selector after capture passed, preserving original quotation and title |
| Cancel preserves clipboard without feedback | Command-file test found quotation text instead of the seeded clipboard | Returning before rendering/writing passed |
| Unavailable External preserves clipboard and explains Internal alternative | Command-file test found an Internal quotation instead of the seeded clipboard | Explicit unavailable-mode error passed |
| Mobile toolbar and selector registration | `npm run test:integration` failed because no Editor Toolbar button was registered | Platform-specific command, toolbar and dialog registration passed |

The source loop used `npm run test:compile && node --test .test-build/tests/command.test.js`. `npm run typecheck` passed during implementation and after renaming the shared command function to `copyQuotation`. Integration checks rebuild production bundles before executing them.

Additional passing bundle cases were added after these implementations: frozen-source copying, empty selection, whitespace-only selection, Cancel, host dismissal, unavailable External, capture rejection, selector rejection, clipboard rejection, and desktop registration regression checks. These are retrospective regression coverage, not separate test-first cycles. The existing note-ID mismatch test now also checks that no selector opens; that is retrospective coverage of the inherited validation path.

Final automated run: `npm test` passed format checking, ESLint, TypeScript checking, **42 source tests**, production archive build, and **15 bundle tests**. `git diff --check` passed. No staging, commit, push, publication or issue closure was performed. Changes are left for developer testing and acceptance.

## Independent review

Applied the code-review skill against base `41ffb738d341b0753300eba14b3d35f883d61f79`, including the uncommitted working-tree diff and this validation document, using separate fresh-context reviewers:

- **Standards:** no actionable documented-standard violations or substantive code smells found.
- **Spec (at review time):** one acceptance evidence gap: real mobile execution and empirical version support were pending. No actionable code defects or scope creep found. Subsequent developer runtime results are recorded below.

No code changed between the original full automated run and that review. Subsequent review-driven changes and validation are recorded below. The original review does not complete the real-mobile acceptance criterion below.

In the subsequent Hunk review, the developer confirmed that capturing the snapshot before the mode dialog appears matches the expected interaction, then requested the suggested responsibility/naming refactor.

## Hunk follow-up: command responsibility refactor

`runQuoteCommand` now coordinates snapshot capture, optional mode selection and error reporting. Its Cancel branch returns before calling `copyQuotation`. The private `copyQuotation` step receives the captured source, output options and clipboard writer explicitly, and only renders and writes the quotation. Both desktop and mobile commands call `runQuoteCommand`; no command-to-command dispatch or second capture was added.

This is a behavior-preserving refactor, not a new test-first feature. The existing command capture/clipboard boundary remains the public test boundary, renamed from `copyQuotation` to `runQuoteCommand`. No private helper mocks or call-count tests were added. Before and after the refactor, `npm run test:compile && node --test .test-build/tests/command.test.js` passed all **13 command tests**, and `npm run typecheck` passed.

Post-refactor `npm test` passed formatting, lint, typechecking, **42 source tests**, the production archive build and **15 bundle tests**. `git diff --check` passed. The Cancel branch's position before `copyQuotation` was also inspected directly; observable Cancel behavior remains covered at the command and bundle boundaries.

Independent fresh-context review of the refactor found **0 Standards findings** and **0 Spec findings**. Hunk was reloaded and the original Cancel thread was updated to point out the implemented responsibility split. No code changed after the full automated run.

After the refactor build was supplied, the developer confirmed that it had been retested successfully and that there were no remaining concerns. This completes the developer's functional acceptance of the current implementation. The previously reported test environment is Pixel 7 Pro, Android 17, Joplin 3.7.11. Runtime fault injection remains skipped as agreed; this acceptance does not establish support on earlier versions or iOS. After commit preparation, the developer explicitly authorized committing, pushing, creating a PR and merging it. Plugin publication and issue closure remain outside that authorization.

## Requirement and verification map

| Requirement / branch | Automated evidence | Runtime limit |
| --- | --- | --- |
| One mobile toolbar button and Internal/External selector | Bundle registration case checks command label, icon, Editor Toolbar location, choices, and absence of desktop context menu | Developer reports toolbar, selector, keyboard and customization checks passed; screen-reader access untested |
| Capture completes before selector and survives note/selection/title changes | Command case mutates original host objects; bundle case changes live note/selection after both capture reads and verifies original output and one read per source | Developer reports race check passed; exact mechanism not recorded |
| Internal selected quotation | Shared quotation source tests and mobile bundle copy case | Developer reports Joplin paste and source-note navigation passed |
| Empty / whitespace-only selection gives only a link | Separate mobile bundle cases, existing renderer cases | Developer reports both cases passed |
| Markdown-only without format warning | Mobile bundle success cases expose only text clipboard write and require no Toast | Developer reports core clipboard flow passed; cross-app paste untested |
| Cancel / dismissed dialog preserves clipboard | Source Cancel test seeds clipboard; separate bundle Cancel/null cases require no writes/errors | Developer reports passed; dismissal method not specified |
| Unavailable External preserves clipboard | Source and bundle cases require no write and actionable feedback | Developer reports feedback and clipboard preservation passed |
| Invalid source aborts before selector/write | Existing source identity-mismatch test; bundle editor-rejection case | Runtime failure injection skipped at developer request |
| Metadata failure / selector failure / clipboard failure | Source metadata-rejection case; bundle selector/clipboard-rejection cases | Runtime failure injection skipped at developer request |
| Desktop access retained | Bundle enabled-condition, command label, context-menu and clipboard cases | No new desktop runtime test; #2's desktop evidence remains separate |

## Real runtime acceptance: developer-reported core checks passed

The developer reports that all manual rows except deliberate host failure injection were tested and passed on **Pixel 7 Pro, Android 17, Joplin 3.7.11**. These are user-reported runtime results, not agent-observed execution. Joplin **3.7.11 is a tested Android version**, not an established minimum; earlier releases and iOS remain untested. The precise method used for the note-switch/edit race was not recorded. No Android device/emulator or iOS simulator was available through the agent's inspected local SDK paths, and no agent-operated mobile runtime tests were performed. The Android core flow now has runtime evidence; remaining platform and release gates are not implied complete.

The developer also confirmed the keyboard/toolbar checks passed and explicitly asked to skip deliberate host failure injection. That row remains **skipped, not passed**. Failure injection requires host debugging and is not an ordinary user operation; existing automated rejection tests do not replace this runtime check. This documentation update records the developer's results; no code or tests changed, so the automated suite was not rerun.

Use `publish/joplin.plugin.quoteit.jpl` from the final build for developer acceptance on Android. Install from file, restart as required by the host, and record Joplin version, OS/version and device before testing. Use a development-capable build for iOS because of the installation restriction above.

| Manual action | Expected observation | Result |
| --- | --- | --- |
| Open a CM6 Markdown note, select one paragraph, tap Quote It | One toolbar entry opens the selector; Internal copies exactly that paragraph plus blank quote separator and note attribution | Passed (developer-reported) |
| Paste in another Joplin note, preview and follow attribution | Valid Markdown quotation; link navigates to source note | Passed (developer-reported) |
| Collapse selection; repeat with whitespace-only selection | Only note link, no quote prefix or warning | Passed (developer-reported) |
| Seed clipboard with known text; open selector; Cancel, then repeat using Android Back/dismissal | Prior clipboard preserved; no failure or success notice | Passed (developer-reported; dismissal method not specified) |
| Change source selection/body/title or navigate while selector is outstanding, where host permits (otherwise use debug facilities); then choose Internal | Original captured source is copied; document whether ordinary modal UI prevents the race | Passed (developer-reported; exact race mechanism not recorded) |
| Choose External | Unavailable-mode feedback, prior clipboard preserved | Passed (developer-reported) |
| With a host debugger, deliberately make editor capture, metadata retrieval, selector opening or clipboard writing reject; seed clipboard before each pre-write failure | Actionable error, no success indication; pre-write failures preserve clipboard | Skipped at developer request; automated failure cases pass, runtime fault injection untested |
| Open the keyboard and invoke Quote It; dismiss keyboard and return to editing; use toolbar settings to hide and re-add Quote It, then invoke it again | Button/selector remain usable through normal editing; after re-adding the button it can copy Internal successfully | Passed (developer-reported) |

Proposed screenshots, **pending real runtime capture**: the mobile toolbar with Quote It visible, the mode selector, and the pasted Internal quotation in another note. Add under `docs/screenshots/` and link beside the README mobile workflow once verified. No synthetic screenshots or nonexistent image links were added.
