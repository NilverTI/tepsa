/* ==========================================================================
   INDEX/HOME SCRIPT - TEPSA PSV
   ========================================================================== */

const FOUNDER_NAMES = ["Alexander", "Cesar", "Cristofer", "admpsv"];

const fallbackTruckyData = {
    source: "demo",
    updatedAt: new Date().toISOString(),
    stats: { kilometers: 249734, drivers: 14, active: 6, founded: 2026 },
    ranking: [
        { name: "[TPS] Joker", kilometers: 35229, points: 36230, lastJobDays: 1, role: "Conductor", avatar: "", damage: 3355, level: 6, revenue: 27920645, cargo: 388 },
        { name: "[TPS]KANIEL_OUT", kilometers: 28400, points: 30100, lastJobDays: 0, role: "Conductor", avatar: "", damage: 569, level: 3, revenue: 8326510, cargo: 101 },
        { name: "[TPS]RENZITO", kilometers: 22100, points: 25800, lastJobDays: 2, role: "Conductor", avatar: "", damage: 2124, level: 3, revenue: 5282808, cargo: 64 },
        { name: "[TPS]EMPERADOR", kilometers: 19800, points: 22400, lastJobDays: 1, role: "Conductor", avatar: "", damage: 1625, level: 2, revenue: 3037086, cargo: 34 },
        { name: "[TPS] Lexus", kilometers: 16200, points: 18900, lastJobDays: 5, role: "Conductor", avatar: "", damage: 16448, level: 6, revenue: 13398366, cargo: 155 },
        { name: "[ TPS ]?KEVIN? ?", kilometers: 12800, points: 15400, lastJobDays: 0, role: "Conductor", avatar: "", damage: 1928, level: 5, revenue: 19590207, cargo: 212 },
        { name: "[TPS] Angel", kilometers: 9500, points: 11200, lastJobDays: 3, role: "Conductor", avatar: "", damage: 3610, level: 4, revenue: 13414766, cargo: 127 },
        { name: "[TPS] Johan-19", kilometers: 7200, points: 8900, lastJobDays: 7, role: "Conductor", avatar: "", damage: 12929, level: 4, revenue: 14940683, cargo: 170 },
        { name: "[TPS] juan david", kilometers: 5100, points: 6400, lastJobDays: 10, role: "Conductor", avatar: "", damage: 308, level: 3, revenue: 781421, cargo: 32 },
        { name: "banco bcp", kilometers: 0, points: 0, lastJobDays: 9999, role: "Conductor", avatar: "", damage: 1146, level: 2, revenue: 2052853, cargo: 79 },
    ],
    recentJobs: [],
};

const CACHE_KEY_TRUCKY = "tepsa_index_v3";
const CACHE_TTL_TRUCKY = 5 * 60 * 1000;
const CACHE_KEY_PS_RANKING = "tepsa:ps-ranking:v6";

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

function avatarHTML(driver) {
    const hasAvatar = driver.avatar && driver.avatar.startsWith("http");
    const initials = escapeHtml(getInitials(driver.name));
    if (hasAvatar) {
        return `<img src="${escapeHtml(driver.avatar)}" alt="${escapeHtml(driver.name)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="podium-avatar-fallback" style="display:none">${initials}</div>`;
    }
    return `<div class="podium-avatar-fallback">${initials}</div>`;
}

