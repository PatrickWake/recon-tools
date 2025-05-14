import { jest } from '@jest/globals';
import { dnsLookup } from '../docs/js/app.js';

describe('DNS Lookup Tool', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  test('correctly fetches and parses DNS records', async () => {
    const mockResponses = {
      A: { Status: 0, Answer: [{ name: 'example.com.', TTL: 3600, data: '93.184.216.34' }] },
      AAAA: { Status: 0, Answer: [{ name: 'example.com.', TTL: 3600, data: '2606:2800:220:1:248:1893:25c8:1946' }] },
      MX: { Status: 0, Answer: [{ name: 'example.com.', TTL: 3600, data: '10 mail.example.com.' }] },
      NS: { Status: 0, Answer: [{ name: 'example.com.', TTL: 3600, data: 'ns1.example.com.' }] },
      TXT: { Status: 0, Answer: [{ name: 'example.com.', TTL: 3600, data: 'sample text record' }] },
      SOA: { Status: 0, Answer: [{ name: 'example.com.', TTL: 3600, data: 'ns1.example.com. hostmaster.example.com. 1 7200 3600 1209600 3600' }] },
    };

    global.fetch.mockImplementation(async (url) => {
      // Extract type from URL, e.g., https://dns.google/resolve?name=example.com&type=A
      const typeMatch = url.match(/type=([A-Z]+)/);
      const type = typeMatch ? typeMatch[1] : null;

      if (type && mockResponses[type]) {
        return { ok: true, json: async () => mockResponses[type] };
      }
      // Fallback for unrecognised types or if type isn't in URL (shouldn't happen for dns.google)
      return { ok: false, status: 404, json: async () => ({ error: 'Unknown type' }) };
    });

    const result = await dnsLookup('example.com');

    expect(result).toHaveProperty('domain', 'example.com');
    expect(result).toHaveProperty('timestamp');
    expect(result).toHaveProperty('records');
    expect(result.records.A).toEqual([expect.objectContaining({ data: '93.184.216.34' })]);
    expect(result.records.AAAA).toEqual([
      expect.objectContaining({ data: '2606:2800:220:1:248:1893:25c8:1946' }),
    ]);
    expect(result.records.MX).toEqual([expect.objectContaining({ data: '10 mail.example.com.' })]);
  });

  test('handles DNS query errors gracefully', async () => {
    global.fetch.mockRejectedValue(new Error('DNS resolution failed'));

    const result = await dnsLookup('example.com');
    expect(result).toHaveProperty('domain', 'example.com');
    expect(result.records).toEqual({}); // Expect empty records object on full failure
  });

  test('handles invalid responses gracefully', async () => {
    global.fetch.mockResolvedValue({ // For dnsLookup, direct fetch, not proxied
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: () => Promise.resolve({ error: 'Server Error' }), // Add json method
    });

    const result = await dnsLookup('example.com');
    expect(result).toHaveProperty('domain', 'example.com');
    expect(result.records).toEqual({}); // Expect empty records object
  });
});
