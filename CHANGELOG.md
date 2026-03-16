# Changelog

All notable changes to the Warp Protocol project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v0.4.0] - 2026-04-01

### Added
- WebSocket feed endpoint for real-time verdict streaming
- Batch query endpoint (POST /v1/query) supporting up to 100 addresses per request
- Platt scaling calibration layer for confidence scores
- SDK method `subscribeVerdicts()` for live feed consumption

### Changed
- Classifier now uses 47 behavioral features (up from 32)
- Improved ONNX model inference latency by 40% via batched tensor ops

### Fixed
- Race condition in scanner listener when reconnecting after RPC node failover

## [v0.3.0] - 2026-03-01

### Added
- On-chain attestation program (warp-attestation) deployed to devnet
- `create_attestation` instruction for writing verdicts to Solana
- Python FastAPI inference server for model serving
- CODEOWNERS file and dependabot configuration

### Changed
- Migrated API from Express to Fastify for better throughput
- Feature extraction pipeline now runs in parallel workers

### Fixed
- Incorrect feature normalization for `tx_frequency_1h` causing misclassification
- Memory leak in long-running scanner processes

## [v0.2.0] - 2026-02-01

### Added
- Classifier package with ONNX runtime integration
- Verdict engine with weighted scoring across signal categories
- Initial SDK release (@warp-protocol/sdk v0.2.0)
- TypeScript examples for querying agent verdicts

### Changed
- Scanner now tracks program invocation patterns across multiple slots
- Restructured monorepo to use Turborepo pipelines

### Fixed
- WebSocket listener dropping messages under high throughput
- Duplicate signal entries when the same transaction is observed via multiple RPC nodes

## [v0.1.0] - 2026-01-15

### Added
- Initial project scaffolding with Turborepo monorepo
- Scanner package with Solana WebSocket listener
- Signal extraction from transaction metadata
- Basic type definitions for AgentSignal, ScanResult, and Verdict
- CI pipeline for TypeScript linting and testing
- MIT license and contribution guidelines
