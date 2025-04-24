import { dnsLookup } from '../docs/js/app.js';

describe('DNS Lookup Tool', () => {
    beforeEach(() => {
        fetch.mockClear();
    });

    test('fetches DNS records successfully', async () => {
        const mockDNSResponse = {
            Answer: [
                { name: 'example.com.', data: '93.184.216.34', TTL: 300 }
            ]
        };

        fetch.mockImplementation(() => 
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve(mockDNSResponse)
            })
        );

        const result = await dnsLookup('https://example.com');
        
        expect(result.hostname).toBe('example.com');
        expect(result.records).toBeDefined();
        expect(result.records.A).toBeDefined();
        expect(result.records.A[0].data).toBe('93.184.216.34');
    });

    test('handles DNS lookup errors gracefully', async () => {
        fetch.mockImplementationOnce(() => 
            Promise.reject(new Error('DNS lookup failed'))
        );

        await expect(dnsLookup('https://example.com'))
            .rejects
            .toThrow('DNS lookup failed');
    });

    test('handles empty DNS responses', async () => {
        fetch.mockImplementation(() => 
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({})
            })
        );

        const result = await dnsLookup('https://example.com');
        
        expect(result.records).toBeDefined();
        expect(Object.values(result.records).every(arr => arr.length === 0)).toBe(true);
    });
}); 