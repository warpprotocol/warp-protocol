# Maintainers

This document lists the core maintainers of the Warp Protocol project and their areas of responsibility.

## Core Team

### @warpcore
**Role:** Project Lead, Architecture
**Focus:** TypeScript packages, monorepo structure, system design
**Responsibilities:**
- Overall architecture decisions and technical direction
- Code review for packages/scanner, packages/verdict-engine, and packages/api
- Release management and versioning
- Coordination across workstreams

### @0xverifier
**Role:** Solana/Rust Specialist
**Focus:** On-chain programs, Anchor development, Solana integration
**Responsibilities:**
- Anchor program development (programs/warp-attestation)
- On-chain attestation logic and account structures
- Solana RPC integration and transaction parsing
- Program security review and upgrade authority management

### @neural-k
**Role:** ML/Python Classifier Engineer
**Focus:** Machine learning models, training pipelines, feature engineering
**Responsibilities:**
- Classification model architecture and training (models/training)
- Feature extraction design and validation (packages/classifier)
- ONNX model export and inference optimization
- Dataset curation, labeling strategy, and model evaluation
- Confidence calibration and threshold tuning

### @lux-ops
**Role:** DevOps, CI, Infrastructure, SDK
**Focus:** Build systems, deployment, SDK maintenance
**Responsibilities:**
- CI/CD pipelines (.github/workflows)
- Infrastructure provisioning and monitoring
- SDK development and publishing (packages/sdk)
- Deployment scripts, Docker images, and environment configuration
- Dependency management and security patching

## Decision Process

Technical decisions are made through pull request review. Any PR requires approval from
at least two maintainers before merging. For changes that span multiple areas (e.g., a new
feature touching both the classifier and the on-chain program), each relevant maintainer
must approve the portions within their domain.

Architecture-level changes require an RFC document in the `docs/` directory and sign-off
from @warpcore plus at least one other maintainer.

## Contact

For security-related disclosures, see [SECURITY.md](./SECURITY.md).
For contribution guidelines, see [CONTRIBUTING.md](./CONTRIBUTING.md).
