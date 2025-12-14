# Ad Scanner - Chrome Extension

A Chrome extension that analyzes advertisements and web links to detect suspicious or malicious URLs, providing risk scores and protecting users from potentially harmful ad networks and scam sites.

## Overview

Ad Scanner is a browser extension that automatically detects ads on web pages and checks them against multiple threat intelligence APIs to identify risky destinations. It combines data from URLVoid and ScamAdvisor to provide comprehensive security assessments.

## Features

- **Automatic Ad Detection**: Identifies ads in iframes, links, and known ad networks
- **URL Risk Assessment**: Checks destination URLs against multiple security databases
- **Cached Results**: SQLite-based caching to reduce API calls and improve performance
- **Risk Scoring**: Aggregates threat intelligence from multiple sources into a single risk score
- **Visual Indicators**: Displays risk information directly in the browser popup

## Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Extension | TypeScript + Manifest V3 | Type-safe modern Chrome APIs |
| Backend API | Bun + Hono | Fast, lightweight server framework |
| Database | SQLite with Drizzle | Zero-infrastructure caching layer |
| Hosting | Fly.io or Railway | Serverless deployment |

## Project Structure

```
adscanner/
├── src/                 # Extension source (TypeScript)
├── server/              # Backend API server
├── manifest.json        # Chrome extension manifest
├── build.ts            # esbuild configuration
├── plan.md             # High-level development plan
└── package.json        # Project dependencies
```

## Development Phases

### Phase 1: Extension Foundation ✓
- Extension scaffold with popup UI and content scripts
- Ad detection logic for iframes and known ad networks
- URL extraction from detected ads

### Phase 2: Backend API 🔄
- Bun + Hono server setup
- URLVoid and ScamAdvisor API integration
- SQLite caching layer
- `/check` endpoint for URL risk assessment

### Phase 3: Integration 🔄
- Extension-to-backend API communication
- Risk score display in popup
- Visual indicators on suspicious ads

### Phase 4: Polish
- Rate limiting and error handling
- Settings and sensitivity controls
- Production deployment
- Chrome Web Store submission

## Getting Started

### Installation

```bash
bun install
```

### Development

Build extension with watch mode:

```bash
bun run dev
```

Build for production:

```bash
bun run build
```

### API Endpoints

#### GET `/check`
Check a URL for security threats.

**Parameters:**
- `url` (string, required) - The URL to check

**Response:**
```json
{
  "url": "https://example.com",
  "riskScore": 25,
  "urlvoidRisk": 10,
  "scamadvisorRisk": 15,
  "cached": false,
  "checkedAt": "2025-01-01T00:00:00Z"
}
```

## Environment Variables

Required for the backend API:

```env
URLVOID_API_KEY=your_key_here
SCAMADVISOR_API_KEY=your_key_here
```

## Contributing

This project is under active development. See `plan.md` for the current roadmap and development status.

## License

MIT
