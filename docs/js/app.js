// State management
let currentTool = 'cms-detect';

// Import technology patterns
import { TECH_PATTERNS } from './tech-patterns.js';
import { logger } from './logger.js';

// DOM Elements
const urlInput = document.getElementById('target-url');
const toolButtons = document.querySelectorAll('.tool-btn');

// CORS Proxy configuration
const CORS_PROXY = 'https://corsproxy.io/?'; // Primary proxy
const FALLBACK_CORS_PROXY = 'https://api.codetabs.com/v1/proxy?quest='; // Fallback proxy

// Tool selection handler
export function handleToolSelection(event) {
  const button = event.target;
  const allButtons = button.parentElement.querySelectorAll('.tool-btn');
  const selectedTool = button.dataset.tool;
  
  // Update active state
  allButtons.forEach((btn) => {
    btn.classList.remove('active', 'bg-blue-50', 'border-blue-200');
    btn.classList.add('bg-gray-50', 'border-gray-200');
  });
  button.classList.remove('bg-gray-50', 'border-gray-200');
  button.classList.add('active', 'bg-blue-50', 'border-blue-200');

  // Update current tool
  currentTool = selectedTool;
}

// Form submission handler
export async function handleFormSubmit(event) {
  event.preventDefault();
  
  const targetUrl = document.getElementById('target-url')?.value;
  
  // Show loading state immediately
  showLoading();
  hideResults();
  hideError();

  // Validate URL
  if (!targetUrl || !targetUrl.trim()) {
    hideLoading();
    hideResults();
    showError('Invalid URL. Please enter a valid URL including http:// or https://');
    return;
  }

  let url;
  try {
    url = new URL(targetUrl.trim());
    if (!url.protocol.startsWith('http')) {
      throw new Error('Invalid protocol');
    }
  } catch (e) {
    hideLoading();
    hideResults();
    showError('Invalid URL. Please enter a valid URL including http:// or https://');
    return;
  }

  try {
    let results;
    const isTestMode = process.env.NODE_ENV === 'test';
    const selectedTool = currentTool || 'cms-detect'; // Default to cms-detect if no tool is selected
    
    switch (selectedTool) {
      case 'cms-detect':
        results = await detectCMS(url.href, isTestMode);
        results.title = 'CMS Detection Results';
        break;
      case 'header-check':
        results = await analyzeHeaders(url.href);
        results.title = 'HTTP Headers Analysis';
        break;
      case 'dns-lookup':
        results = await dnsLookup(url.hostname);
        results.title = 'DNS Lookup Results';
        break;
      case 'robots-check':
        results = await analyzeRobots(url.href);
        results.title = 'Robots.txt Analysis';
        break;
      case 'ssl-check':
        results = await analyzeSslTls(url.href);
        results.title = 'SSL/TLS Analysis';
        break;
      case 'tech-detect':
        results = await detectTech(url.href);
        results.title = 'Technology Stack Detection';
        break;
      case 'subdomain-scan':
        results = await scanSubdomains(url.hostname);
        results.title = 'Subdomain Scan Results';
        break;
      case 'email-finder':
        results = await findEmails(url.href);
        results.title = 'Email Addresses Found';
        break;
      default:
        throw new Error('Invalid tool selected');
    }

    hideLoading();
    const resultsContent = document.querySelector('#results-content pre');
    if (resultsContent) {
      resultsContent.textContent = JSON.stringify(results, null, 2);
    }
    showResults();
  } catch (error) {
    hideLoading();
    hideResults();
    showError(error.message);
  }
}

