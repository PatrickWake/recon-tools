// State management
let currentTool = 'cms-detect';

// Import technology patterns
import { TECH_PATTERNS } from './tech-patterns.js';

// DOM Elements
const form = document.getElementById('analysis-form');
const urlInput = document.getElementById('target-url');
const resultsDiv = document.getElementById('results');
const resultsContent = document.querySelector('#results-content pre');
const errorDiv = document.getElementById('error');
const errorMessage = document.getElementById('error-message');
const loadingDiv = document.getElementById('loading');
const toolButtons = document.querySelectorAll('.tool-btn');

// CORS Proxy configuration
const CORS_PROXY = 'https://corsproxy.io/?'; // Primary proxy
const FALLBACK_CORS_PROXY = 'https://api.codetabs.com/v1/proxy?quest='; // Fallback proxy

// Tool button click handlers
toolButtons.forEach(button => {
    if (!button.disabled) {
        button.addEventListener('click', () => {
            // Update active state
            toolButtons.forEach(btn => {
                btn.classList.remove('active', 'bg-blue-50', 'border-blue-200');
                btn.classList.add('bg-gray-50', 'border-gray-200');
            });
            button.classList.remove('bg-gray-50', 'border-gray-200');
            button.classList.add('active', 'bg-blue-50', 'border-blue-200');
            
            // Update current tool
            currentTool = button.dataset.tool;
            
            // Only reset form, keep results visible
            form.reset();
            hideError();
        });
    }
});

// Form submission handler
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const targetUrl = urlInput.value.trim();
    if (!targetUrl) {
        showError('Please enter a valid URL');
        return;
    }

    try {
        // Validate URL
        const url = new URL(targetUrl);
        
        hideError();
        hideResults(); // Only hide results when starting a new scan
        showLoading();

        let results;
        switch (currentTool) {
            case 'cms-detect':
                results = await detectCMS(targetUrl);
                break;
            case 'tech-detect':
                results = await detectTech(targetUrl);
                break;
            case 'subdomain-scan':
                results = await scanSubdomains(url.hostname);
                break;
            case 'header-check':
                results = await analyzeHeaders(targetUrl);
                break;
            case 'dns-lookup':
                results = await dnsLookup(url.hostname);
                break;
            case 'robots-check':
                results = await analyzeRobots(targetUrl);
                break;
            case 'email-finder':
                results = await findEmails(targetUrl);
                break;
            case 'ssl-check':
                results = await analyzeSslTls(targetUrl);
                break;
            default:
                throw new Error('Tool not implemented');
        }
        showResults(results);
    } catch (error) {
        if (error instanceof TypeError && error.message.includes('URL')) {
            showError('Please enter a valid URL (e.g., https://example.com)');
        } else {
            showError(error.message);
        }
    } finally {
        hideLoading();
    }
});

