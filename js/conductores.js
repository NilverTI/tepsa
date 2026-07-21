/* ==========================================================================
   CONDUCTORES PAGE SCRIPT - TEPSA PSV
   ========================================================================== */

let allDrivers = [];
let currentSort = "km";
let currentStatus = "all";
let searchTerm = "";

function getSortFn(sort) {
    switch (sort) {
        case "damage": return (a, b) => (a.damage || 0) - (b.damage || 0) || (b.kilometers || 0) - (a.kilometers || 0);
        case "points": return (a, b) => (b.points || 0) - (a.points || 0) || (b.kilometers || 0) - (a.kilometers || 0);
        case "name": return (a, b) => a.name.localeCompare(b.name);
        default: return (a, b) => (b.kilometers || 0) - (a.kilometers || 0) || (a.damage || 0) - (b.damage || 0);
    }
}

function getStatus(driver) {
    return Number(driver.lastJobDays) <= 7 ? "active" : "inactive";
}

function getStatusLabel(driver) {
    const days = Number(driver.lastJobDays);
    if (days === 0) return "Conectado ahora";
    if (days <= 7) return `Activo (${driver.lastJob})`;
    if (days === 9999) return "Sin actividad";
    return `Inactivo (${driver.lastJob})`;
}

function getStatusDotClass(driver) {
    const days = Number(driver.lastJobDays);
    if (days <= 7) return "active";
    if (days === 9999) return "no-data";
    return "inactive";
}

/**
 * Driver-specific getInitials that strips VTC tags (e.g., [TPS])
 */
function getDriverInitials(name) {
    const clean = String(name).replace(/\[.*?\]/g, '').trim();
    return clean.charAt(0).toUpperCase() || '?';
}

function renderStats(stats = {}) {
    const bar = document.getElementById("stats-bar");
    if (!bar) return;
    bar.innerHTML = `
        <div class="stat-card">
            <span class="stat-icon">🚌</span>
            <span class="stat-value">${formatNumber(stats.kilometers)}</span>
            <span class="stat-label">KM Totales</span>
        </div>
        <div class="stat-card">
            <span class="stat-icon">👥</span>
            <span class="stat-value">${formatNumber(stats.drivers)}</span>
            <span class="stat-label">Miembros</span>
        </div>
        <div class="stat-card">
            <span class="stat-icon">⚡</span>
            <span class="stat-value">${formatNumber(stats.active)}</span>
            <span class="stat-label">Activos</span>
        </div>
    `;
}

function renderDrivers() {
    const grid = document.getElementById("drivers-grid");
    const statusEl = document.getElementById("data-status");
    if (!grid) return;

    let filtered = allDrivers;
    if (currentStatus !== "all") filtered = filtered.filter(d => getStatus(d) === currentStatus);
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(d =>
            d.name.toLowerCase().includes(term) ||
            d.role.toLowerCase().includes(term) ||
            d.rank.toLowerCase().includes(term)
        );
    }
    const sorted = [...filtered].sort(getSortFn(currentSort));

    if (!sorted.length) {
        const noResultsHtml = `<div class="no-results"><h3>Sin resultados</h3><p>No se encontraron conductores.</p></div>`;
        if (grid.querySelector(".skeleton") || grid.innerHTML.trim() === "") {
            grid.innerHTML = noResultsHtml;
        } else {
            smoothUpdate(grid, noResultsHtml);
        }
        if (statusEl) statusEl.textContent = "0 conductores encontrados";
        return;
    }

    const html = sorted.map((driver, index) => {
        const pos = index + 1;
        const dotClass = getStatusDotClass(driver);
        const initials = getDriverInitials(driver.name);
        const hasAvatar = driver.avatar && driver.avatar.startsWith("http");
        const avatarContent = hasAvatar
            ? `<img src="${escapeHtml(driver.avatar)}" alt="${escapeHtml(driver.name)}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';">
               <span style="display:none;">${escapeHtml(initials)}</span>`
            : escapeHtml(initials);

        return `
        <div class="driver-card">
            <div class="card-top">
                <div class="driver-info">
                    <div class="driver-avatar-wrap">
                        <div class="driver-avatar">${avatarContent}</div>
                    </div>
                    <div class="driver-meta">
                        <div class="name-row">
                            <h3>${escapeHtml(driver.name)}</h3>
                            ${driver.country ? `<span class="driver-country">${escapeHtml(driver.country)}</span>` : ''}
                        </div>
                        ${driver.role ? `<span class="driver-role" data-role="${escapeHtml(driver.role)}">${escapeHtml(driver.role)}</span>` : ''}
                    </div>
                </div>
                <div class="driver-badges">
                    ${driver.level > 0 ? `<span class="driver-level">Nv. ${driver.level}</span>` : ''}
                    ${driver.rank ? `<span class="driver-rank">${escapeHtml(driver.rank)}</span>` : ''}
                </div>
            </div>
            <div class="driver-stats">
                <div class="ds-item km">
                    <div class="ds-value" data-value="${driver.kilometers || 0}">${formatNumber(driver.kilometers)}</div>
                    <div class="ds-label">KM</div>
                </div>
                <div class="ds-item damage">
                    <div class="ds-value" data-value="${driver.damage || 0}">${formatNumber(driver.damage)}</div>
                    <div class="ds-label">Daño</div>
                </div>
                <div class="ds-item points">
                    <div class="ds-value" data-value="${driver.points || 0}">${formatNumber(driver.points)}</div>
                    <div class="ds-label">Puntos</div>
                </div>
            </div>
            <div class="card-bottom">
                <div class="last-job">
                    <span class="status-dot ${dotClass}"></span>
                    <span>${escapeHtml(getStatusLabel(driver))}</span>
                </div>
                <div class="driver-position-wrap">
                    <span class="driver-position-label">#</span>
                    <span class="driver-position">${pos}</span>
                </div>
            </div>
        </div>`;
    }).join("");

    if (grid.querySelector(".skeleton") || grid.innerHTML.trim() === "" || grid.style.opacity === "0.3") {
        grid.innerHTML = html;
    } else {
        smoothUpdate(grid, html);
    }

    const sortLabel = { km: "kilometraje", damage: "menor daño", points: "puntos", name: "nombre" };
    if (statusEl) {
        const statusText = currentStatus === "all" ? "Todos" : currentStatus === "active" ? "Activos" : "Inactivos";
        statusEl.textContent = `${sorted.length} conductor(es) - Filtro: ${statusText} - Orden: ${sortLabel[currentSort] || "km"}`;
    }
}

