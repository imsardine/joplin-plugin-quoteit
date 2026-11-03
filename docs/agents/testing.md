# Testing guidance

Read this before implementing behavior, fixing bugs, or changing tests or test tooling. These rules supplement the product specification and apply to production and test changes.

## TDD execution and evidence

1. Identify the behavior and its public test boundary from the issue and `docs/spec.md`. The established boundaries are quotation source/options to Markdown output, and command capture/clipboard flow. Confirm a new boundary with the developer before writing tests there.
2. Work one behavior at a time: write a test, run it, and observe failure for the intended behavioral reason before implementing the smallest change that makes it pass. A missing import, build error, or unrelated failure does not establish the behavior's red state.
3. Run the relevant test file and typechecking during the work. Refactor after green while preserving behavior.
4. Before requesting review, map each implemented requirement and meaningful branch to a behavioral test or a stated verification limit. Run `npm test`; report unresolved failures and untested cases.

Report actual commands and outcomes. Distinguish test-first implementation from retrospective coverage: tests added after implementation and temporary mutation checks are useful, but do not retroactively establish TDD. Say checks passed only after observing their completion. Test counts alone do not establish adequate coverage.

For existing untested behavior, add explicit expected examples derived from the specification. Where useful, temporarily break the relevant behavior, confirm the tests fail for that reason, restore the original code, and rerun verification. Record this as a mutation check, not a test-first cycle. Separate unreachable dependency fallbacks and compiler-generated branches from supported behavior; avoid fabricating dependency output merely to inflate coverage.

## Test design and readability

- Author production code and tests in TypeScript. Source tests import source modules, not temporary compiler-output paths. Keep output-directory details in execution configuration.
- Give each case one behavioral purpose and a concrete name. Separate no selection, whitespace-only selection, and empty-title behavior. Separate code fences, language markers, quote nesting, and selection boundaries. A boundary test must include the document and offsets needed to establish the claim.
- Use `describe()` to group related cases, and keep related cases adjacent. Parameterize variants of the same behavior with independently reported case names. Cite the relevant specification section when unusual inputs need context.
- Use typed default fixtures with object spread and property overrides to hide irrelevant defaults. For quotation tests, `{ ...sourceDefaults, title, selection }` produces `source`; call `renderQuotation(source, options)` explicitly in the test. Keep fixture construction separate from calling the system under test and from its configuration.
- Type configuration fixtures as `QuoteConfig`. Use `source`, `selection`, and `options` consistently with production interfaces.
- Express multi-line input and expected output as one string-array entry per line, joined by the intended line ending. Use a local `prettier-ignore` when needed to preserve that layout. Keep literal code fences readable; avoid dense newline escapes or template literals requiring escaped backticks. Show tabs and other invisible characters explicitly when they are part of the behavior under test.
- Expected values come from worked examples or the specification, not an implementation-shaped computation. Assert observable output and failure behavior rather than private helper calls.

Use Prettier and ESLint through the package scripts. The formatter configuration is authoritative for indentation. Tools do not replace review of names, logical grouping, intent, or unnecessary defensive logic.

## Validation layers

| Layer | Target | What it establishes |
| --- | --- | --- |
| Source behavior tests | Public source-module interfaces | Formatting, capture validation, and error handling in controlled cases |
| Bundle integration tests | Freshly built `dist` main and content-script bundles with a simulated Joplin host | Delivery-code registration, module connections, and command-to-clipboard flow |
| Manual Joplin validation | Installed plugin in a real desktop or mobile runtime | Actual editor, host API, command access, clipboard and paste behavior on the tested platform |

The complete automated entry point is `npm test`: format check, lint, typecheck, source tests, production build, and bundle tests. Use `npm run test:unit` for the faster source loop and `npm run test:integration` for a fresh build plus bundle tests. Generated `api/` files and build outputs are outside handwritten code-style checks.

Record manual validation in developer documentation with app/OS versions, actions, observations, and remaining limits. A one-time computer-use check is manual validation, not repeatable automated test code. Source tests do not establish bundle correctness; simulated bundle tests do not establish real Joplin compatibility. Keep desktop and mobile evidence separate and preserve the shared beta release gates.

Developer acceptance is a separate step after agent checks and review. Leave changes uncommitted for personal testing until the developer explicitly accepts and authorizes staging or committing, as required by `AGENTS.md`.