// Technology Stack Detection
export async function detectTech(url) {
    let response;
    let html;
    let headers;

    try {
        // Try primary proxy first
        try {
            const proxyUrl = `${CORS_PROXY}${encodeURIComponent(url)}`;
            response = await fetch(proxyUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            html = await response.text();
            headers = Object.fromEntries(response.headers);
        } catch (primaryError) {
            // If primary proxy fails, try fallback
            console.warn('Primary proxy failed, trying fallback:', primaryError.message);
            const fallbackUrl = `${FALLBACK_CORS_PROXY}${encodeURIComponent(url)}`;
            response = await fetch(fallbackUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            html = await response.text();
            headers = Object.fromEntries(response.headers);
        }

        const results = {
            url: url,
            timestamp: new Date().toISOString(),
            technologies: {}
        };

        // Check each category
        for (const [category, techs] of Object.entries(TECH_PATTERNS)) {
            results.technologies[category] = [];

            // Check each technology in the category
            for (const [techName, patterns] of Object.entries(techs)) {
                let found = false;
                const matches = [];

                // Check headers
                if (patterns.headers) {
                    for (const pattern of patterns.headers) {
                        const headerKey = Object.keys(headers).find(key => 
                            key.toLowerCase().includes(pattern.toLowerCase()) ||
                            (headers[key] && headers[key].toLowerCase().includes(pattern.toLowerCase()))
                        );
                        if (headerKey) {
                            found = true;
                            matches.push(`Header: ${headerKey}`);
                        }
                    }
                }

                // Check HTML content and scripts
                if (patterns.html && html) {
                    for (const pattern of patterns.html) {
                        if (html.toLowerCase().includes(pattern.toLowerCase())) {
                            found = true;
                            matches.push(`Content: ${pattern}`);
                        }
                    }
                }

                if (patterns.scripts && html) {
                    for (const pattern of patterns.scripts) {
                        if (html.toLowerCase().includes(pattern.toLowerCase())) {
                            found = true;
                            matches.push(`Script: ${pattern}`);
                        }
                    }
                }

                if (found) {
                    results.technologies[category].push({
                        name: techName,
                        matches: [...new Set(matches)] // Remove duplicates
                    });
                }
            }

            // Remove empty categories
            if (results.technologies[category].length === 0) {
                delete results.technologies[category];
            }
        }

        return results;
    } catch (error) {
        throw new Error(`Failed to detect technologies: ${error.message}`);
    }
}

// Subdomain Scanner
export async function scanSubdomains(domain, testSubdomains = null) {
    try {
        // Common subdomain prefixes to check
        const commonSubdomains = testSubdomains || [
            'www', 'mail', 'ftp', 'smtp', 'pop', 'api',
            'dev', 'staging', 'test', 'beta', 'alpha',
            'admin', 'blog', 'shop', 'store', 'secure',
            'portal', 'support', 'help', 'docs', 'kb',
            'forum', 'community', 'cdn', 'media', 'img',
            'images', 'static', 'assets', 'files', 'download',
            'app', 'mobile', 'm', 'web', 'cloud',
            'status', 'stats', 'analytics', 'metrics',
            'git', 'svn', 'jenkins', 'ci', 'build',
            'auth', 'login', 'sso', 'vpn', 'remote'
        ];

        const results = {
            domain: domain,
            timestamp: new Date().toISOString(),
            subdomains: [],
            total: 0
        };

        // Function to check if a subdomain resolves
        async function checkSubdomain(subdomain) {
            try {
                const response = await fetch(`https://dns.google/resolve?name=${subdomain}.${domain}`);
                if (!response.ok) {
                    return null;
                }
                const data = await response.json();
                if (data.Status === 0 && data.Answer && data.Answer.length > 0) {
                    return {
                        name: `${subdomain}.${domain}`,
                        records: data.Answer.map(record => ({
                            type: record.type,
                            data: record.data
                        }))
                    };
                }
                return null;
            } catch (error) {
                console.warn(`Failed to check subdomain ${subdomain}:`, error);
                return null;
            }
        }

        // Check subdomains in parallel with rate limiting
        const batchSize = 5;
        for (let i = 0; i < commonSubdomains.length; i += batchSize) {
            const batch = commonSubdomains.slice(i, i + batchSize);
            const results_batch = await Promise.all(
                batch.map(subdomain => checkSubdomain(subdomain))
            );
            
            // Add successful results
            results.subdomains.push(...results_batch.filter(r => r !== null));
            
            // Rate limiting - skip in test mode
            if (!testSubdomains && i + batchSize < commonSubdomains.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        results.total = results.subdomains.length;
        return results;
    } catch (error) {
        throw new Error(`Failed to scan subdomains: ${error.message}`);
    }
}

// CMS Detection
export async function detectCMS(url) {
    let response;
    let html;
    let headers;

    try {
        // Try primary proxy first
        try {
            const proxyUrl = `${CORS_PROXY}${encodeURIComponent(url)}`;
            response = await fetch(proxyUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            html = await response.text();
            headers = Object.fromEntries(response.headers);
        } catch (primaryError) {
            // If primary proxy fails, try fallback
            console.warn('Primary proxy failed, trying fallback:', primaryError.message);
            const fallbackUrl = `${FALLBACK_CORS_PROXY}${encodeURIComponent(url)}`;
            response = await fetch(fallbackUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            html = await response.text();
            headers = Object.fromEntries(response.headers);
        }

        let cmsName = null;
        let confidence = 0;
        let version = null;

        // WordPress detection patterns
        const wpPatterns = {
            meta: /<meta[^>]*wp-[^>]*>/i,
            links: /wp-(?:content|includes)/i,
            generator: /<meta[^>]*generator[^>]*WordPress/i,
            scripts: /wp-(?:content|includes|json)/i,
            headers: {
                'x-powered-by': /wordpress/i,
                'link': /wp-json/i
            }
        };

        // Check WordPress patterns
        let wpMatches = 0;
        const totalPatterns = Object.keys(wpPatterns).length + 1; // +1 for headers check

        if (wpPatterns.meta.test(html)) wpMatches++;
        if (wpPatterns.links.test(html)) wpMatches++;
        if (wpPatterns.generator.test(html)) wpMatches++;
        if (wpPatterns.scripts.test(html)) wpMatches++;

        // Check headers
        for (const [headerName, pattern] of Object.entries(wpPatterns.headers)) {
            if (headers[headerName] && pattern.test(headers[headerName])) {
                wpMatches++;
            }
        }

        // Calculate confidence
        confidence = Math.round((wpMatches / totalPatterns) * 100);

        // If confidence is above 40%, consider it WordPress
        if (confidence > 40) {
            cmsName = 'wordpress';

            // Try to detect version
            const versionMatch = html.match(/<meta[^>]*generator[^>]*WordPress\s+([\d.]+)/i);
            if (versionMatch) {
                version = versionMatch[1];
            }
        }

        return {
            url: url,
            timestamp: new Date().toISOString(),
            detected: confidence > 40,
            cms: cmsName,
            confidence: confidence,
            version: version
        };
    } catch (error) {
        throw new Error(`Failed to detect CMS: ${error.message}`);
    }
}

// HTTP Header Analysis
export async function analyzeHeaders(url) {
    let response;
    let headers;

    try {
        // Try primary proxy first
        try {
            const proxyUrl = `${CORS_PROXY}${encodeURIComponent(url)}`;
            response = await fetch(proxyUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            headers = Object.fromEntries(response.headers);
        } catch (primaryError) {
            // If primary proxy fails, try fallback
            console.warn('Primary proxy failed, trying fallback:', primaryError.message);
            const fallbackUrl = `${FALLBACK_CORS_PROXY}${encodeURIComponent(url)}`;
            response = await fetch(fallbackUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            headers = Object.fromEntries(response.headers);
        }

        // Categorize headers
        const categories = {
            security: [
                'content-security-policy',
                'x-frame-options',
                'x-xss-protection',
                'x-content-type-options',
                'strict-transport-security',
                'permissions-policy',
                'referrer-policy'
            ],
            caching: [
                'cache-control',
                'etag',
                'last-modified',
                'expires',
                'age',
                'pragma'
            ],
            cors: [
                'access-control-allow-origin',
                'access-control-allow-methods',
                'access-control-allow-headers',
                'access-control-expose-headers',
                'access-control-max-age',
                'access-control-allow-credentials'
            ],
            compression: [
                'content-encoding',
                'accept-encoding',
                'transfer-encoding'
            ],
            server: [
                'server',
                'x-powered-by',
                'x-aspnet-version',
                'x-runtime'
            ]
        };

        const results = {
            url: url,
            timestamp: new Date().toISOString(),
            headers: {},
            categorized: {}
        };

        // Store all headers
        for (const [key, value] of Object.entries(headers)) {
            results.headers[key.toLowerCase()] = value;
        }

        // Categorize headers
        for (const [category, headerList] of Object.entries(categories)) {
            results.categorized[category] = {};
            for (const header of headerList) {
                if (results.headers[header.toLowerCase()]) {
                    results.categorized[category][header] = results.headers[header.toLowerCase()];
                }
            }
            // Remove empty categories
            if (Object.keys(results.categorized[category]).length === 0) {
                delete results.categorized[category];
            }
        }

        // Add uncategorized headers
        results.categorized.other = {};
        for (const [header, value] of Object.entries(results.headers)) {
            let isCategorized = false;
            for (const headerList of Object.values(categories)) {
                if (headerList.some(h => h.toLowerCase() === header.toLowerCase())) {
                    isCategorized = true;
                    break;
                }
            }
            if (!isCategorized) {
                results.categorized.other[header] = value;
            }
        }

        // Remove empty other category
        if (Object.keys(results.categorized.other).length === 0) {
            delete results.categorized.other;
        }

        return results;
    } catch (error) {
        throw new Error(`Failed to analyze headers: ${error.message}`);
    }
}

// DNS Lookup
export async function dnsLookup(domain) {
    try {
        const recordTypes = ['A', 'AAAA', 'MX', 'NS', 'TXT', 'SOA'];
        const results = {
            domain: domain,
            timestamp: new Date().toISOString(),
            records: {}
        };

        // Query each record type
        await Promise.all(recordTypes.map(async (type) => {
            try {
                const response = await fetch(`https://dns.google/resolve?name=${domain}&type=${type}`);
                if (!response.ok) {
                    throw new Error(`DNS query failed: ${response.status}`);
                }
                const data = await response.json();
                if (data.Status === 0 && data.Answer) {
                    results.records[type] = data.Answer.map(record => ({
                        name: record.name,
                        ttl: record.TTL,
                        data: record.data
                    }));
                }
            } catch (error) {
                console.warn(`Failed to fetch ${type} records:`, error);
            }
        }));

        return results;
    } catch (error) {
        throw new Error(`DNS lookup failed: ${error.message}`);
    }
}

// Robots.txt Analysis
export async function analyzeRobots(url) {
    let robotsContent;
    const parsedUrl = new URL(url);
    const robotsUrl = `${parsedUrl.protocol}//${parsedUrl.hostname}/robots.txt`;

    try {
        // Try primary proxy first
        try {
            const proxyUrl = `${CORS_PROXY}${encodeURIComponent(robotsUrl)}`;
            const response = await fetch(proxyUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            robotsContent = await response.text();
        } catch (primaryError) {
            // If primary proxy fails, try fallback
            console.warn('Primary proxy failed, trying fallback:', primaryError.message);
            const fallbackUrl = `${FALLBACK_CORS_PROXY}${encodeURIComponent(robotsUrl)}`;
            const response = await fetch(fallbackUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            robotsContent = await response.text();
        }

        const results = {
            url: robotsUrl,
            timestamp: new Date().toISOString(),
            rules: [],
            sitemaps: []
        };

        // Parse robots.txt content
        const lines = robotsContent.split('\n');
        let currentUserAgent = '*';

        for (const line of lines) {
            const trimmedLine = line.trim();
            const lowerLine = trimmedLine.toLowerCase();
            if (!trimmedLine || trimmedLine.startsWith('#')) continue;

            if (lowerLine.startsWith('user-agent:')) {
                currentUserAgent = lowerLine.split(':')[1].trim();
            } else if (lowerLine.startsWith('sitemap:')) {
                const sitemap = trimmedLine.split(':').slice(1).join(':').trim();
                results.sitemaps.push(sitemap);
            } else if (lowerLine.startsWith('allow:') || lowerLine.startsWith('disallow:')) {
                const [type, ...pathParts] = trimmedLine.split(':');
                const path = pathParts.join(':').trim();
                if (path) {
                    results.rules.push({
                        userAgent: currentUserAgent,
                        type: type.toLowerCase(),
                        path: path
                    });
                }
            }
        }

        return results;
    } catch (error) {
        throw new Error(`Failed to analyze robots.txt: ${error.message}`);
    }
}

// Email Finder
export async function findEmails(url) {
    let response;
    let html;

    try {
        // Try primary proxy first
        try {
            const proxyUrl = `${CORS_PROXY}${encodeURIComponent(url)}`;
            response = await fetch(proxyUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            html = await response.text();
        } catch (primaryError) {
            // If primary proxy fails, try fallback
            console.warn('Primary proxy failed, trying fallback:', primaryError.message);
            const fallbackUrl = `${FALLBACK_CORS_PROXY}${encodeURIComponent(url)}`;
            response = await fetch(fallbackUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            html = await response.text();
        }

        const results = {
            url: url,
            timestamp: new Date().toISOString(),
            emails: new Set(),
            total: 0
        };

        // Regular expression for email addresses
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        
        // Find emails in HTML content
        const matches = html.match(emailRegex) || [];
        matches.forEach(email => results.emails.add(email.toLowerCase()));

        // Find emails in mailto: links
        const mailtoRegex = /mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
        let mailtoMatch;
        while ((mailtoMatch = mailtoRegex.exec(html)) !== null) {
            results.emails.add(mailtoMatch[1].toLowerCase());
        }

        results.emails = Array.from(results.emails);
        results.total = results.emails.length;

        return results;
    } catch (error) {
        throw new Error(`Failed to find emails: ${error.message}`);
    }
}

// SSL/TLS Analysis
export async function analyzeSslTls(url) {
    try {
        // SSL Labs API endpoint
        const API_URL = 'https://api.ssllabs.com/api/v3';
        
        // Start new scan
        const startScan = await fetch(`${API_URL}/analyze?host=${encodeURIComponent(new URL(url).hostname)}&startNew=on&all=done`);
        const scanData = await startScan.json();
        
        if (scanData.status !== 'READY' && scanData.status !== 'ERROR') {
            // Poll until complete
            let pollCount = 0;
            const maxPolls = 60; // 5 minutes maximum
            
            while (pollCount < maxPolls) {
                await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
                
                const pollResponse = await fetch(`${API_URL}/analyze?host=${encodeURIComponent(new URL(url).hostname)}`);
                const pollData = await pollResponse.json();
                
                if (pollData.status === 'READY' || pollData.status === 'ERROR') {
                    scanData = pollData;
                    break;
                }
                
                pollCount++;
            }
        }
        
        if (scanData.status === 'ERROR') {
            throw new Error(scanData.statusMessage || 'SSL scan failed');
        }
        
        const results = {
            url: url,
            timestamp: new Date().toISOString(),
            grade: scanData.endpoints[0].grade,
            details: {
                protocols: scanData.endpoints[0].details.protocols.map(p => ({
                    name: p.name,
                    version: p.version
                })),
                certificates: scanData.certs.map(cert => ({
                    subject: cert.subject,
                    issuer: cert.issuer,
                    validFrom: cert.notBefore,
                    validTo: cert.notAfter,
                    keyStrength: cert.keyStrength
                })),
                vulnerabilities: {
                    heartbleed: scanData.endpoints[0].details.heartbleed,
                    poodle: scanData.endpoints[0].details.poodle,
                    freak: scanData.endpoints[0].details.freak,
                    logjam: scanData.endpoints[0].details.logjam,
                    drownVulnerable: scanData.endpoints[0].details.drownVulnerable
                }
            }
        };
        
        return results;
    } catch (error) {
        throw new Error(`Failed to analyze SSL/TLS: ${error.message}`);
    }
}

// UI Helper functions
function showLoading() {
    loadingDiv.classList.remove('hidden');
}

function hideLoading() {
    loadingDiv.classList.add('hidden');
}

function showError(message) {
    errorMessage.textContent = message;
    errorDiv.classList.remove('hidden');
}

function hideError() {
    errorDiv.classList.add('hidden');
}

function showResults(data) {
    let lines;

    if (currentTool === 'cms-detect') {
        lines = [
            `CMS Detection Results for ${data.url}`,
            `Timestamp: ${data.timestamp}\n`
        ];

        if (data.detected) {
            lines.push(`Detected CMS: ${data.cms}`);
            lines.push(`Confidence: ${data.confidence}%\n`);
            if (data.version) {
                lines.push(`Version: ${data.version}`);
            }
        } else {
            lines.push('No CMS detected');
        }
    } else if (currentTool === 'tech-detect') {
        lines = [
            `Technology Stack Analysis for ${data.url}`,
            `Timestamp: ${data.timestamp}\n`
        ];

        for (const [category, techs] of Object.entries(data.technologies)) {
            if (techs.length > 0) {
                lines.push(`${category.charAt(0).toUpperCase() + category.slice(1)}:`);
                techs.forEach(tech => {
                    lines.push(`  • ${tech.name}`);
                    tech.matches.forEach(match => {
                        lines.push(`    - ${match}`);
                    });
                });
                lines.push('');
            }
        }

        if (Object.keys(data.technologies).length === 0) {
            lines.push('No technologies detected');
        }
    } else if (currentTool === 'subdomain-scan') {
        lines = [
            `Subdomain Scan Results for ${data.domain}`,
            `Timestamp: ${data.timestamp}`,
            `Found ${data.total} active subdomains:\n`
        ];

        if (data.total === 0) {
            lines.push('No active subdomains found');
        } else {
            data.subdomains.forEach(subdomain => {
                lines.push(`• ${subdomain.name}`);
                subdomain.records.forEach(record => {
                    lines.push(`  - ${record.type}: ${record.data}`);
                });
            });
        }
    } else if (currentTool === 'header-check') {
        lines = [
            `HTTP Header Analysis for ${data.url}`,
            `Timestamp: ${data.timestamp}\n`
        ];

        for (const [category, headers] of Object.entries(data.categorized)) {
            lines.push(`${category.charAt(0).toUpperCase() + category.slice(1)} Headers:`);
            for (const [header, value] of Object.entries(headers)) {
                lines.push(`  • ${header}: ${value}`);
            }
            lines.push('');
        }

        if (Object.keys(data.categorized).length === 0) {
            lines.push('No headers found');
        }
    } else if (currentTool === 'dns-lookup') {
        lines = [
            `DNS Lookup Results for ${data.domain}`,
            `Timestamp: ${data.timestamp}\n`
        ];

        for (const [type, records] of Object.entries(data.records)) {
            lines.push(`${type} Records:`);
            records.forEach(record => {
                lines.push(`  • ${record.name}`);
                lines.push(`    TTL: ${record.ttl}`);
                lines.push(`    Data: ${record.data}`);
            });
            lines.push('');
        }

        if (Object.keys(data.records).length === 0) {
            lines.push('No DNS records found');
        }
    } else if (currentTool === 'robots-check') {
        lines = [
            `Robots.txt Analysis for ${data.url}`,
            `Timestamp: ${data.timestamp}\n`
        ];

        if (data.sitemaps.length > 0) {
            lines.push('Sitemaps:');
            data.sitemaps.forEach(sitemap => {
                lines.push(`  • ${sitemap}`);
            });
            lines.push('');
        }

        if (data.rules.length > 0) {
            lines.push('Crawling Rules:');
            data.rules.forEach(rule => {
                lines.push(`  • ${rule.type.toUpperCase()} ${rule.path}`);
                lines.push(`    User-Agent: ${rule.userAgent}`);
            });
        } else {
            lines.push('No crawling rules found');
        }
    } else if (currentTool === 'email-finder') {
        lines = [
            `Email Finder Results for ${data.url}`,
            `Timestamp: ${data.timestamp}`,
            `Found ${data.total} email addresses:\n`
        ];

        if (data.total > 0) {
            data.emails.forEach(email => {
                lines.push(`  • ${email}`);
            });
        } else {
            lines.push('No email addresses found');
        }
    } else if (currentTool === 'ssl-check') {
        lines = [
            `SSL/TLS Analysis for ${data.url}`,
            `Timestamp: ${data.timestamp}\n`,
            `Overall Grade: ${data.grade}\n`,
            'Supported Protocols:'
        ];
        
        data.details.protocols.forEach(protocol => {
            lines.push(`  • ${protocol.name} ${protocol.version}`);
        });
        
        lines.push('\nCertificate Details:');
        data.details.certificates.forEach(cert => {
            lines.push(`  • Subject: ${cert.subject}`);
            lines.push(`    Issuer: ${cert.issuer}`);
            lines.push(`    Valid From: ${cert.validFrom}`);
            lines.push(`    Valid To: ${cert.validTo}`);
            lines.push(`    Key Strength: ${cert.keyStrength} bits\n`);
        });
        
        lines.push('Vulnerability Assessment:');
        for (const [vuln, status] of Object.entries(data.details.vulnerabilities)) {
            lines.push(`  • ${vuln}: ${status ? '❌ Vulnerable' : '✅ Not Vulnerable'}`);
        }
    } else {
        lines = ['Unsupported tool'];
    }

    resultsContent.textContent = lines.join('\n');
    resultsDiv.classList.remove('hidden');
}

function hideResults() {
    resultsDiv.classList.add('hidden');
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    urlInput.value = 'https://example.com';
}); 