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
            
            // Reset form and results
            form.reset();
            hideResults();
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
        hideResults();
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