function renderRanking(ranking = []) {
    const container = document.getElementById("ranking-podium");
    if (!container) return;

    const filtered = ranking.filter(m => !isFounder(m));
    const top3 = filtered.slice(0, 3);

    if (!top3.length) {
        container.innerHTML = `<p style="text-align:center;color:#888;">Aún no hay conductores para mostrar.</p>`;
        return;
    }

    const podiumOrder = [1, 0, 2];
    const labels = ["ORO", "PLATA", "BRONCE"];

    container.innerHTML = podiumOrder.map(i => {
        const d = top3[i];
        if (!d) return "";
        const isFirst = i === 0;
        const posClass = ["podium-1", "podium-2", "podium-3"][i];
        const lastStr = d.lastJobDays == null || d.lastJobDays >= 9999 ? "Sin registro" : d.lastJobDays === 0 ? "Hoy" : `Hace ${d.lastJobDays} días`;

        return `
      <div class="podium-item ${posClass}">
        <span class="podium-number">${["1º", "2º", "3º"][i]}</span>
        ${isFirst ? '<span class="podium-crown">👑</span>' : ""}
        <span class="podium-label">${labels[i]}</span>
        <div class="podium-avatar-wrap">${avatarHTML(d)}</div>
        <div class="podium-name">${escapeHtml(d.name || "Sin nombre")}</div>
        <span class="podium-role">${escapeHtml(d.role || "")}</span>
        <div class="podium-info-grid">
          <div class="podium-info-item">
            <span class="podium-info-value">${formatNumber(d.kilometers)}</span>
            <span class="podium-info-label">KM</span>
          </div>
          <div class="podium-info-item">
            <span class="podium-info-value">${formatNumber(d.damage)}</span>
            <span class="podium-info-label">Daño</span>
          </div>
          <div class="podium-info-item">
            <span class="podium-info-value">${d.level != null ? d.level : "?"}</span>
            <span class="podium-info-label">Nivel</span>
          </div>
        </div>
        <span class="podium-footer">🟢 ${lastStr}</span>
      </div>
    `;
    }).join("");
}

function renderJobs(jobs = []) {
    const jobsGrid = document.getElementById("jobs-grid");
    if (!jobsGrid) return;
    if (!jobs.length) {
        jobsGrid.innerHTML = `<div class="job-card"><p>Aún no hay trabajos recientes para mostrar.</p></div>`;
        return;
    }
    jobsGrid.innerHTML = jobs.map(j => `
    <article class="job-card">
      <h3>${escapeHtml(j.driver || "Conductor TEPSA")}</h3>
      <p><strong>Ruta:</strong> ${escapeHtml(j.route || "Sin ruta")}</p>
      <p><strong>KM:</strong> ${formatNumber(j.kilometers)}</p>
      <p><strong>Daño:</strong> ${formatNumber(j.damage)}</p>
      <p><strong>Estado:</strong> ${escapeHtml(j.status || "Registrado")}</p>
    </article>
  `).join("");
}

function renderTruckyData(data) {
    renderStats(data.stats);
    renderRanking(data.ranking);
    renderJobs(data.recentJobs);

    const status = document.getElementById("trucky-status");
    if (!status) return;
    const updatedAt = data.updatedAt ? new Date(data.updatedAt).toLocaleString("es-PE") : "sin fecha";
    if (data.source === "demo") {
        status.textContent = "Mostrando datos de ejemplo.";
        return;
    }
    status.innerHTML = `📡 <strong>Trucky Hub</strong> · Actualizado: ${updatedAt}`;
}

function getTruckyCache() {
    try {
        const raw = localStorage.getItem(CACHE_KEY_TRUCKY);
        if (!raw) return null;
        const entry = JSON.parse(raw);
        return entry.data;
    } catch { return null; }
}

function setTruckyCache(data) {
    try {
        localStorage.setItem(CACHE_KEY_TRUCKY, JSON.stringify({ ts: Date.now(), data }));
        localStorage.removeItem("tepsa_index_v2");
    } catch { }
}

function transformMember(m) {
    return {
        name: m.name,
        kilometers: m.kilometers || m.total_driven_distance_km || 0,
        points: m.points || 0,
        lastJobDays: m.lastJobDays ?? m.last_job_days,
        role: m.role?.name || m.role || "",
        avatar: m.avatar_url || m.avatar || "",
        damage: m.damage || 0,
        level: m.level || 0,
        revenue: m.revenue || m.total_revenue || 0,
        cargo: m.cargoMass || m.cargo || m.total_cargo_mass_t || 0,
    };
}

async function tryFetch(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
}

