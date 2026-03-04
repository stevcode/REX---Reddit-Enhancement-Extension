/**
 * REX - Reddit Enhancement Extension
 * Common Module: Shared utility functions
 */

window.REX_COMMON = (function () {
    'use strict';

    let cachedVersionUrl = null;
    let cachedVersion = null;

    let cachedPageTypeUrl = null;
    let cachedPageType = null;

    let cachedFeedTypeUrl = null;
    let cachedFeedType = null;

    let cachedPostViewTypeUrl = null;
    let cachedPostViewType = null;

    let cachedSubredditNameUrl = null;
    let cachedSubredditName = null;

    /**
     * Determines whether the current Reddit page is displaying old reddit or new reddit.
     * @returns {'old' | 'new' | 'unknown'}
     */
    function getRedditVersion() {
        const currentUrl = window.location.href;
        if (cachedVersionUrl === currentUrl && cachedVersion !== null) {
            return cachedVersion;
        }

        let version = 'unknown';

        // New Reddit (Shreddit) uses custom 'shreddit-*' elements
        if (document.querySelector('shreddit-app, shreddit-post, shreddit-async-loader')) {
            version = 'new';
        } else if (document.getElementById('header-img') || document.querySelector('.thing')) {
            // Old Reddit uses the legacy '#header-img' and '.thing' structure
            version = 'old';
        } else if (document.getElementById('reddit-logo')) {
            // Fallback checks
            version = 'new';
        }

        // Cache the result if successfully identified
        if (version !== 'unknown') {
            cachedVersionUrl = currentUrl;
            cachedVersion = version;
        }

        return version;
    }

    /**
     * Determines the type of the current Reddit page based on URL and DOM markers.
     * @returns {'comments' | 'feed' | 'profile' | 'other'}
     */
    function getPageType() {
        const currentUrl = window.location.href;
        if (cachedPageTypeUrl === currentUrl && cachedPageType !== null) {
            return cachedPageType;
        }

        const pathname = window.location.pathname;
        let pageType = 'other';

        // Comment Pages: URL includes /comments/ or DOM has 'shreddit-comment-tree'
        if (pathname.includes('/comments/') || document.querySelector('shreddit-comment-tree')) {
            pageType = 'comments';
        }
        // Profile Pages: URL starts with /user/
        else if (pathname.startsWith('/user/')) {
            pageType = 'profile';
        }
        // Feed Pages: Contains 'shreddit-feed' element.
        else if (document.querySelector('shreddit-feed')) {
            pageType = 'feed';
        }

        // Cache the result if successfully identified, avoiding caching 'other' too quickly
        // while the page is still asynchronously building the DOM during SPA navigation.
        if (pageType !== 'other') {
            cachedPageTypeUrl = currentUrl;
            cachedPageType = pageType;
        }

        return pageType;
    }

    /**
     * Determines the specific type of feed being viewed (home, popular, all, subreddit, news).
     * @returns {'home' | 'popular' | 'all' | 'subreddit' | 'news' | 'unknown'}
     */
    function getFeedType() {
        const currentUrl = window.location.href;
        if (cachedFeedTypeUrl === currentUrl && cachedFeedType !== null) {
            return cachedFeedType;
        }

        const pathname = window.location.pathname;
        const search = window.location.search;
        let feedType = 'unknown';

        if (search.includes('feed=news')) {
            feedType = 'news';
        } else if (pathname === '/' && (search === '' || search.includes('feed=home'))) {
            feedType = 'home';
        } else if (pathname.startsWith('/r/popular')) {
            feedType = 'popular';
        } else if (pathname.startsWith('/r/all')) {
            feedType = 'all';
        } else if (pathname.startsWith('/r/') && !pathname.startsWith('/r/popular') && !pathname.startsWith('/r/all')) {
            feedType = 'subreddit';
        }

        if (feedType !== 'unknown') {
            cachedFeedTypeUrl = currentUrl;
            cachedFeedType = feedType;
        }

        return feedType;
    }

    /**
     * Determines the current post view type (card or compact) for feeds and profile pages.
     * @returns {'card' | 'compact' | 'unknown'}
     */
    function getPostViewType() {
        const currentUrl = window.location.href;
        if (cachedPostViewTypeUrl === currentUrl && cachedPostViewType !== null) {
            return cachedPostViewType;
        }

        let viewType = 'unknown';

        // 1. Check for the attribute on any posts currently in the DOM
        const post = document.querySelector('shreddit-post[view-type]');
        if (post) {
            const vt = post.getAttribute('view-type');
            if (vt === 'compactView') viewType = 'compact';
            else if (vt === 'cardView') viewType = 'card';
        }

        // 2. Fallback: Search for tracking context (useful for empty feeds or profiles)
        if (viewType === 'unknown') {
            const tracker = document.querySelector('[data-faceplate-tracking-context*="view"]');
            if (tracker) {
                try {
                    const context = JSON.parse(tracker.getAttribute('data-faceplate-tracking-context'));
                    const view = context?.feed_options?.view;
                    if (view) {
                        if (view.toLowerCase().includes('compact')) viewType = 'compact';
                        else if (view.toLowerCase().includes('card')) viewType = 'card';
                    }
                } catch (e) {
                    // Context wasn't valid JSON or didn't contain view info
                }
            }
        }

        // 3. Fallback: Check the view toggle button's label
        if (viewType === 'unknown') {
            const viewBtn = document.querySelector('button[aria-label^="View:"]');
            if (viewBtn) {
                const label = viewBtn.getAttribute('aria-label').toLowerCase();
                if (label.includes('compact')) viewType = 'compact';
                else if (label.includes('card')) viewType = 'card';
            }
        }

        if (viewType !== 'unknown') {
            cachedPostViewTypeUrl = currentUrl;
            cachedPostViewType = viewType;
        }

        return viewType;
    }

    /**
     * Extracts subreddit name from the current URL. Uses a cache.
     * Works for both subreddit pages (/r/name/) and post pages (/r/name/comments/...)
     * @returns {string | null} The subreddit name (e.g., "meat") or null if not on a subreddit
     */
    function getSubredditName() {
        const currentUrl = window.location.href;
        if (cachedSubredditNameUrl === currentUrl && cachedSubredditName !== undefined) {
            return cachedSubredditName;
        }

        const match = window.location.pathname.match(/^\/r\/([^\/]+)/);
        const name = match ? match[1] : null;

        cachedSubredditNameUrl = currentUrl;
        cachedSubredditName = name;

        return name;
    }

    /**
     * Find all shadow roots in the document
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
                // Recursively find shadow roots inside shadow roots
                shadowRoots.push(...findAllShadowRoots(node.shadowRoot));
            }
        }

        return shadowRoots;
    }

    return {
        getRedditVersion,
        getPageType,
        getFeedType,
        getPostViewType,
        getSubredditName,
        findAllShadowRoots
    };
})();
