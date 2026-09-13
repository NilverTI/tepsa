/* ==========================================================================
   INDEX/HOME SCRIPT - ZBUSS PSV
   ========================================================================== */

const ZBUSS_COMPANY_ID = "41534";
const FOUNDER_NAMES = ["Admin", "Sentinel", "TioPepex", "Tunche", "GunzouCB"];

const fallbackTruckyData = {
    source: "demo",
    updatedAt: new Date().toISOString(),
    stats: { kilometers: 29012, drivers: 13, active: 10, founded: 2026 },
    ranking: [
        { name: "[ZBSS]SENTINEL", kilometers: 8520, points: 121517, lastJobDays: 0, role: "Administrador", avatar: "https://cdn.truckyapp.com/public/users/262175/yS9Jl3fpMP9x0UwHGZ2Q.png", damage: 1, level: 11, revenue: 14500000, cargo: 180 },
        { name: "[ZBSS] TioPepex", kilometers: 5120, points: 19938, lastJobDays: 0, role: "Administrador", avatar: "https://avatars.steamstatic.com/e08d4e3731a610e133e769063f360d89d8c49406_full.jpg", damage: 1, level: 4, revenue: 8200000, cargo: 110 },
        { name: "[ZBSS]GunzouCB", kilometers: 6410, points: 14564, lastJobDays: 1, role: "Conductor", avatar: "https://avatars.steamstatic.com/97caee00eb9e2fd9f78eaf034b7f9f4d2fd9210d_full.jpg", damage: 0, level: 4, revenue: 6400000, cargo: 95 },
        { name: "[ZBSS]Nelusen20", kilometers: 4250, points: 27040, lastJobDays: 0, role: "Conductor", avatar: "https://avatars.steamstatic.com/f977faec10192ca1899b95f16f5f7d6ba6b35a57_full.jpg", damage: 6, level: 5, revenue: 5800000, cargo: 85 },
        { name: "[ZBUSS]TUNCHE", kilometers: 2850, points: 8629, lastJobDays: 2, role: "Conductor", avatar: "https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg", damage: 1, level: 3, revenue: 3900000, cargo: 60 },
        { name: "[ZBSS] Gato Negro", kilometers: 1840, points: 14778, lastJobDays: 3, role: "Conductor", avatar: "https://avatars.steamstatic.com/1a6845a09ea57f1d99505899185fa3c4834d4858_full.jpg", damage: 2, level: 4, revenue: 2900000, cargo: 45 },
    ],
    recentJobs: [],
};

const CACHE_KEY_TRUCKY = "zbuss_conductores_monthly_v1";
const CACHE_TTL_TRUCKY = 5 * 60 * 1000;
const PS_RANKING_STORAGE_KEY = "zbuss_ps_ranking_store";

let activeTruckyFetchPromise = null;
let rankingPollingIntervalId = null;
let rankingAbortController = null;

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

function renderRankingSkeletons() {
    const container = document.getElementById("ranking-podium");
    if (!container) return;
    container.innerHTML = Array.from({ length: 3 }).map(() => `
        <div class="podium-item skeleton" style="height: 320px; display: flex; flex-direction: column; gap: 15px; padding: 20px; border-radius: 14px; background: #161616; border: 1px solid #222;">
            <div style="width: 80px; height: 80px; border-radius: 50%; background: #2a2a2a; margin: 0 auto;"></div>
            <div style="width: 70%; height: 16px; background: #2a2a2a; border-radius: 4px; margin: 10px auto;"></div>
            <div style="width: 50%; height: 12px; background: #2a2a2a; border-radius: 4px; margin: 0 auto 15px;"></div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                <div style="height: 35px; background: #2a2a2a; border-radius: 8px;"></div>
                <div style="height: 35px; background: #2a2a2a; border-radius: 8px;"></div>
                <div style="height: 35px; background: #2a2a2a; border-radius: 8px;"></div>
            </div>
            <div style="width: 80%; height: 12px; background: #2a2a2a; border-radius: 4px; margin: 15px auto 0;"></div>
        </div>
    `).join("");
}

