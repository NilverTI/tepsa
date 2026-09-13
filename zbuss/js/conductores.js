/* ==========================================================================
   CONDUCTORES PAGE SCRIPT - ZBUSS PSV
   ========================================================================== */

const ZBUSS_COMPANY_ID = "41534";
const CACHE_KEY = "zbuss_conductores_v1";
const CACHE_TTL = 5 * 60 * 1000;

let allDrivers = [];
let currentSort = "km";
let currentStatus = "all";
let searchTerm = "";
let activeConductoresFetchPromise = null;

const fallbackDriversData = {
    source: "demo",
    updatedAt: new Date().toISOString(),
    stats: { kilometers: 95288, drivers: 13, active: 10, founded: 2026 },
    ranking: [
        { name: "[ZBSS]SENTINEL", kilometers: 21496, damage: 27, totalJobs: 38, points: 121517, lastJob: "hace 1 día", lastJobDays: 1, rank: "Líder", role: "Administrador", avatar: "https://cdn.truckyapp.com/public/users/262175/yS9Jl3fpMP9x0UwHGZ2Q.png", level: 11, country: "PE" },
        { name: "[ZBSS]Nelusen20", kilometers: 6199, damage: 25, totalJobs: 15, points: 27040, lastJob: "hoy", lastJobDays: 0, rank: "Piloto", role: "Conductor", avatar: "https://avatars.steamstatic.com/f977faec10192ca1899b95f16f5f7d6ba6b35a57_full.jpg", level: 5, country: "PE" },
        { name: "[ZBSS] TioPepex", kilometers: 18338, damage: 3, totalJobs: 32, points: 19938, lastJob: "hoy", lastJobDays: 0, rank: "Admin", role: "Administrador", avatar: "https://avatars.steamstatic.com/e08d4e3731a610e133e769063f360d89d8c49406_full.jpg", level: 4, country: "PE" },
        { name: "[ZBSS]GunzouCB", kilometers: 10868, damage: 53, totalJobs: 24, points: 14564, lastJob: "hace 2 días", lastJobDays: 2, rank: "Veterano", role: "Conductor", avatar: "https://avatars.steamstatic.com/97caee00eb9e2fd9f78eaf034b7f9f4d2fd9210d_full.jpg", level: 4, country: "PE" },
        { name: "[ZBUSS]TUNCHE", kilometers: 6146, damage: 0, totalJobs: 14, points: 8629, lastJob: "hace 3 días", lastJobDays: 3, rank: "Piloto", role: "Conductor", avatar: "https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg", level: 3, country: "PE" },
        { name: "[ZBSS] ANDEKE", kilometers: 5194, damage: 0, totalJobs: 11, points: 5595, lastJob: "hace 4 días", lastJobDays: 4, rank: "Piloto", role: "Conductor", avatar: "https://avatars.steamstatic.com/d55200fe74617772a65210e4612550ce2c736226_full.jpg", level: 2, country: "PE" },
        { name: "[ZBSS] Gato Negro", kilometers: 5364, damage: 0, totalJobs: 12, points: 14778, lastJob: "hace 3 días", lastJobDays: 3, rank: "Piloto", role: "Conductor", avatar: "https://avatars.steamstatic.com/1a6845a09ea57f1d99505899185fa3c4834d4858_full.jpg", level: 4, country: "PE" },
        { name: "[ZBSS] Yanco", kilometers: 5064, damage: 100, totalJobs: 10, points: 5264, lastJob: "hace 5 días", lastJobDays: 5, rank: "Novato", role: "Conductor", avatar: "https://avatars.steamstatic.com/db5680d2a521edf80d854d04f8ecc8875881b92c_full.jpg", level: 2, country: "PE" },
        { name: "[ZBSS] y'", kilometers: 3898, damage: 0, totalJobs: 8, points: 4699, lastJob: "hace 6 días", lastJobDays: 6, rank: "Novato", role: "Conductor", avatar: "https://avatars.steamstatic.com/786de29a8f0a4d05363684421fba062a40caee94_full.jpg", level: 2, country: "PE" },
        { name: "Lenna♡", kilometers: 3215, damage: 82, totalJobs: 7, points: 3416, lastJob: "hace 7 días", lastJobDays: 7, rank: "Novato", role: "Conductor", avatar: "https://avatars.steamstatic.com/e80345cfe54feb73a67f6efd5ff3d95d13a22d98_full.jpg", level: 2, country: "PE" },
        { name: "[ZBSS] Vicens_Stc", kilometers: 2830, damage: 0, totalJobs: 5, points: 8842, lastJob: "hace 8 días", lastJobDays: 8, rank: "Novato", role: "Conductor", avatar: "https://avatars.steamstatic.com/6940e6d34a30d9da8bddca99818c0297e82c2106_full.jpg", level: 3, country: "PE" },
        { name: "El risas", kilometers: 1180, damage: 0, totalJobs: 3, points: 1381, lastJob: "hace 10 días", lastJobDays: 10, rank: "Novato", role: "Conductor", avatar: "https://avatars.steamstatic.com/c3058af0fe964b884d96632c2b62bddf6191f2b9_full.jpg", level: 1, country: "PE" },
    ]
};

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
    if (days === 0) return "Conectado hoy";
    if (days <= 7) return `Activo (${driver.lastJob || 'esta semana'})`;
    if (days === 9999) return "Sin actividad";
    return `Inactivo (${driver.lastJob || 'hace tiempo'})`;
}

