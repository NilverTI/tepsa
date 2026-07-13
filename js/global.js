/* ==========================================================================
   GLOBAL UTILITIES & SHARED BEHAVIORS - TEPSA PSV
   ========================================================================== */

const numberFormat = new Intl.NumberFormat("es-PE", {
    maximumFractionDigits: 0,
});

/**
 * Formats a numeric value to Peru Spanish locale formatting.
 */
function formatNumber(value) {
    return numberFormat.format(Number(value) || 0);
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
 * Retrieves the initials of a driver name.
 */
function getInitials(name) {
    return (name || "?").charAt(0).toUpperCase();
}

/**
 * Enables smooth scrolling classes for the navbar header.
 */
function setupNavbarScroll() {
    const navbar = document.querySelector(".navbar");
    if (!navbar) return;
    
    function updateNavbarState() {
        navbar.classList.toggle("scrolled", window.scrollY > 60);
    }
    
    window.addEventListener("scroll", updateNavbarState, { passive: true });
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
        mainMenu.classList.toggle("show");
    });
}

// Automatically bind key layouts on DOM content ready
document.addEventListener("DOMContentLoaded", () => {
    setupNavbarScroll();
    setupHamburgerMenu();
});
