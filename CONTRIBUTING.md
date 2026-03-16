# Contributing to Warp Protocol

Thank you for your interest in contributing to Warp Protocol. This guide will help you
get started.

## Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Rust >= 1.75.0 (for Anchor program development)
- Python >= 3.10 (for ML training and inference)
- Solana CLI >= 1.17.0
- Anchor CLI >= 0.29.0

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```
   git clone https://github.com/<your-username>/warp-protocol.git
   cd warp-protocol
   ```
3. Install dependencies:
   ```
   pnpm install
   ```
4. Copy the environment template:
   ```
   cp .env.example .env
   ```
5. Run the test suite to verify your setup:
   ```
   pnpm test
   ```

## Project Structure

```
warp-protocol/
  packages/
    scanner/       - Solana transaction listener and signal extraction
    classifier/    - ML feature extraction and ONNX inference
    verdict-engine/ - Verdict computation from classification output
    api/           - REST and WebSocket API server
    sdk/           - Client SDK for consumers
  programs/
    warp-attestation/ - Anchor program for on-chain verdicts
  models/
    training/      - Python training pipeline
    inference/     - FastAPI inference server
  tests/           - Integration and unit tests
  docs/            - Architecture and API documentation
```

## Development Workflow

### Branching

- Create a feature branch from `main`: `git checkout -b feat/your-feature`
- Use conventional prefixes: `feat/`, `fix/`, `docs/`, `refactor/`, `test/`, `chore/`
- Keep branches focused on a single concern

### Making Changes

1. Make your changes in the appropriate package(s)
2. Add or update tests for your changes
3. Run linting: `pnpm lint`
4. Run type checking: `pnpm typecheck`
5. Run tests: `pnpm test`
6. For Rust changes: `cargo clippy` and `cargo test`
7. For Python changes: `pytest models/training/ models/inference/`

### Commit Messages

Follow the Conventional Commits specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`, `ci`

Scopes: `scanner`, `classifier`, `verdict-engine`, `api`, `sdk`, `attestation`, `models`, `docs`

Examples:
```
feat(classifier): add temporal drift detection features
fix(scanner): handle reconnection on RPC node failover
docs(api): update batch query endpoint documentation
```

### Pull Requests

1. Push your branch to your fork
2. Open a pull request against `main`
3. Fill out the pull request template completely
4. Ensure all CI checks pass
5. Request review from relevant maintainers (see CODEOWNERS)
6. Address review feedback with new commits (do not force-push during review)

PRs require approval from at least two maintainers before merging.

## Code Style

### TypeScript
- Strict mode enabled
- No `any` types without explicit justification in a comment
- Prefer `interface` over `type` for object shapes
- Use named exports, not default exports
- Maximum line length: 100 characters

### Rust
- Follow the Anchor framework conventions
- Run `cargo fmt` before committing
- All public functions must have doc comments
- Use `Result` types for fallible operations

### Python
- Follow PEP 8
- Use type hints for all function signatures
- Format with `black` and sort imports with `isort`
- Docstrings in Google style

## Testing

- Unit tests go in `tests/` at the repo root
- Each package should have meaningful test coverage
- Test file naming: `<package-name>.test.ts`
- Use descriptive test names that explain the expected behavior

## Reporting Issues

- Use the GitHub issue templates for bug reports and feature requests
- Search existing issues before creating a new one
- Provide as much context as possible, including reproduction steps

## Code of Conduct

Be respectful and constructive in all interactions. We are building open-source software
together and value diverse perspectives. Harassment, discrimination, and bad-faith behavior
will not be tolerated.

## Questions?

Open a discussion on GitHub or reach out to any of the maintainers listed in MAINTAINERS.md.