function getStatusDotClass(driver) {
    const days = Number(driver.lastJobDays);
    if (days <= 7) return "active";
    if (days === 9999) return "no-data";
    return "inactive";
}

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
        <div class="stat-card">
            <span class="stat-icon">🏆</span>
            <span class="stat-value">2026</span>
            <span class="stat-label">Fundación</span>
        </div>
    `;
}

function renderDrivers() {
    const grid = document.getElementById("drivers-grid");
    const statusEl = document.getElementById("data-status");
    if (!grid) return;

    let filtered = allDrivers.filter(d => {
        if (currentStatus !== "all" && getStatus(d) !== currentStatus) return false;
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const nameMatch = d.name.toLowerCase().includes(term);
            const roleMatch = (d.role || "").toLowerCase().includes(term);
            if (!nameMatch && !roleMatch) return false;
        }
        return true;
    });

    const sorted = [...filtered].sort(getSortFn(currentSort));

    if (sorted.length === 0) {
        grid.innerHTML = `
            <div class="no-drivers">
                <span style="font-size: 36px; display: block; margin-bottom: 12px;">🔍</span>
                <p>No se encontraron conductores con los filtros actuales.</p>
            </div>
        `;
        if (statusEl) statusEl.textContent = `0 conductores encontrados`;
        return;
    }

    const html = sorted.map((driver, idx) => {
        const pos = idx + 1;
        const initials = getDriverInitials(driver.name);
        const dotClass = getStatusDotClass(driver);
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
                    <div class="ds-value" data-value="${driver.damage || 0}">${driver.damage ?? 0}%</div>
                    <div class="ds-label">Daño Prom.</div>
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

    grid.innerHTML = html;

    const sortLabel = { km: "kilometraje", damage: "menor daño", points: "puntos", name: "nombre" };
    if (statusEl) {
        const statusText = currentStatus === "all" ? "Todos" : currentStatus === "active" ? "Activos" : "Inactivos";
        statusEl.textContent = `${sorted.length} conductor(es) de ZBUSS - Filtro: ${statusText} - Orden: ${sortLabel[currentSort] || "km"}`;
    }
}

function renderDriversSkeletons() {
    const grid = document.getElementById("drivers-grid");
    if (!grid) return;
    grid.innerHTML = Array.from({ length: 6 }).map(() => `
        <div class="driver-card skeleton" style="display: flex; flex-direction: column; gap: 15px; padding: 20px; border-radius: 14px; background: #161616; border: 1px solid #222; height: 210px;">
            <div style="display: flex; gap: 15px; align-items: center;">
                <div style="width: 44px; height: 44px; border-radius: 50%; background: #2a2a2a;"></div>
                <div style="flex: 1; display: flex; flex-direction: column; gap: 6px;">
                    <div style="width: 60%; height: 14px; background: #2a2a2a; border-radius: 4px;"></div>
                    <div style="width: 40%; height: 11px; background: #2a2a2a; border-radius: 4px;"></div>
                </div>
            </div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 10px;">
                <div style="height: 40px; background: #2a2a2a; border-radius: 8px;"></div>
                <div style="height: 40px; background: #2a2a2a; border-radius: 8px;"></div>
                <div style="height: 40px; background: #2a2a2a; border-radius: 8px;"></div>
            </div>
        </div>
    `).join("");
}

function getMonthDateRange() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
    return { y, m, lastDay };
}

function formatLastJob(days) {
    if (days == null || !Number.isFinite(Number(days)) || days === 9999) return "Sin datos";
    const d = Number(days);
    if (d === 0) return "hoy";
    if (d === 1) return "ayer";
    if (d < 30) return `hace ${d} días`;
    const months = Math.floor(d / 30);
    return `hace ${months} ${months === 1 ? "mes" : "meses"}`;
}

async function fetchTruckyJobsDirect() {
    const jobs = [];
    try {
        const jobsUrl = `https://e.truckyapp.com/api/v1/company/${ZBUSS_COMPANY_ID}/jobs?limit=100`;
        const res = await fetch(jobsUrl, {
            headers: {
                "Accept": "application/json, text/plain, */*"
            }
        });
        if (res.ok) {
            const raw = await res.json();
            if (raw && Array.isArray(raw.data)) {
                jobs.push(...raw.data);
            }
        }
    } catch (e) {
        console.warn("No se pudieron cargar trabajos directos de Trucky:", e);
    }
    return jobs;
}

