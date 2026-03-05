/**
 * REX - Reddit Enhancement Extension
 * Sidebar Module: Handles collapsing of sidebar sections and hiding of specific links
 */

window.REX_SIDEBAR = (function () {
    'use strict';

    const activeStyles = {
        popular: false,
        explore: false,
        community: false,
        news: false,
        restoreAll: false
    };

    // Define which sections to collapse
    const SECTIONS_TO_COLLAPSE = [
        'GAMES ON REDDIT',
        'MODERATION',
        'CUSTOM FEEDS',
        'RECENT',
        'COMMUNITIES',
        'RESOURCES'
    ];

    // Track which sections we've already collapsed (persistent across retries)
    const collapsedSections = new Set();
    let observer = null;



    /**
     * Applies or removes styles for a specific root (Document or ShadowRoot)
     * @param {Document|ShadowRoot} root 
     */
    function applyStylesToRoot(root) {
        const rules = [
            { key: 'popular', id: 'rex-hide-popular-style', selector: 'a[href*="/r/popular"], #popular-posts' },
            { key: 'explore', id: 'rex-hide-explore-style', selector: 'a[href="/explore/"], #explore-communities' },
            { key: 'news', id: 'rex-hide-news-style', selector: 'li#news-posts, a[href="/?feed=news"]' },
            { key: 'community', id: 'rex-hide-create-community-style', selector: '.left-nav-create-community-button, a[href*="/subreddits/create"], #create-community-button' }
        ];

        rules.forEach(rule => {
            const shouldHide = activeStyles[rule.key];
            // Handle both Document (getElementById) and ShadowRoot (querySelector or getElementById if supported)
            const existingStyle = root.getElementById ? root.getElementById(rule.id) : root.querySelector(`#${rule.id}`);

            if (shouldHide) {
                if (!existingStyle) {
                    const style = document.createElement('style');
                    style.id = rule.id;
                    // Use !important and generic selector to ensure it overrides
                    style.textContent = `${rule.selector} { display: none !important; }`;

                    if (root.head) {
                        root.head.appendChild(style);
                    } else {
                        root.appendChild(style);
                    }
                    // console.log(`[REX-Sidebar] Applied ${rule.key} style to root`, root);
                }
            } else {
                if (existingStyle) {
                    existingStyle.remove();
                }
            }
        });

        injectAllLink(root);
    }

    /**
     * Injects the 'All' link below the 'Popular' link if enabled
     * @param {Document|ShadowRoot} root
     */
    function injectAllLink(root) {
        const existing = root.getElementById ? root.getElementById('rex-all-posts') : root.querySelector('#rex-all-posts');

        if (!activeStyles.restoreAll) {
            if (existing) existing.remove();
            return;
        }

        const isAllActive = window.location.pathname.startsWith('/r/all');

        if (existing) {
            // Re-evaluate active state for SPA navigation updates
            const link = existing.querySelector('a');
            if (link) {
                if (isAllActive) {
                    link.setAttribute('aria-current', 'page');
                } else {
                    link.removeAttribute('aria-current');
                }
            }

            // Update the icon if it has already been injected as an image
            const img = existing.querySelector('img');
            if (img) {
                const iconName = isAllActive ? 'all-icon-active.png' : 'all-icon.png';
                const iconPath = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL ? chrome.runtime.getURL(`icons/${iconName}`) : null;
                // Make sure we don't trigger unnecessary re-renders if path is already correct
                if (iconPath && img.src !== iconPath) {
                    img.src = iconPath;
                }
            }
            return; // Already injected and evaluated
        }

        const popular = root.getElementById ? root.getElementById('popular-posts') : root.querySelector('#popular-posts');
        if (!popular) return; // Wait until popular exists to append after it

        const clone = popular.cloneNode(true);
        clone.id = 'rex-all-posts';

        // Update link
        const link = clone.querySelector('a');
        if (link) {
            link.href = '/r/all/';

            if (isAllActive) {
                link.setAttribute('aria-current', 'page');
            } else {
                link.removeAttribute('aria-current');
            }

            // Update Text Node. Search spans for text content "Popular"
            const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT, null);
            let node;
            while ((node = walker.nextNode())) {
                if (node.nodeValue.trim() === 'Popular') {
                    node.nodeValue = node.nodeValue.replace('Popular', 'All');
                }
            }

            // Replace SVG icon with a placeholder IMG
            // Explain to user: It looks for an icon in the extension bundle, otherwise falls back to a dummy SVG string.
            const svg = clone.querySelector('svg');
            if (svg) {
                const iconName = isAllActive ? 'all-icon-active.png' : 'all-icon.png';
                const iconPath = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL ? chrome.runtime.getURL(`icons/${iconName}`) : null;

                if (iconPath) {
                    const img = document.createElement('img');
                    img.src = iconPath;
                    img.style.width = '20px';
                    img.style.height = '20px';
                    img.style.objectFit = 'contain';

                    // Maintain Reddit's icon spacing classes if any
                    img.className = svg.className.baseVal || svg.className;
                    svg.replaceWith(img);
                } else {
                    // Fallback visually identical dummy circle in case extension API isn't ready
                    const dummySvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                    dummySvg.setAttribute('viewBox', '0 0 24 24');
                    dummySvg.setAttribute('fill', 'currentColor');
                    if (svg.className.baseVal) {
                        dummySvg.setAttribute('class', svg.className.baseVal);
                    }
                    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                    circle.setAttribute('cx', '12');
                    circle.setAttribute('cy', '12');
                    circle.setAttribute('r', '10');
                    dummySvg.appendChild(circle);
                    svg.replaceWith(dummySvg);
                }
            }

            popular.after(clone);
        }
    }

    /**
     * Updates visibility for all known roots (Main Doc + Shadow Roots)
     */
    function updateAllRoots() {
        // Main Document
        applyStylesToRoot(document);

        // All Shadow Roots
        const shadowRoots = window.REX_COMMON.findAllShadowRoots();
        shadowRoots.forEach(root => applyStylesToRoot(root));
        console.log(`[REX-Sidebar] Updated styles for document and ${shadowRoots.length} shadow roots`);
    }

    /**
     * Find and collapse specified sidebar sections
     * @returns {number} Count of newly collapsed sections
     */
    function collapseSidebarSections() {
        let newlyCollapsedCount = 0;
        const sectionsFoundThisRun = [];
        const allSummaryTexts = [];

        // Collect all details elements from main DOM and shadow DOMs
        const allDetailsElements = [];

        // Get details from main DOM
        const mainDetails = Array.from(document.querySelectorAll('details'));
        allDetailsElements.push(...mainDetails);

        // Get details from shadow DOMs
        const shadowRoots = window.REX_COMMON.findAllShadowRoots();

        for (const shadowRoot of shadowRoots) {
            const shadowDetails = Array.from(shadowRoot.querySelectorAll('details'));
            if (shadowDetails.length > 0) {
                allDetailsElements.push(...shadowDetails);
            }
        }

        // Process all details elements
        for (const details of allDetailsElements) {
            const summary = details.querySelector('summary');
            if (!summary) continue;

            const summaryText = summary.textContent || '';
            const trimmedText = summaryText.trim();

            if (trimmedText) {
                const snippet = trimmedText.substring(0, 50).replace(/\s+/g, ' ');
                allSummaryTexts.push(snippet);
            }

            // Check if this summary contains any of our target sections
            for (const sectionName of SECTIONS_TO_COLLAPSE) {
                if (summaryText.toUpperCase().includes(sectionName.toUpperCase())) {
                    sectionsFoundThisRun.push(sectionName);

                    if (collapsedSections.has(sectionName)) {
                        break;
                    }

                    const isOpen = details.hasAttribute('open');

                    if (isOpen) {
                        console.log(`[REX-Sidebar] ✓ Collapsing ${sectionName} section`);
                        details.removeAttribute('open');
                        collapsedSections.add(sectionName);
                        newlyCollapsedCount++;
                    } else {
                        collapsedSections.add(sectionName);
                    }
                    break;
                }
            }
        }

        return newlyCollapsedCount;
    }

    /**
     * Try to collapse with retries for dynamic content
     */
    function attemptCollapse(retries = 30, delay = 600) {
        collapseSidebarSections();

        // Check if we've found all sections
        const allSectionsFound = SECTIONS_TO_COLLAPSE.every(section =>
            collapsedSections.has(section)
        );

        if (allSectionsFound) {
            console.log(`[REX-Sidebar] ✓ Successfully found and processed all sections!`);
            const hideStyle = document.getElementById('rex-loader-hide');
            if (hideStyle) hideStyle.remove();
            return;
        }

        if (retries > 0) {
            setTimeout(() => attemptCollapse(retries - 1, delay), delay);
        } else {
            const hideStyle = document.getElementById('rex-loader-hide');
            if (hideStyle) hideStyle.remove();
        }
    }

    /**
     * Initialize Settings Listeners for Sidebar Links
     */
    function initLinkHiding() {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
            chrome.storage.sync.get(['rex_hide_popular', 'rex_hide_explore', 'rex_hide_start_community', 'rex_hide_news', 'rex_restore_all'], (items) => {
                activeStyles.popular = !!items.rex_hide_popular;
                activeStyles.explore = !!items.rex_hide_explore;
                activeStyles.community = !!items.rex_hide_start_community;
                activeStyles.news = !!items.rex_hide_news;
                activeStyles.restoreAll = !!items.rex_restore_all;
                updateAllRoots();
            });

            chrome.storage.onChanged.addListener((changes, area) => {
                if (area === 'sync') {
                    let needsUpdate = false;
                    if (changes.rex_hide_popular) {
                        activeStyles.popular = changes.rex_hide_popular.newValue;
                        needsUpdate = true;
                    }
                    if (changes.rex_hide_explore) {
                        activeStyles.explore = changes.rex_hide_explore.newValue;
                        needsUpdate = true;
                    }
                    if (changes.rex_hide_start_community) {
                        activeStyles.community = changes.rex_hide_start_community.newValue;
                        needsUpdate = true;
                    }
                    if (changes.rex_hide_news) {
                        activeStyles.news = changes.rex_hide_news.newValue;
                        needsUpdate = true;
                    }
                    if (changes.rex_restore_all) {
                        activeStyles.restoreAll = changes.rex_restore_all.newValue;
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
        console.log('[REX-Sidebar] Initializing Sidebar Logic');

        // Initialize Link Hiding (Settings-based)
        initLinkHiding();

        // Inject CSS to hide details content during initial load (prevents flash)
        if (!document.getElementById('rex-loader-hide')) {
            const style = document.createElement('style');
            style.id = 'rex-loader-hide';
            style.textContent = `
                details[open] > :not(summary) {
                    display: none !important;
                }
            `;
            document.documentElement.appendChild(style);
        }

        // Initial attempt after page load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                attemptCollapse();
            });
        } else {
            attemptCollapse();
        }

        // Watch for dynamic content changes
        if (!observer) {
            observer = new MutationObserver((mutations) => {
                let shouldCheckCollapse = false;
                let newNodesFound = false;

                for (const mutation of mutations) {
                    if (mutation.addedNodes.length > 0) {
                        newNodesFound = true;
                        // Check nodes for collapse targets
                        for (const node of mutation.addedNodes) {
                            if (node.nodeType === Node.ELEMENT_NODE) {
                                // If this node is or contains a shadow root, we need to inject styles
                                if (node.shadowRoot) {
                                    applyStylesToRoot(node.shadowRoot);
                                }
                                // Also scan descendants for shadow roots
                                const nestedShadows = window.REX_COMMON.findAllShadowRoots(node);
                                nestedShadows.forEach(root => applyStylesToRoot(root));

                                const textContent = node.textContent || '';
                                const hasTargetSection = SECTIONS_TO_COLLAPSE.some(section =>
                                    textContent.toUpperCase().includes(section.toUpperCase())
                                );
                                if (hasTargetSection) {
                                    shouldCheckCollapse = true;
                                }
                            }
                        }
                    }
                }

                if (newNodesFound) {
                    // Ensure styles are applied to any new shadow roots we might have missed
                    // or that appeared deeper in the tree
                    updateAllRoots();
                }

                if (shouldCheckCollapse) {
                    console.log('[REX-Sidebar] New content detected, checking sidebar sections');
                    collapsedSections.clear();
                    attemptCollapse(5, 200);
                }
            });

            // Start observing
            setTimeout(() => {
                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });
                console.log('[REX-Sidebar] MutationObserver started');
            }, 1000);
        }
    }

    return {
        init: init,
        collapseNow: () => {
            collapsedSections.clear();
            attemptCollapse(5, 200);
        },
        debug: () => {
            console.log('Active Styles:', activeStyles);
            updateAllRoots();
        }
    };
})();
