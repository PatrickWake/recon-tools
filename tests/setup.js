// Polyfill fetch for Node.js environment
require('whatwg-fetch');

// Mock DOM elements
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
        <button class="tool-btn" data-tool="robots-check">Robots.txt Analyzer</button>
        <button class="tool-btn" data-tool="email-finder">Email Finder</button>
    </div>
`;

// Mock fetch responses
const mockResponses = {
    'https://corsproxy.io/?https%3A%2F%2Fexample.com': {
        ok: true,
        status: 200,
        text: () => Promise.resolve(`
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
        ])
    },
    'https://corsproxy.io/?https%3A%2F%2Fexample.com%2Frobots.txt': {
        ok: true,
        status: 200,
        text: () => Promise.resolve(`
            User-agent: *
            Disallow: /admin/
            Allow: /
            
            Sitemap: https://example.com/sitemap.xml
        `)
    },
    'https://dns.google/resolve?name=example.com': {
        ok: true,
        status: 200,
        json: () => Promise.resolve({
            Status: 0,
            Answer: [
                {
                    name: 'example.com.',
                    type: 1,
                    TTL: 3600,
                    data: '93.184.216.34'
                }
            ]
        })
    }
};

// Mock fetch globally
global.fetch = jest.fn((url) => {
    const response = mockResponses[url];
    if (response) {
        return Promise.resolve(response);
    }
    return Promise.reject(new Error(`No mock response for ${url}`));
}); 