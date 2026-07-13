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

  const supabaseUrl = "https://natrscfdveztkerxyhoc.supabase.co";
  const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hdHJzY2ZkdmV6dGtlcnh5aG9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3OTA4MzAsImV4cCI6MjA5OTM2NjgzMH0.9bof3LIsQiVKWZwmnNVmdPlX3xDYxWEMb6MEIFDL8aQ";

  try {
    const limit = 12;
    const offset = (page - 1) * limit;

    const dbUrl = `${supabaseUrl}/rest/v1/fotos_conductores?driver_name=eq.${encodeURIComponent(driver)}&order=created_at.desc&limit=${limit}&offset=${offset}`;

    const dbResponse = await fetch(dbUrl, {
      method: "GET",
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Prefer": "count=exact"
      }
    });

    if (!dbResponse.ok) {
      const errText = await dbResponse.text();
      throw new Error(`Supabase error: ${dbResponse.status} - ${errText}`);
    }

    const photos = await dbResponse.json();

    // Extraer total del encabezado content-range (ej: "0-11/45")
    const rangeHeader = dbResponse.headers.get("content-range");
    let total = 0;
    if (rangeHeader) {
      const parts = rangeHeader.split("/");
      if (parts.length > 1) {
        total = parseInt(parts[1], 10) || 0;
      }
    }

    const pages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      photos,
      total,
      pages,
      page
    });
  } catch (error) {
    console.error("fotos.js handler error:", error);
    return res.status(500).json({
      success: false,
      error: "Error interno del servidor",
      message: error.message
    });
  }
};