const CACHE_KEY = "tepsa_conductores_v3";
const CACHE_TTL = 5 * 60 * 1000;

let activeConductoresFetchPromise = null;

function smoothUpdate(element, newHtml) {
    if (!element) return;
    element.style.opacity = "0.3";
    setTimeout(() => {
        element.innerHTML = newHtml;
        element.style.opacity = "1";
    }, 250);
}

function formatTimeAgo(timestamp) {
    if (!timestamp) return "hace un momento";
    const diffMs = Date.now() - new Date(timestamp).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "hace un momento";
    if (diffMins === 1) return "hace 1 minuto";
    return `hace ${diffMins} minutos`;
}

function renderDriversSkeletons() {
    const grid = document.getElementById("drivers-grid");
    if (!grid) return;
    grid.innerHTML = Array.from({ length: 8 }).map(() => `
        <div class="driver-card skeleton" style="display: flex; flex-direction: column; gap: 15px; padding: 20px; border-radius: 14px; background: #161616; border: 1px solid #222; height: 210px;">
            <div style="display: flex; gap: 15px; align-items: center;">
                <div style="width: 44px; height: 44px; border-radius: 50%; background: #2a2a2a;"></div>
                <div style="flex: 1; display: flex; flex-direction: column; gap: 6px;">
                    <div style="width: 60%; height: 14px; background: #2a2a2a; border-radius: 4px;"></div>
                    <div style="width: 40%; height: 11px; background: #2a2a2a; border-radius: 4px;"></div>
                </div>
            </div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 10px 0;">
                <div style="height: 40px; background: #2a2a2a; border-radius: 8px;"></div>
                <div style="height: 40px; background: #2a2a2a; border-radius: 8px;"></div>
                <div style="height: 40px; background: #2a2a2a; border-radius: 8px;"></div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="width: 30%; height: 11px; background: #2a2a2a; border-radius: 4px;"></div>
                <div style="width: 15%; height: 14px; background: #2a2a2a; border-radius: 4px;"></div>
            </div>
        </div>
    `).join("");
}

function getCache() {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const entry = JSON.parse(raw);
        return entry.data;
    } catch { return null; }
}

function setCache(data) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data })); } catch { }
}

function getMonthDateRange() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
    return { y, m, lastDay };
}

function formatLastJob(days) {
    if (days == null || days === "") return "Sin registro";
    const n = Number(days);
    if (!Number.isFinite(n)) return "Sin registro";
    if (n === 0) return "hoy";
    if (n === 1) return "ayer";
    return `hace ${n} días`;
}

async function tryFetch(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
}

async function fetchMonthJobsData() {
    const { y, m, lastDay } = getMonthDateRange();
    const base = `https://e.truckyapp.com/api/v1/company/44302/jobs?dateFrom=${y}-${m}-01&dateTo=${y}-${m}-${lastDay}`;
    const stats = new Map();
    try {
        const p1 = await tryFetch(base + "&page=1");
        if (!p1 || !p1.data) return stats;
        const total = p1.last_page || 1;
        const pages = [p1];
        for (let s = 2; s <= total; s += 4) {
            const batch = [];
            for (let p = s; p < s + 4 && p <= total; p++) batch.push(tryFetch(base + "&page=" + p));
            const results = await Promise.allSettled(batch);
            for (const r of results) if (r.status === "fulfilled" && r.value) pages.push(r.value);
        }
        for (const page of pages) {
            if (!page || !page.data) continue;
            for (const job of page.data) {
                const name = job.driver?.name || job.in_game_profile_name || "";
                if (!name) continue;
                const prev = stats.get(name) || { kilometers: 0, damage: 0, totalJobs: 0 };
                prev.kilometers += Number(job.driven_distance_km || job.kilometers || 0);
                prev.damage += Number(job.vehicle_damage || 0) + Number(job.cargo_damage || 0) + Number(job.trailers_damage || 0);
                prev.totalJobs += 1;
                stats.set(name, prev);
            }
        }
    } catch (e) { console.error("fetchMonthJobsData:", e); }
    return stats;
}

function transformTruckyMember(m, monthStats) {
    const lastJobDays = m.last_job_days != null && Number.isFinite(Number(m.last_job_days))
        ? Number(m.last_job_days) : 9999;
    const name = m.name || m.username || "Sin nombre";
    const ms = monthStats.get(name) || { kilometers: 0, damage: 0, totalJobs: 0 };
    return {
        name,
        kilometers: Math.round(ms.kilometers),
        damage: Math.round(ms.damage),
        totalJobs: ms.totalJobs,
        points: Math.round(m.points || 0),
        lastJob: formatLastJob(m.last_job_days),
        lastJobDays,
        rank: m.rank?.name || "",
        role: m.role?.name || "",
        avatar: m.avatar_url || "",
        level: m.level || 0,
        country: m.country || "",
        cargoMass: Math.round(m.total_cargo_mass_t || 0),
        revenue: Math.round(m.total_revenue || 0),
    };
}

