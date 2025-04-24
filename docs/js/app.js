// Configuration
const WORKER_URL = 'https://recon-tools.pwake.workers.dev';

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

        const response = await fetch(`${WORKER_URL}/${currentTool}?url=${encodeURIComponent(targetUrl)}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Analysis failed');
        }

        showResults(data);
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
});

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
    // Format the results based on the tool
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
    // Set example URL
    urlInput.value = 'https://example.com';
}); 