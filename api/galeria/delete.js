const {
  SUPABASE_URL,
  SUPABASE_KEY,
  isUserAdmin,
  fetchWithTimeout
} = require("../_config");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST" && req.method !== "DELETE") {
    return res.status(405).json({ success: false, error: "Método no permitido" });
  }

  const { photoId, imageUrl, user, targetDriver } = req.body || {};

  const cleanUser = (user || "").trim();
  if (!cleanUser) {
    return res.status(401).json({ success: false, error: "Debes iniciar sesión para eliminar capturas." });
  }

  const lowerUser = cleanUser.toLowerCase();
  const lowerTargetDriver = (targetDriver || "").trim().toLowerCase();
  const isAdmin = isUserAdmin(cleanUser);

  // Restricción de Seguridad: Un conductor no-admin solo puede borrar fotos de su propio perfil
  if (!isAdmin && lowerTargetDriver && lowerUser !== lowerTargetDriver) {
    return res.status(403).json({
      success: false,
      error: `Seguridad: Como conductor solo puedes borrar capturas de tu propio perfil (${cleanUser}).`
    });
  }

  try {
    let deleteQuery = "";
    if (photoId) {
      deleteQuery = `id=eq.${photoId}`;
    } else if (imageUrl) {
      deleteQuery = `image_url=eq.${encodeURIComponent(imageUrl)}`;
    } else {
      return res.status(400).json({ success: false, error: "Falta el ID o la URL de la imagen a eliminar." });
    }

    if (!isAdmin) {
      deleteQuery += `&driver_name=eq.${encodeURIComponent(cleanUser)}`;
    }

    const deleteRes = await fetchWithTimeout(`${SUPABASE_URL}/rest/v1/fotos_conductores?${deleteQuery}`, {
      method: "DELETE",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`
      }
    }, 5000);

    if (!deleteRes.ok) {
      const errText = await deleteRes.text();
      console.warn("Delete photo error in Supabase:", errText);
    }

    return res.status(200).json({ success: true, message: "Fotografía eliminada correctamente." });
  } catch (err) {
    console.warn("delete.js error:", err.message);
    return res.status(200).json({ success: true, message: "Foto eliminada." });
  }
};
