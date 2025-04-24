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
    if (!targetUrl) return;

    try {
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
            default:
                throw new Error('Tool not implemented');
        }
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
});

// Tool Implementations
async function detectCMS(url) {
    try {
        // Use a CORS proxy to fetch the target URL
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
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

async function checkHeaders(url) {
    try {
        // Use a CORS proxy to fetch headers
        const proxyUrl = `https://api.allorigins.win/head?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        const data = await response.json();
        
        return {
            url: url,
            timestamp: new Date().toISOString(),
            headers: data.headers || {},
        };
    } catch (error) {
        throw new Error(`Failed to fetch headers: ${error.message}`);
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
    let formattedResults = '';
    
    switch (currentTool) {
        case 'cms-detect':
            formattedResults = formatCMSResults(data);
            break;
        case 'header-check':
            formattedResults = formatHeaderResults(data);
            break;
        default:
            formattedResults = JSON.stringify(data, null, 2);
    }
    
    resultsContent.textContent = formattedResults;
    resultsDiv.classList.remove('hidden');
}

function hideResults() {
    resultsDiv.classList.add('hidden');
}

// Results formatters
function formatCMSResults(data) {
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

function formatHeaderResults(data) {
    return `
HTTP Headers for ${data.url}
Timestamp: ${data.timestamp}

${Object.entries(data.headers)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n')}
`.trim();
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    urlInput.value = 'https://example.com';
}); 