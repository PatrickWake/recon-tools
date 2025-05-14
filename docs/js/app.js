// Import tool functions
import {
  detectCMS,
  detectTech,
  analyzeHeaders,
  dnsLookup,
  scanSubdomains,
  analyzeRobots,
  findEmails,
  analyzeSslTls,
} from './tools.js';

// CORS Proxy configuration

// Tool selection handler
function handleToolSelection(event) {
  const button = event.currentTarget;
  if (!button || button.disabled) return;

  // Remove active class from all buttons
  document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
  
  // Add active class to clicked button
  button.classList.add('active');
}

// Form submission handler
async function handleFormSubmit(event) {
  event.preventDefault();

  const targetUrl = document.getElementById('targetUrl').value.trim();
  const selectedTool = document.querySelector('.tool-btn.active')?.dataset.tool;
  const loadingDiv = document.getElementById('loading');
  const resultsDiv = document.getElementById('results');
  const errorDiv = document.getElementById('error');
  const resultsContent = document.getElementById('resultsContent');
  const errorMessage = document.getElementById('errorMessage');

  // Validate URL
  if (!targetUrl) {
    showError('Please enter a URL', errorDiv, errorMessage);
    return;
  }

  try {
    new URL(targetUrl);
  } catch (error) {
    showError('Please enter a valid URL', errorDiv, errorMessage);
    return;
  }

  if (!selectedTool) {
    showError('Please select a tool', errorDiv, errorMessage);
    return;
  }

  hideError(errorDiv);
  showLoading(loadingDiv);
  hideResults(resultsDiv);

  try {
    let results;
    switch (selectedTool) {
      case 'tech-detect':
        results = await detectTech(targetUrl);
        break;
      case 'cms-detect':
        results = await detectCMS(targetUrl);
        break;
      case 'headers':
        results = await analyzeHeaders(targetUrl);
        break;
      case 'dns':
        results = await dnsLookup(new URL(targetUrl).hostname);
        break;
      case 'subdomains':
        results = await scanSubdomains(new URL(targetUrl).hostname);
        break;
      case 'robots':
        results = await analyzeRobots(targetUrl);
        break;
      case 'emails':
        results = await findEmails(targetUrl);
        break;
      case 'ssl':
        results = await analyzeSslTls(targetUrl);
        break;
      default:
        throw new Error('Please select a tool');
    }

    showResults(results, resultsDiv, resultsContent, document.getElementById('resultsTitle'));
  } catch (error) {
    showError(error.message, errorDiv, errorMessage);
  } finally {
    hideLoading(loadingDiv);
  }
}

// Function to initialize event listeners and page setup
function init() {
  const urlInput = document.getElementById('targetUrl');
  const toolButtons = document.querySelectorAll('.tool-btn');
  
  toolButtons?.forEach((button) => {
    if (!button.disabled) {
      button.addEventListener('click', handleToolSelection);
    }
  });

  const analysisForm = document.getElementById('scanForm');
  analysisForm?.addEventListener('submit', handleFormSubmit);

  if (urlInput) {
    urlInput.value = 'https://example.com';
  }
}

// Initialize the page if in a browser environment
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', init);
}

// UI Helper Functions
function showLoading(loadingDiv) {
  loadingDiv.classList.remove('hidden');
}

function hideLoading(loadingDiv) {
  loadingDiv.classList.add('hidden');
}

function showError(message, errorDiv, errorMessage) {
  errorMessage.textContent = message;
  errorDiv.classList.remove('hidden');
}

function hideError(errorDiv) {
  errorDiv.classList.add('hidden');
}

function showResults(results, resultsDiv, resultsContent, resultsTitle) {
  const selectedTool = document.querySelector('.tool-btn.active')?.dataset.tool;

  // Set title based on selected tool
  const titles = {
    'tech-detect': 'Technology Stack Detection Results',
    'cms-detect': 'CMS Detection Results',
    'headers': 'HTTP Headers Analysis Results',
    'dns': 'DNS Lookup Results',
    'robots': 'Robots.txt Analysis Results',
    'emails': 'Email Addresses Found',
    'ssl-tls': 'SSL/TLS Analysis Results',
    'subdomains': 'Subdomain Scan Results'
  };
  resultsTitle.textContent = titles[selectedTool] || 'Analysis Results';

  // Format results
  if (typeof results === 'object' && results !== null) {
    resultsContent.textContent = JSON.stringify(results, null, 2);
  } else {
    resultsContent.textContent = results;
  }

  // Show results
  resultsDiv.classList.remove('hidden');
}

function hideResults(resultsDiv) {
  resultsDiv.classList.add('hidden');
}

// Export functions needed for testing or other modules
export { handleToolSelection, handleFormSubmit, detectCMS, detectTech, analyzeHeaders, dnsLookup, scanSubdomains, analyzeRobots, findEmails, analyzeSslTls, init }; // Export init for testing 