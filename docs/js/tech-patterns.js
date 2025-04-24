export const TECH_PATTERNS = {
    frameworks: {
        react: {
            scripts: ['react.', 'react-dom.'],
            html: ['data-reactroot', 'data-reactid']
        },
        vue: {
            scripts: ['vue.', 'nuxt'],
            html: ['data-v-', '__vue__']
        },
        angular: {
            scripts: ['angular.'],
            html: ['ng-', '[ng-']
        },
        jquery: {
            scripts: ['jquery.'],
            html: ['jquery']
        }
    },
    analytics: {
        'google-analytics': {
            scripts: ['google-analytics.com', 'ga.js', 'gtag'],
            html: ['GoogleAnalyticsObject', 'ga(', 'gtag(']
        },
        'google-tag-manager': {
            scripts: ['googletagmanager.com'],
            html: ['google_tag_manager', 'GTM-']
        }
    },
    cdn: {
        cloudflare: {
            headers: ['cf-ray', 'cf-cache-status'],
            html: ['cloudflare']
        },
        akamai: {
            headers: ['x-akamai-transformed', 'akamai-origin-hop']
        },
        fastly: {
            headers: ['fastly-io-info', 'x-fastly']
        }
    },
    security: {
        'security-headers': {
            headers: [
                'content-security-policy',
                'x-frame-options',
                'x-xss-protection',
                'x-content-type-options',
                'strict-transport-security'
            ]
        }
    },
    server: {
        nginx: {
            headers: ['server: nginx', 'x-nginx']
        },
        apache: {
            headers: ['server: apache', 'x-powered-by: php']
        },
        iis: {
            headers: ['server: microsoft-iis', 'x-powered-by: asp.net']
        }
    },
    advertising: {
        'google-ads': {
            scripts: ['pagead2.googlesyndication.com', 'adsbygoogle'],
            html: ['adsbygoogle']
        },
        'facebook-pixel': {
            scripts: ['connect.facebook.net/fbevents.js'],
            html: ['fbq(']
        }
    },
    ecommerce: {
        'woocommerce': {
            scripts: ['woocommerce'],
            html: ['woocommerce', 'wc_']
        },
        'shopify': {
            scripts: ['shopify'],
            html: ['Shopify.']
        },
        'magento': {
            scripts: ['magento'],
            html: ['Mage.']
        }
    }
}; 