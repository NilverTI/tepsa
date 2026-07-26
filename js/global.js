/* ==========================================================================
   GLOBAL UTILITIES & SHARED BEHAVIORS - TEPSA PSV
   ========================================================================== */

const numberFormat = new Intl.NumberFormat("es-PE", {
    maximumFractionDigits: 0,
});

/**
 * Formats a numeric value to Peru Spanish locale formatting safely.
 */
function formatNumber(value) {
    const num = Number(value);
    return isNaN(num) ? "0" : numberFormat.format(num);
}

/**
 * Escapes HTML entities to prevent XSS vulnerability.
 */
function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

/**
 * Retrieves the initials of a driver name, stripping tags.
 */
function getInitials(name) {
    const clean = String(name || "?").replace(/\[.*?\]/g, "").trim();
    return (clean.charAt(0) || "?").toUpperCase();
}

/**
 * Enables smooth scrolling classes for the navbar header with rAF throttling.
 */
function setupNavbarScroll() {
    const navbar = document.querySelector(".navbar");
    if (!navbar) return;
    
    let ticking = false;
    function updateNavbarState() {
        navbar.classList.toggle("scrolled", window.scrollY > 60);
        ticking = false;
    }
    
    window.addEventListener("scroll", () => {
        if (!ticking) {
            window.requestAnimationFrame(updateNavbarState);
            ticking = true;
        }
    }, { passive: true });
    updateNavbarState();
}

/**
 * Configures event listeners for the responsive hamburger menu.
 */
function setupHamburgerMenu() {
    const hamburger = document.getElementById("hamburger");
    const mainMenu = document.getElementById("mainMenu");
    
    if (!hamburger || !mainMenu) return;
    
    hamburger.addEventListener("click", () => {
        const isExpanded = mainMenu.classList.toggle("show");
        hamburger.setAttribute("aria-expanded", isExpanded ? "true" : "false");
    });
}

// Automatically bind key layouts on DOM content ready
document.addEventListener("DOMContentLoaded", () => {
    setupNavbarScroll();
    setupHamburgerMenu();
});
