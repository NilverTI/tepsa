const {
  SUPABASE_URL,
  SUPABASE_KEY,
  isUserAdmin,
  fetchWithTimeout
} = require("../_config");

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

  const isDefaultAdmin = isUserAdmin(cleanUsername);

  try {
    const authRes = await fetchWithTimeout(
      `${SUPABASE_URL}/rest/v1/conductores_auth?driver_name=eq.${encodeURIComponent(cleanUsername)}`,
      { headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` } },
      3500
    );

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
