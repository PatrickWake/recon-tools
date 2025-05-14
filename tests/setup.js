import { jest } from '@jest/globals';
import 'whatwg-fetch';

// Mock DOM elements
document.body.innerHTML = `
    <form id="scanForm">
        <input type="url" id="targetUrl" value="https://example.com">
        <div class="tool-buttons">
            <button type="button" class="tool-btn" data-tool="tech-detect">Tech Stack</button>
            <button type="button" class="tool-btn" data-tool="cms-detect">CMS</button>
            <button type="button" class="tool-btn" data-tool="headers">Headers</button>
            <button type="button" class="tool-btn" data-tool="dns">DNS</button>
            <button type="button" class="tool-btn" data-tool="robots">Robots.txt</button>
            <button type="button" class="tool-btn" data-tool="emails">Emails</button>
            <button type="button" class="tool-btn" data-tool="ssl">SSL/TLS</button>
        </div>
        <button type="submit">Analyze</button>
    </form>
    <div id="loading" class="hidden">Loading...</div>
    <div id="error" class="hidden">
        <p id="errorMessage"></p>
    </div>
    <div id="results" class="hidden">
        <h3 id="resultsTitle"></h3>
        <pre id="resultsContent"></pre>
    </div>
`;

// Mock fetch responses
const mockResponses = {
  'https://example.com': {
    ok: true,
    status: 200,
    text: () =>
      Promise.resolve(`
        <!DOCTYPE html>
        <html>
            <head>
                <meta name="generator" content="WordPress 6.0">
                <link rel="https://api.w.org/">
            </head>
            <body>
                <script src="wp-embed.min.js"></script>
                <a href="mailto:test@example.com">Contact</a>
            </body>
        </html>
    `),
    headers: new Map([
      ['server', 'nginx'],
      ['content-type', 'text/html'],
      ['x-powered-by', 'PHP/7.4.0'],
    ]),
  },
  'https://example.com/robots.txt': {
    ok: true,
    status: 200,
    text: () =>
      Promise.resolve(`
        User-agent: *
        Disallow: /admin/
        Allow: /
        
        Sitemap: https://example.com/sitemap.xml
    `),
  },
};

// Mock fetch globally
global.fetch = jest.fn((url) => {
  // Handle proxy URLs by extracting the actual URL
  const actualUrl = url.includes('corsproxy.io')
    ? decodeURIComponent(url.split('corsproxy.io/?')[1])
    : url.includes('api.codetabs.com')
      ? decodeURIComponent(url.split('quest=')[1])
      : url;

  const response = mockResponses[actualUrl];
  if (response) {
    return Promise.resolve({
      ...response,
      // Ensure text method is properly mocked
      text: response.text || (() => Promise.resolve('')),
      // Ensure json method is properly mocked
      json: () => Promise.resolve(response.json || {}),
    });
  }

  // Default mock response for DNS queries
  if (url.startsWith('https://dns.google/resolve')) {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          Status: 0,
          Answer: [{ name: 'example.com.', type: 1, TTL: 3600, data: '93.184.216.34' }],
        }),
    });
  }

  // Default response for unmatched URLs
  return Promise.resolve({
    ok: true,
    status: 200,
    text: () => Promise.resolve(''),
    json: () => Promise.resolve({}),
    headers: new Map(),
  });
});