async function loadDriversData() {
    renderDriversSkeletons();

    const statusEl = document.getElementById("data-status");
    if (statusEl) statusEl.textContent = "Conectando con Trucky Hub para ZBUSS...";

    // 1. Try server endpoints first
    const endpoints = [
        `/api/zbuss/trucky/conductores?_=${Date.now()}`,
        `/api/zbuss/conductores?_=${Date.now()}`
    ];

    for (const url of endpoints) {
        try {
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                if (data && Array.isArray(data.ranking) && data.ranking.length > 0) {
                    allDrivers = data.ranking.filter(driver => !/\bowner\b/i.test(driver.role || ""));
                    renderStats(data.stats);
                    renderDrivers();
                    return;
                }
            }
        } catch (e) {}
    }

    // 2. Direct Trucky API Fallback (fetches members AND jobs to compute damage correctly)
    try {
        const membersUrl = `https://e.truckyapp.com/api/v1/company/${ZBUSS_COMPANY_ID}/members`;
        const [membersRes, jobsList] = await Promise.all([
            fetch(membersUrl, { headers: { "Accept": "application/json, text/plain, */*" } }),
            fetchTruckyJobsDirect()
        ]);

        if (membersRes.ok) {
            const raw = await membersRes.json();
            const members = raw.data || [];
            if (members.length > 0) {
                const statsById = new Map();
                const statsByName = new Map();

                function norm(name) {
                    return String(name || "").toLowerCase().replace(/\[.*?\]/g, "").replace(/[^a-z0-9]/g, "").trim();
                }

                jobsList.forEach(job => {
                    const uid = job.user_id || job.driver?.id;
                    const rawName = job.driver?.name || job.driver?.username || job.in_game_profile_name || "";
                    const nName = norm(rawName);

                    const km = Number(job.driven_distance_km || job.planned_distance_km || job.kilometers || 0);
                    const rawDamage = job.total_damage != null ? job.total_damage : (job.vehicle_damage != null ? job.vehicle_damage : 0);
                    const dmg = Math.min(100, Math.max(0, Math.round(Number(rawDamage))));

                    if (uid) {
                        if (!statsById.has(uid)) statsById.set(uid, { km: 0, sumDamage: 0, jobs: 0 });
                        const s = statsById.get(uid);
                        s.km += km;
                        s.sumDamage += dmg;
                        s.jobs += 1;
                    }

                    if (nName) {
                        if (!statsByName.has(nName)) statsByName.set(nName, { km: 0, sumDamage: 0, jobs: 0 });
                        const sn = statsByName.get(nName);
                        sn.km += km;
                        sn.sumDamage += dmg;
                        sn.jobs += 1;
                    }
                });

                allDrivers = members
                    .filter(m => !/\bowner\b/i.test(m.role?.name || ""))
                    .map(m => {
                        const rawName = m.name || m.username || "Sin nombre";
                        const nName = norm(rawName);
                        const lastJobDays = m.last_job_days != null && Number.isFinite(Number(m.last_job_days))
                            ? Number(m.last_job_days) : 9999;

                        const s = statsById.get(m.id) || statsByName.get(nName) || { km: 0, sumDamage: 0, jobs: 0 };
                        const avgDamage = s.jobs > 0 ? Math.min(100, Math.round(s.sumDamage / s.jobs)) : 0;
                        const totalKm = s.km > 0 ? Math.round(s.km) : Math.round(Number(m.total_driven_distance_km || 0));

                        return {
                            id: m.id,
                            name: rawName,
                            kilometers: totalKm,
                            damage: avgDamage,
                            totalJobs: s.jobs || Number(m.total_jobs || 0),
                            points: Math.round(Number(m.points || 0)),
                            lastJob: formatLastJob(m.last_job_days),
                            lastJobDays,
                            rank: m.rank?.name || "",
                            role: m.role?.name || "Conductor",
                            avatar: m.avatar_url || "",
                            level: Number(m.level || 0),
                            country: m.country || "PE"
                        };
                    });

                const totalKm = allDrivers.reduce((sum, d) => sum + d.kilometers, 0);
                const activeCount = allDrivers.filter(d => d.lastJobDays <= 7).length;

                renderStats({
                    kilometers: totalKm || 29012,
                    drivers: allDrivers.length,
                    active: activeCount || 10,
                    founded: 2026
                });
                renderDrivers();
                return;
            }
        }
    } catch (e) {
        console.warn("Error en fallback directo de Trucky:", e);
    }

    // 3. Fallback data
    allDrivers = fallbackDriversData.ranking;
    renderStats(fallbackDriversData.stats);
    renderDrivers();
}

