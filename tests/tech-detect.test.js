import { jest } from '@jest/globals';
import { detectTech } from '../docs/js/app.js';

describe('Technology Detection Tool', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    global.fetch = jest.fn();
    // Silence console warnings in tests
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  test('correctly detects technologies from HTML and headers', async () => {
    // Mock response data
    const mockHtml = `
            <html>
                <head>
                    <script src="react.min.js"></script>
                    <script src="jquery.min.js"></script>
                </head>
                <body>
                    <div data-reactroot></div>
                </body>
            </html>
        `;

    const mockHeaders = {
      server: 'nginx', // This matches the pattern 'server: nginx'
      'x-powered-by': 'PHP/7.4.0',
    };

    // Mock fetch response
    global.fetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(mockHtml),
      headers: new Map(Object.entries(mockHeaders)),
    });

    const result = await detectTech('https://example.com');

    // Verify the results
    expect(result).toHaveProperty('technologies');
    expect(result.technologies).toHaveProperty('frameworks');
    expect(result.technologies.frameworks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'react',
          matches: expect.arrayContaining([
            expect.stringContaining('react'),
            expect.stringContaining('data-reactroot'),
          ]),
        }),
        expect.objectContaining({
          name: 'jquery',
          matches: expect.arrayContaining([expect.stringContaining('jquery')]),
        }),
      ])
    );

    // Server technology detection
    expect(result.technologies.server).toBeDefined();
    expect(result.technologies.server).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'nginx',
          matches: expect.arrayContaining([expect.stringContaining('server')]),
        }),
      ])
    );
  });

  test('handles network errors gracefully', async () => {
    // Mock both proxies failing
    global.fetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'));

    await expect(detectTech('https://example.com')).rejects.toThrow(
      'Failed to detect technologies: Network error'
    );
  });

  test('handles invalid response gracefully', async () => {
    // Mock both proxies returning 500
    global.fetch
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

    await expect(detectTech('https://example.com')).rejects.toThrow(
      'Failed to detect technologies: HTTP error! status: 500'
    );
  });

  test('handles empty or no matches gracefully', async () => {
    // Mock response with no technology matches
    global.fetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve('<html><body>Empty site</body></html>'),
      headers: new Map(),
    });

    const result = await detectTech('https://example.com');

    expect(result).toHaveProperty('technologies');
    expect(Object.keys(result.technologies)).toHaveLength(0);
  });

  test('tries fallback proxy on primary proxy failure', async () => {
    // Mock primary proxy failure
    global.fetch
      .mockRejectedValueOnce(new Error('Primary proxy failed'))
      // Mock successful fallback response
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('<html><script src="react.min.js"></script></html>'),
        headers: new Map(),
      });

    const result = await detectTech('https://example.com');

    expect(result).toHaveProperty('technologies');
    expect(result.technologies).toHaveProperty('frameworks');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
