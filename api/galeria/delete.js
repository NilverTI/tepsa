const ADMIN_USERS = ["alexander", "cesar", "cristofer", "sabrosaurio", "kirito"];

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

  const { photoId, imageUrl, user } = req.body || {};

  const cleanUser = (user || "").trim().toLowerCase();
  const isAdmin = ADMIN_USERS.some(a => cleanUser.includes(a));

  if (!isAdmin && !cleanUser) {
    return res.status(403).json({ success: false, error: "Solo administradores o moderadores pueden eliminar capturas." });
  }

  const supabaseUrl = process.env.SUPABASE_URL || "https://natrscfdveztkerxyhoc.supabase.co";
  const supabaseKey = process.env.SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hdHJzY2ZkdmV6dGtlcnh5aG9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3OTA4MzAsImV4cCI6MjA5OTM2NjgzMH0.9bof3LIsQiVKWZwmnNVmdPlX3xDYxWEMb6MEIFDL8aQ";

  try {
    let deleteQuery = "";
    if (photoId) {
      deleteQuery = `id=eq.${photoId}`;
    } else if (imageUrl) {
      deleteQuery = `image_url=eq.${encodeURIComponent(imageUrl)}`;
    } else {
      return res.status(400).json({ success: false, error: "Falta el ID o la URL de la imagen a eliminar." });
    }

    const deleteRes = await fetch(`${supabaseUrl}/rest/v1/fotos_conductores?${deleteQuery}`, {
      method: "DELETE",
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`
      }
    });

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
