# Ad Scanner - API Server

Backend API service for the Ad Scanner Chrome extension. Checks URLs against VirusTotal and Google Safe Browsing to detect malicious ads and phishing attempts.

## Features

- **VirusTotal Integration**: Checks URLs against 80+ security vendors
- **Google Safe Browsing**: Detects malware, phishing, and unwanted software
- **SQLite Caching**: 24-hour cache to reduce API calls
- **Rate Limiting**: Built-in protection against abuse
- **Mock Mode**: Works without API keys for development/testing

## Quick Start

### 1. Install Dependencies

```bash
bun install
```

### 2. Configure API Keys (Optional)

For development and testing, the server works with **mock data** (no API keys needed).

For production use with real threat detection:

```bash
cp .env.example .env
# Edit .env and add your API keys
```

**Get API Keys:**

- **VirusTotal** (500 requests/day free):
  1. Sign up: https://www.virustotal.com/gui/join-us
  2. Get API key: https://www.virustotal.com/gui/my-apikey

- **Google Safe Browsing** (10,000 requests/day free):
  1. Go to: https://console.cloud.google.com/
  2. Create a new project
  3. Enable "Safe Browsing API"
  4. Create credentials → API key

### 3. Run Server

```bash
bun run src/index.ts
```

Server starts on `http://localhost:3000`

## API Endpoints

### `GET /health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok"
}
```

### `POST /api/check`
Check a URL for threats.

**Request:**
```json
{
  "url": "https://example.com"
}
```

**Response:**
```json
{
  "url": "https://example.com",
  "riskScore": 15.5,
  "riskLevel": "low",
  "sources": [
    {
      "source": "virustotal",
      "score": 12.5,
      "details": {
        "detectionCount": 11,
        "enginesCount": 88,
        "categories": ["safe"]
      }
    },
    {
      "source": "google-safe-browsing",
      "score": 0,
      "details": {
        "isSafe": true,
        "threatTypes": []
      }
    }
  ],
  "cached": false,
  "checkedAt": "2025-12-14T10:30:00.000Z"
}
```

## Development

### Mock Mode (No API Keys)

Without API keys, the server returns deterministic mock data:
- Ad-related domains (doubleclick, adserver) → High risk
- Test domains → Medium risk
- Other domains → Low/safe risk

This is perfect for:
- Extension development
- Testing visual indicators
- Avoiding API rate limits

### With Real API Keys

Add keys to `.env` file:
```bash
VIRUSTOTAL_API_KEY=your_key_here
GOOGLE_SAFE_BROWSING_API_KEY=your_key_here
```

The server automatically switches from mock to real API calls.

## Architecture

```
Extension → Server → [VirusTotal + Google Safe Browsing] → SQLite Cache
```

1. Extension sends URL to `/api/check`
2. Server checks cache (24hr TTL)
3. If not cached, queries both APIs in parallel
4. Combines scores and caches result
5. Returns aggregated risk assessment

## Tech Stack

- **Runtime**: Bun
- **Framework**: Hono
- **Database**: SQLite (better-sqlite3)
- **APIs**: VirusTotal v3, Google Safe Browsing v4

---

This project was created using `bun init` in bun v1.3.4. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
