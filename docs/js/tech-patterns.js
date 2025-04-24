export const TECH_PATTERNS = {
    frameworks: {
        react: {
            scripts: ['react.js', 'react.min.js', 'react.production.min.js'],
            meta: ['react-root', 'react-modal-root'],
            html: ['data-reactroot', 'data-reactid']
        },
        vue: {
            scripts: ['vue.js', 'vue.min.js'],
            meta: ['vue', 'nuxt'],
            html: ['data-v-', '__vue__']
        },
        angular: {
            scripts: ['angular.js', 'angular.min.js'],
            meta: ['angular'],
            html: ['ng-app', 'ng-controller', 'ng-model']
        },
        jquery: {
            scripts: ['jquery.js', 'jquery.min.js'],
            meta: ['jQuery'],
            html: ['jquery']
        }
    },
    analytics: {
        'google-analytics': {
            scripts: ['google-analytics.com/analytics.js', 'ga.js', 'gtag'],
            meta: ['google-analytics', 'UA-'],
            html: ['GoogleAnalyticsObject']
        },
        'google-tag-manager': {
            scripts: ['googletagmanager.com/gtm.js'],
            meta: ['GTM-'],
            html: ['google_tag_manager']
        }
    },
    cdn: {
        cloudflare: {
            headers: ['cf-ray', 'cf-cache-status', '__cfduid'],
            html: ['cloudflare']
        },
        akamai: {
            headers: ['x-akamai-transformed', 'akamai-origin-hop'],
            html: []
        },
        fastly: {
            headers: ['fastly-io-info', 'x-fastly', 'fastly-ssl'],
            html: []
        }
    },
    security: {
        'content-security-policy': {
            headers: ['content-security-policy', 'content-security-policy-report-only'],
            html: []
        },
        'x-frame-options': {
            headers: ['x-frame-options'],
            html: []
        },
        'x-xss-protection': {
            headers: ['x-xss-protection'],
            html: []
        }
    },
    server: {
        nginx: {
            headers: ['server: nginx', 'x-nginx'],
            html: []
        },
        apache: {
            headers: ['server: apache', 'x-powered-by: php'],
            html: []
        },
        iis: {
            headers: ['server: microsoft-iis', 'x-powered-by: asp.net'],
            html: []
        }
    },
    advertising: {
        'google-adsense': {
            scripts: ['pagead2.googlesyndication.com', 'adsbygoogle.js'],
            meta: ['adsbygoogle'],
            html: ['adsbygoogle']
        },
        'facebook-pixel': {
            scripts: ['connect.facebook.net/en_US/fbevents.js'],
            meta: ['fb:app_id'],
            html: ['fbq']
        }
    },
    ecommerce: {
        'woocommerce': {
            scripts: ['woocommerce', 'wc-'],
            meta: ['woocommerce'],
            html: ['woocommerce', 'wc_', 'wc-']
        },
        'shopify': {
            scripts: ['shopify', '/shop.js'],
            meta: ['shopify'],
            html: ['shopify']
        },
        'magento': {
            scripts: ['mage/', 'magento'],
            meta: ['magento'],
            html: ['magento', 'Mage.']
        }
    }
}; 