async function fetchFresh() {
    const urls = [
        "/api/trucky/conductores",
        "http://127.0.0.1:3000/api/trucky/conductores",
        "http://127.0.0.1:3001/api/trucky/conductores",
        "https://tepsa.vercel.app/api/trucky/conductores"
    ];

    const promises = urls.map(async (url) => {
        const isLocal = url.startsWith("/") || url.includes("127.0.0.1") || url.includes("localhost");
        const timeoutMs = isLocal ? 1500 : 8000;
        
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeoutMs);
        
        try {
            const res = await fetch(url, { cache: "no-store", signal: controller.signal });
            clearTimeout(id);
            if (!res.ok) throw new Error("HTTP " + res.status);
            return await res.json();
        } catch (err) {
            clearTimeout(id);
            throw err;
        }
    });

    try {
        return await Promise.any(promises);
    } catch (err) {
        console.warn("All primary URLs failed or timed out, trying direct Trucky backup...");
    }

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 8000);
    try {
        const [raw, monthStats] = await Promise.all([
            fetch("https://e.truckyapp.com/api/v1/company/44302/members", { cache: "no-store", signal: controller.signal }).then(r => r.json()),
            fetchMonthJobsData(),
        ]);
        clearTimeout(id);
        const members = raw.data || [];
        const ranking = members.map(m => transformTruckyMember(m, monthStats)).sort((a, b) => b.kilometers - a.kilometers);
        const totalKm = ranking.reduce((s, d) => s + d.kilometers, 0);
        const active = ranking.filter(d => d.lastJobDays <= 7).length;
        return { ranking, stats: { kilometers: totalKm, drivers: ranking.filter(d => d.kilometers > 0).length, active } };
    } catch (err) {
        clearTimeout(id);
        throw err;
    }
}

async function loadData(force) {
    let cached = null;
    let cacheTime = null;
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (raw) {
            const entry = JSON.parse(raw);
            cached = entry.data;
            cacheTime = entry.ts;
        }
    } catch (e) {}

    const statusEl = document.getElementById("data-status");

    if (cached) {
        allDrivers = (cached.ranking || []).filter(d => d.role?.toLowerCase() !== "owner");
        renderStats(cached.stats);
        renderDrivers();
        if (statusEl) {
            statusEl.textContent = `📡 Datos locales · Actualizado: ${formatTimeAgo(cacheTime)}`;
        }

        if (cacheTime && (Date.now() - cacheTime < CACHE_TTL) && !force) {
            return;
        }
    } else {
        renderDriversSkeletons();
        if (statusEl) {
            statusEl.textContent = "⏳ Cargando datos del servidor...";
        }
    }

    if (activeConductoresFetchPromise) {
        try {
            await activeConductoresFetchPromise;
        } catch (e) {}
        return;
    }

    let data = null;
    activeConductoresFetchPromise = fetchFresh();

    try {
        data = await activeConductoresFetchPromise;
    } catch (e) {
        console.error("loadData fetch error:", e);
    } finally {
        activeConductoresFetchPromise = null;
    }

    if (data) {
        const isChanged = !cached ||
            JSON.stringify(cached.stats) !== JSON.stringify(data.stats) ||
            JSON.stringify(cached.ranking) !== JSON.stringify(data.ranking);

        setCache(data);

        allDrivers = (data.ranking || []).filter(d => d.role?.toLowerCase() !== "owner");
        
        if (isChanged) {
            renderStats(data.stats);
            renderDrivers();
        } else {
            if (statusEl) {
                statusEl.textContent = `📡 Datos actualizados · ${allDrivers.length} miembros`;
            }
        }
    } else {
        if (cached) {
            if (statusEl) {
                statusEl.textContent = `⚠️ Mostrando datos guardados. Última actualización: ${formatTimeAgo(cacheTime)}`;
            }
        } else {
            allDrivers = [
                { name: "[TPS]SABROSAURIO", kilometers: 43400, damage: 3263, totalJobs: 78, points: 63897, lastJob: "hoy", lastJobDays: 0, rank: "Veterano", role: "Administrador", avatar: "https://cdn.truckyapp.com/public/users/262175/yS9Jl3fpMP9x0UwHGZ2Q.png", level: 8, country: "PE", cargoMass: 663, revenue: 34542506 },
                { name: "[TPS] Cristofer Jonathan QM", kilometers: 35229, damage: 3289, totalJobs: 51, points: 36230, lastJob: "ayer", lastJobDays: 1, rank: "Veterano", role: "Moderador", avatar: "https://avatars.steamstatic.com/c3f55192adc55003cf213ef22fb2fa948f255e66_full.jpg", level: 6, country: "", cargoMass: 350, revenue: 28848413 },
                { name: "[TPS] Lexus", kilometers: 27203, damage: 16448, totalJobs: 27, points: 30305, lastJob: "ayer", lastJobDays: 1, rank: "Veterano", role: "Conductor", avatar: "https://avatars.steamstatic.com/afbd9b7d1fcb595c2af3a889126eb2d633da0643_full.jpg", level: 6, country: "", cargoMass: 155, revenue: 13398366 },
                { name: "[TPS] Joker", kilometers: 26369, damage: 3355, totalJobs: 64, points: 41526, lastJob: "hace 3 días", lastJobDays: 3, rank: "Veterano", role: "Conductor", avatar: "", level: 6, country: "", cargoMass: 388, revenue: 27920645 },
                { name: "[ TPS ] KEVIN", kilometers: 22888, damage: 1928, totalJobs: 32, points: 24089, lastJob: "hoy", lastJobDays: 0, rank: "Veterano", role: "Conductor", avatar: "https://avatars.steamstatic.com/7b66986ac882de1f95b9b947e85e7fac32a5d02e_full.jpg", level: 5, country: "", cargoMass: 212, revenue: 19590207 },
                { name: "[TPS]KIRITO", kilometers: 20512, damage: 416, totalJobs: 33, points: 23113, lastJob: "ayer", lastJobDays: 1, rank: "Veterano", role: "Moderador", avatar: "https://cdn.truckyapp.com/public/users/264396/MZLTiXQQkRCC20bZ2WT4.jpg", level: 5, country: "", cargoMass: 238, revenue: 15645932 },
                { name: "[TPS] Johan-19", kilometers: 16337, damage: 12929, totalJobs: 31, points: 19138, lastJob: "hoy", lastJobDays: 0, rank: "Conductor", role: "Conductor", avatar: "", level: 4, country: "", cargoMass: 170, revenue: 14940683 },
                { name: "[TPS] Angel", kilometers: 15896, damage: 3610, totalJobs: 22, points: 18097, lastJob: "hoy", lastJobDays: 0, rank: "Conductor", role: "Conductor", avatar: "https://cdn.truckyapp.com/public/users/273992/WZnmQpZBkGQUE298GDyh.jpeg", level: 4, country: "", cargoMass: 127, revenue: 13414766 },
                { name: "[TPS]KANIEL_OUT", kilometers: 9452, damage: 569, totalJobs: 15, points: 11424, lastJob: "hace 19 días", lastJobDays: 19, rank: "Conductor", role: "Conductor", avatar: "", level: 3, country: "PE", cargoMass: 101, revenue: 8326510 },
                { name: "[TPS]RENZITO", kilometers: 6362, damage: 2124, totalJobs: 15, points: 7963, lastJob: "hoy", lastJobDays: 0, rank: "Conductor", role: "Conductor", avatar: "https://avatars.steamstatic.com/20350153c82aa90d7dcf947e103eb16593597d49_full.jpg", level: 3, country: "", cargoMass: 64, revenue: 5282808 },
                { name: "[TPS]EMPERADOR", kilometers: 3719, damage: 1625, totalJobs: 10, points: 4119, lastJob: "hace 16 días", lastJobDays: 16, rank: "novato", role: "Conductor", avatar: "", level: 2, country: "", cargoMass: 34, revenue: 3037086 },
                { name: "banco bcp", kilometers: 2606, damage: 1146, totalJobs: 9, points: 4567, lastJob: "hace 35 días", lastJobDays: 35, rank: "novato", role: "Conductor", avatar: "", level: 2, country: "", cargoMass: 79, revenue: 2052853 },
                { name: "[TPS] juan david", kilometers: 1850, damage: 308, totalJobs: 5, points: 7981, lastJob: "hoy", lastJobDays: 0, rank: "novato", role: "Conductor", avatar: "https://avatars.steamstatic.com/05abc1a0da733e816b15973c762a2fdd511a3274_full.jpg", level: 3, country: "", cargoMass: 32, revenue: 781421 },
            ];
            const totalKm = allDrivers.reduce((s, d) => s + d.kilometers, 0);
            const active = allDrivers.filter(d => d.lastJobDays <= 7).length;
            renderStats({ kilometers: totalKm, drivers: allDrivers.length, active });
            renderDrivers();
            if (statusEl) {
                statusEl.textContent = "Sin conexión. Mostrando datos de respaldo.";
            }
        }
    }
}

