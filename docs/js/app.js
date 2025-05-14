// Import technology patterns
import { TECH_PATTERNS } from './tech-patterns.js';
import { logger } from './logger.js';

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
const CORS_PROXY = 'https://corsproxy.io/?'; // Primary proxy
const FALLBACK_CORS_PROXY = 'https://api.codetabs.com/v1/proxy?quest='; // Fallback proxy

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
    showError('Please enter a URL');
    return;
  }

  try {
    new URL(targetUrl);
  } catch (error) {
    showError('Please enter a valid URL');
    return;
  }

  if (!selectedTool) {
    showError('Please select a tool');
    return;
  }

  hideError();
  showLoading();
  hideResults();

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

    showResults(results);
  } catch (error) {
    showError(error.message);
  } finally {
    hideLoading();
  }
}

// Initialize the page
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const urlInput = document.getElementById('targetUrl');
    const toolButtons = document.querySelectorAll('.tool-btn');
    
    // Add event listeners if in browser environment
    toolButtons?.forEach((button) => {
      if (!button.disabled) {
        button.addEventListener('click', handleToolSelection);
      }
    });

    // Form submission handler
    const analysisForm = document.getElementById('scanForm');
    analysisForm?.addEventListener('submit', handleFormSubmit);

    // Set default URL
    if (urlInput) {
      urlInput.value = 'https://example.com';
    }
  });
}

function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// Helper function to check if a subdomain resolves
async function checkSubdomain(subdomain, domain) {
  try {
    const response = await fetch(`https://dns.google/resolve?name=${subdomain}.${domain}`);
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    if (data.Status === 0 && data.Answer && data.Answer.length > 0) {
      return {
        name: `${subdomain}.${domain}`,
        records: data.Answer.map((record) => ({
          type: record.type,
          data: record.data,
        })),
      };
    }
    return null;
  } catch (error) {
    // Log error but continue scanning
    return null;
  }
}

// Helper function to fetch with proxy
async function fetchWithProxy(url, proxyUrl) {
  const fullUrl = `${proxyUrl}${encodeURIComponent(url)}`;
  const response = await fetch(fullUrl);
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response;
}

// Helper function to extract headers
function extractHeaders(response) {
  if (response.headers instanceof Map) {
    const headers = {};
    for (const [key, value] of response.headers) {
      headers[key.toLowerCase()] = value;
    }
    return headers;
  }
  return Object.fromEntries(response.headers);
}

// Helper function to fetch content
async function fetchContent(url, testMode = false) {
  let response;
  
  if (testMode) {
    response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } else {
    try {
      response = await fetchWithProxy(url, CORS_PROXY);
    } catch (error) {
      logger.warn('Primary proxy failed, trying fallback', error);
      try {
        response = await fetchWithProxy(url, FALLBACK_CORS_PROXY);
      } catch (fallbackError) {
        throw new Error('Network error');
      }
    }
  }
  
  const html = await response.text();
  const headers = extractHeaders(response);
  
  return { html, headers };
}

// UI Helper Functions
function showLoading() {
  const loadingDiv = document.getElementById('loading');
  loadingDiv.classList.remove('hidden');
}

function hideLoading() {
  const loadingDiv = document.getElementById('loading');
  loadingDiv.classList.add('hidden');
}

function showError(message) {
  const errorDiv = document.getElementById('error');
  const errorMessage = document.getElementById('errorMessage');
  errorMessage.textContent = message;
  errorDiv.classList.remove('hidden');
}

function hideError() {
  const errorDiv = document.getElementById('error');
  errorDiv.classList.add('hidden');
}

function showResults(results) {
  const resultsDiv = document.getElementById('results');
  const resultsTitle = document.getElementById('resultsTitle');
  const resultsContent = document.getElementById('resultsContent');
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

function hideResults() {
  const resultsDiv = document.getElementById('results');
  resultsDiv.classList.add('hidden');
}

// Export all the tool functions
export { handleToolSelection, handleFormSubmit, detectCMS, detectTech, analyzeHeaders, dnsLookup, scanSubdomains, analyzeRobots, findEmails, analyzeSslTls }; 