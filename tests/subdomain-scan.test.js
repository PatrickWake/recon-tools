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
    // Reduce the number of subdomains to check in test
    jest.spyOn(global, 'setTimeout').mockImplementation((fn) => fn());

    // Mock successful subdomain responses
    const mockResponses = {
      www: {
        Status: 0,
        Answer: [{ type: 1, data: '93.184.216.34' }],
      },
      api: {
        Status: 0,
        Answer: [
          { type: 1, data: '93.184.216.35' },
          { type: 28, data: '2606:2800:220:1:248:1893:25c8:1946' },
        ],
      },
    };

    // Setup fetch mock for successful responses
    global.fetch.mockImplementation(async (url) => {
      const subdomain = url.split('name=')[1].split('.')[0];
      if (mockResponses[subdomain]) {
        return {
          ok: true,
          json: () => Promise.resolve(mockResponses[subdomain]),
        };
      }
      return {
        ok: true,
        json: () => Promise.resolve({ Status: 3 }), // NXDOMAIN
      };
    });

    const result = await scanSubdomains('example.com', ['www', 'api']); // Pass specific subdomains to test

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
              data: '93.184.216.34',
            }),
          ],
        }),
        expect.objectContaining({
          name: 'api.example.com',
          records: expect.arrayContaining([
            expect.objectContaining({
              type: 1,
              data: '93.184.216.35',
            }),
            expect.objectContaining({
              type: 28,
              data: '2606:2800:220:1:248:1893:25c8:1946',
            }),
          ]),
        }),
      ])
    );
  }, 10000); // Increase timeout to 10 seconds

  test('handles DNS errors gracefully', async () => {
    // Mock DNS error
    global.fetch.mockRejectedValue(new Error('DNS resolution failed'));
    jest.spyOn(global, 'setTimeout').mockImplementation((fn) => fn());

    const result = await scanSubdomains('example.com', ['www']); // Test with single subdomain

    expect(result).toHaveProperty('domain', 'example.com');
    expect(result.total).toBe(0);
    expect(result.subdomains).toEqual([]);
  }, 10000);

  test('handles rate limiting correctly', async () => {
    // Mock timing functions
    jest.useFakeTimers();

    // Mock a successful response
    global.fetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          Status: 0,
          Answer: [{ type: 1, data: '93.184.216.34' }],
        }),
    });

    // Start scanning with limited subdomains
    const scanPromise = scanSubdomains('example.com', ['www', 'api']);

    // Fast-forward timers one at a time
    jest.runAllTimers();
    await Promise.resolve(); // Let promises resolve

    const result = await scanPromise;

    expect(result).toHaveProperty('domain', 'example.com');
    expect(result.total).toBeGreaterThan(0);

    // Cleanup
    jest.useRealTimers();
  }, 10000);

  test('handles invalid responses gracefully', async () => {
    // Mock invalid response
    global.fetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });
    jest.spyOn(global, 'setTimeout').mockImplementation((fn) => fn());

    const result = await scanSubdomains('example.com', ['www']); // Test with single subdomain

    expect(result).toHaveProperty('domain', 'example.com');
    expect(result.total).toBe(0);
    expect(result.subdomains).toEqual([]);
  }, 10000);
});
