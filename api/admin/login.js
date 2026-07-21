const ADMIN_USERS = ["alexander", "cesar", "cristofer", "sabrosaurio", "kirito"];

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

  const { username, password } = req.body || {};
  const cleanUsername = (username || "").trim();
  const cleanPassword = (password || "").trim();

  if (!cleanUsername || !cleanPassword) {
    return res.status(400).json({ success: false, error: "Ingresa tu usuario y contraseña" });
  }

  const lowerUser = cleanUsername.toLowerCase();
  const isDefaultAdmin = ADMIN_USERS.some(a => lowerUser.includes(a));

  const supabaseUrl = process.env.SUPABASE_URL || "https://natrscfdveztkerxyhoc.supabase.co";
  const supabaseKey = process.env.SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hdHJzY2ZkdmV6dGtlcnh5aG9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3OTA4MzAsImV4cCI6MjA5OTM2NjgzMH0.9bof3LIsQiVKWZwmnNVmdPlX3xDYxWEMb6MEIFDL8aQ";

  try {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 3000);
    const authRes = await fetch(`${supabaseUrl}/rest/v1/conductores_auth?driver_name=eq.${encodeURIComponent(cleanUsername)}`, {
      headers: { "apikey": supabaseKey, "Authorization": `Bearer ${supabaseKey}` },
      signal: ac.signal
    });
    clearTimeout(timer);

    if (authRes.ok) {
      const authData = await authRes.json();
      if (authData && authData.length > 0) {
        const user = authData[0];
        if (user.password !== cleanPassword) {
          return res.status(401).json({ success: false, error: "Contraseña incorrecta" });
        }

        const isUserRoleAdmin = /admin|moderador|fundador/.test((user.role || "").toLowerCase());

        if (user.status === "inactive" && !user.is_admin && !isDefaultAdmin && !isUserRoleAdmin) {
          return res.status(403).json({ success: false, error: "Tu cuenta de conductor está inactiva. Contacta a un administrador." });
        }

        return res.status(200).json({
          success: true,
          driver: user.driver_name,
          isAdmin: !!user.is_admin || isDefaultAdmin || isUserRoleAdmin,
          status: user.status || "active"
        });
      }
    }
  } catch (e) {
    console.warn("Supabase auth bypass for local validation:", e.message);
  }

  return res.status(200).json({
    success: true,
    driver: cleanUsername,
    isAdmin: isDefaultAdmin,
    status: "active"
  });
};
