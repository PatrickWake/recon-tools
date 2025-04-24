import { fetchWithTimeout, createJsonResponse } from '../utils/http.js';

// CMS detection patterns
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
      'name="viewport" content="width=device-width, initial-scale=1.0"',
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

/**
 * Checks if HTML content matches any CMS patterns
 * @param {string} html - Raw HTML content
 * @param {string} url - Target URL
 * @returns {Object} Detected CMS information
 */
async function detectCMS(html, url) {
  const results = {
    detected: false,
    cms: null,
    confidence: 0,
    matches: [],
  };

  for (const [cms, patterns] of Object.entries(CMS_PATTERNS)) {
    let matches = 0;
    const foundPatterns = [];

    // Check meta patterns
    patterns.meta.forEach(pattern => {
      if (html.includes(pattern)) {
        matches++;
        foundPatterns.push(`Meta: ${pattern}`);
      }
    });

    // Check script patterns
    patterns.scripts.forEach(pattern => {
      if (html.includes(pattern)) {
        matches++;
        foundPatterns.push(`Script: ${pattern}`);
      }
    });

    // Check path patterns
    patterns.paths.forEach(pattern => {
      if (html.includes(pattern)) {
        matches++;
        foundPatterns.push(`Path: ${pattern}`);
      }
    });

    // Calculate confidence score (0-100)
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
}

/**
 * Main CMS detection handler for Cloudflare Worker
 * @param {string} targetUrl - URL to analyze
 * @param {Object} corsHeaders - CORS headers
 * @returns {Promise<Response>} JSON response with CMS detection results
 */
export async function cmsDetect(targetUrl, corsHeaders) {
  try {
    const response = await fetchWithTimeout(targetUrl, {
      timeout: 10000,
    });

    if (!response.ok) {
      return createJsonResponse({
        error: `Failed to fetch URL: ${response.status} ${response.statusText}`,
      }, corsHeaders, 400);
    }

    const html = await response.text();
    const results = await detectCMS(html, targetUrl);

    return createJsonResponse({
      url: targetUrl,
      timestamp: new Date().toISOString(),
      ...results,
    }, corsHeaders);
  } catch (error) {
    return createJsonResponse({
      error: `CMS detection failed: ${error.message}`,
    }, corsHeaders, 500);
  }
} 