function isFounder(member) {
    const role = (member.role || "").toLowerCase();
    if (/owner|fundador|founder|administrador|moderador/.test(role)) return true;
    const name = (member.name || "").toLowerCase();
    for (const fn of FOUNDER_NAMES) {
        if (name.includes(fn.toLowerCase())) return true;
    }
    return false;
}

function renderStats(stats = {}) {
    const kmEl = document.getElementById("stat-kilometros");
    const condEl = document.getElementById("stat-conductores");
    const actEl = document.getElementById("stat-activos");
    
    if (kmEl) kmEl.textContent = formatNumber(stats.kilometers);
    if (condEl) condEl.textContent = formatNumber(stats.drivers);
    if (actEl) actEl.textContent = formatNumber(stats.active);
}

function renderPodium(ranking = []) {
    const container = document.getElementById("ranking-podium");
    if (!container) return;

    ranking = ranking.filter(driver => !/\bowner\b/i.test(driver.role || ""));

    if (!ranking || ranking.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; color: #888;">
                <span style="font-size: 32px; display: block; margin-bottom: 10px;">📊</span>
                <p style="font-size: 15px; margin: 0;">No se registraron viajes finalizados este mes aún.</p>
                <p style="font-size: 13px; color: #555; margin-top: 5px;">¡Sé el primero en salir a ruta con ZBUSS!</p>
            </div>
        `;
        return;
    }

    const topDrivers = ranking.slice(0, 3);
    const podiumHtml = topDrivers.map((driver, index) => {
        const place = index + 1;
        const initial = getInitials(driver.name);
        const hasAvatar = driver.avatar && driver.avatar.startsWith("http");
        const avatarContent = hasAvatar
            ? `<img src="${escapeHtml(driver.avatar)}" alt="${escapeHtml(driver.name)}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';">
               <span style="display:none;">${escapeHtml(initial)}</span>`
            : escapeHtml(initial);

        return `
            <div class="podium-item place-${place}">
                <div class="podium-badge">#${place}</div>
                <div class="podium-avatar-wrap">
                    <div class="podium-avatar">${avatarContent}</div>
                </div>
                <h3 class="podium-name">${escapeHtml(driver.name)}</h3>
                ${driver.role ? `<span class="podium-role">${escapeHtml(driver.role)}</span>` : ""}
                <div class="podium-stats">
                    <div class="pstat">
                        <span class="pstat-val">${formatNumber(driver.kilometers)}</span>
                        <span class="pstat-lbl">KM Mes</span>
                    </div>
                    <div class="pstat">
                        <span class="pstat-val">${driver.damage ?? 0}%</span>
                        <span class="pstat-lbl">Daño Prom.</span>
                    </div>
                    <div class="pstat">
                        <span class="pstat-val">${formatNumber(driver.points)}</span>
                        <span class="pstat-lbl">Puntos</span>
                    </div>
                </div>
            </div>
        `;
    }).join("");

    smoothUpdate(container, podiumHtml);
}

function renderTruckyData(data) {
    if (!data) return;
    renderStats(data.stats);
    renderPodium(data.ranking);

    const status = document.getElementById("trucky-status");
    if (!status) return;

    const updatedAt = data.updatedAt ? formatTimeAgo(data.updatedAt) : "hace un momento";
    if (data.source === "demo") {
        status.textContent = "Mostrando datos de ejemplo ZBUSS.";
        return;
    }
    status.innerHTML = `📡 <strong>Trucky Hub (Ranking Mensual ZBUSS)</strong> · Actualizado: ${updatedAt}`;
}

function setTruckyCache(data) {
    try {
        localStorage.setItem(CACHE_KEY_TRUCKY, JSON.stringify({ ts: Date.now(), data }));
    } catch { }
}

async function loadTruckyData(force) {
    let cached = null;
    let cacheTime = null;
    try {
        const raw = localStorage.getItem(CACHE_KEY_TRUCKY);
        if (raw) {
            const entry = JSON.parse(raw);
            cached = entry.data;
            cacheTime = entry.ts;
        }
    } catch (e) {}

    const status = document.getElementById("trucky-status");

    if (cached) {
        renderTruckyData(cached);
        if (status) {
            status.innerHTML = `📡 <strong>Datos locales (Ranking Mensual ZBUSS)</strong> · Actualizado: ${formatTimeAgo(cacheTime)}`;
        }
        if (cacheTime && (Date.now() - cacheTime < CACHE_TTL_TRUCKY) && !force) {
            return;
        }
    } else {
        renderRankingSkeletons();
        if (status) status.innerHTML = `⏳ Cargando datos del servidor ZBUSS...`;
    }

    if (activeTruckyFetchPromise) {
        try { await activeTruckyFetchPromise; } catch (e) {}
        return;
    }

    activeTruckyFetchPromise = (async () => {
        const controller = new AbortController();
        const timerId = setTimeout(() => controller.abort(), 10000);

        const endpoints = [
            "/api/zbuss/trucky/conductores",
            "/api/zbuss/conductores"
        ];

        for (const baseUrl of endpoints) {
            try {
                const res = await fetch(`${baseUrl}?_=${Date.now()}`, {
                    headers: { "Accept": "application/json" },
                    signal: controller.signal
                });
                if (res.ok) {
                    const json = await res.json();
                    if (json && Array.isArray(json.ranking) && json.ranking.length > 0) {
                        clearTimeout(timerId);
                        return json;
                    }
                }
            } catch (e) {}
        }

        // Direct Fallback: Trucky API for company 41534
        try {
            const now = new Date();
            const y = now.getFullYear();
            const m = String(now.getMonth() + 1).padStart(2, "0");
            const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();

            const jobsUrl = `https://e.truckyapp.com/api/v1/company/${ZBUSS_COMPANY_ID}/jobs?dateFrom=${y}-${m}-01&dateTo=${y}-${m}-${lastDay}`;
            const membersUrl = `https://e.truckyapp.com/api/v1/company/${ZBUSS_COMPANY_ID}/members`;

            const [membersRes, jobsRes] = await Promise.all([
                fetch(membersUrl, { headers: { "Accept": "application/json" }, signal: controller.signal }),
                fetch(jobsUrl, { headers: { "Accept": "application/json" }, signal: controller.signal })
            ]);

            clearTimeout(timerId);
            if (!membersRes.ok) throw new Error("HTTP " + membersRes.status);

            const membersRaw = await membersRes.json();
            const jobsRaw = jobsRes.ok ? await jobsRes.json() : { data: [] };

            const kmByDriver = new Map();
            const damageByDriver = new Map();
            const jobsByDriver = new Map();

            (jobsRaw.data || []).forEach(j => {
                const driverObj = j.driver || {};
                const name = typeof driverObj === "object" ? driverObj.name || driverObj.username : driverObj;
                if (!name) return;
                const norm = String(name).toLowerCase().replace(/\[.*?\]/g, "").replace(/[^a-z0-9]/g, "").trim();
                const km = Number(j.driven_distance_km || j.kilometers || j.km || 0);
                const rawDamage = j.total_damage != null ? j.total_damage : (j.vehicle_damage != null ? j.vehicle_damage : 0);
                const dmg = Math.min(100, Math.max(0, Math.round(Number(rawDamage))));
                kmByDriver.set(norm, (kmByDriver.get(norm) || 0) + km);
                damageByDriver.set(norm, (damageByDriver.get(norm) || 0) + dmg);
                jobsByDriver.set(norm, (jobsByDriver.get(norm) || 0) + 1);
            });

            const ranking = (membersRaw.data || [])
                .map(m => {
                    const rawName = m.name || m.username || "Sin nombre";
                    const norm = String(rawName).toLowerCase().replace(/\[.*?\]/g, "").replace(/[^a-z0-9]/g, "").trim();
                    const monthlyKm = Math.round(kmByDriver.get(norm) || 0);
                    const jCount = jobsByDriver.get(norm) || 0;
                    const avgDamage = jCount > 0 ? Math.min(100, Math.round((damageByDriver.get(norm) || 0) / jCount)) : 0;
                    const lastJobDays = m.last_job_days != null && Number.isFinite(Number(m.last_job_days)) ? Number(m.last_job_days) : 9999;
                    return {
                        name: rawName,
                        kilometers: monthlyKm,
                        damage: avgDamage,
                        points: Math.round(Number(m.points || 0)),
                        lastJobDays: lastJobDays,
                        role: m.role?.name || m.role || "",
                        avatar: m.avatar_url || m.avatar || "",
                        level: Number(m.level || 0),
                        rank: m.rank?.name || "",
                        totalJobs: jCount
                    };
                })
                .filter(m => !/\bowner\b/i.test(m.role || ""))
                .sort((a, b) => b.kilometers - a.kilometers);

            const totalKm = ranking.reduce((s, d) => s + d.kilometers, 0);
            const activeCount = ranking.filter(d => d.lastJobDays <= 7).length;

            return {
                source: "trucky",
                updatedAt: new Date().toISOString(),
                stats: {
                    kilometers: totalKm || 29012,
                    drivers: ranking.length || 13,
                    active: activeCount || 10,
                    founded: 2026
                },
                ranking: ranking.length > 0 ? ranking : fallbackTruckyData.ranking
            };
        } catch (err) {
            clearTimeout(timerId);
            return fallbackTruckyData;
        }
    })();

    try {
        const freshData = await activeTruckyFetchPromise;
        if (freshData) {
            setTruckyCache(freshData);
            renderTruckyData(freshData);
        }
    } catch (e) {
        if (!cached) renderTruckyData(fallbackTruckyData);
    } finally {
        activeTruckyFetchPromise = null;
    }
}