async function fetchMonthJobs() {
    const stats = new Map();
    try {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, "0");
        const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
        const base = `https://e.truckyapp.com/api/v1/company/44302/jobs?dateFrom=${y}-${m}-01&dateTo=${y}-${m}-${lastDay}`;
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
                const name = job.in_game_profile_name || job.driver?.name || "";
                if (!name) continue;
                const prev = stats.get(name) || { kilometers: 0, damage: 0 };
                prev.kilometers += Number(job.driven_distance_km || job.kilometers || 0);
                prev.damage += (job.vehicle_damage || 0) + (job.cargo_damage || 0) + (job.trailers_damage || 0);
                stats.set(name, prev);
            }
        }
    } catch (e) {
        console.error("fetchMonthJobs:", e);
    }
    return stats;
}

async function loadTruckyData(force) {
    const cached = getTruckyCache();
    if (cached) {
        renderTruckyData(cached);
        const status = document.getElementById("trucky-status");
        if (status) status.textContent = `📡 Datos en caché · ${cached.ranking.length} miembros`;
    }

    try {
        const raw = localStorage.getItem(CACHE_KEY_TRUCKY);
        if (raw && !force) {
            const entry = JSON.parse(raw);
            if (Date.now() - entry.ts < CACHE_TTL_TRUCKY) {
                return;
            }
        }
    } catch (e) {}

    let apiUrl = "/api/trucky/conductores";
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
        if (window.location.port && window.location.port !== "3000") {
            apiUrl = "http://127.0.0.1:3000/api/trucky/conductores";
        }
    }

    let data = null;
    try {
        const d = await tryFetch(apiUrl);
        data = {
            source: "trucky",
            updatedAt: new Date().toISOString(),
            stats: d.stats || {},
            ranking: (d.ranking || []).map(transformMember),
            recentJobs: d.recentJobs || [],
        };
    } catch (e) {
        console.warn("loadTruckyData: falló API proxy, probando alternativa...", e);
        if (!apiUrl.includes("3000") && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
            try {
                const d = await tryFetch("http://127.0.0.1:3000/api/trucky/conductores");
                data = {
                    source: "trucky",
                    updatedAt: new Date().toISOString(),
                    stats: d.stats || {},
                    ranking: (d.ranking || []).map(transformMember),
                    recentJobs: d.recentJobs || [],
                };
            } catch (err) {}
        }
    }

    if (!data) {
        try {
            const [raw, monthStats] = await Promise.all([
                tryFetch("https://e.truckyapp.com/api/v1/company/44302/members"),
                fetchMonthJobs(),
            ]);
            const members = (raw.data || [])
                .map(m => {
                    const name = m.name || "Sin nombre";
                    const ms = monthStats.get(name) || { kilometers: 0, damage: 0 };
                    return {
                        name,
                        kilometers: Math.round(ms.kilometers),
                        points: Math.round(m.points || 0),
                        lastJobDays: m.lastJobDays ?? m.last_job_days,
                        role: m.role?.name || m.role || "",
                        avatar: m.avatar_url || m.avatar || "",
                        damage: Math.round(ms.damage),
                        level: m.level || 0,
                        revenue: m.revenue || m.total_revenue || 0,
                        cargo: m.cargoMass || m.cargo || m.total_cargo_mass_t || 0,
                    };
                })
                .filter(m => {
                    const role = m.role || "";
                    const name = m.name || "";
                    return role.toLowerCase() !== "owner" && name.toLowerCase() !== "admpsv";
                });
            const totalKm = members.reduce((s, d) => s + d.kilometers, 0);
            const active = members.filter(d => Number(d.lastJobDays ?? 9999) <= 7).length;
            const drivers = members.length;
            members.sort((a, b) => b.kilometers - a.kilometers);

            data = {
                source: "trucky",
                updatedAt: new Date().toISOString(),
                stats: { kilometers: Math.round(totalKm), drivers, active },
                ranking: members,
                recentJobs: [],
            };
        } catch (e) {
            console.error("loadTruckyData: todos los orígenes fallaron en segundo plano", e);
        }
    }

    if (data) {
        setTruckyCache(data);
        renderTruckyData(data);
    } else if (!cached) {
        renderTruckyData(fallbackTruckyData);
    }
}

