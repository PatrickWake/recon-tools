import { jest } from '@jest/globals';
import { analyzeSslTls } from '../docs/js/app.js';

describe('SSL/TLS Analyzer Tool', () => {
    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();
        global.fetch = jest.fn();
    });

    test('correctly analyzes SSL/TLS configuration', async () => {
        const mockScanResponse = {
            status: 'READY',
            endpoints: [{
                grade: 'A+',
                details: {
                    protocols: [
                        { name: 'TLS', version: '1.3' },
                        { name: 'TLS', version: '1.2' }
                    ],
                    heartbleed: false,
                    poodle: false,
                    freak: false,
                    logjam: false,
                    drownVulnerable: false
                }
            }],
            certs: [{
                subject: 'CN=example.com',
                issuer: 'CN=Let\'s Encrypt Authority X3',
                notBefore: 1612345678000,
                notAfter: 1617654321000,
                keyStrength: 2048
            }]
        };

        // Mock successful response
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockScanResponse)
        });

        const result = await analyzeSslTls('https://example.com');

        // Verify the results
        expect(result).toHaveProperty('url', 'https://example.com');
        expect(result).toHaveProperty('timestamp');
        expect(result).toHaveProperty('grade', 'A+');
        
        // Check protocols
        expect(result.details.protocols).toEqual([
            { name: 'TLS', version: '1.3' },
            { name: 'TLS', version: '1.2' }
        ]);

        // Check certificate
        expect(result.details.certificates[0]).toEqual({
            subject: 'CN=example.com',
            issuer: 'CN=Let\'s Encrypt Authority X3',
            validFrom: 1612345678000,
            validTo: 1617654321000,
            keyStrength: 2048
        });

        // Check vulnerabilities
        expect(result.details.vulnerabilities).toEqual({
            heartbleed: false,
            poodle: false,
            freak: false,
            logjam: false,
            drownVulnerable: false
        });
    });

    test('handles scan in progress correctly', async () => {
        const inProgressResponse = {
            status: 'IN_PROGRESS',
            endpoints: []
        };

        const completedResponse = {
            status: 'READY',
            endpoints: [{
                grade: 'A',
                details: {
                    protocols: [{ name: 'TLS', version: '1.2' }],
                    heartbleed: false,
                    poodle: false,
                    freak: false,
                    logjam: false,
                    drownVulnerable: false
                }
            }],
            certs: [{
                subject: 'CN=example.com',
                issuer: 'CN=Let\'s Encrypt Authority X3',
                notBefore: 1612345678000,
                notAfter: 1617654321000,
                keyStrength: 2048
            }]
        };

        // Mock responses for polling
        global.fetch
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(inProgressResponse)
            })
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(completedResponse)
            });

        const result = await analyzeSslTls('https://example.com', 100);
        expect(result.grade).toBe('A');
    }, 15000);

    test('handles errors gracefully', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
                status: 'ERROR',
                statusMessage: 'Unable to resolve hostname'
            })
        });

        await expect(analyzeSslTls('https://nonexistent.example.com'))
            .rejects
            .toThrow('Failed to analyze SSL/TLS: Unable to resolve hostname');
    });
}); 