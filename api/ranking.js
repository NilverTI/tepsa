const {
  SUPABASE_URL,
  SUPABASE_KEY,
  PERUSERVER_API_URL,
  TEPSA_COMPANY_ID,
  PERUSERVER_HEADERS,
  fetchWithTimeout
} = require("./_config");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    // 1. Obtener datos en vivo de PeruServer
    const apiRes = await fetchWithTimeout(PERUSERVER_API_URL, { headers: PERUSERVER_HEADERS }, 8000);

    if (!apiRes.ok) throw new Error("Error al consultar PeruServer API: HTTP " + apiRes.status);
    const apiData = await apiRes.json();
    const items = apiData?.items || [];
    const idx = items.findIndex(x => x.id === TEPSA_COMPANY_ID);

    if (idx === -1) {
      throw new Error("Empresa TEPSA PSV (ID 44302) no encontrada en PeruServer");
    }

    const currentItem = items[idx];
    const currentPuesto = idx + 1;
    const currentKm = Math.round(currentItem.total_distance || 0);
    const currentJobs = currentItem.total_jobs || 0;
    const currentMembers = currentItem.members || currentItem.total_members || 16;

    let puestoAnterior = currentPuesto > 1 ? currentPuesto + 1 : currentPuesto;

    // 2. Consultar / actualizar historial en Supabase de forma segura
    try {
      const historyUrl = `${SUPABASE_URL}/rest/v1/ranking_historial?order=fecha_registro.desc&limit=2`;
      const historyRes = await fetchWithTimeout(historyUrl, {
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`
        }
      }, 3000);

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
          await fetch(`${SUPABASE_URL}/rest/v1/ranking_historial`, {
            method: "POST",
            headers: {
              "apikey": SUPABASE_KEY,
              "Authorization": `Bearer ${SUPABASE_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              empresa_id: TEPSA_COMPANY_ID,
              puesto: currentPuesto,
              kilometros: currentKm,
              viajes: currentJobs,
              miembros: currentMembers
            })
          });
        } else {
          const latestDateStr = new Date(latestRecord.fecha_registro).toDateString();
          if (latestDateStr !== todayStr || latestRecord.puesto !== currentPuesto) {
            await fetch(`${SUPABASE_URL}/rest/v1/ranking_historial`, {
              method: "POST",
              headers: {
                "apikey": SUPABASE_KEY,
                "Authorization": `Bearer ${SUPABASE_KEY}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                empresa_id: TEPSA_COMPANY_ID,
                puesto: currentPuesto,
                kilometros: currentKm,
                viajes: currentJobs,
                miembros: currentMembers
              })
            });
            puestoAnterior = latestRecord.puesto;
          } else {
            await fetch(`${SUPABASE_URL}/rest/v1/ranking_historial?id=eq.${latestRecord.id}`, {
              method: "PATCH",
              headers: {
                "apikey": SUPABASE_KEY,
                "Authorization": `Bearer ${SUPABASE_KEY}`,
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

    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=60, stale-while-revalidate=30");
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
      kilometros: 132010,
      viajes: 170,
      miembros: 16,
      tendencia: "subio",
      actualizadoEn: new Date().toISOString()
    });
  }
};