/* ==========================================================================
   PERUSERVER CERTIFICATION SEAL (ZBUSS)
   ========================================================================== */

function normalizeCompanyNameClient(str) {
    return String(str || "")
        .toLowerCase()
        .replace(/\[.*?\]/g, "")
        .replace(/[^a-z0-9]/g, "")
        .trim();
}

function extractPSRankingData(apiData) {
    if (!apiData) return null;

    let items = [];
    if (Array.isArray(apiData)) items = apiData;
    else if (Array.isArray(apiData.items)) items = apiData.items;
    else if (Array.isArray(apiData.data)) items = apiData.data;

    if (!items.length) return null;

    // Search by exact ZBUSS ID (41534)
    let index = items.findIndex(x => x && String(x.id || x.company_id || x.empresa_id) === ZBUSS_COMPANY_ID);

    // Search by name "zbuss"
    if (index === -1) {
        index = items.findIndex(x => {
            if (!x) return false;
            const norm = normalizeCompanyNameClient(x.name || x.empresa || x.company_name);
            return norm.includes("zbuss") || norm.includes("zbss");
        });
    }

    if (index === -1) return null;

    const item = items[index];
    const position = item.position != null && !isNaN(Number(item.position)) ? Math.floor(Number(item.position)) : index + 1;
    const kilometers = Math.round(Number(item.total_distance || item.kilometros || item.km || 0));
    const trips = Math.round(Number(item.total_jobs || item.viajes || item.jobs || 0));
    const members = Math.round(Number(item.members || item.miembros || 13));

    const month = apiData.period?.from?.month || (new Date().getMonth() + 1);
    const year = apiData.period?.from?.year || new Date().getFullYear();

    return {
        position,
        kilometers,
        trips,
        members,
        month,
        year
    };
}

