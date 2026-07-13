# TEPSA PSV - Sitio Web Oficial

Empresa Virtual de Transporte Peruano en Euro Truck Simulator 2, registrada y participante del servidor **PeruServer**.

---

## 📂 Estructura del Proyecto Reestructurado

El proyecto ha sido reorganizado profesionalmente bajo la siguiente estructura modular:

```text
/
├── api/                  # Funciones Serverless de Vercel (Trucky API & Supabase Gallery integration)
├── assets/               # Recursos estáticos
│   ├── img/              # Flota, portadas y capturas de la galería
│   ├── icons/            # Iconos decorativos
│   └── fonts/            # Fuentes tipográficas personalizadas (si se requieren)
├── pages/                # Vistas HTML principales
│   ├── index.html        # Página principal de inicio (Home)
│   └── conductores.html  # Directorio y listado de tripulación/galería
├── css/                  # Hojas de estilo modulares
│   ├── global.css        # Resets, navbar, footer, botones y tipografías comunes
│   ├── index.css         # Estilos específicos de la página de inicio, podium y postulaciones
│   └── conductores.css   # Estilos del directorio, filtros, login y modals
├── js/                   # Archivos de lógica JavaScript modular
│   ├── global.js         # Utilidades comunes (escapeHtml, formatNumber, nav listeners)
│   ├── index.js          # Lógica SWR, contadores, ranking PeruServer y reclutamiento Formspree
│   └── conductores.js    # Lógica de tripulación, filtros, galerías Supabase y subida
├── server.js             # Servidor de desarrollo HTTP nativo en Node.js (con ruteo inteligente)
├── vercel.json           # Configuración de despliegue en Vercel (rewrites y headers)
├── .gitignore            # Archivos excluidos del control de versiones
└── README.md             # Documentación del proyecto
```

---

## 🛠️ Configuración y Ejecución Local

### 1. Requisitos Previos
- Tener instalado [Node.js](https://nodejs.org/) (versión 16 o superior recomendada).

### 2. Instalación de Dependencias
Descarga o clona el repositorio localmente, sitúate en la raíz del proyecto y ejecuta:
```bash
npm install
```

### 3. Iniciar el Servidor de Desarrollo
Para arrancar el servidor web local con soporte de enrutamiento modular (para `/`, `/conductores`, etc.) y las APIs proxies sin necesidad de configurar ningún archivo `.env` externo:
```bash
npm run dev
```
o directamente:
```bash
node server.js
```
El sitio estará disponible de inmediato en: [http://localhost:3000](http://localhost:3000)

---

## 🚀 Despliegue en Vercel

Este proyecto está listo para ser desplegado de manera instantánea en **Vercel**:

- Las rutas de páginas estáticas se mapean de forma transparente sin extensión `.html` gracias a las directivas de `vercel.json` (`cleanUrls` y `rewrites`).
- Las APIs se ejecutan automáticamente como Serverless Functions bajo el directorio `/api`.
- Se aplican políticas de caché optimizadas para los recursos estáticos en la ruta `/assets/img/*`.
- **Portabilidad Total**: Todo el ruteo de base de datos de Supabase y consultas de ranking a PeruServer se resuelven de manera estática mediante constantes codificadas directamente, lo que garantiza el correcto funcionamiento sin variables de entorno en producción.
