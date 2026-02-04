/**
 * REX - Reddit Enhancement Extension
 * Header Module: Handles "Advertise on Reddit" button visibility
 */

window.REX_HEADER = (function () {
    'use strict';

    // Selectors identified via inspection
    // Primary header ads: #advertise-button
    const AD_SELECTORS = [
        '#advertise-button',
        'a[href*="ads.reddit.com"]',
        'a[href*="/advertising"]'
    ].join(', ');

    // Create Post button: #create-post
    const CREATE_SELECTOR = '#create-post';

    let adStyleTag = null;
    let createStyleTag = null;

    /**
     * Toggles visibility for a specific feature using a style tag
     * @param {boolean} shouldHide - Whether to hide the elements
     * @param {string} selector - CSS selector to hide
     * @param {string} styleId - Unique ID for the style tag
     * @param {object} tagRef - Reference object { tag: HTMLStyleElement|null } to track state
     * @param {string} logName - Name for logging
     */
    function toggleVisibility(shouldHide, selector, styleId, tagRef, logName) {
        if (shouldHide) {
            if (!tagRef.tag) {
                const style = document.createElement('style');
                style.id = styleId;
                style.textContent = `${selector} { display: none !important; }`;
                document.head.appendChild(style);
                tagRef.tag = style;
                console.log(`[REX] Header: ${logName} hidden`);
            }
        } else {
            if (tagRef.tag) {
                tagRef.tag.remove();
                tagRef.tag = null;
                console.log(`[REX] Header: ${logName} shown`);
            }
        }
    }

    // State trackers (wrappers to allow pass-by-reference simulation)
    const adState = { tag: null };
    const createState = { tag: null };

    function init() {
        console.log('[REX] Header: Initializing');

        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
            // Initial load
            chrome.storage.sync.get(['rex_hide_ads', 'rex_hide_create'], (items) => {
                toggleVisibility(!!items.rex_hide_ads, AD_SELECTORS, 'rex-hide-ads-style', adState, 'Ads');
                toggleVisibility(!!items.rex_hide_create, CREATE_SELECTOR, 'rex-hide-create-style', createState, 'Create Button');
            });

            // Listen for changes
            chrome.storage.onChanged.addListener((changes, area) => {
                if (area === 'sync') {
                    if (changes.rex_hide_ads) {
                        toggleVisibility(changes.rex_hide_ads.newValue, AD_SELECTORS, 'rex-hide-ads-style', adState, 'Ads');
                    }
                    if (changes.rex_hide_create) {
                        toggleVisibility(changes.rex_hide_create.newValue, CREATE_SELECTOR, 'rex-hide-create-style', createState, 'Create Button');
                    }
                }
            });
        }
    }

    return {
        init: init
    };
})();
