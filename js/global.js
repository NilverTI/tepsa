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
 * Resolves optimal API endpoint based on current environment.
 * Prevents 404 console errors when running under VS Code Live Server.
 */
function getApiEndpoint(path) {
    const cleanPath = path.startsWith('/') ? path : '/' + path;
    const port = window.location.port;

    if (port && port !== '3000' && port !== '3001' && port !== '80' && port !== '443') {
        return `https://tepsa.vercel.app${cleanPath}`;
    }

    return cleanPath;
}

/**
 * Returns prioritized fallback API endpoints array.
 */
function getApiEndpointsList(path) {
    const cleanPath = path.startsWith('/') ? path : '/' + path;
    const primary = getApiEndpoint(cleanPath);
    const list = [
        primary,
        `https://tepsa.vercel.app${cleanPath}`,
        `http://127.0.0.1:3000${cleanPath}`
    ];
    return Array.from(new Set(list));
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
        const isExpanded = mainMenu.classList.toggle("show");
        hamburger.setAttribute("aria-expanded", isExpanded ? "true" : "false");
    });
}

// Automatically bind key layouts on DOM content ready
document.addEventListener("DOMContentLoaded", () => {
    setupNavbarScroll();
    setupHamburgerMenu();
});
