/**
 * REX - Reddit Enhancement Extension
 * Header Module: Handles "Advertise on Reddit" button visibility
 */

window.REX_HEADER = (function () {
    'use strict';

    // Selectors identified via inspection
    // Primary: #advertise-button
    // Fallback: Link to ads.reddit.com or containing "advertising"
    const AD_SELECTORS = [
        '#advertise-button',
        'a[href*="ads.reddit.com"]',
        'a[href*="/advertising"]'
    ].join(', ');

    let adStyleTag = null;

    function applyAdVisibility(shouldHide) {
        if (shouldHide) {
            if (!adStyleTag) {
                adStyleTag = document.createElement('style');
                adStyleTag.id = 'rex-hide-ads-style';
                // !important to override any specific styles
                adStyleTag.textContent = `${AD_SELECTORS} { display: none !important; }`;
                document.head.appendChild(adStyleTag);
                console.log('[REX] Header: Ads hidden');
            }
        } else {
            if (adStyleTag) {
                adStyleTag.remove();
                adStyleTag = null;
                console.log('[REX] Header: Ads shown');
            }
        }
    }

    function init() {
        console.log('[REX] Header: Initializing');

        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
            // Initial load
            chrome.storage.sync.get(['rex_hide_ads'], (items) => {
                const shouldHide = !!items.rex_hide_ads;
                console.log('[REX] Header: Initial setting loaded:', shouldHide);
                applyAdVisibility(shouldHide);
            });

            // Listen for changes
            chrome.storage.onChanged.addListener((changes, area) => {
                if (area === 'sync' && changes.rex_hide_ads) {
                    const newValue = changes.rex_hide_ads.newValue;
                    console.log('[REX] Header: Setting changed:', newValue);
                    applyAdVisibility(newValue);
                }
            });
        }
    }

    return {
        init: init
    };
})();
