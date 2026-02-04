/**
 * REX - Reddit Enhancement Extension
 * Reddit Header Module: Handles functionality/visibility for the header buttons.
 */

window.REX_HEADER = (function () {
    'use strict';

    // Selectors identified via inspection
    const AD_SELECTORS = '#advertise-button';
    const CREATE_SELECTOR = '#create-post';

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

    /**
     * Toggles visibility for Ask AI button which is inside Shadow DOM
     * Searches through all shadow roots to find the button
     */
    function toggleAskVisibility(shouldHide) {
        const STYLE_ID = 'rex-hide-ask-shadow-style';
        const CSS_CONTENT = `
            a[href^="/answers/"] { display: none !important; }
            hr.trailing-divider { display: none !important; }
        `;

        // Try multiple potential shadow hosts
        const shadowHosts = [
            document.querySelector('reddit-search-large'),
            document.querySelector('faceplate-search-input#search-input'),
            document.getElementById('search-input')
        ];

        let injectedCount = 0;

        for (const host of shadowHosts) {
            if (!host || !host.shadowRoot) continue;

            const existingStyle = host.shadowRoot.getElementById(STYLE_ID);

            if (shouldHide) {
                if (!existingStyle) {
                    const style = document.createElement('style');
                    style.id = STYLE_ID;
                    style.textContent = CSS_CONTENT;
                    host.shadowRoot.appendChild(style);
                    injectedCount++;
                    console.log(`[REX] Header: Ask AI hidden (shadow of ${host.tagName})`);
                }

                // Check for nested shadow root (faceplate-search-input inside reddit-search-large)
                const nestedHost = host.shadowRoot.querySelector('faceplate-search-input');
                if (nestedHost && nestedHost.shadowRoot) {
                    const nestedStyleId = STYLE_ID + '-nested';
                    const existingNestedStyle = nestedHost.shadowRoot.getElementById(nestedStyleId);
                    if (!existingNestedStyle) {
                        const nestedStyle = document.createElement('style');
                        nestedStyle.id = nestedStyleId;
                        nestedStyle.textContent = CSS_CONTENT;
                        nestedHost.shadowRoot.appendChild(nestedStyle);
                        console.log(`[REX] Header: Ask AI divider hidden (nested shadow of ${nestedHost.tagName})`);
                    }
                }
            } else {
                if (existingStyle) {
                    existingStyle.remove();
                    console.log(`[REX] Header: Ask AI shown (shadow of ${host.tagName})`);
                }

                // Remove from nested shadow root too
                const nestedHost = host.shadowRoot.querySelector('faceplate-search-input');
                if (nestedHost && nestedHost.shadowRoot) {
                    const nestedStyleId = STYLE_ID + '-nested';
                    const existingNestedStyle = nestedHost.shadowRoot.getElementById(nestedStyleId);
                    if (existingNestedStyle) {
                        existingNestedStyle.remove();
                        console.log(`[REX] Header: Ask AI divider shown (nested shadow)`);
                    }
                }
            }
        }

        // Also try to find and hide directly in the main DOM (fallback)
        if (shouldHide) {
            const askButton = document.querySelector('a[href="/answers/"]');
            if (askButton) {
                askButton.style.display = 'none';
                const divider = askButton.previousElementSibling;
                if (divider && divider.tagName === 'HR') {
                    divider.style.display = 'none';
                }
                console.log('[REX] Header: Ask AI hidden (main DOM fallback)');
            }
        } else {
            const askButton = document.querySelector('a[href="/answers/"]');
            if (askButton) {
                askButton.style.display = '';
                const divider = askButton.previousElementSibling;
                if (divider && divider.tagName === 'HR') {
                    divider.style.display = '';
                }
            }
        }

        // If nothing found, retry after delay (page may still be loading)
        if (shouldHide && injectedCount === 0) {
            setTimeout(() => toggleAskVisibility(shouldHide), 1000);
        }
    }

    const adState = { tag: null };
    const createState = { tag: null };
    let askHideEnabled = false; // Track the setting

    function init() {
        console.log('[REX] Header: Initializing');

        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
            chrome.storage.sync.get(['rex_hide_ads', 'rex_hide_create', 'rex_hide_ask'], (items) => {
                toggleVisibility(!!items.rex_hide_ads, AD_SELECTORS, 'rex-hide-ads-style', adState, 'Ads');
                toggleVisibility(!!items.rex_hide_create, CREATE_SELECTOR, 'rex-hide-create-style', createState, 'Create');

                askHideEnabled = !!items.rex_hide_ask;
                toggleAskVisibility(askHideEnabled);
            });

            chrome.storage.onChanged.addListener((changes, area) => {
                if (area === 'sync') {
                    if (changes.rex_hide_ads) {
                        toggleVisibility(changes.rex_hide_ads.newValue, AD_SELECTORS, 'rex-hide-ads-style', adState, 'Ads');
                    }
                    if (changes.rex_hide_create) {
                        toggleVisibility(changes.rex_hide_create.newValue, CREATE_SELECTOR, 'rex-hide-create-style', createState, 'Create');
                    }
                    if (changes.rex_hide_ask) {
                        askHideEnabled = changes.rex_hide_ask.newValue;
                        toggleAskVisibility(askHideEnabled);
                    }
                }
            });

            // Use MutationObserver to re-apply Ask setting when DOM changes
            // This handles dynamic page loading where shadow DOMs appear later
            const observer = new MutationObserver(() => {
                if (askHideEnabled) {
                    toggleAskVisibility(true);
                }
            });

            const observeTarget = document.body || document.documentElement;
            if (observeTarget) {
                observer.observe(observeTarget, { childList: true, subtree: true });
            }
        }
    }

    return { init };
})();
