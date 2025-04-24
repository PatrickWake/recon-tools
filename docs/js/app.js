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
        new URL(targetUrl);
        
        hideError();
        hideResults();
        showLoading();

        const techResults = await detectTech(targetUrl);
        showResults(techResults);
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
    try {
        let response;
        let html;
        let headers;

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
    const lines = [
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

    if (lines.length === 2) {
        lines.push('No technologies detected');
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