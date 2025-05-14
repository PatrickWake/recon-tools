import { jest } from '@jest/globals';
// Import app.js and its init function AFTER we potentially redefine fetch for this suite
// import '../docs/js/app.js';
// import { init as initApp } from '../docs/js/app.js';

// Re-define a simplified version of setup.js's fetch mock locally for this test suite
// to ensure it's active and not interfered with.
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
    headers: new Map(), // Added headers for consistency
  },
};

const dnsGoogleMock = (url) => {
  // Simplified from dns-lookup.test.js, assuming generic success for form-handler
  const typeMatch = url.match(/type=([A-Z]+)/);
  const type = typeMatch ? typeMatch[1] : 'A';
  let answerData = '93.184.216.34'; // Default A record
  if (type === 'AAAA') answerData = '2606:2800:220:1:248:1893:25c8:1946';
  if (type === 'MX') answerData = '10 mail.example.com.';

  return Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve({
        Status: 0,
        Answer: [{ name: 'example.com.', TTL: 3600, data: answerData }],
      }),
  });
};

describe('Form Handler', () => {
  let form;
  let urlInput;
  let resultsDiv;
  let errorDiv;
  let loadingDiv;
  let resultsContent;
  let errorMessage;
  let originalGlobalFetch;

  beforeAll(() => {
    // Store original global fetch if it exists from setup.js, though we'll override.
    originalGlobalFetch = global.fetch;
  });

  afterAll(() => {
    // Restore original global fetch.
    global.fetch = originalGlobalFetch;
  });

  beforeEach(() => {
    // Reset DOM elements
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

    form = document.getElementById('scanForm');
    urlInput = document.getElementById('targetUrl');
    resultsDiv = document.getElementById('results');
    errorDiv = document.getElementById('error');
    loadingDiv = document.getElementById('loading');
    resultsContent = document.getElementById('resultsContent');
    errorMessage = document.getElementById('errorMessage');

    // Define the fetch mock for this suite
    global.fetch = jest.fn((url) => {
      const actualUrl = url.includes('corsproxy.io/?')
        ? decodeURIComponent(url.split('corsproxy.io/?')[1])
        : url.includes('api.codetabs.com/v1/proxy?quest=')
          ? decodeURIComponent(url.split('quest=')[1])
          : url;

      const responseData = mockResponses[actualUrl];
      if (responseData) {
        return Promise.resolve({
          ok: responseData.ok !== undefined ? responseData.ok : true,
          status: responseData.status || 200,
          text: responseData.text || (() => Promise.resolve('')),
          json:
            responseData.json ||
            (() => Promise.resolve(responseData.Status !== undefined ? responseData : {})), // For DNS-like direct JSON data
          headers: responseData.headers || new Map(),
        });
      }

      if (url.startsWith('https://dns.google/resolve')) {
        return dnsGoogleMock(url);
      }

      // Fallback for any other unhandled URL during these tests
      return Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve('Fallback content for unmocked URL in form-handler.test.js'),
        json: () => Promise.resolve({ message: 'Fallback JSON' }),
        headers: new Map(),
      });
    });

    // Dynamically import app and init AFTER fetch is mocked for this suite.
    // This is to ensure app.js uses this suite's fetch mock.
    const appModule = require('../docs/js/app.js');
    appModule.init();
  });

  afterEach(() => {
    jest.clearAllMocks(); // Clears call counts etc. for global.fetch
    // global.fetch might be restored in afterAll or managed by spy in specific tests
  });

  test('handles tool selection correctly', () => {
    const buttons = document.querySelectorAll('.tool-btn');
    buttons.forEach((button) => {
      button.click();
      expect(button.classList.contains('active')).toBe(true);
      expect(document.querySelectorAll('.tool-btn.active').length).toBe(1);
    });
  });

  test('validates URL format', async () => {
    urlInput.value = 'invalid-url';
    form.dispatchEvent(new Event('submit'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(errorMessage.textContent).toBe('Please enter a valid URL');
    expect(errorDiv.classList.contains('hidden')).toBe(false);
  });

  test('handles empty URL', async () => {
    urlInput.value = '';
    form.dispatchEvent(new Event('submit'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(errorMessage.textContent).toBe('Please enter a URL');
    expect(errorDiv.classList.contains('hidden')).toBe(false);
  });

  test('handles network error', async () => {
    document.querySelector('[data-tool="tech-detect"]').click();
    // This test will use the global.fetch defined in beforeEach,
    // but we'll specifically make it reject for this test case.
    global.fetch.mockImplementationOnce(() => Promise.reject(new Error('Network error')));

    form.dispatchEvent(new Event('submit'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(errorMessage.textContent).toContain('Network error'); // Should now be "Failed to detect technologies: Network error" or similar
    expect(errorDiv.classList.contains('hidden')).toBe(false);
    // No need to restore global.fetch if beforeEach re-assigns it every time.
  });

  const toolTests = [
    {
      tool: 'tech-detect',
      expectedTitle: 'Technology Stack Detection Results',
      expectedContent: 'nginx',
    },
    {
      tool: 'cms-detect',
      expectedTitle: 'CMS Detection Results',
      expectedContent: 'wordpress',
    },
    {
      tool: 'headers',
      expectedTitle: 'HTTP Headers Analysis Results',
      expectedContent: 'nginx',
    },
    {
      tool: 'dns',
      expectedTitle: 'DNS Lookup Results',
      expectedContent: '93.184.216.34',
    },
    {
      tool: 'robots',
      expectedTitle: 'Robots.txt Analysis Results',
      expectedContent: 'sitemap.xml',
    },
    {
      tool: 'emails',
      expectedTitle: 'Email Addresses Found',
      expectedContent: 'test@example.com',
    },
  ];

  toolTests.forEach(({ tool, expectedTitle, expectedContent }) => {
    test(`handles ${tool} analysis correctly`, async () => {
      const toolBtn = document.querySelector(`[data-tool="${tool}"]`);
      toolBtn.click();
      form.dispatchEvent(new Event('submit'));

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(loadingDiv.classList.contains('hidden')).toBe(true);
      expect(resultsDiv.classList.contains('hidden')).toBe(false);
      expect(document.getElementById('resultsTitle').textContent).toBe(expectedTitle);
      expect(resultsContent.textContent).toContain(expectedContent);
    });
  });
});
