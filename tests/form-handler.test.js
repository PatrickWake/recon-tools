import { jest } from '@jest/globals';
import '../docs/js/app.js';
import { init as initApp } from '../docs/js/app.js';

describe('Form Handler', () => {
  let form;
  let urlInput;
  let resultsDiv;
  let errorDiv;
  let loadingDiv;
  let resultsContent;
  let errorMessage;

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

    // Get DOM elements
    form = document.getElementById('scanForm');
    urlInput = document.getElementById('targetUrl');
    resultsDiv = document.getElementById('results');
    errorDiv = document.getElementById('error');
    loadingDiv = document.getElementById('loading');
    resultsContent = document.getElementById('resultsContent');
    errorMessage = document.getElementById('errorMessage');

    // Mock fetch - REMOVING THIS LOCAL MOCK
    // global.fetch = jest.fn(() =>
    //   Promise.resolve({
    //     ok: true,
    //     json: () => Promise.resolve({
    //       cms: { name: 'WordPress', confidence: 100 },
    //       headers: { server: 'nginx' },
    //       dns: { A: ['93.184.216.34'] },
    //       robots: { sitemaps: ['sitemap.xml'] },
    //       emails: ['test@example.com'],
    //       tech: ['PHP', 'MySQL']
    //     })
    //   })
    // );
    
    initApp(); // Initialize app listeners after DOM is set up
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('handles tool selection correctly', () => {
    const buttons = document.querySelectorAll('.tool-btn');
    buttons.forEach(button => {
      button.click();
      expect(button.classList.contains('active')).toBe(true);
      expect(document.querySelectorAll('.tool-btn.active').length).toBe(1);
    });
  });

  test('validates URL format', async () => {
    urlInput.value = 'invalid-url';
    form.dispatchEvent(new Event('submit'));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(errorMessage.textContent).toBe('Please enter a valid URL');
    expect(errorDiv.classList.contains('hidden')).toBe(false);
  });

  test('handles empty URL', async () => {
    urlInput.value = '';
    form.dispatchEvent(new Event('submit'));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(errorMessage.textContent).toBe('Please enter a URL');
    expect(errorDiv.classList.contains('hidden')).toBe(false);
  });

  test('handles network error', async () => {
    document.querySelector('[data-tool="tech-detect"]').click();
    global.fetch = jest.fn(() => Promise.reject(new Error('Network error')));
    form.dispatchEvent(new Event('submit'));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(errorMessage.textContent).toContain('Network error');
    expect(errorDiv.classList.contains('hidden')).toBe(false);
  });

  const toolTests = [
    {
      tool: 'tech-detect',
      expectedTitle: 'Technology Stack Detection Results',
      expectedContent: 'PHP'
    },
    {
      tool: 'cms-detect',
      expectedTitle: 'CMS Detection Results',
      expectedContent: 'WordPress'
    },
    {
      tool: 'headers',
      expectedTitle: 'HTTP Headers Analysis Results',
      expectedContent: 'nginx'
    },
    {
      tool: 'dns',
      expectedTitle: 'DNS Lookup Results',
      expectedContent: '93.184.216.34'
    },
    {
      tool: 'robots',
      expectedTitle: 'Robots.txt Analysis Results',
      expectedContent: 'sitemap.xml'
    },
    {
      tool: 'emails',
      expectedTitle: 'Email Addresses Found',
      expectedContent: 'test@example.com'
    }
  ];

  toolTests.forEach(({ tool, expectedTitle, expectedContent }) => {
    test(`handles ${tool} analysis correctly`, async () => {
      const toolBtn = document.querySelector(`[data-tool="${tool}"]`);
      toolBtn.click();
      form.dispatchEvent(new Event('submit'));
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(loadingDiv.classList.contains('hidden')).toBe(true);
      expect(resultsDiv.classList.contains('hidden')).toBe(false);
      expect(document.getElementById('resultsTitle').textContent).toBe(expectedTitle);
      expect(resultsContent.textContent).toContain(expectedContent);
    });
  });
});
