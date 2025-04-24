import { jest, describe, it, expect, test } from '@jest/globals';
import { dnsLookup } from '../docs/js/app.js';

describe('DNS Lookup Tool', () => {
    it('fetches DNS records successfully', async () => {
        const result = await dnsLookup('https://example.com');
        
        expect(result.records[0].data).toBe('93.184.216.34');
        expect(result.records[0].TTL).toBe(3600);
        expect(result.status).toBe(0);
    });

    test('handles DNS lookup errors gracefully', async () => {
        global.fetch.mockImplementationOnce(() => 
            Promise.reject(new Error('Network error'))
        );

        await expect(dnsLookup('https://example.com'))
            .rejects
            .toThrow('Failed to perform DNS lookup: Network error');
    });

    test('handles empty DNS responses', async () => {
        global.fetch.mockImplementationOnce(() => 
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({
                    Status: 0,
                    Answer: []
                })
            })
        );

        const result = await dnsLookup('https://example.com');
        
        expect(result.records).toEqual([]);
        expect(result.status).toBe(0);
    });
}); 