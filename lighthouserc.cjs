const PORT = process.env.LIGHTHOUSE_PORT || 3000;
const HOST = process.env.LIGHTHOUSE_HOST || 'localhost';
const BASE_URL = process.env.LIGHTHOUSE_URL || `http://${HOST}:${PORT}`;

module.exports = {
  ci: {
    collect: {
      startServerCommand: `npx serve docs -l ${PORT}`,
      url: [BASE_URL],
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
        chromeFlags: ['--no-sandbox']
      }
    },
    assert: {
      preset: 'lighthouse:no-pwa',
      assertions: {
        'categories:performance': ['warn', { minScore: 0.7 }],
        'categories:accessibility': ['warn', { minScore: 0.8 }],
        'categories:best-practices': ['warn', { minScore: 0.8 }],
        'categories:seo': ['warn', { minScore: 0.8 }],
        
        // Temporarily disable some checks during development
        'unused-css-rules': 'off',
        'unused-javascript': 'off',
        'color-contrast': 'warn',
        'meta-description': 'warn',
        'render-blocking-resources': 'warn',
        'uses-long-cache-ttl': 'off',
        'errors-in-console': 'warn',
        'link-name': 'warn'
      }
    },
    upload: {
      target: 'temporary-public-storage'
    }
  }
}; 