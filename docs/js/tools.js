// Import technology patterns
import { TECH_PATTERNS } from './tech-patterns.js';
import { logger } from './logger.js';

// CORS Proxy configuration
const CORS_PROXY = 'https://corsproxy.io/?'; // Primary proxy
const FALLBACK_CORS_PROXY = 'https://api.codetabs.com/v1/proxy?quest='; // Fallback proxy

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

// CMS Detection
export async function detectCMS(url, testMode = false) {
  try {
    const { html, headers } = await fetchContent(url, testMode);
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
    const totalPatterns = Object.keys(wpPatterns).length;

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

    // Calculate confidence
    confidence = Math.round((wpMatches / (totalPatterns - 1)) * 100);

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
  try {
    const { html, headers } = await fetchContent(url);
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
    const response = await fetchWithProxy(url);
    const headers = response.headers;
    const normalizedHeaders = {};

    // Normalize header keys to lowercase
    for (const [key, value] of headers.entries()) {
      normalizedHeaders[key.toLowerCase()] = value;
    }

    // Check for security headers
    const securityHeaders = {
      'content-security-policy': normalizedHeaders['content-security-policy'] || null,
      'strict-transport-security': normalizedHeaders['strict-transport-security'] || null,
      'x-content-type-options': normalizedHeaders['x-content-type-options'] || null,
      'x-frame-options': normalizedHeaders['x-frame-options'] || null,
      'x-xss-protection': normalizedHeaders['x-xss-protection'] || null
    };

    return {
      url,
      timestamp: new Date().toISOString(),
      headers: normalizedHeaders,
      securityHeaders,
      missingSecurityHeaders: Object.entries(securityHeaders)
        .filter(([_, value]) => !value)
        .map(([key]) => key)
    };
  } catch (error) {
    if (error.message.includes('Failed to fetch')) {
      throw new Error('Failed to analyze headers: Network error');
    }
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

// Robots.txt Analysis
export async function analyzeRobots(url) {
  try {
    const robotsUrl = new URL('/robots.txt', url).href;
    const { html: content } = await fetchContent(robotsUrl);

    const rules = [];
    const sitemaps = [];
    let currentUserAgent = '*';

    // Split content into lines and process each line
    const lines = content.split('\n');
    for (let line of lines) {
      line = line.trim();
      if (!line || line.startsWith('#')) continue;

      const [directive, ...valueParts] = line.split(':');
      const value = valueParts.join(':').trim();

      switch (directive.toLowerCase()) {
        case 'user-agent':
          currentUserAgent = value.toLowerCase();
          break;
        case 'allow':
          rules.push({
            userAgent: currentUserAgent,
            type: 'allow',
            path: value
          });
          break;
        case 'disallow':
          rules.push({
            userAgent: currentUserAgent,
            type: 'disallow',
            path: value
          });
          break;
        case 'sitemap':
          sitemaps.push(value);
          break;
      }
    }

    return {
      url: robotsUrl,
      timestamp: new Date().toISOString(),
      rules,
      sitemaps
    };
  } catch (error) {
    if (error.message.includes('HTTP error')) {
      throw new Error(`Failed to analyze robots.txt: HTTP error! status: ${error.message.split('status: ')[1]}`);
    }
    throw new Error(`Failed to analyze robots.txt: ${error.message}`);
  }
}

// Email Finder
export async function findEmails(url) {
  try {
    const { html: content } = await fetchContent(url);
    const emailSet = new Set();

    // Regular expression for email addresses
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

    // Find emails in text content
    const textEmails = content.match(emailRegex) || [];
    textEmails.forEach(email => emailSet.add(email.toLowerCase()));

    // Find emails in mailto links
    const mailtoRegex = /mailto:([^"'\s]+)/g;
    let match;
    while ((match = mailtoRegex.exec(content)) !== null) {
      const email = match[1];
      if (email.match(emailRegex)) {
        emailSet.add(email.toLowerCase());
      }
    }

    const emails = Array.from(emailSet);
    return {
      url,
      timestamp: new Date().toISOString(),
      emails,
      total: emails.length
    };
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