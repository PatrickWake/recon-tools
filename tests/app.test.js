import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import {
    detectCMS,
    checkHeaders,
    dnsLookup,
    checkRobots,
    findEmails,
    showResults,
    showError
} from '../docs/js/app.js';

describe('Recon Tools', () => {
    beforeEach(() => {
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
    });

    describe('CMS Detection', () => {
        it('should detect WordPress', async () => {
            const results = await detectCMS('https://example.com');
            expect(results.detected).toBe(true);
            expect(results.cms).toBe('wordpress');
            expect(results.confidence).toBeGreaterThan(40);
        });
    });

    describe('HTTP Headers', () => {
        it('should fetch and display headers', async () => {
            const results = await checkHeaders('https://example.com');
            expect(results.headers['server']).toBe('nginx');
            expect(results.headers['content-type']).toBe('text/html');
        });
    });

    describe('DNS Lookup', () => {
        it('should perform DNS lookup', async () => {
            const results = await dnsLookup('https://example.com');
            expect(results.records[0].data).toBe('93.184.216.34');
            expect(results.records[0].TTL).toBe(3600);
            expect(results.status).toBe(0);
        });
    });

    describe('Robots.txt Analysis', () => {
        it('should analyze robots.txt', async () => {
            const results = await checkRobots('https://example.com');
            expect(results.exists).toBe(true);
            expect(results.content).toContain('User-agent: *');
            expect(results.content).toContain('Disallow: /admin/');
        });
    });

    describe('Email Finder', () => {
        it('should find email addresses', async () => {
            const results = await findEmails('https://example.com');
            expect(results.emails).toContain('test@example.com');
            expect(results.count).toBe(1);
        });
    });

    describe('Error Handling', () => {
        it('should handle invalid URLs', () => {
            expect(() => new URL('not-a-url')).toThrow();
        });

        it('should handle fetch errors', async () => {
            global.fetch.mockImplementationOnce(() => 
                Promise.reject(new Error('Network error'))
            );

            await expect(detectCMS('https://example.com'))
                .rejects
                .toThrow('Failed to analyze URL: Network error');
        });
    });
}); 