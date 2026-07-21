module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const driver = (req.query.driver || "").trim();
  const page = parseInt(req.query.page, 10) || 1;

  if (!driver) {
    return res.status(400).json({ success: false, error: "Falta el nombre del conductor" });
  }

  const supabaseUrl = process.env.SUPABASE_URL || "https://natrscfdveztkerxyhoc.supabase.co";
  const supabaseKey = process.env.SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hdHJzY2ZkdmV6dGtlcnh5aG9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3OTA4MzAsImV4cCI6MjA5OTM2NjgzMH0.9bof3LIsQiVKWZwmnNVmdPlX3xDYxWEMb6MEIFDL8aQ";

  try {
    const limit = 12;
    const offset = (page - 1) * limit;

    const dbUrl = `${supabaseUrl}/rest/v1/fotos_conductores?driver_name=eq.${encodeURIComponent(driver)}&order=created_at.desc&limit=${limit}&offset=${offset}`;

    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 4000);
    const dbResponse = await fetch(dbUrl, {
      method: "GET",
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Prefer": "count=exact"
      },
      signal: ac.signal
    });
    clearTimeout(timer);

    if (dbResponse.ok) {
      const photos = await dbResponse.json();

      const rangeHeader = dbResponse.headers.get("content-range");
      let total = photos.length;
      if (rangeHeader) {
        const parts = rangeHeader.split("/");
        if (parts.length > 1) {
          total = parseInt(parts[1], 10) || total;
        }
      }

      const pages = Math.max(1, Math.ceil(total / limit));

      return res.status(200).json({
        success: true,
        photos,
        total,
        pages,
        page
      });
    }
  } catch (error) {
    console.warn("fotos.js Supabase fetch skipped:", error.message);
  }

  // Respuesta segura limpia si no hay fotos aún o Supabase no está conectado
  return res.status(200).json({
    success: true,
    photos: [],
    total: 0,
    pages: 1,
    page: 1
  });
};
