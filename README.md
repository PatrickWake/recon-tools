# Recon Tools

A collection of lightweight reconnaissance tools for website analysis and security assessment. All tools run entirely in your browser - no server-side processing required.

## Features

- **CMS Detector**: Identify content management systems and their versions
- **Technology Stack Detector**: Discover web technologies, frameworks, and libraries
- **HTTP Header Analyzer**: Inspect and categorize HTTP response headers
- **DNS Record Lookup**: Query and analyze DNS records
- **Subdomain Scanner**: Discover active subdomains
- **Robots.txt Analyzer**: Parse and analyze robots.txt files
- **Email Finder**: Extract email addresses from web pages
- **SSL/TLS Checker**: Analyze SSL/TLS configuration and vulnerabilities

## Project Structure

```
recon-tools/
├── docs/                  # Static web application
│   ├── index.html        # Main application page
│   ├── css/              # Stylesheets
│   └── js/               # JavaScript modules
│       ├── app.js        # Core application logic
│       └── tech-patterns.js  # Technology detection patterns
├── tests/                # Test suite
│   ├── cms-detect.test.js
│   ├── tech-detect.test.js
│   ├── dns-lookup.test.js
│   ├── robots-check.test.js
│   ├── email-finder.test.js
│   └── ssl-check.test.js
└── README.md            # Project documentation
```

## Development

1. Clone the repository:
   ```bash
   git clone https://github.com/PatrickWake/recon-tools.git
   cd recon-tools
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run tests:
   ```bash
   npm test
   ```

4. Open `docs/index.html` in your browser or serve with a local server.

## Tool Descriptions

### CMS Detection
- Detects popular Content Management Systems
- Provides confidence scores and version information
- Supports WordPress detection with multiple indicators

### Technology Stack Detection
- Identifies web frameworks, libraries, and tools
- Categorizes technologies by type
- Shows evidence of detected technologies

### HTTP Header Analysis
- Categorizes security, caching, and CORS headers
- Identifies server technologies
- Highlights missing security headers

### DNS Record Lookup
- Queries A, AAAA, MX, NS, TXT, and SOA records
- Shows TTL values and record data
- Handles multiple records per type

### Subdomain Scanner
- Checks common subdomain patterns
- Verifies active subdomains
- Shows DNS records for discovered subdomains

### Robots.txt Analyzer
- Parses robots.txt directives
- Lists sitemaps
- Shows crawling rules by user agent

### Email Finder
- Extracts email addresses from web pages
- Finds addresses in mailto: links
- Normalizes and deduplicates results

### SSL/TLS Checker
- Grades SSL/TLS configuration
- Lists supported protocols
- Checks for common vulnerabilities (Heartbleed, POODLE, etc.)
- Shows certificate details and expiration

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

# Feature Improvements

## New Features
- Added SSL/TLS checker tool with comprehensive vulnerability scanning
- Improved UI: Results stay visible when switching between tools

## Bug Fixes
- Fixed robots.txt parsing to handle URLs with colons
- Fixed CMS detection edge cases

## Test Coverage
- Added SSL/TLS checker tests
- Added email finder tests
- Added robots.txt analyzer tests
- Added DNS lookup tests

## UI/UX Improvements
- Results persist between tool switches for better comparison
- Cleaner state management
- Better error handling

## Testing
- All tests passing
- Manual testing completed
- No regressions found 