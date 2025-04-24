import { jest } from '@jest/globals';
import { analyzeHeaders } from '../docs/js/app.js';

describe('HTTP Header Analyzer Tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  test('correctly analyzes HTTP headers', async () => {
    const mockHeaders = new Map([
      ['server', 'nginx/1.18.0'],
      ['content-type', 'text/html; charset=UTF-8'],
      ['x-powered-by', 'PHP/7.4.0'],
      ['strict-transport-security', 'max-age=31536000'],
      ['x-frame-options', 'SAMEORIGIN'],
      ['x-content-type-options', 'nosniff'],
    ]);

    global.fetch.mockResolvedValueOnce({
      ok: true,
      headers: mockHeaders,
    });

    const result = await analyzeHeaders('https://example.com');

    expect(result).toEqual({
      url: 'https://example.com',
      timestamp: expect.any(String),
      headers: {
        server: 'nginx/1.18.0',
        'content-type': 'text/html; charset=UTF-8',
        'x-powered-by': 'PHP/7.4.0',
        'strict-transport-security': 'max-age=31536000',
        'x-frame-options': 'SAMEORIGIN',
        'x-content-type-options': 'nosniff',
      },
      security: {
        'Content-Security-Policy': false,
        'Strict-Transport-Security': true,
        'X-Content-Type-Options': true,
        'X-Frame-Options': true,
        'X-XSS-Protection': false,
      },
    });
  });

  test('handles missing security headers correctly', async () => {
    const mockHeaders = new Map([
      ['server', 'nginx/1.18.0'],
      ['content-type', 'text/html'],
    ]);

    global.fetch.mockResolvedValueOnce({
      ok: true,
      headers: mockHeaders,
    });

    const result = await analyzeHeaders('https://example.com');

    expect(result.security).toEqual({
      'Content-Security-Policy': false,
      'Strict-Transport-Security': false,
      'X-Content-Type-Options': false,
      'X-Frame-Options': false,
      'X-XSS-Protection': false,
    });
  });

  test('handles network errors gracefully', async () => {
    global.fetch
      .mockRejectedValueOnce(new Error('Primary proxy failed'))
      .mockRejectedValueOnce(new Error('Network error'));

    await expect(analyzeHeaders('https://example.com')).rejects.toThrow(
      'Failed to analyze headers: Network error'
    );
  });

  test('handles invalid responses gracefully', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    await expect(analyzeHeaders('https://example.com')).rejects.toThrow(
      'Failed to analyze headers: HTTP error! status: 500'
    );
  });

  test('tries fallback proxy on primary proxy failure', async () => {
    const mockHeaders = new Map([
      ['server', 'nginx/1.18.0'],
      ['content-type', 'text/html'],
    ]);

    global.fetch.mockRejectedValueOnce(new Error('Primary proxy failed')).mockResolvedValueOnce({
      ok: true,
      headers: mockHeaders,
    });

    const result = await analyzeHeaders('https://example.com');

    expect(result).toHaveProperty('headers');
    expect(result.headers).toHaveProperty('server', 'nginx/1.18.0');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
