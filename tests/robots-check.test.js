import { jest } from '@jest/globals';
import { analyzeRobots } from '../docs/js/app.js';

describe('Robots.txt Analyzer Tool', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  test('correctly parses robots.txt content', async () => {
    const mockRobotsTxt = `
            User-agent: *
            Disallow: /admin/
            Allow: /blog/
            
            User-agent: Googlebot
            Allow: /
            
            Sitemap: https://example.com/sitemap.xml
            Sitemap: https://example.com/posts-sitemap.xml
        `;

    // Mock successful response
    global.fetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(mockRobotsTxt),
    });

    const result = await analyzeRobots('https://example.com');

    // Verify the results
    expect(result).toHaveProperty('url', 'https://example.com/robots.txt');
    expect(result).toHaveProperty('timestamp');
    expect(result).toHaveProperty('rules');
    expect(result).toHaveProperty('sitemaps');

    // Check sitemaps
    expect(result.sitemaps).toEqual([
      'https://example.com/sitemap.xml',
      'https://example.com/posts-sitemap.xml',
    ]);

    // Check rules
    expect(result.rules).toEqual(
      expect.arrayContaining([
        {
          userAgent: '*',
          type: 'disallow',
          path: '/admin/',
        },
        {
          userAgent: '*',
          type: 'allow',
          path: '/blog/',
        },
        {
          userAgent: 'googlebot',
          type: 'allow',
          path: '/',
        },
      ])
    );
  });

  test('handles missing robots.txt gracefully', async () => {
    // Mock 404 response
    global.fetch.mockRejectedValueOnce(new Error('Primary proxy failed')).mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    await expect(analyzeRobots('https://example.com')).rejects.toThrow(
      'Failed to analyze robots.txt: HTTP error! status: 404'
    );
  });

  test('handles empty robots.txt correctly', async () => {
    // Mock empty response
    global.fetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(''),
    });

    const result = await analyzeRobots('https://example.com');
    expect(result.rules).toHaveLength(0);
    expect(result.sitemaps).toHaveLength(0);
  });

  test('handles network errors gracefully', async () => {
    // Mock network error for both proxies
    global.fetch
      .mockRejectedValueOnce(new Error('Primary proxy failed'))
      .mockRejectedValueOnce(new Error('Network error'));

    await expect(analyzeRobots('https://example.com')).rejects.toThrow(
      'Failed to analyze robots.txt: Network error'
    );
  });
});
