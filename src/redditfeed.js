/**
 * REX - Reddit Enhancement Extension
 * Reddit Feed Module: Handles functionality specific to the Reddit feed (home/subreddit)
 */

window.REX_FEED = (function () {
    'use strict';

    // Style state tracking
    const recentPostsState = { tag: null };

    /**
     * Applies or removes styles for a specific root (Document or ShadowRoot)
     * @param {Document|ShadowRoot} root 
     */
    function applyStylesToRoot(root) {
        const rules = [
            // Target the custom element <recent-posts>
            // Also target potential container classes if the tag changes, based on inspection
            { key: 'recent_posts', id: 'rex-hide-recent-posts-style', selector: 'recent-posts, shreddit-recent-posts' },
            { key: 'reddit_footer', id: 'rex-hide-reddit-footer-style', selector: 'div.legal-links' },
            {
                key: 'trending',
                id: 'rex-hide-trending-style',
                css: `
                    /* Hide the inner carousel components */
                    search-dynamic-id-cache-controller[search-telemetry-source="popular_carousel"],
                    shreddit-gallery-carousel[data-faceplate-tracking-context*="popular_carousel"] {
                        display: none !important;
                    }
                    
                    /* Hide adjacent hr dividers */
                    search-dynamic-id-cache-controller[search-telemetry-source="popular_carousel"] + hr,
                    shreddit-gallery-carousel[data-faceplate-tracking-context*="popular_carousel"] + hr {
                        display: none !important;
                    }

                    /* Unflinchingly target the main layout wrappers (masthead and margin div) */
                    div.masthead:has(search-dynamic-id-cache-controller[search-telemetry-source="popular_carousel"]),
                    div.masthead:has(shreddit-gallery-carousel[data-faceplate-tracking-context*="popular_carousel"]),
                    div:has(> search-dynamic-id-cache-controller[search-telemetry-source="popular_carousel"]) {
                        display: none !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        height: 0 !important;
                    }

                    /* Hide any hr dividers following the wrapper divs */
                    div.masthead:has(search-dynamic-id-cache-controller[search-telemetry-source="popular_carousel"]) + hr {
                        display: none !important;
                    }
                `
            }
        ];

        rules.forEach(rule => {
            // Check if we should hide based on our global state
            const shouldHide = activeStyles[rule.key];

            const existingStyle = root.getElementById ? root.getElementById(rule.id) : root.querySelector(`#${rule.id}`);

            if (shouldHide) {
                if (!existingStyle) {
                    const style = document.createElement('style');
                    style.id = rule.id;
                    if (rule.css) {
                        style.textContent = rule.css;
                    } else {
                        style.textContent = `${rule.selector} { display: none !important; }`;
                    }

                    if (root.head) {
                        root.head.appendChild(style);
                    } else {
                        root.appendChild(style);
                    }
                }
            } else {
                if (existingStyle) {
                    existingStyle.remove();
                }
            }
        });
    }

    // Active state
    const activeStyles = {
        recent_posts: false,
        reddit_footer: false,
        trending: false
    };



    /**
     * Updates visibility for all known roots
     */
    function updateAllRoots() {
        applyStylesToRoot(document);
        const shadowRoots = window.REX_COMMON.findAllShadowRoots();
        shadowRoots.forEach(root => applyStylesToRoot(root));
    }

    /**
     * Initialize Settings Listeners
     */
    function initSettings() {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
            chrome.storage.sync.get(['rex_hide_recent_posts', 'rex_hide_reddit_footer', 'rex_hide_trending'], (items) => {
                activeStyles.recent_posts = !!items.rex_hide_recent_posts;
                activeStyles.reddit_footer = !!items.rex_hide_reddit_footer;
                activeStyles.trending = !!items.rex_hide_trending;
                updateAllRoots();
            });

            chrome.storage.onChanged.addListener((changes, area) => {
                if (area === 'sync') {
                    let needsUpdate = false;
                    if (changes.rex_hide_recent_posts) {
                        activeStyles.recent_posts = changes.rex_hide_recent_posts.newValue;
                        needsUpdate = true;
                    }
                    if (changes.rex_hide_reddit_footer) {
                        activeStyles.reddit_footer = changes.rex_hide_reddit_footer.newValue;
                        needsUpdate = true;
                    }
                    if (changes.rex_hide_trending) {
                        activeStyles.trending = changes.rex_hide_trending.newValue;
                        needsUpdate = true;
                    }
                    if (needsUpdate) {
                        updateAllRoots();
                    }
                }
            });
        }
    }

    function init() {
        console.log('[REX-Feed] Initializing Feed Logic');
        initSettings();

        // Watch for dynamic content/shadow DOMs (Reusing robust pattern from sidebar.js)
        const observer = new MutationObserver((mutations) => {
            let newNodesFound = false;
            for (const mutation of mutations) {
                if (mutation.addedNodes.length > 0) {
                    newNodesFound = true;
                    // Also check for direct added nodes that might need styles if they are roots
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.shadowRoot) {
                                applyStylesToRoot(node.shadowRoot);
                            }
                        }
                    }
                }
            }

            if (newNodesFound) {
                updateAllRoots();
            }
        });

        if (document.body) {
            observer.observe(document.body, { childList: true, subtree: true });
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                observer.observe(document.body, { childList: true, subtree: true });
            });
        }
    }

    return { init };
})();
