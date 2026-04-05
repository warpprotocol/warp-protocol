# Architecture Overview

Warp Protocol is an AI agent verifier on Solana that classifies wallet addresses as
AUTONOMOUS, HYBRID, or HUMAN based on on-chain behavioral analysis.

## System Components

### 1. Scanner (`packages/scanner`)

The scanner maintains persistent WebSocket connections to Solana RPC nodes and monitors
transaction activity for targeted program IDs. When new transactions are observed, the
scanner extracts raw signal data and buffers it for downstream processing.

Key responsibilities:
- WebSocket connection management with automatic reconnection
- Transaction fetching and parsing
- Signal extraction from transaction metadata
- Historical transaction backfilling for newly discovered agents

Data flow: Solana RPC -> WebSocket Listener -> Transaction Parser -> Signal Extractor

### 2. Classifier (`packages/classifier`)

The classifier takes raw signals from the scanner and transforms them into a 47-dimensional
feature vector. This vector is then fed into an ONNX model that produces probability
distributions across the three agent classes.

Key responsibilities:
- Feature extraction from agent signals (47 behavioral features)
- ONNX model loading and inference
- Platt scaling for confidence calibration
- Batched inference for throughput optimization

Data flow: Signals -> Feature Extraction -> ONNX Inference -> Calibration -> Probabilities

### 3. Verdict Engine (`packages/verdict-engine`)

The verdict engine applies business logic on top of raw classification probabilities.
It enforces minimum data requirements, applies confidence thresholds, generates
human-readable explanations, and manages verdict caching.

Key responsibilities:
- Threshold-based verdict resolution
- Reason generation from feature contributions
- Verdict caching with TTL
- Change detection and notification

Data flow: Classification Result -> Threshold Check -> Verdict Resolution -> Caching

### 4. API Server (`packages/api`)

A Fastify-based HTTP and WebSocket server that exposes the classification pipeline
to external consumers.

Endpoints:
- `GET /v1/verdict/:address` - Single address verdict lookup
- `POST /v1/query` - Batch query for up to 100 addresses
- `WS /v1/feed` - Real-time verdict stream
- `GET /health` - Health check

### 5. SDK (`packages/sdk`)

A TypeScript client library that wraps the API with typed methods, automatic
retries, and WebSocket subscription management.

### 6. On-Chain Program (`programs/warp-attestation`)

An Anchor program deployed on Solana that stores verdict attestations on-chain.
Each attestation is a PDA derived from the agent address, containing the verdict
type, confidence score, model version, and a hash of the feature vector used.

Instructions:
- `create_attestation` - Write a new verdict to chain
- `update_attestation` - Update an existing verdict
- `query_verdict` - Read an attestation
- `close_attestation` - Reclaim rent from a closed attestation

### 7. ML Training Pipeline (`models/training`)

A Python pipeline for training the classification model. Uses PyTorch for model
development and exports to ONNX for cross-runtime inference.

### 8. Inference Server (`models/inference`)

A FastAPI server that wraps the ONNX model for standalone inference. Used as an
alternative to the in-process ONNX runtime when latency isolation is preferred.

## End-to-End Flow

```
1. Scanner observes transaction via WebSocket
2. Signal extractors produce AgentSignal records
3. Feature extractor computes 47-dimensional vector
4. ONNX model outputs class probabilities
5. Platt scaling calibrates confidence
6. Verdict engine resolves final verdict
7. Result is cached and served via API
8. Optionally, verdict is written on-chain via warp-attestation
```

## Data Model

- **AgentSignal**: Raw behavioral signal (category, name, value, timestamp)
- **FeatureVector**: 47-element float array with feature names
- **ClassificationResult**: Label, confidence, per-class probabilities
- **VerdictResult**: Final verdict with reasons, TTL, and metadata
- **Attestation**: On-chain account storing verdict and model metadata

## Deployment Topology

Production deployment consists of:
- Scanner process (1-3 instances, each monitoring different program sets)
- API server (2+ instances behind a load balancer)
- Inference server (optional, for latency isolation)
- Redis cache (shared verdict cache)
- Solana RPC node access (Helius recommended for production throughput)
