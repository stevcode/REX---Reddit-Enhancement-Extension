/**
 * REX - Reddit Enhancement Extension
 * Sidebar Module: Handles collapsing of sidebar sections
 */

window.REX_SIDEBAR = (function () {
    'use strict';

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
        console.log(`[REX-Sidebar] Found ${mainDetails.length} details in main DOM`);

        // Get details from shadow DOMs
        const shadowRoots = findAllShadowRoots();
        console.log(`[REX-Sidebar] Found ${shadowRoots.length} shadow roots`);

        for (const shadowRoot of shadowRoots) {
            const shadowDetails = Array.from(shadowRoot.querySelectorAll('details'));
            if (shadowDetails.length > 0) {
                console.log(`[REX-Sidebar] Found ${shadowDetails.length} details in shadow DOM`);
                allDetailsElements.push(...shadowDetails);
            }
        }

        console.log(`[REX-Sidebar] Total details elements: ${allDetailsElements.length}`);

        // Process all details elements
        for (const details of allDetailsElements) {
            const summary = details.querySelector('summary');
            if (!summary) continue;

            const summaryText = summary.textContent || '';
            const trimmedText = summaryText.trim();

            // Debug: collect summary text snippets
            if (trimmedText) {
                const snippet = trimmedText.substring(0, 50).replace(/\s+/g, ' ');
                allSummaryTexts.push(snippet);
            }

            // Check if this summary contains any of our target sections
            for (const sectionName of SECTIONS_TO_COLLAPSE) {
                if (summaryText.toUpperCase().includes(sectionName.toUpperCase())) {
                    sectionsFoundThisRun.push(sectionName);

                    if (collapsedSections.has(sectionName)) {
                        console.log(`[REX-Sidebar] ${sectionName} already processed`);
                        break;
                    }

                    const isOpen = details.hasAttribute('open');

                    if (isOpen) {
                        console.log(`[REX-Sidebar] ✓ Collapsing ${sectionName} section`);
                        // Directly remove the open attribute instead of clicking
                        details.removeAttribute('open');
                        collapsedSections.add(sectionName);
                        newlyCollapsedCount++;
                    } else {
                        console.log(`[REX-Sidebar] ${sectionName} section already collapsed`);
                        collapsedSections.add(sectionName);
                    }
                    break;
                }
            }
        }

        console.log(`[REX-Sidebar] All summary texts found:`, allSummaryTexts);
        console.log(`[REX-Sidebar] Sections found this run:`, sectionsFoundThisRun);
        console.log(`[REX-Sidebar] Total sections processed:`, Array.from(collapsedSections));
        return newlyCollapsedCount;
    }

    /**
     * Try to collapse with retries for dynamic content
     * Keeps retrying until all sections are found or max retries reached
     */
    function attemptCollapse(retries = 30, delay = 600) {
        collapseSidebarSections();

        // Check if we've found all sections
        const allSectionsFound = SECTIONS_TO_COLLAPSE.every(section =>
            collapsedSections.has(section)
        );

        if (allSectionsFound) {
            console.log(`[REX-Sidebar] ✓ Successfully found and processed all ${SECTIONS_TO_COLLAPSE.length} sections!`);
            // Remove the hiding CSS now that we're done
            const hideStyle = document.getElementById('rex-loader-hide');
            if (hideStyle) {
                hideStyle.remove();
                console.log('[REX-Sidebar] Removed loader CSS, sections can now be toggled normally');
            }
            return;
        }

        if (retries > 0) {
            const remaining = SECTIONS_TO_COLLAPSE.filter(s => !collapsedSections.has(s));
            console.log(`[REX-Sidebar] Still looking for: [${remaining.join(', ')}], retrying in ${delay}ms... (${retries} attempts left)`);
            setTimeout(() => attemptCollapse(retries - 1, delay), delay);
        } else {
            const found = Array.from(collapsedSections);
            const missing = SECTIONS_TO_COLLAPSE.filter(s => !collapsedSections.has(s));
            console.log(`[REX-Sidebar] Finished. Found ${found.length}/${SECTIONS_TO_COLLAPSE.length} sections.`);
            if (missing.length > 0) {
                console.log(`[REX-Sidebar] ⚠ Missing sections (may not exist on this page): [${missing.join(', ')}]`);
            }
            // Remove the hiding CSS even if we didn't find all sections
            const hideStyle = document.getElementById('rex-loader-hide');
            if (hideStyle) {
                hideStyle.remove();
                console.log('[REX-Sidebar] Removed loader CSS after finishing retries');
            }
        }
    }

    function init() {
        console.log('[REX-Sidebar] Initializing Sidebar Collapse Logic');

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
                console.log('[REX-Sidebar] DOM loaded, attempting to collapse sidebar sections');
                attemptCollapse();
            });
        } else {
            console.log('[REX-Sidebar] Document ready, attempting to collapse sidebar sections');
            attemptCollapse();
        }

        // Watch for dynamic content changes (for SPA navigation)
        if (!observer) {
            observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    if (mutation.addedNodes.length > 0) {
                        // Check if the added content might contain any of our target sections
                        for (const node of mutation.addedNodes) {
                            if (node.nodeType === Node.ELEMENT_NODE) {
                                const textContent = node.textContent || '';
                                // Check if any target section is in the new content
                                const hasTargetSection = SECTIONS_TO_COLLAPSE.some(section =>
                                    textContent.toUpperCase().includes(section.toUpperCase())
                                );
                                if (hasTargetSection) {
                                    console.log('[REX-Sidebar] Detected sidebar section added to DOM, attempting to collapse');
                                    // Clear our tracking and start fresh
                                    collapsedSections.clear();
                                    attemptCollapse(5, 200);
                                    break;
                                }
                            }
                        }
                    }
                }
            });

            // Start observing after a short delay to let the page initialize
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
        }
    };
})();
