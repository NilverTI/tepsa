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
            <span class="stat-icon">🏎️</span>
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
        grid.innerHTML = `<div class="no-results"><h3>Sin resultados</h3><p>No se encontraron conductores.</p></div>`;
        if (statusEl) statusEl.textContent = "0 conductores encontrados";
        return;
    }

    grid.innerHTML = sorted.map((driver, index) => {
        const pos = index + 1;
        const dotClass = getStatusDotClass(driver);
        const hasAvatar = driver.avatar && driver.avatar.startsWith("http");
        const avatarImg = hasAvatar
            ? `<img src="${escapeHtml(driver.avatar)}" alt="${escapeHtml(driver.name)}" loading="lazy" onerror="this.parentElement.innerHTML=this.parentElement.getAttribute('data-fallback')">`
            : '';
        const initials = getDriverInitials(driver.name);
        const avatarContent = hasAvatar ? avatarImg : escapeHtml(initials);

        return `
        <div class="driver-card">
            <div class="card-top">
                <div class="driver-info">
                    <div class="driver-avatar-wrap">
                        <div class="driver-avatar" data-fallback="${escapeHtml(initials)}">${avatarContent}</div>
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

    const sortLabel = { km: "kilometraje", damage: "menor daño", points: "puntos", name: "nombre" };
    if (statusEl) {
        const statusText = currentStatus === "all" ? "Todos" : currentStatus === "active" ? "Activos" : "Inactivos";
        statusEl.textContent = `${sorted.length} conductor(es) - Filtro: ${statusText} - Orden: ${sortLabel[currentSort] || "km"}`;
    }
}

const CACHE_KEY = "tepsa_conductores_v3";
const CACHE_TTL = 5 * 60 * 1000;

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

function applyData(data, source) {
    allDrivers = (data.ranking || []).filter(d => d.role?.toLowerCase() !== "owner");
    renderStats(data.stats);
    renderDrivers();
    setCache(data);
    const statusEl = document.getElementById("data-status");
    if (statusEl) statusEl.textContent = `Trucky Hub · ${allDrivers.length} miembros · ${source}`;
}

async function tryFetch(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
}

async function fetchFresh() {
    const errors = [];
    const urls = [
        "/api/trucky/conductores",
        "http://127.0.0.1:3000/api/trucky/conductores",
        "http://127.0.0.1:3001/api/trucky/conductores",
        "https://tepsa.vercel.app/api/trucky/conductores"
    ];

    for (const url of urls) {
        try {
            const d = await tryFetch(url);
            applyData(d, "Servidor");
            return;
        } catch {
            errors.push(url);
            continue;
        }
    }

    try {
        const [raw, monthStats] = await Promise.all([
            tryFetch("https://e.truckyapp.com/api/v1/company/44302/members"),
            fetchMonthJobsData(),
        ]);
        const members = raw.data || [];
        const ranking = members.map(m => transformTruckyMember(m, monthStats)).sort((a, b) => b.kilometers - a.kilometers);
        const totalKm = ranking.reduce((s, d) => s + d.kilometers, 0);
        const active = ranking.filter(d => d.lastJobDays <= 7).length;
        applyData({ ranking, stats: { kilometers: totalKm, drivers: ranking.filter(d => d.kilometers > 0).length, active } }, "Trucky directo");
        return;
    } catch {
        errors.push("Trucky directo");
    }
    throw new Error("Fallaron todos los orígenes: " + errors.join(", "));
}

async function loadData(force) {
    const cached = getCache();
    if (cached) {
        allDrivers = (cached.ranking || []).filter(d => d.role?.toLowerCase() !== "owner");
        renderStats(cached.stats);
        renderDrivers();
        const statusEl = document.getElementById("data-status");
        if (statusEl) {
            statusEl.textContent = `📡 Datos en caché · ${allDrivers.length} miembros`;
        }
    } else {
        // Carga inmediata de datos de respaldo
        allDrivers = [
            { name: "[TPS]SABROSAURIO", kilometers: 43400, damage: 3263, totalJobs: 78, points: 63897, lastJob: "hoy", lastJobDays: 0, rank: "Veterano", role: "Administrador", avatar: "", level: 8, country: "PE", cargoMass: 663, revenue: 34542506 },
            { name: "[TPS] Cristofer Jonathan QM", kilometers: 35229, damage: 3289, totalJobs: 51, points: 36230, lastJob: "ayer", lastJobDays: 1, rank: "Veterano", role: "Moderador", avatar: "", level: 6, country: "", cargoMass: 350, revenue: 28848413 },
            { name: "[TPS] Lexus", kilometers: 27203, damage: 16448, totalJobs: 27, points: 30305, lastJob: "ayer", lastJobDays: 1, rank: "Veterano", role: "Conductor", avatar: "", level: 6, country: "", cargoMass: 155, revenue: 13398366 },
            { name: "[TPS] Joker", kilometers: 26369, damage: 3355, totalJobs: 64, points: 41526, lastJob: "hace 3 días", lastJobDays: 3, rank: "Veterano", role: "Conductor", avatar: "", level: 6, country: "", cargoMass: 388, revenue: 27920645 },
            { name: "[ TPS ] KEVIN", kilometers: 22888, damage: 1928, totalJobs: 32, points: 24089, lastJob: "hoy", lastJobDays: 0, rank: "Veterano", role: "Conductor", avatar: "", level: 5, country: "", cargoMass: 212, revenue: 19590207 },
            { name: "[TPS]KIRITO", kilometers: 20512, damage: 416, totalJobs: 33, points: 23113, lastJob: "ayer", lastJobDays: 1, rank: "Veterano", role: "Moderador", avatar: "", level: 5, country: "", cargoMass: 238, revenue: 15645932 },
            { name: "[TPS] Johan-19", kilometers: 16337, damage: 12929, totalJobs: 31, points: 19138, lastJob: "hoy", lastJobDays: 0, rank: "Conductor", role: "Conductor", avatar: "", level: 4, country: "", cargoMass: 170, revenue: 14940683 },
            { name: "[TPS] Angel", kilometers: 15896, damage: 3610, totalJobs: 22, points: 18097, lastJob: "hoy", lastJobDays: 0, rank: "Conductor", role: "Conductor", avatar: "", level: 4, country: "", cargoMass: 127, revenue: 13414766 },
            { name: "[TPS]KANIEL_OUT", kilometers: 9452, damage: 569, totalJobs: 15, points: 11424, lastJob: "hace 19 días", lastJobDays: 19, rank: "Conductor", role: "Conductor", avatar: "", level: 3, country: "PE", cargoMass: 101, revenue: 8326510 },
            { name: "[TPS]RENZITO", kilometers: 6362, damage: 2124, totalJobs: 15, points: 7963, lastJob: "hoy", lastJobDays: 0, rank: "Conductor", role: "Conductor", avatar: "", level: 3, country: "", cargoMass: 64, revenue: 5282808 },
            { name: "[TPS]EMPERADOR", kilometers: 3719, damage: 1625, totalJobs: 10, points: 4119, lastJob: "hace 16 días", lastJobDays: 16, rank: "novato", role: "Conductor", avatar: "", level: 2, country: "", cargoMass: 34, revenue: 3037086 },
            { name: "banco bcp", kilometers: 2606, damage: 1146, totalJobs: 9, points: 4567, lastJob: "hace 35 días", lastJobDays: 35, rank: "novato", role: "Conductor", avatar: "", level: 2, country: "", cargoMass: 79, revenue: 2052853 },
            { name: "[TPS] juan david", kilometers: 1850, damage: 308, totalJobs: 5, points: 7981, lastJob: "hoy", lastJobDays: 0, rank: "novato", role: "Conductor", avatar: "", level: 3, country: "", cargoMass: 32, revenue: 781421 },
        ];
        const totalKm = allDrivers.reduce((s, d) => s + d.kilometers, 0);
        const active = allDrivers.filter(d => d.lastJobDays <= 7).length;
        renderStats({ kilometers: totalKm, drivers: allDrivers.length, active });
        renderDrivers();
        const statusEl = document.getElementById("data-status");
        if (statusEl) {
            statusEl.textContent = "Cargando datos frescos...";
        }
    }

    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (raw && !force) {
            const entry = JSON.parse(raw);
            if (Date.now() - entry.ts < CACHE_TTL) {
                return;
            }
        }
    } catch (e) { }

    try {
        await fetchFresh();
    } catch (e) {
        console.error("loadData: error al actualizar en segundo plano", e);
        const statusEl = document.getElementById("data-status");
        if (statusEl) {
            statusEl.textContent = cached ? `📡 Datos en caché (error al actualizar)` : "Sin conexión. Mostrando datos de respaldo.";
        }
    }
}

/* ===== PHOTO GALLERY IN CONDUCORES MODAL ===== */
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

let activeModalDriver = "";
let currentGalleryPage = 1;
let totalGalleryPages = 1;

function openPhotosModal(name) {
    if (!modal) return;
    activeModalDriver = name;
    currentGalleryPage = 1;
    modalDriverName.textContent = `Galería de ${name}`;
    modal.style.display = "flex";
    setTimeout(() => modal.classList.add("show"), 10);

    const savedPw = localStorage.getItem(`tepsa:driver-pw:${activeModalDriver}`);
    if (savedPw) {
        btnOpenAuthModal.innerHTML = `<span>🔓</span> Subir Captura`;
    } else {
        btnOpenAuthModal.innerHTML = `<span>🔒</span> Subir (Login)`;
    }

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

    const savedPw = localStorage.getItem(`tepsa:driver-pw:${activeModalDriver}`);
    if (savedPw) {
        loginFormState.style.display = "none";
        uploadFormState.style.display = "block";
        uploadActiveDriverText.textContent = activeModalDriver;
        uploadImageUrlInput.value = "";
        uploadDescInput.value = "";
        uploadPopupError.style.display = "none";
        uploadPopupSuccess.style.display = "none";
    } else {
        loginFormState.style.display = "block";
        uploadFormState.style.display = "none";
        loginUsernameInput.value = activeModalDriver;
        loginPasswordInput.value = "";
        loginPopupError.style.display = "none";
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
    galleryPagination.innerHTML = "";

    try {
        let apiUrl = `/api/galeria/fotos?driver=${encodeURIComponent(driverName)}&page=${page}`;
        if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
            if (window.location.port && window.location.port !== "3000") {
                apiUrl = `http://127.0.0.1:3000/api/galeria/fotos?driver=${encodeURIComponent(driverName)}&page=${page}`;
            }
        }

        let res, data;
        let useDirectFallback = false;

        try {
            res = await fetch(apiUrl);
            if (res.ok) {
                data = await res.json();
            } else {
                useDirectFallback = true;
            }
        } catch (fetchErr) {
            console.warn("Local API server offline, using direct Supabase fallback:", fetchErr);
            useDirectFallback = true;
        }

        if (useDirectFallback || !data || !data.success) {
            const supabaseUrl = "https://natrscfdveztkerxyhoc.supabase.co";
            const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hdHJzY2ZkdmV6dGtlcnh5aG9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3OTA4MzAsImV4cCI6MjA5OTM2NjgzMH0.9bof3LIsQiVKWZwmnNVmdPlX3xDYxWEMb6MEIFDL8aQ";

            const limit = 12;
            const offset = (page - 1) * limit;
            const dbUrl = `${supabaseUrl}/rest/v1/fotos_conductores?driver_name=eq.${encodeURIComponent(driverName)}&order=created_at.desc&limit=${limit}&offset=${offset}`;

            const dbResponse = await fetch(dbUrl, {
                headers: {
                    "apikey": supabaseKey,
                    "Authorization": `Bearer ${supabaseKey}`,
                    "Prefer": "count=exact"
                }
            });

            if (!dbResponse.ok) {
                throw new Error(`Direct query failed with status ${dbResponse.status}`);
            }

            const photos = await dbResponse.json();
            const rangeHeader = dbResponse.headers.get("content-range");
            let total = 0;
            if (rangeHeader) {
                const parts = rangeHeader.split("/");
                if (parts.length > 1) total = parseInt(parts[1], 10) || 0;
            }
            const pages = Math.ceil(total / limit);

            data = { success: true, photos, pages, page, total };
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

        galleryPhotosGrid.innerHTML = photos.map(p => {
            return `
            <div class="gallery-card">
              <div class="gallery-img-wrapper">
                <img src="${escapeHtml(p.image_url)}" alt="Captura de ${escapeHtml(driverName)}" loading="lazy" onerror="this.src='../assets/img/portada.png';">
              </div>
            </div>
          `;
        }).join("");

        galleryPhotosGrid.querySelectorAll(".gallery-img-wrapper img").forEach((img, idx) => {
            img.addEventListener("click", () => {
                openLightbox(photos[idx].image_url, photos[idx].description, photos[idx].created_at);
            });
        });

        renderPaginationControls();
    } catch (err) {
        console.error("fetchPhotos error:", err);
        galleryPhotosGrid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #ff6b6b;">
            <p>Error al cargar la galería: ${escapeHtml(err.message)}</p>
          </div>
        `;
    }
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
    authModal?.addEventListener("click", (e) => {
        if (e.target === authModal) closeAuthModal();
    });

    // Close Modals
    document.getElementById("closePhotosModal")?.addEventListener("click", closePhotosModal);
    modal?.addEventListener("click", (e) => {
        if (e.target === modal) closePhotosModal();
    });

    // Login Form Submit
    popupLoginForm?.addEventListener("submit", (e) => {
        e.preventDefault();
        const name = loginUsernameInput.value.trim();
        const password = loginPasswordInput.value.trim();

        if (!name || !password) return;

        localStorage.setItem(`tepsa:driver-pw:${name}`, password);
        btnOpenAuthModal.innerHTML = `<span>🔓</span> Subir Captura`;

        loginFormState.style.display = "none";
        uploadFormState.style.display = "block";
        uploadActiveDriverText.textContent = name;
        uploadImageUrlInput.value = "";
        uploadDescInput.value = "";
        uploadPopupError.style.display = "none";
        uploadPopupSuccess.style.display = "none";
    });

    // Logout Link
    linkLogout?.addEventListener("click", (e) => {
        e.preventDefault();
        localStorage.removeItem(`tepsa:driver-pw:${activeModalDriver}`);
        btnOpenAuthModal.innerHTML = `<span>🔒</span> Subir (Login)`;

        loginFormState.style.display = "block";
        uploadFormState.style.display = "none";
        loginUsernameInput.value = activeModalDriver;
        loginPasswordInput.value = "";
    });

    // Upload Capture Form Submit
    popupUploadForm?.addEventListener("submit", async (e) => {
        e.preventDefault();

        const password = localStorage.getItem(`tepsa:driver-pw:${activeModalDriver}`) || "";
        const url = uploadImageUrlInput.value.trim();
        const description = uploadDescInput.value.trim();

        if (!password || !url || !description) {
            uploadPopupError.textContent = "Falta contraseña o campos requeridos. Por favor inicia sesión de nuevo.";
            uploadPopupError.style.display = "block";
            return;
        }

        btnSubmitPopupUpload.disabled = true;
        btnSubmitPopupUpload.textContent = "Publicando...";
        try {
            let apiUrl = "/api/galeria/upload";
            if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
                if (window.location.port && window.location.port !== "3000") {
                    apiUrl = "http://127.0.0.1:3000/api/galeria/upload";
                }
            }

            let response, resData;
            let useDirectUploadFallback = false;

            try {
                response = await fetch(apiUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        driver: activeModalDriver,
                        password,
                        url,
                        description
                    })
                });
                if (response.ok) {
                    resData = await response.json();
                } else {
                    if (response.status === 401) {
                        localStorage.removeItem(`tepsa:driver-pw:${activeModalDriver}`);
                        btnOpenAuthModal.innerHTML = `<span>🔒</span> Subir (Login)`;
                        throw new Error("Contraseña incorrecta. Por favor, vuelve a ingresar tu contraseña.");
                    }
                    useDirectUploadFallback = true;
                }
            } catch (fetchErr) {
                if (fetchErr.message && fetchErr.message.includes("Contraseña incorrecta")) {
                    throw fetchErr;
                }
                console.warn("Local upload API failed, falling back to direct Supabase write:", fetchErr);
                useDirectUploadFallback = true;
            }

            if (useDirectUploadFallback) {
                const supabaseUrl = "https://natrscfdveztkerxyhoc.supabase.co";
                const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hdHJzY2ZkdmV6dGtlcnh5aG9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3OTA4MzAsImV4cCI6MjA5OTM2NjgzMH0.9bof3LIsQiVKWZwmnNVmdPlX3xDYxWEMb6MEIFDL8aQ";

                const authUrl = `${supabaseUrl}/rest/v1/conductores_auth?driver_name=eq.${encodeURIComponent(activeModalDriver)}`;
                const authRes = await fetch(authUrl, {
                    headers: { "apikey": supabaseKey, "Authorization": `Bearer ${supabaseKey}` }
                });
                if (!authRes.ok) throw new Error("Error al consultar credenciales directamente en Supabase.");
                const authData = await authRes.json();

                if (authData.length === 0) {
                    const registerRes = await fetch(`${supabaseUrl}/rest/v1/conductores_auth`, {
                        method: "POST",
                        headers: {
                            "apikey": supabaseKey,
                            "Authorization": `Bearer ${supabaseKey}`,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({ driver_name: activeModalDriver, password })
                    });
                    if (!registerRes.ok) throw new Error("No se pudo registrar tu contraseña en Supabase.");
                } else {
                    if (authData[0].password !== password) {
                        localStorage.removeItem(`tepsa:driver-pw:${activeModalDriver}`);
                        btnOpenAuthModal.innerHTML = `<span>🔒</span> Subir (Login)`;
                        throw new Error("Contraseña incorrecta. Por favor, vuelve a ingresar tu contraseña.");
                    }
                }

                const insertRes = await fetch(`${supabaseUrl}/rest/v1/fotos_conductores`, {
                    method: "POST",
                    headers: {
                        "apikey": supabaseKey,
                        "Authorization": `Bearer ${supabaseKey}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        driver_name: activeModalDriver,
                        image_url: url,
                        description
                    })
                });
                if (!insertRes.ok) throw new Error("Error al guardar la captura en la base de datos.");
                resData = { success: true };
            }

            uploadPopupSuccess.textContent = "¡Captura publicada con éxito!";
            uploadPopupSuccess.style.display = "block";
            uploadImageUrlInput.value = "";
            uploadDescInput.value = "";

            setTimeout(() => {
                closeAuthModal();
                fetchPhotos(activeModalDriver, 1);
            }, 1500);

        } catch (err) {
            console.error("Subida fallida:", err);
            uploadPopupError.textContent = err.message;
            uploadPopupError.style.display = "block";

            if (err.message.includes("Contraseña incorrecta")) {
                setTimeout(() => {
                    loginFormState.style.display = "block";
                    uploadFormState.style.display = "none";
                    loginUsernameInput.value = activeModalDriver;
                    loginPasswordInput.value = "";
                    loginPopupError.textContent = err.message;
                    loginPopupError.style.display = "block";
                    uploadPopupError.style.display = "none";
                }, 1000);
            }
        } finally {
            btnSubmitPopupUpload.disabled = false;
            btnSubmitPopupUpload.textContent = "Publicar Captura";
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
    loadData();
    setInterval(() => loadData(true), 5 * 60 * 1000);
});
