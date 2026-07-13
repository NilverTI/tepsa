module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Método no permitido" });
  }

  const { driver, password, url, description } = req.body || {};

  const cleanDriver = (driver || "").trim();
  const cleanPassword = (password || "").trim();
  const cleanUrl = (url || "").trim();
  const cleanDescription = (description || "").trim();

  if (!cleanDriver || !cleanPassword || !cleanUrl) {
    return res.status(400).json({ success: false, error: "Faltan campos obligatorios (conductor, contraseña o enlace de imagen)" });
  }

  const supabaseUrl = "https://natrscfdveztkerxyhoc.supabase.co";
  const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hdHJzY2ZkdmV6dGtlcnh5aG9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3OTA4MzAsImV4cCI6MjA5OTM2NjgzMH0.9bof3LIsQiVKWZwmnNVmdPlX3xDYxWEMb6MEIFDL8aQ";

  try {
    // 1. Verificar si el conductor existe en conductores_auth
    const authUrl = `${supabaseUrl}/rest/v1/conductores_auth?driver_name=eq.${encodeURIComponent(cleanDriver)}`;
    const authRes = await fetch(authUrl, {
      method: "GET",
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`
      }
    });

    if (!authRes.ok) {
      throw new Error(`Error al leer autenticación: ${authRes.status}`);
    }

    const authData = await authRes.json();

    if (authData.length === 0) {
      // Caso A: Primer registro del conductor (Registrar automáticamente)
      const registerRes = await fetch(`${supabaseUrl}/rest/v1/conductores_auth`, {
        method: "POST",
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
          "Prefer": "return=representation"
        },
        body: JSON.stringify({
          driver_name: cleanDriver,
          password: cleanPassword
        })
      });

      if (!registerRes.ok) {
        const errText = await registerRes.text();
        throw new Error(`Error al registrar contraseña: ${registerRes.status} - ${errText}`);
      }
    } else {
      // Caso B: El conductor ya tiene contraseña registrada (Validar)
      const savedPassword = authData[0].password;
      if (savedPassword !== cleanPassword) {
        return res.status(401).json({ success: false, error: "Contraseña incorrecta para este conductor" });
      }
    }

    // 2. Insertar foto en fotos_conductores
    const insertRes = await fetch(`${supabaseUrl}/rest/v1/fotos_conductores`, {
      method: "POST",
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
      },
      body: JSON.stringify({
        driver_name: cleanDriver,
        image_url: cleanUrl,
        description: cleanDescription
      })
    });

    if (!insertRes.ok) {
      const errText = await insertRes.text();
      throw new Error(`Error al subir la foto: ${insertRes.status} - ${errText}`);
    }

    return res.status(200).json({ success: true, message: "Foto publicada correctamente" });
  } catch (error) {
    console.error("upload.js handler error:", error);
    return res.status(500).json({
      success: false,
      error: "Error interno del servidor",
      message: error.message
    });
  }
};
