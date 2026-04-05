# API Reference

Base URL: `https://api.warp-protocol.dev` (production) or `http://localhost:3100` (local)

All responses use JSON format. Errors include an `error` code and a `message` field.

## Authentication

Include your API key in the `Authorization` header:

```
Authorization: Bearer YOUR_API_KEY
```

## Endpoints

### GET /health

Health check endpoint. No authentication required.

**Response:**
```json
{
  "status": "ok",
  "version": "0.4.0",
  "timestamp": 1712000000000
}
```

### GET /v1/verdict/:address

Retrieve the verdict for a single Solana address.

**Path Parameters:**
- `address` (string, required): Solana public key (32-44 characters)

**Response (200):**
```json
{
  "data": {
    "address": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "verdict": "AUTONOMOUS",
    "confidence": 0.9231,
    "reasons": [
      {
        "code": "TIMING_PERIODICITY_SCORE",
        "description": "Strong periodic pattern detected in transaction timing.",
        "weight": 2.8,
        "featureContribution": 2.52
      }
    ],
    "signalCount": 156,
    "transactionCount": 423,
    "timestamp": 1712000000000,
    "cached": false
  }
}
```

**Error Response (400):**
```json
{
  "error": "INVALID_ADDRESS",
  "message": "Solana address must be at least 32 characters"
}
```

**Error Response (500):**
```json
{
  "error": "VERDICT_COMPUTATION_FAILED",
  "message": "An internal error occurred while computing the verdict."
}
```

### POST /v1/query

Batch query for multiple addresses. Supports up to 100 addresses per request.

**Request Body:**
```json
{
  "addresses": [
    "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
  ],
  "options": {
    "skipCache": false,
    "includeReasons": true
  }
}
```

**Request Fields:**
- `addresses` (string[], required): Array of Solana addresses (1 to 100)
- `options.skipCache` (boolean, optional): Force fresh computation. Default: false
- `options.includeReasons` (boolean, optional): Include verdict reasons. Default: true

**Response (200):**
```json
{
  "data": {
    "results": [
      {
        "address": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
        "verdict": "AUTONOMOUS",
        "confidence": 0.9231,
        "reasons": [],
        "signalCount": 156,
        "transactionCount": 423,
        "cached": true
      }
    ],
    "errors": [
      {
        "address": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        "error": "VERDICT_FAILED"
      }
    ],
    "meta": {
      "total": 2,
      "succeeded": 1,
      "failed": 1,
      "latencyMs": 342
    }
  }
}
```

### WS /v1/feed

WebSocket endpoint for real-time verdict updates.

**Connection:**
```
ws://localhost:3100/v1/feed
```

**Client Messages:**

Subscribe to specific addresses:
```json
{ "action": "subscribe", "addresses": ["addr1", "addr2"] }
```

Subscribe to all verdict updates:
```json
{ "action": "subscribe_all" }
```

Unsubscribe from addresses:
```json
{ "action": "unsubscribe", "addresses": ["addr1"] }
```

Ping (keepalive):
```json
{ "action": "ping" }
```

**Server Messages:**

Verdict update:
```json
{
  "type": "verdict",
  "data": {
    "address": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "previousVerdict": "HYBRID",
    "currentVerdict": "AUTONOMOUS",
    "confidence": 0.9231,
    "timestamp": 1712000000000
  }
}
```

Subscription confirmation:
```json
{
  "type": "subscribed",
  "addresses": ["addr1", "addr2"]
}
```

Pong:
```json
{ "type": "pong", "timestamp": 1712000000000 }
```

Error:
```json
{ "type": "error", "message": "Unknown action: invalid" }
```

## Rate Limits

- Default: 100 requests per minute per API key
- Batch query: Each address in the batch counts as one request
- WebSocket connections: 10 concurrent connections per API key

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Invalid request parameters |
| 401 | Missing or invalid API key |
| 429 | Rate limit exceeded |
| 500 | Internal server error |
| 503 | Service unavailable (model not loaded) |