/* ===== PHOTO GALLERY & ADMIN CONTROL SYSTEM ===== */
const ADMIN_USERS_LIST = ["alexander", "cesar", "cristofer", "sabrosaurio", "kirito"];

function isUserAdmin(username) {
    if (!username) return false;
    const lower = username.toLowerCase();
    return ADMIN_USERS_LIST.some(a => lower.includes(a));
}

function getActiveSession() {
    try {
        const raw = localStorage.getItem("tepsa:driver-session");
        if (!raw) return null;
        const session = JSON.parse(raw);
        if (!session || !session.username || !session.password) return null;

        const now = Date.now();
        const elapsed = now - (session.lastActivity || 0);
        if (elapsed > 30 * 60 * 1000) { // 30 minutos de inactividad
            clearActiveSession();
            return null;
        }

        session.lastActivity = now;
        localStorage.setItem("tepsa:driver-session", JSON.stringify(session));
        return session;
    } catch (e) {
        return null;
    }
}

function setActiveSession(username, password) {
    const session = {
        username: username,
        password: password,
        isAdmin: isUserAdmin(username),
        loginTime: Date.now(),
        lastActivity: Date.now()
    };
    localStorage.setItem("tepsa:driver-session", JSON.stringify(session));
    localStorage.setItem("tepsa:active-driver", username);
    localStorage.setItem(`tepsa:driver-pw:${username}`, password);
    checkAndUpdateAdminVisibility();
}

function clearActiveSession() {
    localStorage.removeItem("tepsa:driver-session");
    localStorage.removeItem("tepsa:active-driver");
    checkAndUpdateAdminVisibility();
}

function checkAndUpdateAdminVisibility() {
    const session = getActiveSession();
    if (!btnOpenAdminModal) return;
    if (session && isUserAdmin(session.username)) {
        btnOpenAdminModal.style.display = "inline-flex";
    } else {
        btnOpenAdminModal.style.display = "none";
    }
}

const modal = document.getElementById("driverPhotosModal");
const modalDriverName = document.getElementById("modalDriverName");
const galleryPhotosGrid = document.getElementById("galleryPhotosGrid");
const galleryPagination = document.getElementById("galleryPagination");

// Auth Modal Controls
const authModal = document.getElementById("driverAuthModal");
const btnOpenAuthModal = document.getElementById("btnOpenAuthModal");
const closeAuthModalBtn = document.getElementById("closeAuthModal");
const loginFormState = document.getElementById("loginFormState");
const uploadFormState = document.getElementById("uploadFormState");

