describe('Recon Tools', () => {
    let app;

    beforeEach(async () => {
        // Reset fetch mock
        global.fetch.mockClear();
        
        // Reset DOM
        document.body.innerHTML = `
            <form id="analysis-form">
                <input type="url" id="target-url" value="https://example.com">
            </form>
            <div id="results" class="hidden">
                <div id="results-content"><pre></pre></div>
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

        // Import app.js
        app = require('../docs/js/app.js');
    });

    describe('CMS Detection', () => {
        it('should detect WordPress', async () => {
            const form = document.getElementById('analysis-form');
            form.dispatchEvent(new Event('submit'));

            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 0));

            const results = document.querySelector('#results-content pre').textContent;
            expect(results).toContain('WordPress');
            expect(results).toContain('100%');
        });
    });

    describe('HTTP Headers', () => {
        it('should fetch and display headers', async () => {
            // Switch to header check tool
            document.querySelector('[data-tool="header-check"]').click();
            
            const form = document.getElementById('analysis-form');
            form.dispatchEvent(new Event('submit'));

            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 0));

            const results = document.querySelector('#results-content pre').textContent;
            expect(results).toContain('server: nginx');
            expect(results).toContain('content-type: text/html');
        });
    });

    describe('DNS Lookup', () => {
        it('should perform DNS lookup', async () => {
            // Switch to DNS lookup tool
            document.querySelector('[data-tool="dns-lookup"]').click();
            
            const form = document.getElementById('analysis-form');
            form.dispatchEvent(new Event('submit'));

            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 0));

            const results = document.querySelector('#results-content pre').textContent;
            expect(results).toContain('93.184.216.34');
            expect(results).toContain('TTL: 3600');
        });
    });

    describe('Robots.txt Analysis', () => {
        it('should analyze robots.txt', async () => {
            // Switch to robots.txt analyzer tool
            document.querySelector('[data-tool="robots-check"]').click();
            
            const form = document.getElementById('analysis-form');
            form.dispatchEvent(new Event('submit'));

            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 0));

            const results = document.querySelector('#results-content pre').textContent;
            expect(results).toContain('✓ Found');
            expect(results).toContain('User-agent: *');
            expect(results).toContain('Disallow: /admin/');
        });
    });

    describe('Email Finder', () => {
        it('should find email addresses', async () => {
            // Switch to email finder tool
            document.querySelector('[data-tool="email-finder"]').click();
            
            const form = document.getElementById('analysis-form');
            form.dispatchEvent(new Event('submit'));

            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 0));

            const results = document.querySelector('#results-content pre').textContent;
            expect(results).toContain('test@example.com');
            expect(results).toContain('Found 1 unique email(s)');
        });
    });

    describe('Error Handling', () => {
        it('should handle invalid URLs', async () => {
            const urlInput = document.getElementById('target-url');
            urlInput.value = 'not-a-url';
            
            const form = document.getElementById('analysis-form');
            form.dispatchEvent(new Event('submit'));

            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 0));

            const errorMessage = document.getElementById('error-message').textContent;
            expect(errorMessage).toContain('Please enter a valid URL');
        });

        it('should handle fetch errors', async () => {
            const urlInput = document.getElementById('target-url');
            urlInput.value = 'https://non-existent-site.com';
            
            const form = document.getElementById('analysis-form');
            form.dispatchEvent(new Event('submit'));

            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 0));

            const errorMessage = document.getElementById('error-message').textContent;
            expect(errorMessage).toContain('Failed to');
        });
    });
}); 