function setupControls() {
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            searchTerm = e.target.value.trim();
            renderDrivers();
        });
    }

    const statusBtns = document.querySelectorAll(".status-btn");
    statusBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            statusBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            currentStatus = btn.getAttribute("data-status") || "all";
            renderDrivers();
        });
    });

    const filterBtns = document.querySelectorAll(".filter-btn");
    filterBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            filterBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            currentSort = btn.getAttribute("data-sort") || "km";
            renderDrivers();
        });
    });
}

function setupModals() {
    const photosModal = document.getElementById("driverPhotosModal");
    const closePhotosBtn = document.getElementById("closePhotosModal");
    if (closePhotosBtn && photosModal) {
        closePhotosBtn.addEventListener("click", () => {
            photosModal.style.display = "none";
        });
    }

    const authModal = document.getElementById("driverAuthModal");
    const closeAuthBtn = document.getElementById("closeAuthModal");
    const openAuthBtn = document.getElementById("btnOpenAuthModal");
    if (openAuthBtn && authModal) {
        openAuthBtn.addEventListener("click", () => {
            authModal.style.display = "flex";
        });
    }
    if (closeAuthBtn && authModal) {
        closeAuthBtn.addEventListener("click", () => {
            authModal.style.display = "none";
        });
    }

    const lightbox = document.getElementById("photoLightbox");
    const closeLightbox = document.getElementById("closeLightbox");
    if (closeLightbox && lightbox) {
        closeLightbox.addEventListener("click", () => {
            lightbox.classList.remove("active");
        });
    }
}

document.addEventListener("DOMContentLoaded", () => {
    setupControls();
    setupModals();
    loadDriversData();
});
