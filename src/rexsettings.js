/**
 * REX - Reddit Enhancement Extension
 * Settings Module: Handles the "REX Settings" tab injection and UI
 */

window.REX_SETTINGS = (function () {
    'use strict';

    const REX_TAB_ID = 'rex-settings-tab';
    const REX_PANEL_ID = 'rex-settings-panel';

    // Default settings
    let currentSettings = {
        rex_hide_ads: false,
        rex_hide_create: false,
        rex_hide_ask: false,
        rex_show_subreddit_indicator: true,
        rex_sidebar_mode: 'Show', // Default for now
        rex_sidebar_collapse: false
    };

    /**
     * Loads settings from chrome.storage.sync
     */
    function loadSettings() {
        return new Promise((resolve) => {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
                chrome.storage.sync.get(currentSettings, (items) => {
                    currentSettings = { ...currentSettings, ...items };
                    console.log('[REX] Settings loaded:', currentSettings);
                    resolve(currentSettings);
                });
            } else {
                console.warn('[REX] chrome.storage not available, using defaults');
                resolve(currentSettings);
            }
        });
    }

    /**
     * Saves a setting to chrome.storage.sync
     * @param {string} key 
     * @param {any} value 
     */
    function saveSetting(key, value) {
        currentSettings[key] = value;
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
            chrome.storage.sync.set({ [key]: value }, () => {
                if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.lastError) {
                    console.error('[REX] Failed to save setting:', key, value, chrome.runtime.lastError);
                    if (typeof window !== 'undefined' && typeof window.alert === 'function') {
                        window.alert('REX: Failed to save setting "' + key + '". Please try again.');
                    }
                    return;
                }
                console.log('[REX] Setting saved:', key, value);
            });
        }
    }

    /**
     * Creates the HTML structure for the REX Settings panel
     */
    function createPanelHTML() {
        // Native-like classes extracted from inspection (Account/Preferences pages)
        // HEADERS: Exact match for "General" header on Account tab.
        // Class: text-title-3 font-semibold scalable-text
        // We add text-neutral-content-strong to ensure correct theme color (light/dark).
        // We add mb-xs mt-lg for spacing (as seen in computed styles).
        const SECTION_HEADER_CLASS = "text-title-3 font-semibold scalable-text text-neutral-content-strong mb-xs mt-lg";

        // Settings rows
        // Padding: py-[12px] matches computed style ~12px.
        // Label: 14px.
        const ROW_CONTAINER_CLASS = "flex justify-between items-center py-[12px] border-b border-neutral-border-weak";
        const ROW_LABEL_CLASS = "text-neutral-content-strong text-[14px]";
        const ROW_DESC_CLASS = "text-neutral-content-weak text-[12px] mt-2xs";

        // Helper to create a native-like toggle row using faceplate-switch-input
        // We use data attributes to identify the setting and handle events in init/after render
        const createToggleRow = (label, desc, id, settingKey) => {
            const isChecked = !!currentSettings[settingKey];
            const checkedAttr = isChecked ? 'checked=""' : '';
            const ariaChecked = isChecked ? 'true' : 'false';

            return `
            <label class="block normal-case cursor-pointer rex-toggle-label" data-setting-key="${settingKey}">
                <div class="${ROW_CONTAINER_CLASS}">
                    <span class="flex flex-col flex-1 pr-md">
                        <span class="${ROW_LABEL_CLASS}">${label}</span>
                        <span class="${ROW_DESC_CLASS}">${desc}</span>
                    </span>
                    <span class="flex items-center">
                         <div class="flex items-center justify-center h-lg">
                            <faceplate-switch-input 
                                id="${id}"
                                class="flex-col mr-xs pointer-events-none" 
                                role="checkbox" 
                                aria-checked="${ariaChecked}"
                                aria-label="${label}"
                                ${checkedAttr}>
                            </faceplate-switch-input>
                        </div>
                    </span>
                </div>
            </label>
        `;
        };

        // Helper to create a select/dropdown row (visual button styled like Reddit's)
        const createSelectRow = (label, options) => `
             <div class="block normal-case">
                <div class="${ROW_CONTAINER_CLASS}">
                    <span class="flex flex-col flex-1 pr-md">
                        <span class="${ROW_LABEL_CLASS}">${label}</span>
                    </span>
                    <span class="flex items-center">
                        <div class="relative group">
                            <button class="min-w-fit button-medium px-[var(--rem8)] button-plain icon items-center justify-center button inline-flex" aria-label="Change ${label}">
                                <span class="text-neutral-content-strong mr-xs text-[14px]">Show</span>
                                <span class="flex items-center justify-center">
                                    <svg viewBox="0 0 20 20" class="w-[20px] h-[20px] fill-current text-neutral-content-weak">
                                        <path d="M10 13.125L4.375 7.5L5.625 6.25L10 10.625L14.375 6.25L15.625 7.5L10 13.125Z"></path>
                                    </svg>
                                </span>
                            </button>
                             <select class="absolute inset-0 w-full h-full opacity-0 cursor-pointer">
                                <option>Show</option>
                                <option>Collapse</option>
                                <option>Hide</option>
                            </select>
                        </div>
                    </span>
                </div>
            </div>
        `;

        return `
            <div class="rex-settings-content">
                <!-- REDDIT HEADER Section -->
                <div class="mb-lg">
                    <h2 class="${SECTION_HEADER_CLASS}">Reddit Header</h2>
                    ${createToggleRow("Hide 'Advertise on Reddit' Button", "Removes the megaphone icon from the header", "rex-toggle-ads", "rex_hide_ads")}
                    ${createToggleRow("Remove 'Create' Button", "Hides the Create Post (+) button from the header", "rex-toggle-create", "rex_hide_create")}
                    ${createToggleRow("Remove 'Ask AI' Button", "Hides the Ask button and divider from the search bar", "rex-toggle-ask", "rex_hide_ask")}
                    ${createToggleRow("Show Current Subreddit In Header", "Shows the logo and name of the current subreddit next to the Reddit logo", "rex-toggle-sub-indicator", "rex_show_subreddit_indicator")}
                </div>

                <!-- SIDEBAR Section -->
                <div class="mb-lg">
                    <h2 class="${SECTION_HEADER_CLASS}">Sidebar</h2>
                    ${createToggleRow("Hide 'Popular' Link", "Removes the Popular link from the sidebar", "rex-toggle-popular", "rex_hide_popular")}
                    ${createToggleRow("Hide 'Explore' Link", "Removes the Explore link from the sidebar", "rex-toggle-explore", "rex_hide_explore")}
                    ${createToggleRow("Hide 'Start a community' Button", "Removes the Start a community button from the sidebar", "rex-toggle-start-community", "rex_hide_start_community")}
                    ${['GAMES ON REDDIT', 'MODERATION', 'CUSTOM FEEDS', 'RECENT', 'COMMUNITIES', 'RESOURCES'].map(item => createSelectRow(item)).join('')}
                </div>

                <!-- COMMENTS PAGE Section -->
                <div class="mb-lg">
                    <h2 class="${SECTION_HEADER_CLASS}">Comments Page</h2>
                     ${createToggleRow("Collapse Sidebar", "Automatically collapse the right sidebar on comment pages", "rex-toggle-sidebar", "rex_sidebar_collapse")}
                </div>
            </div>
        `;
    }

    /**
     * Injects the REX Settings tab into the navigation bar
     */
    function injectTab() {
        // Force refresh: if it exists, remove it first to ensure we aren't using an old version
        const existing = document.getElementById(REX_TAB_ID);
        if (existing) existing.remove();

        // refined selector: The tabs are inside rpl-horizontal-scroller#settings-tabgroup
        let targetContainer = document.querySelector('rpl-horizontal-scroller#settings-tabgroup');

        let emailTab = null;
        if (!targetContainer) {
            // Fallback
            const allLinks = Array.from(document.querySelectorAll('a'));
            emailTab = allLinks.find(a => a.textContent.trim() === 'Email');
            if (emailTab) targetContainer = emailTab.parentElement;
            else return false;
        } else {
            const allLinks = Array.from(targetContainer.querySelectorAll('a'));
            emailTab = allLinks.find(a => a.textContent.trim() === 'Email');
        }

        const rexTab = document.createElement('a');
        rexTab.id = REX_TAB_ID;
        // CRITICAL: URL changes trigger Reddit's router -> 404. Use void(0) to prevent any nav.
        rexTab.href = 'javascript:void(0)';

        // Base classes
        const BASE_CLASSES = emailTab ? emailTab.className : "inline-flex flex-col text-secondary-plain-weak font-semibold relative tab-bottom-border group hover:no-underline hover:text-secondary-plain ps-[var(--rem16)] pe-[var(--rem16)] cursor-pointer";
        rexTab.className = BASE_CLASSES;

        // Structure
        rexTab.innerHTML = `
            <span class="inline-flex">
              <span class="inline-flex flex-row items-center gap-xs py-[var(--rem10)] text-body-2">
                <span>REX Settings</span>
              </span>
              <span class="inline-flex flex-row items-center gap-xs"></span>
            </span>
            <span class="hidden group-[.tab-bottom-border.tab-selected]:block bottom-border-selected flex-grow h-[2px] -mt-[2px] pointer-events-none bg-secondary-plain group-hover:block group-hover:bg-secondary-plain-weak rounded-full absolute bottom-0 left-0 right-0"></span>
        `;

        rexTab.removeAttribute('aria-selected');
        rexTab.removeAttribute('aria-current');
        rexTab.classList.remove('tab-selected', '!text-neutral-content-strong');
        if (!rexTab.classList.contains('text-secondary-plain-weak')) {
            rexTab.classList.add('text-secondary-plain-weak');
        }

        // Handle click
        rexTab.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            console.log('[REX] Tab clicked, switching view...');

            // UI Update
            const siblings = targetContainer.querySelectorAll('a');
            siblings.forEach(t => {
                // Skip us
                if (t.id === REX_TAB_ID) return;

                t.removeAttribute('aria-selected');
                t.removeAttribute('aria-current');
                t.removeAttribute('rpl-selected');
                t.classList.remove('arr-selected', 'tab-selected', '!text-neutral-content-strong');
                if (!t.classList.contains('text-secondary-plain-weak')) {
                    t.classList.add('text-secondary-plain-weak');
                }
            });

            rexTab.setAttribute('aria-selected', 'true');
            rexTab.setAttribute('rpl-selected', '');
            rexTab.classList.add('tab-selected', '!text-neutral-content-strong');
            rexTab.classList.remove('text-secondary-plain-weak');

            switchToRexSettings();
        });

        targetContainer.appendChild(rexTab);
        return true;
    }

    /**
     * Hides the default content and shows REX settings
     * Preserves tabs by only hiding content siblings
     */
    function switchToRexSettings() {
        // Selector for main wrapper: main#main-content > div.px-md
        const mainContainerInner = document.querySelector('main#main-content > div.px-md') || document.querySelector('main > div.px-md');

        if (mainContainerInner) {
            const children = Array.from(mainContainerInner.children);
            children.forEach(child => {
                // Skip specific IDs/Tags to preserve Header and Tabs
                if (child.id === REX_PANEL_ID) return;

                // CRITICAL: Do NOT hide the header or the tabs container
                if (child.tagName === 'H1') return; // "Settings" header
                if (child.tagName === 'RPL-HORIZONTAL-SCROLLER') return; // New scroller tag
                if (child.id === 'settings-tabgroup' || child.querySelector('#settings-tabgroup') || child.querySelector('a[href*="/settings/account"]')) return;

                // If the child contains the scroller, don't hide it
                if (child.querySelector('rpl-horizontal-scroller')) return;

                child.style.display = 'none';
            });

            let panel = document.getElementById(REX_PANEL_ID);
            // Always recreate panel to ensure up-to-date settings render
            if (panel) panel.remove();

            panel = document.createElement('div');
            panel.id = REX_PANEL_ID;
            panel.innerHTML = createPanelHTML();
            mainContainerInner.appendChild(panel);

            attachListeners(panel);

            panel.style.display = 'block';

            // NOTE: We do NOT push history state to avoid fighting Reddit's router.
            // The view is transient.
        }
    }

    /**
     * Attaches event listeners to the settings panel
     * @param {HTMLElement} panel 
     */
    function attachListeners(panel) {
        const toggles = panel.querySelectorAll('.rex-toggle-label');
        toggles.forEach(label => {
            label.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const switchInput = label.querySelector('faceplate-switch-input');
                const settingKey = label.dataset.settingKey;

                if (switchInput && settingKey) {
                    // Current state
                    const isChecked = switchInput.hasAttribute('checked');
                    const newState = !isChecked; // Toggle

                    // Visual Update: precise attribute manipulation matching native behavior
                    switchInput.setAttribute('aria-checked', newState ? 'true' : 'false');

                    if (newState) {
                        switchInput.setAttribute('checked', '');
                    } else {
                        switchInput.removeAttribute('checked');
                    }

                    // Save
                    saveSetting(settingKey, newState);
                }
            });
        });
    }

    return {
        init: function () {
            console.log('[REX] Initializing Settings Injector');
            // Load settings immediately on init
            loadSettings().then(() => {
                injectTab();

                const observer = new MutationObserver(() => {
                    // If tab is gone (navigation/render), put it back
                    if (!document.getElementById(REX_TAB_ID)) {
                        injectTab();
                    }
                });

                observer.observe(document.body, { childList: true, subtree: true });
            });
        },
        save: saveSetting, // Expose save for inline handlers
    };
})();