// Forms
const popupLoginForm = document.getElementById("popupLoginForm");
const popupUploadForm = document.getElementById("popupUploadForm");

// Inputs
const loginUsernameInput = document.getElementById("loginUsernameInput");
const loginPasswordInput = document.getElementById("loginPasswordInput");
const uploadImageUrlInput = document.getElementById("uploadImageUrlInput");
const uploadDescInput = document.getElementById("uploadDescInput");
const uploadActiveDriverText = document.getElementById("uploadActiveDriverText");

// Buttons & Error overlays
const btnSubmitLogin = document.getElementById("btnSubmitLogin");
const btnSubmitPopupUpload = document.getElementById("btnSubmitPopupUpload");
const loginPopupError = document.getElementById("loginPopupError");
const uploadPopupError = document.getElementById("uploadPopupError");
const uploadPopupSuccess = document.getElementById("uploadPopupSuccess");
const linkLogout = document.getElementById("linkLogout");

// Lightbox preview overlays
const photoLightbox = document.getElementById("photoLightbox");
const lightboxImg = document.getElementById("lightboxImg");
const lightboxCaption = document.getElementById("lightboxCaption");

// Admin Modal Elements
const adminControlModal = document.getElementById("adminControlModal");
const btnOpenAdminModal = document.getElementById("btnOpenAdminModal");
const closeAdminModalBtn = document.getElementById("closeAdminModal");
const tabDriversListBtn = document.getElementById("tabDriversListBtn");
const tabCreateDriverBtn = document.getElementById("tabCreateDriverBtn");
const adminTabDriversView = document.getElementById("adminTabDriversView");
const adminTabCreateView = document.getElementById("adminTabCreateView");
const adminDriversListContainer = document.getElementById("adminDriversListContainer");
const adminCreateForm = document.getElementById("adminCreateForm");
const adminNewDriverName = document.getElementById("adminNewDriverName");
const adminNewDriverPassword = document.getElementById("adminNewDriverPassword");
const adminNewDriverRole = document.getElementById("adminNewDriverRole");
const adminCreateMsg = document.getElementById("adminCreateMsg");

let activeModalDriver = "";
let currentGalleryPage = 1;
let totalGalleryPages = 1;

function openPhotosModal(name) {
    if (!modal) return;
    activeModalDriver = name;
    currentGalleryPage = 1;
    if (modalDriverName) modalDriverName.textContent = `Galería de ${name}`;
    modal.style.display = "flex";
    setTimeout(() => modal.classList.add("show"), 10);

    const savedPw = localStorage.getItem(`tepsa:driver-pw:${activeModalDriver}`);
    if (savedPw) {
        if (btnOpenAuthModal) btnOpenAuthModal.innerHTML = `<span>🔓</span> Subir Captura`;
    } else {
        if (btnOpenAuthModal) btnOpenAuthModal.innerHTML = `<span>🔒</span> Subir (Login)`;
    }

    checkAndUpdateAdminVisibility();
    fetchPhotos(name, 1);
}

function closePhotosModal() {
    if (!modal) return;
    modal.classList.remove("show");
    setTimeout(() => modal.style.display = "none", 300);
    activeModalDriver = "";
}

function openAuthModal() {
    if (!authModal) return;

    const session = getActiveSession();
    if (session) {
        if (loginFormState) loginFormState.style.display = "none";
        if (uploadFormState) uploadFormState.style.display = "block";
        if (uploadActiveDriverText) uploadActiveDriverText.textContent = activeModalDriver;
        if (uploadImageUrlInput) uploadImageUrlInput.value = "";
        if (uploadDescInput) uploadDescInput.value = "";
        if (uploadPopupError) uploadPopupError.style.display = "none";
        if (uploadPopupSuccess) uploadPopupSuccess.style.display = "none";
    } else {
        if (loginFormState) loginFormState.style.display = "block";
        if (uploadFormState) uploadFormState.style.display = "none";
        if (loginUsernameInput) loginUsernameInput.value = "";
        if (loginPasswordInput) loginPasswordInput.value = "";
        if (loginPopupError) loginPopupError.style.display = "none";
    }

    authModal.style.display = "flex";
}

function closeAuthModal() {
    if (!authModal) return;
    authModal.style.display = "none";
}

