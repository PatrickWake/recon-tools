// State management
let currentTool = 'cms-detect';

// DOM Elements
const form = document.getElementById('analysis-form');
const urlInput = document.getElementById('target-url');
const resultsDiv = document.getElementById('results');
const resultsContent = document.querySelector('#results-content pre');
const errorDiv = document.getElementById('error');
const errorMessage = document.getElementById('error-message');
const loadingDiv = document.getElementById('loading');
const toolButtons = document.querySelectorAll('.tool-btn');

// CMS Patterns for detection
const CMS_PATTERNS = {
    wordpress: {
        meta: [
            '<meta name="generator" content="WordPress',
            '<link rel="https://api.w.org/"',
        ],
        paths: ['/wp-content/', '/wp-includes/', '/wp-admin/'],
        scripts: ['wp-embed.min.js', 'wp-emoji-release.min.js'],
    },
    drupal: {
        meta: [
            '<meta name="generator" content="Drupal',
            'jQuery.extend(Drupal.settings',
        ],
        paths: ['/sites/default/', '/sites/all/'],
        scripts: ['drupal.js', 'drupal.min.js'],
    },
    joomla: {
        meta: [
            '<meta name="generator" content="Joomla!',
            'name="viewport"',
        ],
        paths: ['/templates/', '/media/jui/'],
        scripts: ['mootools.js', 'media/jui/js/jquery.min.js'],
    },
    shopify: {
        meta: [
            'cdn.shopify.com',
            'Shopify.theme',
        ],
        paths: ['/cdn/shop/products/', '/cdn/shop/files/'],
        scripts: ['shopify.js', 'shopify.min.js'],
    },
    wix: {
        meta: [
            'X-Wix-Published-Version',
            'X-Wix-Application-Instance',
        ],
        paths: ['/_api/', '/_partials/'],
        scripts: ['wix-code.js', 'wix-stores.js'],
    },
};

// CORS Proxy configuration
const CORS_PROXY = 'https://corsproxy.io/?' // Alternative proxies if this fails: 'https://api.codetabs.com/v1/proxy?quest='

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
        new URL(targetUrl);
        
        hideError();
        hideResults();
        showLoading();

        switch (currentTool) {
            case 'cms-detect':
                const cmsResults = await detectCMS(targetUrl);
                showResults(cmsResults);
                break;
            case 'header-check':
                const headerResults = await checkHeaders(targetUrl);
                showResults(headerResults);
                break;
            case 'dns-lookup':
                const dnsResults = await dnsLookup(targetUrl);
                showResults(dnsResults);
                break;
            case 'robots-check':
                const robotsResults = await checkRobots(targetUrl);
                showResults(robotsResults);
                break;
            case 'email-finder':
                const emailResults = await findEmails(targetUrl);
                showResults(emailResults);
                break;
            default:
                throw new Error('Tool not implemented');
        }
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

// Tool Implementations
export async function detectCMS(url) {
    try {
        const proxyUrl = `${CORS_PROXY}${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const html = await response.text();

        const results = {
            url: url,
            timestamp: new Date().toISOString(),
            detected: false,
            cms: null,
            confidence: 0,
            matches: [],
        };

        for (const [cms, patterns] of Object.entries(CMS_PATTERNS)) {
            let matches = 0;
            const foundPatterns = [];

            // Check patterns
            patterns.meta.forEach(pattern => {
                if (html.includes(pattern)) {
                    matches++;
                    foundPatterns.push(`Meta: ${pattern}`);
                }
            });

            patterns.scripts.forEach(pattern => {
                if (html.includes(pattern)) {
                    matches++;
                    foundPatterns.push(`Script: ${pattern}`);
                }
            });

            patterns.paths.forEach(pattern => {
                if (html.includes(pattern)) {
                    matches++;
                    foundPatterns.push(`Path: ${pattern}`);
                }
            });

            const totalPatterns = patterns.meta.length + patterns.scripts.length + patterns.paths.length;
            const confidence = Math.round((matches / totalPatterns) * 100);

            if (confidence > results.confidence) {
                results.detected = true;
                results.cms = cms;
                results.confidence = confidence;
                results.matches = foundPatterns;
            }
        }

        return results;
    } catch (error) {
        throw new Error(`Failed to analyze URL: ${error.message}`);
    }
}

export async function checkHeaders(url) {
    try {
        const proxyUrl = `${CORS_PROXY}${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl, { method: 'HEAD' });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const headers = {};
        for (const [key, value] of response.headers) {
            headers[key] = value;
        }
        
        return {
            url: url,
            timestamp: new Date().toISOString(),
            headers: headers
        };
    } catch (error) {
        throw new Error(`Failed to fetch headers: ${error.message}`);
    }
}

