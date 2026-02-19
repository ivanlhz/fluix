# Contributing to Fluix

Thanks for your interest in contributing.

Fluix is a cross-framework UI library. We prioritize:
- Logic in `@fluix/core`
- Thin adapters (`@fluix/react`, `@fluix/vue`, `@fluix/svelte`, `@fluix/solid`, `@fluix/vanilla`)
- Data-attribute DOM contract

## Quick Start

1. Fork and clone the repo.
2. Install dependencies:

```bash
pnpm install
```

3. Run checks locally:

```bash
pnpm build
pnpm test
pnpm lint
pnpm -r run typecheck
```

## Development Rules

- Keep behavior logic in `packages/core`.
- Adapters should mostly map state to framework rendering/lifecycle.
- Avoid broad refactors unrelated to your change.
- Add or update tests for non-trivial behavior changes.

## Pull Request Process

1. Open a PR with a clear description of:
   - what changed
   - why it changed
   - how it was tested
2. Keep PRs focused and small when possible.
3. Link related issues if applicable.

## Commit Style

Use concise, imperative commit messages. Examples:
- `fix toast auto-dismiss hover race`
- `refactor react toast viewport offset helper`
- `docs add npm publish guide`

## Need Help?

Open a discussion or issue with:
- expected behavior
- actual behavior
- reproduction steps

Thank you for helping improve Fluix.