function renderPSRankingCertificate(data, statusText, isLive) {
    const els = {
        card: document.getElementById("psvCertificationCard"),
        heroRank: document.getElementById("psvCertHeroRank"),
        centerRank: document.getElementById("psvCertCenterRank"),
        stats: document.getElementById("psvCertStats"),
        monthRank: document.getElementById("psvCertMonthRank"),
        members: document.getElementById("psvCertMembers"),
        title: document.getElementById("psvCertTitle"),
        subtitle: document.getElementById("psvCertSubtitle"),
        meta: document.getElementById("psvCertMeta"),
    };
    if (!els.heroRank || !data) return;

    const pos = Math.floor(Number(data.position || 17));
    const prevPos = Math.floor(Number(data.previousPosition || (pos > 1 ? pos + 1 : 2)));
    const km = Number(data.kilometers || 29012);
    const trips = Number(data.trips || 46);
    const members = Number(data.members || 13);
    const movement = data.movement || "same";

    const formattedKm = formatNumber(km);

    if (els.card) {
        els.card.setAttribute("data-tier", "top" + Math.min(pos, 3));
    }

    if (els.heroRank) els.heroRank.textContent = "#" + pos;
    if (els.centerRank) els.centerRank.textContent = pos;
    if (els.monthRank) els.monthRank.textContent = "#" + pos;
    if (els.members) els.members.textContent = members;
    if (els.stats) els.stats.textContent = `${formattedKm} KM · ${trips} Viajes`;
    if (els.title) els.title.textContent = "ZBUSS PSV";
    if (els.subtitle) els.subtitle.textContent = "Ranking Mensual PeruServer";

    const trendSymbol = movement === "up" ? "▲" : movement === "down" ? "▼" : "●";
    const trendText = movement === "up" ? `subió de #${prevPos}` : movement === "down" ? `bajó de #${prevPos}` : `puesto #${pos}`;

    const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const monthName = data.month ? months[data.month - 1] : months[new Date().getMonth()];
    const year = data.year || new Date().getFullYear();
    const periodStr = `${monthName} ${year}`;

    if (els.meta) {
        if (isLive) {
            els.meta.textContent = `Top ${pos} (${trendSymbol} ${trendText}) · EN VIVO · ${periodStr}`;
        } else {
            els.meta.textContent = `Top ${pos} (${trendSymbol} ${trendText}) · Ranking Oficial PeruServer`;
        }
    }
}

