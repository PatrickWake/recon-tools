import { jest } from '@jest/globals';
import { dnsLookup } from '../docs/js/app.js';

describe('DNS Lookup Tool', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  test('correctly fetches and parses DNS records', async () => {
    // Mock responses for different record types
    const mockResponses = {
      A: {
        Status: 0,
        Answer: [{ name: 'example.com.', TTL: 3600, data: '93.184.216.34' }],
      },
      AAAA: {
        Status: 0,
        Answer: [{ name: 'example.com.', TTL: 3600, data: '2606:2800:220:1:248:1893:25c8:1946' }],
      },
      MX: {
        Status: 0,
        Answer: [{ name: 'example.com.', TTL: 3600, data: '10 mail.example.com.' }],
      },
    };

    // Setup fetch mock for different record types
    global.fetch.mockImplementation((url) => {
      const type = url.match(/type=([A-Z]+)/)[1];
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponses[type] || { Status: 0 }),
      });
    });

    const result = await dnsLookup('example.com');

    // Verify the results
    expect(result).toHaveProperty('domain', 'example.com');
    expect(result).toHaveProperty('timestamp');
    expect(result).toHaveProperty('records');

    // Check A record
    expect(result.records.A).toEqual([
      expect.objectContaining({
        name: 'example.com.',
        ttl: 3600,
        data: '93.184.216.34',
      }),
    ]);

    // Check AAAA record
    expect(result.records.AAAA).toEqual([
      expect.objectContaining({
        name: 'example.com.',
        ttl: 3600,
        data: '2606:2800:220:1:248:1893:25c8:1946',
      }),
    ]);

    // Check MX record
    expect(result.records.MX).toEqual([
      expect.objectContaining({
        name: 'example.com.',
        ttl: 3600,
        data: '10 mail.example.com.',
      }),
    ]);
  });

  test('handles DNS query errors gracefully', async () => {
    global.fetch.mockRejectedValue(new Error('DNS resolution failed'));

    const result = await dnsLookup('example.com');
    expect(result).toHaveProperty('domain', 'example.com');
    expect(result.records).toEqual({});
  });

  test('handles invalid responses gracefully', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    const result = await dnsLookup('example.com');
    expect(result).toHaveProperty('domain', 'example.com');
    expect(result.records).toEqual({});
  });
});