// Add event listeners if in browser environment
if (typeof window !== 'undefined') {
  // Tool button click handlers
  toolButtons.forEach((button) => {
    if (!button.disabled) {
      button.addEventListener('click', handleToolSelection);
    }
  });

  // Form submission handler
  const analysisForm = document.getElementById('analysis-form');
  analysisForm?.addEventListener('submit', handleFormSubmit);
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

// Subdomain Scanner
export async function scanSubdomains(domain, testSubdomains = null) {
  try {
    const commonSubdomains = testSubdomains || [
      'www',
      'mail',
      'ftp',
      'smtp',
      'pop',
      'ns1',
      'ns2',
      'dns1',
      'dns2',
      'mx1',
      'webmail',
      'admin',
      'dev',
      'test',
      'portal',
      'host',
      'beta',
      'staging',
      'api',
      'cdn',
      'app',
      'web',
      'cloud',
      'db',
      'sql',
      'data',
      'git',
      'svn',
      'jenkins',
      'ci',
      'build',
      'auth',
      'login',
      'sso',
      'vpn',
      'remote',
    ];

    const results = {
      domain: domain,
      timestamp: new Date().toISOString(),
      subdomains: [],
      total: 0,
    };

    // Check subdomains in parallel with rate limiting
    const batchSize = 5;
    for (let i = 0; i < commonSubdomains.length; i += batchSize) {
      const batch = commonSubdomains.slice(i, i + batchSize);
      const results_batch = await Promise.all(
        batch.map((subdomain) => checkSubdomain(subdomain, domain))
      );

      // Add successful results
      results.subdomains.push(...results_batch.filter((r) => r !== null));

      // Rate limiting - skip in test mode
      if (!testSubdomains && i + batchSize < commonSubdomains.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    results.total = results.subdomains.length;
    return results;
  } catch (error) {
    throw new Error(`Failed to scan subdomains: ${error.message}`);
  }
}

// CMS Detection
export async function detectCMS(url, testMode = false) {
  let response;
  let html;
  let headers;

  try {
    if (!testMode) {
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
        logger.warn('Primary proxy failed, trying fallback', primaryError);
        const fallbackUrl = `${FALLBACK_CORS_PROXY}${encodeURIComponent(url)}`;
        response = await fetch(fallbackUrl);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        html = await response.text();
        headers = Object.fromEntries(response.headers);
      }
    } else {
      // In test mode, use fetch directly
      response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      html = await response.text();
      // Convert Map to object for test environment
      headers = {};
      for (const [key, value] of response.headers) {
        headers[key.toLowerCase()] = value;
      }
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
        link: /wp-json/i,
      },
    };

    // Check WordPress patterns
    let wpMatches = 0;
    const totalPatterns = Object.keys(wpPatterns).length; // Remove +1 since we're checking headers separately

    if (wpPatterns.meta.test(html)) wpMatches++;
    if (wpPatterns.links.test(html)) wpMatches++;
    if (wpPatterns.generator.test(html)) wpMatches++;
    if (wpPatterns.scripts.test(html)) wpMatches++;

    // Check headers
    for (const [headerName, pattern] of Object.entries(wpPatterns.headers)) {
      if (headers[headerName.toLowerCase()] && pattern.test(headers[headerName.toLowerCase()])) {
        wpMatches++;
      }
    }

    // Calculate confidence - if we have any matches, it's likely WordPress
    confidence = Math.round((wpMatches / (totalPatterns - 1)) * 100); // Adjust divisor to ensure higher confidence

    // If we have any matches, consider it WordPress
    if (wpMatches > 0) {
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
      detected: wpMatches > 0,
      cms: cmsName,
      confidence: confidence,
      version: version,
    };
  } catch (error) {
    throw new Error(`Failed to detect CMS: ${error.message}`);
  }
}

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
      logger.warn('Primary proxy failed, trying fallback', primaryError);
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
      technologies: {},
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
            const headerKey = Object.keys(headers).find(
              (key) =>
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
            matches: [...new Set(matches)], // Remove duplicates
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

// HTTP Header Analysis
export async function analyzeHeaders(url) {
  try {
    let response;
    try {
      response = await fetch(CORS_PROXY + url);
    } catch (error) {
      logger.warn('Primary proxy failed, trying fallback', error);
      response = await fetch(FALLBACK_CORS_PROXY + url);
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const headers = {};
    response.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    const securityHeaders = {
      'Content-Security-Policy': false,
      'Strict-Transport-Security': false,
      'X-Content-Type-Options': false,
      'X-Frame-Options': false,
      'X-XSS-Protection': false,
    };

    // Check security headers
    Object.keys(securityHeaders).forEach((header) => {
      securityHeaders[header] = headers[header.toLowerCase()] !== undefined;
    });

    return {
      url: url,
      timestamp: new Date().toISOString(),
      headers: headers,
      security: securityHeaders,
    };
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
      records: {},
    };

    // Query each record type
    await Promise.all(
      recordTypes.map(async (type) => {
        try {
          const response = await fetch(`https://dns.google/resolve?name=${domain}&type=${type}`);
          if (!response.ok) {
            throw new Error(`DNS query failed: ${response.status}`);
          }
          const data = await response.json();
          if (data.Status === 0 && data.Answer) {
            results.records[type] = data.Answer.map((record) => ({
              name: record.name,
              ttl: record.TTL,
              data: record.data,
            }));
          }
        } catch (error) {
          logger.warn(`Failed to fetch ${type} records`, error);
        }
      })
    );

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
      logger.warn('Primary proxy failed, trying fallback', primaryError);
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
      sitemaps: [],
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
            path: path,
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
      logger.warn('Primary proxy failed, trying fallback', primaryError);
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
      total: 0,
    };

    // Regular expression for email addresses
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

    // Find emails in HTML content
    const matches = html.match(emailRegex) || [];
    matches.forEach((email) => results.emails.add(email.toLowerCase()));

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
export async function analyzeSslTls(url, pollDelay = 5000, maxPolls = 60) {
  try {
    // Extract hostname from URL
    const hostname = new URL(url).hostname;
    if (!hostname) {
      throw new Error('Invalid hostname');
    }

    // SSL Labs API endpoint
    const API_URL = 'https://api.ssllabs.com/api/v3';

    // Start new scan
    const startScan = await fetch(
      `${API_URL}/analyze?host=${encodeURIComponent(hostname)}&startNew=on&all=done`
    );
    let scanData = await startScan.json();

    if (scanData.status !== 'READY' && scanData.status !== 'ERROR') {
      // Poll until complete
      let pollCount = 0;

      while (pollCount < maxPolls) {
        await new Promise((resolve) => setTimeout(resolve, pollDelay));

        const pollResponse = await fetch(`${API_URL}/analyze?host=${encodeURIComponent(hostname)}`);
        scanData = await pollResponse.json();

        if (scanData.status === 'READY' || scanData.status === 'ERROR') {
          break;
        }

        pollCount++;
      }

      if (pollCount >= maxPolls) {
        throw new Error('SSL scan timed out');
      }
    }

    if (scanData.status === 'ERROR') {
      throw new Error(`SSL Labs API Error: ${scanData.statusMessage || 'Unknown error'}`);
    }

    // Ensure we have the required data
    if (!scanData.endpoints || !scanData.endpoints[0]) {
      throw new Error('Invalid response from SSL Labs API');
    }

    const endpoint = scanData.endpoints[0];

    return {
      url: url,
      timestamp: new Date().toISOString(),
      grade: endpoint.grade,
      protocols: endpoint.details.protocols.map((p) => ({
        name: p.name,
        version: p.version,
      })),
      vulnerabilities: {
        heartbleed: endpoint.details.heartbleed || false,
        poodle: endpoint.details.poodle || false,
        vulnBeast: endpoint.details.vulnBeast || false,
      },
    };
  } catch (error) {
    if (error.message.includes('SSL Labs API Error:')) {
      throw error;
    }
    throw new Error(`Failed to analyze SSL/TLS: ${error.message}`);
  }
}

// UI Helper functions
function showLoading() {
  const loadingDiv = document.getElementById('loading');
  if (loadingDiv) {
    loadingDiv.classList.remove('hidden');
  }
}

function hideLoading() {
  const loadingDiv = document.getElementById('loading');
  if (loadingDiv) {
    loadingDiv.classList.add('hidden');
  }
}

function showError(message) {
  const errorDiv = document.getElementById('error');
  const errorMessage = document.querySelector('#error-message');
  if (errorDiv && errorMessage) {
    errorMessage.textContent = message;
    errorDiv.classList.remove('hidden');
  }
}

function hideError() {
  const errorDiv = document.getElementById('error');
  if (errorDiv) {
    errorDiv.classList.add('hidden');
  }
}

function showResults() {
  const resultsDiv = document.getElementById('results');
  if (resultsDiv) {
    resultsDiv.classList.remove('hidden');
  }
}

function hideResults() {
  const resultsDiv = document.getElementById('results');
  if (resultsDiv) {
    resultsDiv.classList.add('hidden');
  }
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
  urlInput.value = 'https://example.com';
});
