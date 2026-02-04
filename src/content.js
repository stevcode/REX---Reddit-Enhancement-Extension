/**
 * REX - Reddit Enhancement Extension
 * Content Script: Collapse sidebar sections by default
 */

(function () {
    'use strict';

    // Initialize Sidebar Collapse Logic
    if (window.REX_SIDEBAR) {
        window.REX_SIDEBAR.init();
    }

    // Initialize Header Logic (Ads etc)
    if (window.REX_HEADER) {
        window.REX_HEADER.init();
    }

    // Initialize REX Settings if we are on the settings page
    function initSettings() {
        if (window.location.href.includes('/settings') && window.REX_SETTINGS) {
            window.REX_SETTINGS.init();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initSettings();
        });
    } else {
        initSettings();
    }

})();