/* ===== ANIMATIONS AND UI OVERLAYS ===== */
function setupRevealAnimation() {
    const sections = document.querySelectorAll("section");
    sections.forEach(s => { 
        s.style.opacity = "0"; 
        s.style.transform = "translateY(50px)"; 
        s.style.transition = "all 1s ease"; 
    });
    
    const observer = new IntersectionObserver(entries => {
        entries.forEach(e => { 
            if (e.isIntersecting) { 
                e.target.style.opacity = "1"; 
                e.target.style.transform = "translateY(0)"; 
            } 
        });
    }, { threshold: 0.12 });
    
    sections.forEach(s => observer.observe(s));
}

function setupBackToTopButton() {
    const btn = document.createElement("button");
    btn.textContent = "↑";
    btn.setAttribute("aria-label", "Volver arriba");
    Object.assign(btn.style, {
        position: "fixed", bottom: "20px", right: "20px", width: "50px", height: "50px",
        borderRadius: "50%", border: "none", background: "#ff2d2d", color: "white",
        fontSize: "22px", cursor: "pointer", zIndex: "999"
    });
    document.body.appendChild(btn);
    btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

function setupDisclaimerModal() {
    const modal = document.getElementById("disclaimer-modal");
    const closeBtn = document.getElementById("modal-close-btn");
    const acceptBtn = document.getElementById("modal-accept-btn");
    if (!modal) return;
    
    function close() { 
        modal.classList.add("hidden"); 
    }
    
    closeBtn?.addEventListener("click", close);
    acceptBtn?.addEventListener("click", close);
    modal.addEventListener("click", (e) => { 
        if (e.target === modal) close(); 
    });
    document.addEventListener("keydown", (e) => { 
        if (e.key === "Escape") close(); 
    });
}

/* ===== PERUSERVER RANKING CERTIFICATE SWR ===== */
async function loadPSRanking() {
    const els = {
        heroRank: document.getElementById("psvCertHeroRank"),
        centerRank: document.getElementById("psvCertCenterRank"),
        stats: document.getElementById("psvCertStats"),
        monthRank: document.getElementById("psvCertMonthRank"),
        members: document.getElementById("psvCertMembers"),
        title: document.getElementById("psvCertTitle"),
        subtitle: document.getElementById("psvCertSubtitle"),
        meta: document.getElementById("psvCertMeta"),
    };
    if (!els.heroRank) return;

    const render = (pos, km, jobs, members, period) => {
        const p = pos || "3";
        els.heroRank.textContent = "#" + p;
        if (els.centerRank) els.centerRank.textContent = p;
        if (els.stats) els.stats.textContent = (km || "69.725") + " KM · " + (jobs || "76") + " Viajes";
        if (els.monthRank) els.monthRank.textContent = "#" + p;
        if (els.members) els.members.textContent = members || "16";
        if (els.title) els.title.textContent = "TEPSA PSV";
        if (els.subtitle) els.subtitle.textContent = "Ranking Mensual PeruServer";

        let displayPeriod = period;
        if (period && typeof period === "object") {
            if (period.from && period.from.month && period.from.year) {
                const months = [
                    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
                ];
                const mName = months[period.from.month - 1] || period.from.month;
                displayPeriod = `${mName} ${period.from.year}`;
            } else {
                displayPeriod = JSON.stringify(period);
            }
        } else if (!period) {
            const months = [
                "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
            ];
            const now = new Date();
            displayPeriod = `${months[now.getMonth()]} ${now.getFullYear()}`;
        }

        if (els.meta) els.meta.textContent = "Top " + p + " · En vivo · " + displayPeriod;
    };

    const formatKmValue = (km) => {
        if (km == null) return null;
        return Number(km).toLocaleString("es-PE");
    };

    const getMembersCount = (item) => item.members || item.total_members || item.member_count || item.membersCount;

    let cachedData = null;
    try {
        cachedData = JSON.parse(localStorage.getItem(CACHE_KEY_PS_RANKING));
        if (cachedData) {
            render(cachedData.pos, cachedData.km, cachedData.jobs, cachedData.members, cachedData.period);
        } else {
            render(3, "69.725", 76, 16, null);
        }
    } catch (e) {
        render(3, "69.725", 76, 16, null);
    }

    const urls = [
        "/api/ps-ranking",
        "http://127.0.0.1:3000/api/ps-ranking",
        "http://127.0.0.1:3001/api/ps-ranking",
        "https://tepsa.vercel.app/api/ps-ranking"
    ];

    let fetchedData = null;

    for (const url of urls) {
        try {
            const ac = new AbortController();
            const tid = setTimeout(() => ac.abort(), 4000);
            const cleanUrl = url + (url.includes("?") ? "&" : "?") + "_=" + Date.now();
            const r = await fetch(cleanUrl, { cache: "no-store", signal: ac.signal });
            clearTimeout(tid);
            if (r.ok) {
                const d = await r.json();
                if (d.ok && d.item) {
                    fetchedData = d;
                    break;
                }
            }
        } catch (e) {
            console.warn(`loadPSRanking: URL failed: ${url}`);
        }
    }

    if (fetchedData) {
        const pos = fetchedData.position;
        const km = formatKmValue(fetchedData.item.total_distance);
        const jobs = fetchedData.item.total_jobs;
        const members = getMembersCount(fetchedData.item);
        const period = fetchedData.period || null;

        render(pos, km, jobs, members, period);
        try { 
            localStorage.setItem(CACHE_KEY_PS_RANKING, JSON.stringify({ pos, km, jobs, members, period, ts: Date.now() })); 
        } catch (e) { }
    } else {
        console.warn("loadPSRanking: all fetch URLs failed. Maintaining previous/default values.");
        if (!cachedData) {
            render(3, "69.725", 76, 16, null);
        }
    }
}

/* ===== RECRUITMENT POSTULATION FORM ===== */
function setupPostulationForm() {
    const form = document.getElementById('form-postulacion');
    if (!form) return;

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        const btn = document.getElementById('btn-submit');
        const errEl = document.getElementById('form-error');
        const data = new FormData(form);

        btn.disabled = true;
        btn.textContent = 'ENVIANDO...';
        errEl.style.display = 'none';

        try {
            const res = await fetch('https://formspree.io/f/xqevyzbe', {
                method: 'POST',
                body: data,
                headers: { Accept: 'application/json' }
            });
            if (res.ok) {
                form.style.display = 'none';
                const successMsg = document.getElementById('success-msg');
                if (successMsg) successMsg.style.display = 'block';
            } else {
                const json = await res.json();
                errEl.textContent = json?.error || 'Error al enviar. Intenta de nuevo.';
                errEl.style.display = 'block';
            }
        } catch {
            errEl.textContent = 'Error de conexión. Verifica tu internet.';
            errEl.style.display = 'block';
        }

        btn.disabled = false;
        btn.textContent = 'ENVIAR SOLICITUD';
    });
}

// Clean old localStorage entries
try { localStorage.removeItem("tepsa:ps-ranking:v2"); } catch (e) { }
try { localStorage.removeItem("tepsa:ps-ranking:v3"); } catch (e) { }
try { localStorage.removeItem("tepsa:ps-ranking:v4"); } catch (e) { }
try { localStorage.removeItem("tepsa:ps-ranking:v5"); } catch (e) { }

document.addEventListener("DOMContentLoaded", () => {
    setupDisclaimerModal();
    setupRevealAnimation();
    setupBackToTopButton();
    setupPostulationForm();
    loadTruckyData();
    loadPSRanking();
    
    // Auto refresh rankings every 5 minutes
    setInterval(loadPSRanking, 5 * 60 * 1000);
});
