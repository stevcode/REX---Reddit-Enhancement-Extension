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
            { key: 'reddit_footer', id: 'rex-hide-reddit-footer-style', selector: 'div.legal-links' }
        ];

        rules.forEach(rule => {
            // Check if we should hide based on our global state
            const shouldHide = activeStyles[rule.key];

            const existingStyle = root.getElementById ? root.getElementById(rule.id) : root.querySelector(`#${rule.id}`);

            if (shouldHide) {
                if (!existingStyle) {
                    const style = document.createElement('style');
                    style.id = rule.id;
                    style.textContent = `${rule.selector} { display: none !important; }`;

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
        reddit_footer: false
    };

    /**
     * Find all shadow roots in the document (reused logic pattern)
     * @param {Element} root - Root element to search from
     * @returns {Array} Array of shadow roots
     */
    function findAllShadowRoots(root = document.body) {
        const shadowRoots = [];
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);

        let node;
        while (node = walker.nextNode()) {
            if (node.shadowRoot) {
                shadowRoots.push(node.shadowRoot);
                shadowRoots.push(...findAllShadowRoots(node.shadowRoot));
            }
        }
        return shadowRoots;
    }

    /**
     * Updates visibility for all known roots
     */
    function updateAllRoots() {
        applyStylesToRoot(document);
        const shadowRoots = findAllShadowRoots();
        shadowRoots.forEach(root => applyStylesToRoot(root));
    }

    /**
     * Initialize Settings Listeners
     */
    function initSettings() {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
            chrome.storage.sync.get(['rex_hide_recent_posts', 'rex_hide_reddit_footer'], (items) => {
                activeStyles.recent_posts = !!items.rex_hide_recent_posts;
                activeStyles.reddit_footer = !!items.rex_hide_reddit_footer;
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
