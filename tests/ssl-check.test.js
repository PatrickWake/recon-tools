import { jest } from '@jest/globals';
import { analyzeSslTls } from '../docs/js/app.js';

describe('SSL/TLS Analyzer Tool', () => {
    beforeEach(() => {
        global.fetch = jest.fn();
    });

    const mockScanData = {
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
                vulnBeast: false
            }
        }]
    };

    test('correctly analyzes SSL/TLS configuration', async () => {
        global.fetch
            .mockResolvedValueOnce(Promise.resolve({
                json: () => Promise.resolve(mockScanData)
            }));

        const result = await analyzeSslTls('https://example.com');
        
        expect(result).toEqual({
            url: 'https://example.com',
            timestamp: expect.any(String),
            grade: 'A+',
            protocols: [
                { name: 'TLS', version: '1.3' },
                { name: 'TLS', version: '1.2' }
            ],
            vulnerabilities: {
                heartbleed: false,
                poodle: false,
                vulnBeast: false
            }
        });
    });

    test('handles in-progress scans correctly', async () => {
        const inProgressData = { status: 'IN_PROGRESS' };
        
        global.fetch
            .mockResolvedValueOnce(Promise.resolve({
                json: () => Promise.resolve(inProgressData)
            }))
            .mockResolvedValueOnce(Promise.resolve({
                json: () => Promise.resolve(mockScanData)
            }));

        const result = await analyzeSslTls('https://example.com', 100, 2);
        expect(result.grade).toBe('A+');
    });

    test('handles scan timeout', async () => {
        const inProgressData = { status: 'IN_PROGRESS' };
        
        global.fetch
            .mockResolvedValue(Promise.resolve({
                json: () => Promise.resolve(inProgressData)
            }));

        await expect(analyzeSslTls('https://example.com', 100, 1))
            .rejects
            .toThrow('SSL scan timed out');
    });

    test('handles API errors correctly', async () => {
        const errorData = {
            status: 'ERROR',
            statusMessage: 'Invalid hostname'
        };

        global.fetch
            .mockResolvedValueOnce(Promise.resolve({
                json: () => Promise.resolve(errorData)
            }));

        await expect(analyzeSslTls('https://example.com'))
            .rejects
            .toThrow('SSL Labs API Error: Invalid hostname');
    });

    test('handles invalid responses', async () => {
        const invalidData = {
            status: 'READY',
            endpoints: []
        };

        global.fetch
            .mockResolvedValueOnce(Promise.resolve({
                json: () => Promise.resolve(invalidData)
            }));

        await expect(analyzeSslTls('https://example.com'))
            .rejects
            .toThrow('Invalid response from SSL Labs API');
    });
}); 