async function fetchPhotos(driverName, page) {
    if (!galleryPhotosGrid) return;
    galleryPhotosGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #888;">
          <div class="spinner" style="margin: 0 auto 10px;"></div>
          <p>Cargando capturas...</p>
        </div>
    `;
    if (galleryPagination) galleryPagination.innerHTML = "";

    const urls = [
        `/api/galeria/fotos?driver=${encodeURIComponent(driverName)}&page=${page}`,
        `https://tepsa.vercel.app/api/galeria/fotos?driver=${encodeURIComponent(driverName)}&page=${page}`,
        `http://127.0.0.1:3000/api/galeria/fotos?driver=${encodeURIComponent(driverName)}&page=${page}`
    ];

    let data = null;

    for (const url of urls) {
        try {
            const ac = new AbortController();
            const tid = setTimeout(() => ac.abort(), 3500);
            const res = await fetch(url, { signal: ac.signal });
            clearTimeout(tid);
            if (res.ok) {
                const parsed = await res.json();
                if (parsed && parsed.success) {
                    data = parsed;
                    break;
                }
            }
        } catch (e) {}
    }

    if (!data) {
        const localPhotos = JSON.parse(localStorage.getItem(`tepsa:driver-photos:${driverName}`)) || [];
        data = { success: true, photos: localPhotos, pages: 1, page: 1, total: localPhotos.length };
    }

    const photos = data.photos || [];
    totalGalleryPages = data.pages || 1;
    currentGalleryPage = data.page || 1;

    if (photos.length === 0) {
        galleryPhotosGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: #777;">
          <span style="font-size: 44px; display: block; margin-bottom: 15px;">🌴📸</span>
          <p style="font-size: 15px; font-weight: 600; color: #eee; margin-bottom: 5px;">¡Parece que nuestro fotógrafo oficial se fue de vacaciones!</p>
          <p style="font-size: 12.5px; color: #777;">Este conductor aún no tiene capturas de ruta. ¡Salva el día subiendo una foto!</p>
        </div>
      `;
        return;
    }

    const session = getActiveSession();
    const canDelete = session && (session.isAdmin || session.username.toLowerCase() === driverName.toLowerCase());

    galleryPhotosGrid.innerHTML = photos.map(p => {
        const pId = p.id || p.image_url;
        return `
        <div class="gallery-card" style="position: relative;">
          ${canDelete ? `<button class="delete-photo-btn" data-id="${escapeHtml(pId)}" data-url="${escapeHtml(p.image_url)}" title="Eliminar foto">🗑️</button>` : ""}
          <div class="gallery-img-wrapper">
            <img src="${escapeHtml(p.image_url)}" alt="Captura de ${escapeHtml(driverName)}" loading="lazy" onerror="this.src='../assets/img/portada.png';">
          </div>
        </div>
      `;
    }).join("");

    galleryPhotosGrid.querySelectorAll(".delete-photo-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            e.stopPropagation();
            const pId = btn.dataset.id;
            const pUrl = btn.dataset.url;
            if (confirm("¿Estás seguro de que deseas eliminar esta fotografía de la galería?")) {
                await deletePhoto(pId, pUrl);
            }
        });
    });

    galleryPhotosGrid.querySelectorAll(".gallery-img-wrapper img").forEach((img, idx) => {
        img.addEventListener("click", () => {
            openLightbox(photos[idx].image_url, photos[idx].description, photos[idx].created_at);
        });
    });

    renderPaginationControls();
}

async function deletePhoto(photoId, imageUrl) {
    const session = getActiveSession();
    if (!session) {
        alert("Debes iniciar sesión para eliminar capturas.");
        return;
    }

    const urls = ["/api/galeria/delete", "https://tepsa.vercel.app/api/galeria/delete"];
    for (const url of urls) {
        try {
            await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    photoId,
                    imageUrl,
                    user: session.username,
                    targetDriver: activeModalDriver
                })
            });
        } catch (e) {}
    }

    // Local cleanup
    const localPhotos = JSON.parse(localStorage.getItem(`tepsa:driver-photos:${activeModalDriver}`)) || [];
    const updated = localPhotos.filter(p => p.id !== photoId && p.image_url !== imageUrl);
    localStorage.setItem(`tepsa:driver-photos:${activeModalDriver}`, JSON.stringify(updated));

    fetchPhotos(activeModalDriver, currentGalleryPage);
}

function renderPaginationControls() {
    if (totalGalleryPages <= 1 || !galleryPagination) return;

    galleryPagination.innerHTML = `
        <button class="page-btn" id="btnPrevPage" ${currentGalleryPage === 1 ? "disabled" : ""}>&lt;</button>
        <span class="page-info">Página ${currentGalleryPage} de ${totalGalleryPages}</span>
        <button class="page-btn" id="btnNextPage" ${currentGalleryPage === totalGalleryPages ? "disabled" : ""}>&gt;</button>
    `;

    document.getElementById("btnPrevPage")?.addEventListener("click", () => {
        if (currentGalleryPage > 1) {
            currentGalleryPage--;
            fetchPhotos(activeModalDriver, currentGalleryPage);
        }
    });

    document.getElementById("btnNextPage")?.addEventListener("click", () => {
        if (currentGalleryPage < totalGalleryPages) {
            currentGalleryPage++;
            fetchPhotos(activeModalDriver, currentGalleryPage);
        }
    });
}

/* ===== ADMIN CONTROL PANEL MODAL LOGIC ===== */
function openAdminModal() {
    if (!adminControlModal) return;
    adminControlModal.style.display = "flex";
    loadAdminDriversList();
}

function closeAdminModal() {
    if (!adminControlModal) return;
    adminControlModal.style.display = "none";
}

async function loadAdminDriversList() {
    if (!adminDriversListContainer) return;
    adminDriversListContainer.innerHTML = `
        <div style="text-align: center; padding: 20px; color: #888;">
          <div class="spinner" style="margin: 0 auto 10px;"></div>
          <p>Cargando cuentas...</p>
        </div>
    `;

    let drivers = [];
    try {
        const res = await fetch("/api/admin/conductores");
        if (res.ok) {
            const data = await res.json();
            if (data.drivers) drivers = data.drivers;
        }
    } catch (e) {}

    if (drivers.length === 0) {
        const defaultAccounts = JSON.parse(localStorage.getItem("tepsa:driver-accounts")) || [
            { driver_name: "Alexander", role: "Fundador / Admin", status: "active", is_admin: true },
            { driver_name: "Cesar", role: "Fundador / Admin", status: "active", is_admin: true },
            { driver_name: "Cristofer", role: "Moderador / Admin", status: "active", is_admin: true },
            { driver_name: "[TPS]SABROSAURIO", role: "Administrador", status: "active", is_admin: true },
            { driver_name: "[TPS]KIRITO", role: "Moderador", status: "active", is_admin: true },
            { driver_name: "[TPS] Cristofer Jonathan QM", role: "Moderador", status: "active", is_admin: true },
            { driver_name: "[TPS] Lexus", role: "Conductor", status: "active", is_admin: false }
        ];
        drivers = defaultAccounts;
    }

    adminDriversListContainer.innerHTML = drivers.map(d => {
        const isActive = d.status !== "inactive";
        return `
        <div class="admin-driver-card">
          <div class="admin-driver-info">
            <h4>${escapeHtml(d.driver_name)}</h4>
            <span>${escapeHtml(d.role || "Conductor")} ${d.is_admin ? "• 👑 Admin" : ""}</span>
          </div>
          <div class="admin-actions-wrap">
            <button class="btn-toggle-status ${isActive ? 'active' : 'inactive'}" data-name="${escapeHtml(d.driver_name)}" data-status="${isActive ? 'active' : 'inactive'}">
              ${isActive ? '🟢 Activa' : '🔴 Inactiva'}
            </button>
          </div>
        </div>
      `;
    }).join("");

    adminDriversListContainer.querySelectorAll(".btn-toggle-status").forEach(btn => {
        btn.addEventListener("click", async () => {
            const name = btn.dataset.name;
            const current = btn.dataset.status;
            const newStatus = current === "active" ? "inactive" : "active";
            await toggleDriverAccountStatus(name, newStatus);
        });
    });
}

async function toggleDriverAccountStatus(driverName, newStatus) {
    try {
        await fetch("/api/admin/conductores", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                adminUser: localStorage.getItem("tepsa:active-driver") || "Alexander",
                action: "toggle-status",
                targetDriver: driverName,
                status: newStatus
            })
        });
    } catch (e) {}

    let accounts = JSON.parse(localStorage.getItem("tepsa:driver-accounts")) || [];
    const idx = accounts.findIndex(a => a.driver_name === driverName);
    if (idx >= 0) {
        accounts[idx].status = newStatus;
    } else {
        accounts.push({ driver_name: driverName, status: newStatus });
    }
    localStorage.setItem("tepsa:driver-accounts", JSON.stringify(accounts));

    loadAdminDriversList();
}

/* ===== LIGHTBOX IMAGE ZOOM ===== */
function openLightbox(url, caption, dateStr) {
    if (!photoLightbox) return;
    lightboxImg.src = url;
    const formattedDate = dateStr ? new Date(dateStr).toLocaleDateString("es-PE") : "Fecha desconocida";
    lightboxCaption.innerHTML = `
        <p style="font-size: 15px; margin-bottom: 5px; color: #fff;">${escapeHtml(caption || "Captura de viaje.")}</p>
        <p style="font-size: 12px; color: #888;">Por ${escapeHtml(activeModalDriver)} • ${escapeHtml(formattedDate)}</p>
    `;
    photoLightbox.style.display = "flex";
}

function closeLightbox() {
    if (!photoLightbox) return;
    photoLightbox.style.display = "none";
    lightboxImg.src = "";
}

// Bind UI actions
document.addEventListener("DOMContentLoaded", () => {
    // Lightbox binding
    document.getElementById("closeLightbox")?.addEventListener("click", closeLightbox);
    photoLightbox?.addEventListener("click", (e) => {
        if (e.target === photoLightbox || e.target === document.getElementById("closeLightbox")) {
            closeLightbox();
        }
    });

    // Auth trigger binding
    btnOpenAuthModal?.addEventListener("click", openAuthModal);
    closeAuthModalBtn?.addEventListener("click", closeAuthModal);

    // Admin Panel trigger binding
    btnOpenAdminModal?.addEventListener("click", openAdminModal);
    closeAdminModalBtn?.addEventListener("click", closeAdminModal);

    // Admin Tabs switching
    tabDriversListBtn?.addEventListener("click", () => {
        tabDriversListBtn.classList.add("active");
        tabCreateDriverBtn.classList.remove("active");
        if (adminTabDriversView) adminTabDriversView.style.display = "block";
        if (adminTabCreateView) adminTabCreateView.style.display = "none";
    });

    tabCreateDriverBtn?.addEventListener("click", () => {
        tabCreateDriverBtn.classList.add("active");
        tabDriversListBtn.classList.remove("active");
        if (adminTabDriversView) adminTabDriversView.style.display = "none";
        if (adminTabCreateView) adminTabCreateView.style.display = "block";
    });

    // Admin Create Form Submit
    adminCreateForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = adminNewDriverName ? adminNewDriverName.value.trim() : "";
        const password = adminNewDriverPassword ? adminNewDriverPassword.value.trim() : "";
        const role = adminNewDriverRole ? adminNewDriverRole.value : "Conductor";

        if (!name || !password) return;

        try {
            await fetch("/api/admin/conductores", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    adminUser: localStorage.getItem("tepsa:active-driver") || "Alexander",
                    action: "create",
                    targetDriver: name,
                    newPassword: password,
                    role: role,
                    status: "active"
                })
            });
        } catch (e) {}

        let accounts = JSON.parse(localStorage.getItem("tepsa:driver-accounts")) || [];
        accounts.push({ driver_name: name, role, status: "active", is_admin: isUserAdmin(name) });
        localStorage.setItem("tepsa:driver-accounts", JSON.stringify(accounts));
        localStorage.setItem(`tepsa:driver-pw:${name}`, password);

        if (adminCreateMsg) {
            adminCreateMsg.textContent = `¡Acceso creado con éxito para ${name}!`;
            adminCreateMsg.style.display = "block";
        }
        if (adminNewDriverName) adminNewDriverName.value = "";
        if (adminNewDriverPassword) adminNewDriverPassword.value = "";

        setTimeout(() => {
            if (adminCreateMsg) adminCreateMsg.style.display = "none";
            tabDriversListBtn?.click();
            loadAdminDriversList();
        }, 1200);
    });

    // Close Modals
    document.getElementById("closePhotosModal")?.addEventListener("click", closePhotosModal);

    // Login Form Submit
    popupLoginForm?.addEventListener("submit", (e) => {
        e.preventDefault();
        const name = loginUsernameInput ? loginUsernameInput.value.trim() : "";
        const password = loginPasswordInput ? loginPasswordInput.value.trim() : "";

        if (!name || !password) return;

        setActiveSession(name, password);
        if (btnOpenAuthModal) btnOpenAuthModal.innerHTML = `<span>🔓</span> Subir Captura`;

        if (loginFormState) loginFormState.style.display = "none";
        if (uploadFormState) uploadFormState.style.display = "block";
        if (uploadActiveDriverText) uploadActiveDriverText.textContent = activeModalDriver;
        if (uploadImageUrlInput) uploadImageUrlInput.value = "";
        if (uploadDescInput) uploadDescInput.value = "";
        if (uploadPopupError) uploadPopupError.style.display = "none";
        if (uploadPopupSuccess) uploadPopupSuccess.style.display = "none";
    });

    // Logout Link
    linkLogout?.addEventListener("click", (e) => {
        e.preventDefault();
        clearActiveSession();
        if (btnOpenAuthModal) btnOpenAuthModal.innerHTML = `<span>🔒</span> Subir (Login)`;

        if (loginFormState) loginFormState.style.display = "block";
        if (uploadFormState) uploadFormState.style.display = "none";
        if (loginUsernameInput) loginUsernameInput.value = "";
        if (loginPasswordInput) loginPasswordInput.value = "";
    });

    // Upload Capture Form Submit
    popupUploadForm?.addEventListener("submit", async (e) => {
        e.preventDefault();

        const session = getActiveSession();
        if (!session) {
            if (uploadPopupError) {
                uploadPopupError.textContent = "Tu sesión ha expirado (30 min de inactividad). Por favor inicia sesión de nuevo.";
                uploadPopupError.style.display = "block";
            }
            setTimeout(() => {
                if (loginFormState) loginFormState.style.display = "block";
                if (uploadFormState) uploadFormState.style.display = "none";
            }, 1000);
            return;
        }

        const password = session.password;
        const url = uploadImageUrlInput ? uploadImageUrlInput.value.trim() : "";
        const description = uploadDescInput ? uploadDescInput.value.trim() : "";

        // Validación de Seguridad: Conductor estándar no puede subir fotos a la cuenta de otro
        if (!session.isAdmin && session.username.toLowerCase() !== activeModalDriver.toLowerCase()) {
            if (uploadPopupError) {
                uploadPopupError.textContent = `Seguridad: Estás conectado como ${session.username}. Solo puedes subir fotos a tu propio perfil. Para subir aquí, inicia sesión como ${activeModalDriver} o como Administrador.`;
                uploadPopupError.style.display = "block";
            }
            return;
        }

        if (!url || !description) {
            if (uploadPopupError) {
                uploadPopupError.textContent = "Ingresa el enlace de la imagen y una descripción.";
                uploadPopupError.style.display = "block";
            }
            return;
        }

        if (btnSubmitPopupUpload) {
            btnSubmitPopupUpload.disabled = true;
            btnSubmitPopupUpload.textContent = "Publicando...";
        }
        try {
            const urls = ["/api/galeria/upload", "https://tepsa.vercel.app/api/galeria/upload"];
            let uploaded = false;

            for (const apiUrl of urls) {
                try {
                    const response = await fetch(apiUrl, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            driver: activeModalDriver,
                            uploader: session.username,
                            password,
                            url,
                            description
                        })
                    });
                    if (response.ok) {
                        uploaded = true;
                        break;
                    }
                } catch (err) {}
            }

            // Always store in local fallback list so it never fails locally
            const localList = JSON.parse(localStorage.getItem(`tepsa:driver-photos:${activeModalDriver}`)) || [];
            localList.unshift({
                id: Date.now().toString(),
                driver_name: activeModalDriver,
                image_url: url,
                description,
                created_at: new Date().toISOString()
            });
            localStorage.setItem(`tepsa:driver-photos:${activeModalDriver}`, JSON.stringify(localList));

            if (uploadPopupSuccess) {
                uploadPopupSuccess.textContent = "¡Captura publicada con éxito!";
                uploadPopupSuccess.style.display = "block";
            }
            if (uploadImageUrlInput) uploadImageUrlInput.value = "";
            if (uploadDescInput) uploadDescInput.value = "";

            setTimeout(() => {
                closeAuthModal();
                fetchPhotos(activeModalDriver, 1);
            }, 1200);

        } catch (err) {
            console.error("Subida fallida:", err);
            if (uploadPopupError) {
                uploadPopupError.textContent = err.message;
                uploadPopupError.style.display = "block";
            }
        } finally {
            if (btnSubmitPopupUpload) {
                btnSubmitPopupUpload.disabled = false;
                btnSubmitPopupUpload.textContent = "Publicar Captura";
            }
        }
    });

    // Card delegation event trigger
    document.getElementById("drivers-grid")?.addEventListener("click", (e) => {
        const card = e.target.closest(".driver-card");
        if (!card) return;
        const nameEl = card.querySelector(".driver-meta h3");
        if (!nameEl) return;
        openPhotosModal(nameEl.textContent);
    });

    // Search and filters input bindings
    document.getElementById("searchInput")?.addEventListener("input", (e) => {
        searchTerm = e.target.value.trim();
        renderDrivers();
    });

    document.querySelectorAll(".filter-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            currentSort = btn.dataset.sort;
            renderDrivers();
        });
    });

    document.querySelectorAll(".status-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".status-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            currentStatus = btn.dataset.status;
            renderDrivers();
        });
    });

    // Initial load
    checkAndUpdateAdminVisibility();
    loadData();
    setInterval(() => loadData(true), 5 * 60 * 1000);
});

