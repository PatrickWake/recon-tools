# Recon Tools

A collection of lightweight, cloud-native reconnaissance tools built with JavaScript and deployed on Cloudflare Workers. These tools are designed for passive information gathering and website analysis.

## Features

- **HTTP Header Analyzer**: Inspect HTTP response headers
- **CMS Detector**: Identify content management systems
- *(Coming Soon)*:
  - DNS Record Lookup
  - Subdomain Brute-forcer
  - Robots.txt & Sitemap Fetcher
  - Email Scraper
  - Broken Link Checker

## Project Structure

```
recon-tools/
├── src/
│   ├── worker.js           # Main worker entry point
│   ├── tools/              # Individual tool implementations
│   │   ├── cmsDetect.js    # CMS detection tool
│   │   └── headerCheck.js  # Header analysis tool
│   └── utils/              # Shared utilities
│       └── http.js         # HTTP helper functions
├── wrangler.toml           # Cloudflare Workers configuration
└── README.md              # Project documentation
```

## Development

1. Install dependencies:
   ```bash
   npm install -g wrangler
   ```

2. Authenticate with Cloudflare:
   ```bash
   wrangler login
   ```

3. Run locally:
   ```bash
   wrangler dev
   ```

4. Deploy:
   ```bash
   wrangler publish
   ```

## API Usage

### CMS Detection

```http
GET /cms-detect?url=https://example.com
```

Response:
```json
{
  "url": "https://example.com",
  "timestamp": "2024-03-01T12:00:00Z",
  "detected": true,
  "cms": "wordpress",
  "confidence": 85,
  "matches": [
    "Meta: <meta name=\"generator\" content=\"WordPress",
    "Path: /wp-content/",
    "Script: wp-emoji-release.min.js"
  ]
}
```

## License

MIT License 

let currentTool = 'cms-detect'; 

if (currentTool === 'tech-detect') {
    // handle tech detection results
} else if (currentTool === 'subdomain-scan') {
    // handle subdomain scan results
} else {
    lines = ['Unsupported tool'];
} 