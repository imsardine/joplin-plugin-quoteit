# Quote It contributor guidance

## Product and platform

Read `docs/spec.md` before planning or implementing Quote It behavior. Understand the user problem and concrete use cases from the specification and the developer's explanations; ask when those are unclear.

Support both desktop and mobile. Check API availability, dependencies, and user access on both as features evolve. Record actual runtime tests: a successful build alone does not establish compatibility. Discuss changes to supported platforms with the developer.

## Plugin identity

Keep these identities distinct:

- `package.json` → `name`: npm package identity; retain the `joplin-plugin-` prefix and the `joplin-plugin` keyword for Joplin's automatic repository inclusion.
- `src/manifest.json` → `id`: Joplin plugin identity. Its `joplin.plugin.` prefix is a project convention. After distribution, changing the ID also changes the plugin's identity and data location; discuss any migration with the developer.
- `src/manifest.json` → `name`: user-facing display name.

## User documentation

Keep the README focused on users: explain the problem, useful scenarios, operation, and limitations as features evolve. Describe implemented behavior accurately, and put implementation details in developer documentation. Use the known motivation and examples; ask the developer when they are missing.

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
