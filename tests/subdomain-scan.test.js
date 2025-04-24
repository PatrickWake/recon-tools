import { jest } from '@jest/globals';
import { scanSubdomains } from '../docs/js/app.js';

describe('Subdomain Scanner Tool', () => {
    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();
        global.fetch = jest.fn();
        // Silence console warnings in tests
        jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    test('correctly detects active subdomains', async () => {
        // Mock successful subdomain responses
        const mockResponses = {
            'www': {
                Status: 0,
                Answer: [
                    { type: 1, data: '93.184.216.34' }
                ]
            },
            'api': {
                Status: 0,
                Answer: [
                    { type: 1, data: '93.184.216.35' },
                    { type: 28, data: '2606:2800:220:1:248:1893:25c8:1946' }
                ]
            }
        };

        // Setup fetch mock for successful responses
        global.fetch.mockImplementation(async (url) => {
            const subdomain = url.split('name=')[1].split('.')[0];
            if (mockResponses[subdomain]) {
                return {
                    ok: true,
                    json: () => Promise.resolve(mockResponses[subdomain])
                };
            }
            return {
                ok: true,
                json: () => Promise.resolve({ Status: 3 }) // NXDOMAIN
            };
        });

        const result = await scanSubdomains('example.com');

        // Verify the results
        expect(result).toHaveProperty('domain', 'example.com');
        expect(result).toHaveProperty('timestamp');
        expect(result).toHaveProperty('subdomains');
        expect(result.total).toBe(2);
        expect(result.subdomains).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    name: 'www.example.com',
                    records: [
                        expect.objectContaining({
                            type: 1,
                            data: '93.184.216.34'
                        })
                    ]
                }),
                expect.objectContaining({
                    name: 'api.example.com',
                    records: expect.arrayContaining([
                        expect.objectContaining({
                            type: 1,
                            data: '93.184.216.35'
                        }),
                        expect.objectContaining({
                            type: 28,
                            data: '2606:2800:220:1:248:1893:25c8:1946'
                        })
                    ])
                })
            ])
        );
    });

    test('handles DNS errors gracefully', async () => {
        // Mock DNS error
        global.fetch.mockRejectedValue(new Error('DNS resolution failed'));

        const result = await scanSubdomains('example.com');

        expect(result).toHaveProperty('domain', 'example.com');
        expect(result.total).toBe(0);
        expect(result.subdomains).toEqual([]);
    });

    test('handles rate limiting correctly', async () => {
        // Mock timing functions
        jest.useFakeTimers();

        // Mock a successful response
        global.fetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({
                Status: 0,
                Answer: [{ type: 1, data: '93.184.216.34' }]
            })
        });

        // Start scanning but don't await it
        const scanPromise = scanSubdomains('example.com');

        // Fast-forward timers one at a time
        for (let i = 0; i < 10; i++) {
            jest.advanceTimersByTime(1000);
            await Promise.resolve(); // Let promises resolve
        }

        const result = await scanPromise;

        expect(result).toHaveProperty('domain', 'example.com');
        expect(result.total).toBeGreaterThan(0);

        // Cleanup
        jest.useRealTimers();
    });

    test('handles invalid responses gracefully', async () => {
        // Mock invalid response
        global.fetch.mockResolvedValue({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error'
        });

        const result = await scanSubdomains('example.com');

        expect(result).toHaveProperty('domain', 'example.com');
        expect(result.total).toBe(0);
        expect(result.subdomains).toEqual([]);
    });
}); 