/**
 * REX - Reddit Enhancement Extension
 * Sidebar Module: Handles collapsing of sidebar sections and hiding of specific links
 */

window.REX_SIDEBAR = (function () {
    'use strict';

    // Track active style states for link hiding
    const activeStyles = {
        popular: false,
        explore: false,
        community: false
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

    /**
     * Applies or removes styles for a specific root (Document or ShadowRoot)
     * @param {Document|ShadowRoot} root 
     */
    function applyStylesToRoot(root) {
        const rules = [
            { key: 'popular', id: 'rex-hide-popular-style', selector: 'a[href*="/r/popular"], #popular-posts' },
            { key: 'explore', id: 'rex-hide-explore-style', selector: 'a[href="/explore/"], #explore-communities' },
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
    }

    /**
     * Updates visibility for all known roots (Main Doc + Shadow Roots)
     */
    function updateAllRoots() {
        // Main Document
        applyStylesToRoot(document);

        // All Shadow Roots
        const shadowRoots = findAllShadowRoots();
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
        const shadowRoots = findAllShadowRoots();

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
            chrome.storage.sync.get(['rex_hide_popular', 'rex_hide_explore', 'rex_hide_start_community'], (items) => {
                activeStyles.popular = !!items.rex_hide_popular;
                activeStyles.explore = !!items.rex_hide_explore;
                activeStyles.community = !!items.rex_hide_start_community;
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
                                const nestedShadows = findAllShadowRoots(node);
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
