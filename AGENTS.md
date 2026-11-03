# Quote It contributor guidance

## Product and platform

Read `docs/spec.md` before planning or implementing Quote It behavior. Understand the user problem and concrete use cases from the specification and the developer's explanations; ask when those are unclear.

Support both desktop and mobile. Check API availability, dependencies, and user access on both as features evolve. Record actual runtime tests: a successful build alone does not establish compatibility. Discuss changes to supported platforms with the developer.

## Plugin identity

Keep these identities distinct:

- `package.json` → `name`: npm package identity; retain the `joplin-plugin-` prefix and the `joplin-plugin` keyword for Joplin's automatic repository inclusion.
- `src/manifest.json` → `id`: Joplin plugin identity. Its `joplin.plugin.` prefix is a project convention. After distribution, changing the ID also changes the plugin's identity and data location; discuss any migration with the developer.
- `src/manifest.json` → `name`: user-facing display name.

## Code readability

Prioritize code that readers can understand over brevity. Each step should express one clear intent; split chained operations with different purposes using named intermediate variables. Explain the purpose of regular expressions and their non-obvious special cases. Before requesting review, check that names and structure reveal the processing flow; rewrite expressions that require character-by-character decoding to understand. Use blank lines to separate logical phases, including final result assembly from the return statement. Comments should explain intent or non-obvious constraints rather than restate the code. Apply this standard to production code and tests alike.

## Implementation, tests, and acceptance

Before implementing behavior, fixing a bug, or changing tests or test tooling, read `docs/agents/testing.md`. Follow its TDD evidence, test design, and validation requirements before requesting review.

Use consistent names for the same domain concepts across production interfaces, fixtures, and assertions. Shape data structures around each module’s responsibility; pass dependencies and configuration explicitly where they affect behavior. Add defensive branches for established failure conditions, verifying dependency contracts before introducing fallbacks.

After implementation and review, leave changes available for the developer's own testing. Stage or commit agent changes only after explicit developer acceptance and authorization to stage or commit; a request to implement, automated checks, agent runtime tests, or a skill's automatic-commit instruction does not replace that acceptance. Preserve any existing staging state. Push, publication, and issue closure require their own authorization.

## User documentation

The README describes the intended end-user product: its motivation, representative scenarios, expected workflows, and enduring limitations. Preserve the existing product narrative and examples when implementing individual issues; make targeted edits rather than replacing it with the currently implemented subset. During development, use one brief status notice to distinguish the intended experience from current availability. Keep issue-level progress, temporary implementation limitations, build details, and validation results in developer documentation under `docs/`. Update product expectations when the agreed product scope changes, not merely when another implementation step completes. Ask the developer when motivation or examples are missing.

Suggest screenshots when a workflow would benefit from them, including what to capture and where it belongs. Use real screenshots of implemented behavior and mark proposed captures as pending.

## Publication review

When publication is requested, review the following with the developer as needed:

- The English description and display name convey the plugin's purpose and useful search terms.
- The README covers user value, representative use cases, actual operation, limitations, and helpful screenshots. Screenshot files or URLs exist, show current behavior, and have useful labels.
- Categories, screenshots, and other metadata meet the current [manifest reference](https://joplinapp.org/help/api/references/plugin_manifest/) and website requirements.
- Package name, plugin ID, version, platforms, minimum versions, and repository and homepage URLs are deliberate and consistent. The npm name prefix and keyword satisfy the [official publishing requirements](https://github.com/laurent22/joplin/blob/dev/packages/generator-joplin/generators/app/templates/GENERATOR_DOC.md#publishing-the-plugin).

## Agent skills

Configuration for the engineering skills: where to track work, how to classify issues, and where to find domain documentation.

### Issue tracker

GitHub Issues tracks work in `imsardine/joplin-plugin-quoteit`. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the five standard triage labels. See `docs/agents/triage-labels.md`.

### Domain docs

This is a single-context project. See `docs/agents/domain.md`.
