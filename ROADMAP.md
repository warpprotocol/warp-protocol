# Warp Protocol Roadmap

This document outlines the planned development milestones for Warp Protocol,
an AI agent verifier on Solana that classifies agents as AUTONOMOUS, HYBRID, or HUMAN.

## v0.1 - Foundation (January 2026)

- [x] Monorepo scaffolding with Turborepo
- [x] Solana WebSocket listener for real-time transaction monitoring
- [x] Signal extraction pipeline for transaction metadata
- [x] Core type definitions (AgentSignal, ScanResult, Verdict)
- [x] CI pipeline with lint, type-check, and unit tests
- [x] Initial documentation and contribution guidelines

## v0.2 - Classification Engine (February 2026)

- [x] ONNX model integration for agent classification
- [x] Feature extraction pipeline (32 behavioral features)
- [x] Verdict engine with weighted scoring
- [x] SDK release (@warp-protocol/sdk)
- [x] TypeScript and Python query examples
- [x] Turborepo pipeline optimization for parallel builds

## v0.3 - On-Chain Attestation (March 2026)

- [x] Anchor program for on-chain attestation storage
- [x] `create_attestation` and `query` instructions
- [x] Devnet deployment of warp-attestation program
- [x] Fastify migration for API layer
- [x] Python FastAPI inference server
- [x] Feature extraction expanded to 47 behavioral signals

## v0.4 - Real-Time Feeds and Calibration (April 2026)

- [x] WebSocket feed for live verdict streaming
- [x] Batch query endpoint for high-volume consumers
- [x] Platt scaling confidence calibration
- [x] SDK live subscription method
- [ ] Backfill script for historical agent classification
- [ ] Rate limiting and API key authentication

## v0.5 - Mainnet Preparation (May 2026)

- [ ] Mainnet deployment of warp-attestation program
- [ ] Mainnet scanner configuration and RPC failover
- [ ] Model v2 training with expanded labeled dataset (10k+ agents)
- [ ] Latency optimization target: sub-200ms end-to-end classification
- [ ] Load testing at 1000 concurrent queries
- [ ] Security audit of Anchor program by third-party firm
- [ ] API key management and usage dashboard

## v0.6 - Ecosystem Integrations (June 2026)

- [ ] Webhook notifications for verdict changes
- [ ] REST callbacks for partner integrations
- [ ] Agent reputation score (rolling 30-day behavioral index)
- [ ] Historical verdict timeline per agent address
- [ ] Grafana dashboard for operational monitoring
- [ ] Public status page

## v0.7 - Advanced Classification (July 2026)

- [ ] Ensemble model with gradient-boosted trees + neural net
- [ ] Temporal feature extraction (behavioral drift detection)
- [ ] Multi-chain support: Ethereum L2 agents (Base, Arbitrum)
- [ ] Agent clustering and similarity search
- [ ] Explainability layer: per-feature contribution to verdict
- [ ] Model retraining pipeline with automated dataset refresh

## v0.8 - Developer Experience (August 2026)

- [ ] CLI tool for local agent verification
- [ ] Embeddable verification badge (SVG/React component)
- [ ] Verification widget for dApp frontends
- [ ] Improved SDK with retry logic and connection pooling
- [ ] OpenAPI spec generation from route definitions
- [ ] Interactive API playground

## v0.9 - Governance and Decentralization (September 2026)

- [ ] On-chain governance for classification thresholds
- [ ] Stake-weighted validator participation in verdict consensus
- [ ] Dispute resolution mechanism for contested verdicts
- [ ] Transparent model versioning on-chain
- [ ] Community-contributed feature proposals
- [ ] Bug bounty program launch

## v1.0 - Production Release (October 2026)

- [ ] Stable API with backwards-compatibility guarantees
- [ ] SLA commitments for uptime and latency
- [ ] Comprehensive audit trail for all verdicts
- [ ] Multi-region deployment for global low-latency access
- [ ] Published research paper on behavioral classification methodology
- [ ] SDK v1.0 with long-term support
- [ ] Full documentation site with tutorials and guides
