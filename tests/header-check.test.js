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
      securityHeaders: {
        'content-security-policy': null,
        'strict-transport-security': 'max-age=31536000',
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'SAMEORIGIN',
        'x-xss-protection': null,
      },
      missingSecurityHeaders: expect.arrayContaining([
        'content-security-policy',
        'x-xss-protection',
      ]),
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

    expect(result.securityHeaders).toEqual({
      'content-security-policy': null,
      'strict-transport-security': null,
      'x-content-type-options': null,
      'x-frame-options': null,
      'x-xss-protection': null,
    });
    expect(result.missingSecurityHeaders).toEqual([
      'content-security-policy',
      'strict-transport-security',
      'x-content-type-options',
      'x-frame-options',
      'x-xss-protection',
    ]);
  });

  test('handles network errors gracefully', async () => {
    global.fetch
      .mockRejectedValueOnce(new Error('Primary proxy failed'))
      .mockRejectedValueOnce(new Error('Fallback proxy failed'));

    await expect(analyzeHeaders('https://example.com')).rejects.toThrow(
      'Failed to analyze headers: Network error'
    );
  });

  test('handles invalid responses gracefully', async () => {
    global.fetch
      .mockRejectedValueOnce(new Error('Primary proxy network failure'))
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Map(),
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
