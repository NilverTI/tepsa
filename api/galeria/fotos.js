const {
  SUPABASE_URL,
  SUPABASE_KEY,
  normalizeImageUrl,
  fetchWithTimeout
} = require("../_config");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { driver, page: pageStr } = req.query || {};
  const driverName = (driver || "").trim();
  const page = parseInt(pageStr, 10) || 1;
  const limit = 12;
  const offset = (page - 1) * limit;

  if (!driverName) {
    return res.status(400).json({ success: false, error: "Se requiere especificar el parámetro 'driver'." });
  }

  try {
    const dbUrl = `${SUPABASE_URL}/rest/v1/fotos_conductores?driver_name=eq.${encodeURIComponent(driverName)}&order=created_at.desc&limit=${limit}&offset=${offset}`;

    const dbResponse = await fetchWithTimeout(dbUrl, {
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Prefer": "count=exact"
      }
    }, 4000);

    if (!dbResponse.ok) {
      throw new Error(`Supabase query status ${dbResponse.status}`);
    }

    const photosRaw = await dbResponse.json();
    const photos = (photosRaw || []).map(p => ({
      ...p,
      image_url: normalizeImageUrl(p.image_url)
    }));

    const rangeHeader = dbResponse.headers.get("content-range");
    let total = photos.length;
    if (rangeHeader) {
      const parts = rangeHeader.split("/");
      if (parts.length > 1) total = parseInt(parts[1], 10) || photos.length;
    }

    const pages = Math.ceil(total / limit) || 1;

    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=60, stale-while-revalidate=30");
    return res.status(200).json({
      success: true,
      photos,
      total,
      page,
      pages
    });

  } catch (error) {
    console.warn("api/galeria/fotos Supabase fallback:", error.message);
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    return res.status(200).json({
      success: true,
      photos: [],
      total: 0,
      page: 1,
      pages: 1
    });
  }
};
