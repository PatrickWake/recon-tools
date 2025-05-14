import { jest } from '@jest/globals';
import { findEmails } from '../docs/js/app.js';

describe('Email Finder Tool', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  test('correctly finds email addresses in HTML content', async () => {
    const mockHtml = `
            <html>
                <body>
                    <p>Contact us at support@example.com</p>
                    <a href="mailto:info@example.com">Email us</a>
                    <div>
                        Sales: sales@example.com
                        <a href="mailto:contact@example.com">Contact</a>
                        <span>Invalid.email@</span>
                    </div>
                </body>
            </html>
        `;

    // Mock successful response
    global.fetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(mockHtml),
      headers: new Map(),
    });

    const result = await findEmails('https://example.com');

    // Verify the results
    expect(result).toHaveProperty('url', 'https://example.com');
    expect(result).toHaveProperty('timestamp');
    expect(result).toHaveProperty('emails');
    expect(result).toHaveProperty('total');

    // Check found emails
    expect(result.emails).toEqual(
      expect.arrayContaining([
        'support@example.com',
        'info@example.com',
        'sales@example.com',
        'contact@example.com',
      ])
    );

    // Check total count
    expect(result.total).toBe(4);

    // Verify no duplicates
    expect(new Set(result.emails).size).toBe(result.emails.length);
  });

  test('handles pages with no emails correctly', async () => {
    // Mock response with no emails
    global.fetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve('<html><body>No emails here</body></html>'),
      headers: new Map(),
    });

    const result = await findEmails('https://example.com');
    expect(result.emails).toEqual([]);
    expect(result.total).toBe(0);
  });

  test('handles network errors gracefully', async () => {
    // Mock network error for both proxies
    global.fetch
      .mockRejectedValueOnce(new Error('Primary proxy failed'))
      .mockRejectedValueOnce(new Error('Network error'));

    await expect(findEmails('https://example.com')).rejects.toThrow(
      'Failed to find emails: Network error'
    );
  });

  test('normalizes email addresses to lowercase', async () => {
    const mockHtml = `
            <html>
                <body>
                    <p>Contact: Support@Example.com</p>
                    <a href="mailto:INFO@EXAMPLE.COM">Email</a>
                </body>
            </html>
        `;

    global.fetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(mockHtml),
      headers: new Map(),
    });

    const result = await findEmails('https://example.com');
    expect(result.emails).toEqual(
      expect.arrayContaining(['support@example.com', 'info@example.com'])
    );
  });
});