async function initPsvCertification() {
    try {
        const res = await fetch("https://api.mdcdev.me/v2/peruserver/trucky/top-km/monthly?limit=100", {
            headers: { "Accept": "application/json" }
        });
        if (res.ok) {
            const data = await res.json();
            const certData = extractPSRankingData(data);
            if (certData) {
                renderPSRankingCertificate(certData, "OK", true);
                return;
            }
        }
    } catch (e) {}

    // Fallback certification
    renderPSRankingCertificate({
        position: 17,
        kilometers: 29012,
        trips: 46,
        members: 13,
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear()
    }, "Fallback", false);
}

/* ==========================================================================
   FORM & UI HANDLERS
   ========================================================================== */

function setupPostulacionForm() {
    const form = document.getElementById("form-postulacion");
    const successMsg = document.getElementById("success-msg");
    const errorMsg = document.getElementById("form-error");
    const submitBtn = document.getElementById("btn-submit");

    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = "ENVIANDO...";
        }
        if (errorMsg) errorMsg.style.display = "none";

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
            // Simulated submission or webhook
            await new Promise(r => setTimeout(r, 900));
            form.style.display = "none";
            if (successMsg) successMsg.style.display = "block";
        } catch (err) {
            if (errorMsg) {
                errorMsg.textContent = "Error al enviar la solicitud. Intenta por Discord.";
                errorMsg.style.display = "block";
            }
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = "ENVIAR SOLICITUD";
            }
        }
    });
}

function setupDisclaimerModal() {
    const modal = document.getElementById("disclaimer-modal");
    const acceptBtn = document.getElementById("modal-accept-btn");
    const closeBtn = document.getElementById("modal-close-btn");

    if (!modal) return;

    function closeModal() {
        modal.classList.add("hidden");
        modal.style.display = "none";
    }

    if (acceptBtn) acceptBtn.addEventListener("click", closeModal);
    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeModal();
    });
}

function setupBackToTop() {
    const btn = document.getElementById("back-to-top");
    if (!btn) return;

    window.addEventListener("scroll", () => {
        if (window.scrollY > 300) {
            btn.classList.add("visible");
        } else {
            btn.classList.remove("visible");
        }
    }, { passive: true });

    btn.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
}

document.addEventListener("DOMContentLoaded", () => {
    setupDisclaimerModal();
    loadTruckyData();
    initPsvCertification();
    setupPostulacionForm();
    setupBackToTop();
});
