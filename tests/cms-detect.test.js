import { jest, describe, it, expect, test } from '@jest/globals';
import { detectCMS } from '../docs/js/app.js';

describe('CMS Detection Tool', () => {
    beforeEach(() => {
        fetch.mockClear();
    });

    it('detects WordPress correctly', async () => {
        const mockHtml = `
            <meta name="generator" content="WordPress 5.8">
            <link rel="https://api.w.org/">
            <script src="wp-includes/js/wp-embed.min.js"></script>
        `;

        fetch.mockImplementationOnce(() => 
            Promise.resolve({
                ok: true,
                text: () => Promise.resolve(mockHtml)
            })
        );

        const result = await detectCMS('https://example.com');
        
        expect(result.detected).toBe(true);
        expect(result.cms).toBe('wordpress');
        expect(result.confidence).toBeGreaterThan(40);
    });

    test('handles errors gracefully', async () => {
        fetch.mockImplementationOnce(() => 
            Promise.reject(new Error('Network error'))
        );

        await expect(detectCMS('https://example.com'))
            .rejects
            .toThrow('Failed to analyze URL: Network error');
    });

    test('returns no detection for unknown CMS', async () => {
        fetch.mockImplementationOnce(() => 
            Promise.resolve({
                ok: true,
                text: () => Promise.resolve('<html><body>No CMS here</body></html>')
            })
        );

        const result = await detectCMS('https://example.com');
        
        expect(result.detected).toBe(false);
        expect(result.cms).toBeNull();
        expect(result.confidence).toBe(0);
    });
}); 