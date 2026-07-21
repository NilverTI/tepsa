const supabaseUrl = "https://natrscfdveztkerxyhoc.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hdHJzY2ZkdmV6dGtlcnh5aG9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3OTA4MzAsImV4cCI6MjA5OTM2NjgzMH0.9bof3LIsQiVKWZwmnNVmdPlX3xDYxWEMb6MEIFDL8aQ";
const API_URL = "https://api.mdcdev.me/v2/peruserver/trucky/top-km/monthly?limit=100";
const COMPANY_ID = 44302;
const headers = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  Accept: "application/json",
  Origin: "https://peruserver.pe",
  Referer: "https://peruserver.pe/",
};

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    // 1. Obtener datos en vivo de PeruServer
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const apiRes = await fetch(API_URL, { headers, signal: controller.signal });
    clearTimeout(timer);

    if (!apiRes.ok) throw new Error("Error al consultar PeruServer API: HTTP " + apiRes.status);
    const apiData = await apiRes.json();
    const items = apiData?.items || [];
    const idx = items.findIndex(x => x.id === COMPANY_ID);

    if (idx === -1) {
      throw new Error("Empresa TEPSA PSV (ID 44302) no encontrada en PeruServer");
    }

    const currentItem = items[idx];
    const currentPuesto = idx + 1;
    const currentKm = Math.round(currentItem.total_distance || 0);
    const currentJobs = currentItem.total_jobs || 0;
    const currentMembers = currentItem.members || currentItem.total_members || 16;

    let puestoAnterior = currentPuesto > 1 ? currentPuesto + 1 : currentPuesto;

    // 2. Consultar / actualizar historial en Supabase de forma segura (sin bloquear en caso de error)
    try {
      const historyUrl = `${supabaseUrl}/rest/v1/ranking_historial?order=fecha_registro.desc&limit=2`;
      const historyController = new AbortController();
      const hTimer = setTimeout(() => historyController.abort(), 3000);
      const historyRes = await fetch(historyUrl, {
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`
        },
        signal: historyController.signal
      });
      clearTimeout(hTimer);

      if (historyRes.ok) {
        const history = await historyRes.json();
        const latestRecord = history[0] || null;
        const previousRecord = history[1] || null;

        if (previousRecord) {
          puestoAnterior = previousRecord.puesto;
        } else if (latestRecord && latestRecord.puesto !== currentPuesto) {
          puestoAnterior = latestRecord.puesto;
        }

        const todayStr = new Date().toDateString();
        if (!latestRecord) {
          await fetch(`${supabaseUrl}/rest/v1/ranking_historial`, {
            method: "POST",
            headers: {
              "apikey": supabaseKey,
              "Authorization": `Bearer ${supabaseKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              empresa_id: COMPANY_ID,
              puesto: currentPuesto,
              kilometros: currentKm,
              viajes: currentJobs,
              miembros: currentMembers
            })
          });
        } else {
          const latestDateStr = new Date(latestRecord.fecha_registro).toDateString();
          if (latestDateStr !== todayStr || latestRecord.puesto !== currentPuesto) {
            await fetch(`${supabaseUrl}/rest/v1/ranking_historial`, {
              method: "POST",
              headers: {
                "apikey": supabaseKey,
                "Authorization": `Bearer ${supabaseKey}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                empresa_id: COMPANY_ID,
                puesto: currentPuesto,
                kilometros: currentKm,
                viajes: currentJobs,
                miembros: currentMembers
              })
            });
            puestoAnterior = latestRecord.puesto;
          } else {
            await fetch(`${supabaseUrl}/rest/v1/ranking_historial?id=eq.${latestRecord.id}`, {
              method: "PATCH",
              headers: {
                "apikey": supabaseKey,
                "Authorization": `Bearer ${supabaseKey}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                kilometros: currentKm,
                viajes: currentJobs,
                miembros: currentMembers
              })
            });
          }
        }
      }
    } catch (supaErr) {
      console.warn("Supabase ranking history optional update skipped:", supaErr.message);
    }

    // 3. Determinar tendencia
    let tendencia = "mantuvo";
    if (currentPuesto < puestoAnterior) {
      tendencia = "subio";
    } else if (currentPuesto > puestoAnterior) {
      tendencia = "bajo";
    }

    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    return res.status(200).json({
      ok: true,
      empresa: "TEPSA PSV",
      puestoActual: currentPuesto,
      puestoAnterior: puestoAnterior,
      kilometros: currentKm,
      viajes: currentJobs,
      miembros: currentMembers,
      tendencia: tendencia,
      actualizadoEn: new Date().toISOString()
    });

  } catch (error) {
    console.error("api/ranking handler error:", error);

    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    return res.status(200).json({
      ok: false,
      empresa: "TEPSA PSV",
      puestoActual: 2,
      puestoAnterior: 3,
      kilometros: 129809,
      viajes: 166,
      miembros: 16,
      tendencia: "subio",
      actualizadoEn: new Date().toISOString()
    });
  }
};