export async function dnsLookup(url) {
    try {
        const hostname = new URL(url).hostname;
        const response = await fetch(`https://dns.google/resolve?name=${hostname}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        return {
            url: url,
            timestamp: new Date().toISOString(),
            records: data.Answer || [],
            status: data.Status
        };
    } catch (error) {
        throw new Error(`Failed to perform DNS lookup: ${error.message}`);
    }
}

export async function checkRobots(url) {
    try {
        const robotsUrl = new URL('/robots.txt', url).href;
        const proxyUrl = `${CORS_PROXY}${encodeURIComponent(robotsUrl)}`;
        const response = await fetch(proxyUrl);
        
        if (!response.ok && response.status !== 404) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const content = await response.text();
        
        return {
            url: robotsUrl,
            timestamp: new Date().toISOString(),
            exists: response.ok,
            content: response.ok ? content : 'No robots.txt file found'
        };
    } catch (error) {
        throw new Error(`Failed to check robots.txt: ${error.message}`);
    }
}

export async function findEmails(url) {
    try {
        const proxyUrl = `${CORS_PROXY}${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const html = await response.text();
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const emails = [...new Set(html.match(emailRegex) || [])];
        
        return {
            url: url,
            timestamp: new Date().toISOString(),
            emails: emails,
            count: emails.length
        };
    } catch (error) {
        throw new Error(`Failed to find emails: ${error.message}`);
    }
}

// UI Helper functions
export function showLoading() {
    loadingDiv.classList.remove('hidden');
}

export function hideLoading() {
    loadingDiv.classList.add('hidden');
}

export function showError(message) {
    errorMessage.textContent = message;
    errorDiv.classList.remove('hidden');
}

export function hideError() {
    errorDiv.classList.add('hidden');
}

export function showResults(data) {
    let formattedResults = '';
    
    switch (currentTool) {
        case 'cms-detect':
            formattedResults = formatCMSResults(data);
            break;
        case 'header-check':
            formattedResults = formatHeaderResults(data);
            break;
        case 'dns-lookup':
            formattedResults = formatDNSResults(data);
            break;
        case 'robots-check':
            formattedResults = formatRobotsResults(data);
            break;
        case 'email-finder':
            formattedResults = formatEmailResults(data);
            break;
        default:
            formattedResults = JSON.stringify(data, null, 2);
    }
    
    resultsContent.textContent = formattedResults;
    resultsDiv.classList.remove('hidden');
}

export function hideResults() {
    resultsDiv.classList.add('hidden');
}

// Results formatters
export function formatCMSResults(data) {
    if (!data.detected) {
        return `No CMS detected for ${data.url}\nTimestamp: ${data.timestamp}`;
    }

    return `
CMS Detection Results for ${data.url}
Timestamp: ${data.timestamp}
Detected CMS: ${data.cms}
Confidence: ${data.confidence}%

Matches Found:
${data.matches.map(match => `• ${match}`).join('\n')}
`.trim();
}

export function formatHeaderResults(data) {
    return `
HTTP Headers for ${data.url}
Timestamp: ${data.timestamp}

${Object.entries(data.headers)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n')}
`.trim();
}

export function formatDNSResults(data) {
    const lines = [
        `DNS Lookup Results for ${data.hostname}`,
        `Timestamp: ${data.timestamp}\n`,
    ];

    for (const [type, records] of Object.entries(data.records)) {
        lines.push(`${type} Records:`);
        if (records.length === 0) {
            lines.push('  No records found');
        } else {
            records.forEach(record => {
                lines.push(`  ${record.name} -> ${record.data} (TTL: ${record.ttl})`);
            });
        }
        lines.push('');
    }

    return lines.join('\n');
}

export function formatRobotsResults(data) {
    const lines = [
        `Robots.txt Analysis for ${data.url}`,
        `Timestamp: ${data.timestamp}\n`,
    ];

    lines.push('Robots.txt Status:');
    if (data.exists) {
        lines.push('✓ Found');
        lines.push('\nRules:');
        lines.push(`  ${data.content}`);
    } else {
        lines.push('✗ Not Found');
    }

    return lines.join('\n');
}

export function formatEmailResults(data) {
    const lines = [
        `Email Finder Results for ${data.url}`,
        `Timestamp: ${data.timestamp}\n`,
        `Found ${data.count} unique email(s)\n`,
        'Email Addresses:',
    ];

    data.emails.forEach(email => lines.push(`  • ${email}`));
    
    return lines.join('\n');
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    urlInput.value = 'https://example.com';
}); 