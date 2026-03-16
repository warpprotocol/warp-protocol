# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.4.x   | Yes                |
| 0.3.x   | Security fixes only|
| < 0.3   | No                 |

## Reporting a Vulnerability

If you discover a security vulnerability in Warp Protocol, please report it responsibly.
Do not open a public GitHub issue for security vulnerabilities.

**Email:** security@warp-protocol.dev

Please include the following in your report:

1. Description of the vulnerability
2. Steps to reproduce the issue
3. Potential impact assessment
4. Suggested fix (if you have one)

## Response Timeline

- **Acknowledgment:** We will acknowledge receipt of your report within 48 hours.
- **Initial Assessment:** Within 5 business days, we will provide an initial severity assessment.
- **Resolution:** Critical vulnerabilities will be patched within 7 days. High-severity issues
  will be resolved within 14 days. Medium and low severity issues will be addressed in the
  next scheduled release.

## Scope

The following components are in scope for security reports:

- **On-chain program** (programs/warp-attestation): Account validation, access control,
  arithmetic overflow, instruction handler logic
- **API server** (packages/api): Input validation, authentication bypass, injection attacks,
  rate limiting circumvention
- **Scanner** (packages/scanner): WebSocket connection security, RPC credential handling
- **SDK** (packages/sdk): Credential storage, request signing, data integrity
- **ML inference** (models/inference): Model tampering, adversarial input handling

## Out of Scope

- Classification accuracy disputes (these are handled through the governance process)
- Denial of service against public RPC endpoints (report to the RPC provider)
- Social engineering attacks against maintainers
- Vulnerabilities in third-party dependencies (report upstream, but notify us if it affects
  Warp Protocol)

## Disclosure Policy

We follow a coordinated disclosure model. After a fix is released, we will:

1. Publish a security advisory on GitHub
2. Credit the reporter (unless they request anonymity)
3. Include details in the CHANGELOG for the patched release

## Bug Bounty

We do not currently operate a formal bug bounty program. However, we recognize and credit
all valid security reports. A formal bounty program is planned for v0.9.

## Security Best Practices for Deployers

- Always use environment variables for RPC URLs, API keys, and private keys
- Never commit `.env` files to version control
- Run the API server behind a reverse proxy with TLS termination
- Enable rate limiting in production deployments
- Rotate API keys periodically
- Monitor the attestation program upgrade authority and ensure it is controlled by a multisig
