.PHONY: install build dev test lint clean deploy anchor-build anchor-test train serve-model

# Install all dependencies
install:
	pnpm install
	cd models/training && pip install -r requirements.txt
	cd models/inference && pip install -r requirements.txt

# Build all packages
build:
	pnpm build

# Run development servers
dev:
	pnpm dev

# Run all tests
test:
	pnpm test
	cargo test --manifest-path programs/warp-attestation/Cargo.toml
	cd models/training && pytest

# Run TypeScript tests only
test-ts:
	pnpm test:unit

# Run Rust tests only
test-rust:
	cargo test --manifest-path programs/warp-attestation/Cargo.toml

# Run Python tests only
test-python:
	cd models/training && pytest -v

# Lint all code
lint:
	pnpm lint
	cargo clippy --manifest-path programs/warp-attestation/Cargo.toml -- -D warnings
	cd models/training && python -m flake8 .

# Format all code
format:
	pnpm format
	cargo fmt --manifest-path programs/warp-attestation/Cargo.toml
	cd models/training && black . && isort .

# Type check TypeScript
typecheck:
	pnpm typecheck

# Clean all build artifacts
clean:
	pnpm clean
	cargo clean --manifest-path programs/warp-attestation/Cargo.toml
	find models -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	rm -rf .turbo

# Build Anchor program
anchor-build:
	cd programs/warp-attestation && anchor build

# Test Anchor program
anchor-test:
	cd programs/warp-attestation && anchor test

# Deploy Anchor program to devnet
anchor-deploy-devnet:
	cd programs/warp-attestation && anchor deploy --provider.cluster devnet

# Train the classifier model
train:
	cd models/training && python train.py

# Start the inference server
serve-model:
	cd models/inference && uvicorn server:app --host 0.0.0.0 --port 8000 --reload

# Run the API server
serve-api:
	cd packages/api && pnpm dev

# Run the scanner
scan:
	cd packages/scanner && pnpm dev

# Backfill historical agents
backfill:
	npx tsx scripts/backfill.ts

# Deploy to production
deploy:
	bash scripts/deploy.sh

# Generate API docs
docs:
	pnpm typedoc

# Docker build
docker-build:
	docker build -t warp-protocol-api -f Dockerfile.api .
	docker build -t warp-protocol-scanner -f Dockerfile.scanner .
	docker build -t warp-protocol-inference -f Dockerfile.inference .
