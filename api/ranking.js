const {
  SUPABASE_URL,
  SUPABASE_KEY,
  PERUSERVER_API_URL,
  TEPSA_COMPANY_ID,
  PERUSERVER_HEADERS,
  fetchWithTimeout,
  findTepsaCompany,
  getCompanyPosition,
  computeMovement
} = require("./_config");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const forceNoCache = req.query && (req.query.nocache === "1" || req.query.force === "1");
  if (forceNoCache) {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  } else {
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=60, stale-while-revalidate=30");
  }

  const requestedAt = new Date().toISOString();

  try {
    // 1. Consultar API en vivo de PeruServer con timeout de 8000ms
    const apiRes = await fetchWithTimeout(PERUSERVER_API_URL, { headers: PERUSERVER_HEADERS }, 8000);
    if (!apiRes.ok) {
      throw new Error(`PeruServer HTTP ${apiRes.status}`);
    }

    const apiData = await apiRes.json();
    const { item, index, total } = findTepsaCompany(apiData);

    if (!item) {
      console.warn(`[Ranking API] Empresa TEPSA PSV (ID ${TEPSA_COMPANY_ID}) no encontrada en las ${total} empresas recibidas de PeruServer.`);
      return res.status(404).json({
        success: false,
        source: "peruserver-live",
        updatedAt: requestedAt,
        error: "Empresa TEPSA PSV no encontrada en el ranking actual de PeruServer."
      });
    }

    const position = getCompanyPosition(item, index);
    if (!position || isNaN(position) || position <= 0) {
      throw new Error("Posición inválida calculada para TEPSA PSV");
    }

    const kilometers = Math.round(Number(item.total_distance || item.kilometros || item.km || 0));
    const trips = Math.round(Number(item.total_jobs || item.viajes || item.jobs || 0));
    const members = Math.round(Number(item.members || item.miembros || item.total_members || 16));

    const month = apiData?.period?.from?.month || (new Date().getMonth() + 1);
    const year = apiData?.period?.from?.year || new Date().getFullYear();

    console.log(`[Ranking API] URL: ${PERUSERVER_API_URL} | HTTP status: ${apiRes.status}`);
    console.log(`[Ranking API] Total empresas recibidas: ${total}`);
    console.log(`[Ranking API] Empresa encontrada: "${item.name || item.empresa}" (ID ${item.id || TEPSA_COMPANY_ID})`);
    console.log(`[Ranking API] Posición calculada: #${position}`);

    // 2. Consultar historial en Supabase para obtener la posición anterior real
    let previousPosition = position > 1 ? position + 1 : 2;

    try {
      const historyUrl = `${SUPABASE_URL}/rest/v1/ranking_historial?empresa_id=eq.${TEPSA_COMPANY_ID}&order=fecha_registro.desc&limit=2`;
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

        if (previousRecord && previousRecord.puesto) {
          previousPosition = Number(previousRecord.puesto);
        } else if (latestRecord && latestRecord.puesto && Number(latestRecord.puesto) !== position) {
          previousPosition = Number(latestRecord.puesto);
        }

        // Actualizar/Insertar registro diario en Supabase sin bloquear la respuesta si falla
        const todayStr = new Date().toISOString().split("T")[0];
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
              puesto: position,
              kilometros: kilometers,
              viajes: trips,
              miembros: members
            })
          });
        } else {
          const latestDateStr = new Date(latestRecord.fecha_registro).toISOString().split("T")[0];
          if (latestDateStr !== todayStr || Number(latestRecord.puesto) !== position) {
            await fetch(`${SUPABASE_URL}/rest/v1/ranking_historial`, {
              method: "POST",
              headers: {
                "apikey": SUPABASE_KEY,
                "Authorization": `Bearer ${SUPABASE_KEY}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                empresa_id: TEPSA_COMPANY_ID,
                puesto: position,
                kilometros: kilometers,
                viajes: trips,
                miembros: members
              })
            });
            previousPosition = Number(latestRecord.puesto);
          } else {
            await fetch(`${SUPABASE_URL}/rest/v1/ranking_historial?id=eq.${latestRecord.id}`, {
              method: "PATCH",
              headers: {
                "apikey": SUPABASE_KEY,
                "Authorization": `Bearer ${SUPABASE_KEY}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                kilometros: kilometers,
                viajes: trips,
                miembros: members
              })
            });
          }
        }
      }
    } catch (supaErr) {
      console.warn(`[Ranking API] Historial Supabase no disponible (${supaErr.message}). Continuando con datos en vivo.`);
    }

    const { movement, tendencia } = computeMovement(position, previousPosition);
    console.log(`[Ranking API] Posición anterior: #${previousPosition} | Movimiento: ${movement} (${tendencia}) | Fuente: peruserver-live`);

    // 3. Devolver respuesta estandarizada y retrocompatible
    return res.status(200).json({
      success: true,
      source: "peruserver-live",
      updatedAt: requestedAt,
      company: {
        id: item.id || TEPSA_COMPANY_ID,
        name: item.name || "TEPSA [PSV]",
        position,
        previousPosition,
        movement,
        kilometers,
        trips,
        members,
        month,
        year
      },
      // Campos de retrocompatibilidad
      ok: true,
      empresa: item.name || "TEPSA [PSV]",
      puestoActual: position,
      puestoAnterior: previousPosition,
      kilometros: kilometers,
      viajes: trips,
      miembros: members,
      tendencia,
      actualizadoEn: requestedAt
    });


  } catch (error) {
    console.error(`[Ranking API] Error en consulta PeruServer API: ${error.message}. Fuente utilizada: fallback. Motivo: ${error.message}`);

    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

    // Intento de fallback desde Supabase si PeruServer falla
    try {
      const historyUrl = `${SUPABASE_URL}/rest/v1/ranking_historial?empresa_id=eq.${TEPSA_COMPANY_ID}&order=fecha_registro.desc&limit=2`;
      const historyRes = await fetchWithTimeout(historyUrl, {
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`
        }
      }, 2000);

      if (historyRes.ok) {
        const history = await historyRes.json();
        if (history.length > 0) {
          const rec = history[0];
          const prevRec = history[1] || null;
          const pos = Number(rec.puesto) || 1;
          const prevPos = prevRec ? Number(prevRec.puesto) : (pos > 1 ? pos + 1 : 2);
          const { movement, tendencia } = computeMovement(pos, prevPos);

          return res.status(200).json({
            success: true,
            source: "supabase-fallback",
            updatedAt: rec.fecha_registro || requestedAt,
            company: {
              id: TEPSA_COMPANY_ID,
              name: "TEPSA [PSV]",
              position: pos,
              previousPosition: prevPos,
              movement,
              kilometers: Number(rec.kilometros || 0),
              trips: Number(rec.viajes || 0),
              members: Number(rec.miembros || 16),
              month: new Date().getMonth() + 1,
              year: new Date().getFullYear()
            },
            ok: true,
            empresa: "TEPSA [PSV]",
            puestoActual: pos,
            puestoAnterior: prevPos,
            kilometros: Number(rec.kilometros || 0),
            viajes: Number(rec.viajes || 0),
            miembros: Number(rec.miembros || 16),
            tendencia,
            actualizadoEn: rec.fecha_registro || requestedAt
          });
        }
      }
    } catch (e) {
      console.warn(`[Ranking API] Fallback de Supabase no disponible: ${e.message}`);
    }

    return res.status(503).json({
      success: false,
      source: "fallback-error",
      updatedAt: requestedAt,
      error: error.message
    });
  }
};
