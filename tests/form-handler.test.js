import { jest } from '@jest/globals';
import { handleFormSubmit, handleToolSelection } from '../docs/js/app.js';

describe('Form Handler and Tool Selection', () => {
  let form;
  let urlInput;
  let resultsDiv;
  let loadingDiv;
  let errorDiv;

  beforeEach(() => {
    // Set test environment
    process.env.NODE_ENV = 'test';

    // Setup DOM elements
    document.body.innerHTML = `
      <form id="analysis-form">
        <input type="url" id="target-url" value="https://example.com">
      </form>
      <div id="results" class="hidden">
        <div id="results-content">
          <pre></pre>
        </div>
      </div>
      <div id="error" class="hidden">
        <p id="error-message"></p>
      </div>
      <div id="loading" class="hidden"></div>
      <div class="tool-buttons">
        <button class="tool-btn active" data-tool="cms-detect">CMS Detector</button>
        <button class="tool-btn" data-tool="header-check">HTTP Header Analyzer</button>
        <button class="tool-btn" data-tool="dns-lookup">DNS Lookup</button>
      </div>
    `;

    form = document.getElementById('analysis-form');
    urlInput = document.getElementById('target-url');
    resultsDiv = document.getElementById('results');
    loadingDiv = document.getElementById('loading');
    errorDiv = document.getElementById('error');

    // Mock fetch
    global.fetch = jest.fn();
  });

  test('handles tool selection correctly', () => {
    const cmsButton = document.querySelector('[data-tool="cms-detect"]');
    const headerButton = document.querySelector('[data-tool="header-check"]');

    // Simulate clicking header check button
    handleToolSelection({ target: headerButton });

    expect(cmsButton.classList.contains('active')).toBe(false);
    expect(headerButton.classList.contains('active')).toBe(true);

    // Simulate clicking CMS detect button
    handleToolSelection({ target: cmsButton });

    expect(cmsButton.classList.contains('active')).toBe(true);
    expect(headerButton.classList.contains('active')).toBe(false);
  });

  test('form submission shows loading state', async () => {
    // Mock successful response
    global.fetch.mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(() => {
        resolve({
          ok: true,
          headers: new Map([['x-powered-by', 'WordPress']]),
          text: () => Promise.resolve('<meta name="generator" content="WordPress 6.0">'),
        });
      }, 100))
    );

    // Set active tool
    const cmsButton = document.querySelector('[data-tool="cms-detect"]');
    handleToolSelection({ target: cmsButton });

    // Submit form
    const event = { preventDefault: jest.fn(), target: form };
    const promise = handleFormSubmit(event);

    // Check loading state is shown immediately
    expect(loadingDiv.classList.contains('hidden')).toBe(false);
    expect(resultsDiv.classList.contains('hidden')).toBe(true);
    expect(errorDiv.classList.contains('hidden')).toBe(true);

    // Wait for completion
    await promise;
  });

  test('form submission handles successful response', async () => {
    // Mock successful CMS detection
    global.fetch.mockResolvedValueOnce({
      ok: true,
      headers: new Map([['x-powered-by', 'WordPress']]),
      text: () => Promise.resolve('<meta name="generator" content="WordPress 6.0">'),
    });

    // Set active tool
    const cmsButton = document.querySelector('[data-tool="cms-detect"]');
    handleToolSelection({ target: cmsButton });

    // Submit form
    const event = { preventDefault: jest.fn(), target: form };
    await handleFormSubmit(event);

    expect(loadingDiv.classList.contains('hidden')).toBe(true);
    expect(resultsDiv.classList.contains('hidden')).toBe(false);
    expect(errorDiv.classList.contains('hidden')).toBe(true);

    const resultsContent = document.querySelector('#results-content pre').textContent;
    const results = JSON.parse(resultsContent);
    expect(results.detected).toBe(true);
    expect(results.cms).toBe('wordpress');
    expect(results.confidence).toBeGreaterThan(40);
  });

  test('form submission handles errors', async () => {
    // Mock network error
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    // Set active tool
    const cmsButton = document.querySelector('[data-tool="cms-detect"]');
    handleToolSelection({ target: cmsButton });

    // Submit form
    const event = { preventDefault: jest.fn(), target: form };
    await handleFormSubmit(event);

    expect(loadingDiv.classList.contains('hidden')).toBe(true);
    expect(resultsDiv.classList.contains('hidden')).toBe(true);
    expect(errorDiv.classList.contains('hidden')).toBe(false);

    const errorMessage = document.querySelector('#error-message').textContent;
    expect(errorMessage).toContain('Network error');
  });

  test('form submission validates URL', async () => {
    // Set invalid URL
    urlInput.value = 'not-a-url';

    // Set active tool
    const cmsButton = document.querySelector('[data-tool="cms-detect"]');
    handleToolSelection({ target: cmsButton });

    // Submit form
    const event = { preventDefault: jest.fn(), target: form };
    await handleFormSubmit(event);

    // Check that error is shown and loading/results are hidden
    expect(loadingDiv.classList.contains('hidden')).toBe(true);
    expect(resultsDiv.classList.contains('hidden')).toBe(true);
    expect(errorDiv.classList.contains('hidden')).toBe(false);

    const errorMessage = document.querySelector('#error-message').textContent;
    expect(errorMessage).toBe('Invalid URL. Please enter a valid URL including http:// or https://');
  });

  test('form submission handles different tools', async () => {
    // Test CMS detection
    const cmsButton = document.querySelector('[data-tool="cms-detect"]');
    handleToolSelection({ target: cmsButton });

    global.fetch.mockResolvedValueOnce({
      ok: true,
      headers: new Map([['x-powered-by', 'WordPress']]),
      text: () => Promise.resolve('<meta name="generator" content="WordPress 6.0">'),
    });

    let event = { preventDefault: jest.fn(), target: form };
    await handleFormSubmit(event);

    let resultsContent = document.querySelector('#results-content pre').textContent;
    const cmsResults = JSON.parse(resultsContent);
    expect(cmsResults.title).toBe('CMS Detection Results');
    expect(cmsResults.detected).toBe(true);

    // Test header check
    const headerButton = document.querySelector('[data-tool="header-check"]');
    handleToolSelection({ target: headerButton });

    global.fetch.mockResolvedValueOnce({
      ok: true,
      headers: new Map([['server', 'nginx']]),
      text: () => Promise.resolve(''),
    });

    event = { preventDefault: jest.fn(), target: form };
    await handleFormSubmit(event);

    resultsContent = document.querySelector('#results-content pre').textContent;
    const headerResults = JSON.parse(resultsContent);
    expect(headerResults.title).toBe('HTTP Headers Analysis');
  });
}); 