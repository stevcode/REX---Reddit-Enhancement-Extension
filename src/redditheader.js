/**
 * REX - Reddit Enhancement Extension
 * Reddit Header Module: Handles functionality/visibility for the header buttons.
 */

window.REX_HEADER = (function () {
    'use strict';

    // Selectors identified via inspection
    const AD_SELECTORS = '#advertise-button';
    const CREATE_SELECTOR = '#create-post';
    const REDDIT_LOGO_SELECTOR = '#reddit-logo';
    const SUBREDDIT_INDICATOR_ID = 'rex-subreddit-indicator';

    /**
     * Extracts subreddit name from the current URL
     * Works for both subreddit pages (/r/name/) and post pages (/r/name/comments/...)
     * @returns {string|null} The subreddit name (e.g., "meat") or null if not on a subreddit
     */
    function getSubredditFromUrl() {
        const match = window.location.pathname.match(/^\/r\/([^\/]+)/);
        return match ? match[1] : null;
    }

    /**
     * Finds the subreddit logo URL from the page
     * Searches for community icon images in the DOM
     * @returns {string|null} The logo URL or null if not found
     */
    function findSubredditLogo() {
        // Method 1: Look for shreddit-subreddit-icon element
        const subIconElement = document.querySelector('shreddit-subreddit-icon');
        if (subIconElement) {
            // Check shadow root first
            if (subIconElement.shadowRoot) {
                const img = subIconElement.shadowRoot.querySelector('img');
                if (img && img.src) return img.src;
            }
            // Check for img child in light DOM
            const img = subIconElement.querySelector('img');
            if (img && img.src) return img.src;
            // Check for src attribute on the element itself
            const srcAttr = subIconElement.getAttribute('src');
            if (srcAttr) return srcAttr;
        }

        // Method 2: Search for images with communityIcon in URL
        const allImgs = Array.from(document.querySelectorAll('img'));
        const iconImg = allImgs.find(img => img.src && img.src.includes('communityIcon'));
        if (iconImg) return iconImg.src;

        // Method 3: Look for images with matching alt text pattern
        const subredditName = getSubredditFromUrl();
        if (subredditName) {
            const altImg = allImgs.find(img =>
                img.alt && img.alt.toLowerCase().includes(`r/${subredditName.toLowerCase()} icon`)
            );
            if (altImg) return altImg.src;
        }

        return null;
    }

    /**
     * Creates or updates the subreddit indicator in the header
     */
    function updateSubredditIndicator() {
        // Only run if the feature is enabled in settings
        if (!showSubredditIndicator) {
            const existingIndicator = document.getElementById(SUBREDDIT_INDICATOR_ID);
            if (existingIndicator) {
                existingIndicator.remove();
            }
            return;
        }

        const subredditName = getSubredditFromUrl();
        const redditLogo = document.querySelector(REDDIT_LOGO_SELECTOR);

        // Remove existing indicator if present
        const existingIndicator = document.getElementById(SUBREDDIT_INDICATOR_ID);
        if (existingIndicator) {
            existingIndicator.remove();
        }

        // If not on a subreddit page or logo not found, nothing to do
        if (!subredditName || !redditLogo) {
            return;
        }

        // Find subreddit logo
        const logoUrl = findSubredditLogo();

        // Create the indicator container
        const indicator = document.createElement('a');
        indicator.id = SUBREDDIT_INDICATOR_ID;
        indicator.href = `/r/${subredditName}/`;
        indicator.style.cssText = `
            display: flex;
            align-items: flex-end;
            height: 40px;
            padding-bottom: 9px;
            box-sizing: border-box;
            text-decoration: none;
            margin-left: 8px;
            gap: 6px;
        `;

        // Create the logo image if available
        if (logoUrl) {
            const logoImg = document.createElement('img');
            logoImg.src = logoUrl;
            logoImg.alt = `r/${subredditName} icon`;
            logoImg.style.cssText = `
                width: 24px;
                height: 24px;
                border-radius: 50%;
                object-fit: cover;
                margin-bottom: 0;
            `;
            indicator.appendChild(logoImg);
        }

        // Create the subreddit name text
        const nameSpan = document.createElement('span');
        nameSpan.textContent = `/r/${subredditName}`;
        nameSpan.style.cssText = `
            color: var(--color-neutral-content-strong, #1A1A1B);
            font-size: 14px;
            font-weight: 500;
            line-height: normal;
        `;
        indicator.appendChild(nameSpan);

        // Insert after the reddit logo's parent container (tooltip wrapper)
        // to avoid being inside the hover activation area
        const logoContainer = redditLogo.closest('rpl-tooltip') || redditLogo.parentNode;
        logoContainer.parentNode.insertBefore(indicator, logoContainer.nextSibling);
        console.log(`[REX] Header: Subreddit indicator added for r/${subredditName}`);
    }

    /**
     * Initializes subreddit indicator with retry logic for dynamic content
     */
    function initSubredditIndicator() {
        // Initial attempt
        updateSubredditIndicator();

        // Retry a few times as page may still be loading
        setTimeout(updateSubredditIndicator, 500);
        setTimeout(updateSubredditIndicator, 1500);
        setTimeout(updateSubredditIndicator, 3000);

        // Watch for URL changes (SPA navigation) and DOM rebuilds (page refresh)
        let lastUrl = window.location.href;
        const domObserver = new MutationObserver(() => {
            if (!showSubredditIndicator) return;

            const subredditName = getSubredditFromUrl();
            const existingIndicator = document.getElementById(SUBREDDIT_INDICATOR_ID);
            const redditLogo = document.querySelector(REDDIT_LOGO_SELECTOR);

            // Re-add indicator if we're on a subreddit, logo exists, but indicator is missing
            if (subredditName && redditLogo && !existingIndicator) {
                updateSubredditIndicator();
            }

            // Handle URL changes (SPA navigation)
            if (window.location.href !== lastUrl) {
                lastUrl = window.location.href;
                // Delay to allow new page content to load
                setTimeout(updateSubredditIndicator, 300);
                setTimeout(updateSubredditIndicator, 1000);
            }
        });

        // Observe body when available
        const startObserving = () => {
            if (document.body) {
                domObserver.observe(document.body, { childList: true, subtree: true });
            }
        };

        if (document.body) {
            startObserving();
        } else {
            document.addEventListener('DOMContentLoaded', startObserving);
        }

        // Also listen for popstate events (browser back/forward)
        window.addEventListener('popstate', () => {
            setTimeout(updateSubredditIndicator, 300);
        });
    }

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
        const isSubreddit = !!getSubredditFromUrl();
        const shouldCenter = shouldHide && !isSubreddit;

        const STYLE_ID = 'rex-hide-ask-shadow-style';
        const CSS_CONTENT = `
            a[href^="/answers/"] { display: none !important; }
            hr.trailing-divider { display: none !important; }
            input { 
                text-align: ${shouldCenter ? 'center' : 'inherit'} !important; 
                padding-right: ${shouldCenter ? '40px' : '0'} !important;
            }
            input:focus {
                text-align: left !important;
                padding-right: 0 !important;
            }
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
                    console.log(`[REX] Header: Ask AI hidden (shadow of ${host.tagName})${shouldCenter ? ' and search centered' : ''}`);
                } else {
                    existingStyle.textContent = CSS_CONTENT;
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
                        console.log(`[REX] Header: Ask AI divider hidden (nested shadow of ${nestedHost.tagName})${shouldCenter ? ' and search centered' : ''}`);
                    } else {
                        existingNestedStyle.textContent = CSS_CONTENT;
                    }
                }
            } else {
                if (existingStyle) {
                    existingStyle.remove();
                    console.log(`[REX] Header: Ask AI shown and search un-centered (shadow of ${host.tagName})`);
                }

                // Remove from nested shadow root too
                const nestedHost = host.shadowRoot.querySelector('faceplate-search-input');
                if (nestedHost && nestedHost.shadowRoot) {
                    const nestedStyleId = STYLE_ID + '-nested';
                    const existingNestedStyle = nestedHost.shadowRoot.getElementById(nestedStyleId);
                    if (existingNestedStyle) {
                        existingNestedStyle.remove();
                        console.log(`[REX] Header: Ask AI divider shown and search un-centered (nested shadow)`);
                    }
                }
            }
        }

        // Also try to find and hide directly in the main DOM (fallback)
        const searchInput = document.querySelector('input[placeholder="Find anything"]');
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
            if (searchInput) {
                const applyCenter = () => {
                    if (shouldCenter && document.activeElement !== searchInput) {
                        searchInput.style.setProperty('text-align', 'center', 'important');
                        searchInput.style.setProperty('padding-right', '40px', 'important');
                    } else {
                        searchInput.style.setProperty('text-align', 'left', 'important');
                        searchInput.style.setProperty('padding-right', '0', 'important');
                    }
                };

                // Add focus/blur listeners
                searchInput.onfocus = () => {
                    searchInput.style.setProperty('text-align', 'left', 'important');
                    searchInput.style.setProperty('padding-right', '0', 'important');
                };
                searchInput.onblur = applyCenter;

                // Initial apply
                applyCenter();
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
            if (searchInput) {
                searchInput.style.textAlign = '';
                searchInput.style.paddingRight = '';
                searchInput.onfocus = null;
                searchInput.onblur = null;
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
    let showSubredditIndicator = true; // Track the subreddit indicator setting

    function init() {
        console.log('[REX] Header: Initializing');

        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
            chrome.storage.sync.get(['rex_hide_ads', 'rex_hide_create', 'rex_hide_ask', 'rex_show_subreddit_indicator'], (items) => {
                toggleVisibility(!!items.rex_hide_ads, AD_SELECTORS, 'rex-hide-ads-style', adState, 'Ads');
                toggleVisibility(!!items.rex_hide_create, CREATE_SELECTOR, 'rex-hide-create-style', createState, 'Create');

                askHideEnabled = !!items.rex_hide_ask;
                toggleAskVisibility(askHideEnabled);

                showSubredditIndicator = items.rex_show_subreddit_indicator !== false;
                initSubredditIndicator();
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
                    if (changes.rex_show_subreddit_indicator) {
                        showSubredditIndicator = changes.rex_show_subreddit_indicator.newValue;
                        updateSubredditIndicator();
                    }
                }
            });

            // Use MutationObserver to re-apply Ask setting when DOM changes
            // This handles dynamic page loading where shadow DOMs appear later
            let lastUrl = window.location.href;
            const observer = new MutationObserver(() => {
                const currentUrl = window.location.href;
                if (currentUrl !== lastUrl) {
                    lastUrl = currentUrl;
                    if (askHideEnabled) toggleAskVisibility(true);
                }

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
