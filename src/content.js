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

    // Initialize Feed Logic (Recent Posts etc)
    if (window.REX_FEED) {
        window.REX_FEED.init();
    }

    // Initialize REX Settings globally to allow its SPA router to inject tabs on navigation
    if (window.REX_SETTINGS) {
        window.REX_SETTINGS.init();
    }

})();
