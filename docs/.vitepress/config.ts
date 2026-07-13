import { defineConfig } from 'vitepress'

// ─────────────────────────────────────────────────────────────────────────────
// BASE PATH
// Ajusta este valor si el repositorio cambia de nombre o de organización.
// Formato: '/<nombre-del-repositorio>/'
// URL actual: https://alejandromaturana.github.io/mush2/
// ─────────────────────────────────────────────────────────────────────────────
const BASE = '/mush2/'

export default defineConfig({
  // Ruta base para GitHub Pages (project site)
  base: BASE,

  // Metadatos del sitio
  title: 'Mush2 Docs',
  description:
    'Documentación técnica del sistema IoT de control ambiental para hongos adaptógenos.',

  // Idioma principal
  lang: 'es-CL',

  // Genera URLs limpias: /guide/ en lugar de /guide.html
  cleanUrls: true,

  // Evita fallos por enlaces rotos a recursos externos o fuera de docs/
  ignoreDeadLinks: true,

  // Encabezados para SEO y seguridad
  head: [
    ['link', { rel: 'icon', href: `${BASE}favicon.ico` }],
    ['meta', { name: 'theme-color', content: '#4ade80' }],
  ],

  themeConfig: {
    // ── Navbar ──────────────────────────────────────────────────────────────
    nav: [
      { text: 'Inicio', link: '/' },
      { text: 'Arquitectura', link: '/architecture/architecture' },
      { text: 'Contratos', link: '/contracts/api-contract' },
      { text: 'Roadmap', link: '/roadmap/roadmap' },
      {
        text: 'Más',
        items: [
          { text: 'ADR', link: '/ADR/ADR-001-ESP32' },
          { text: 'EDD', link: '/EDD/EDD-001-sistema-control-ambiental' },
          { text: 'RFC', link: '/RFC/RFC-0001-https-tls-firmware' },
          { text: 'Gobernanza', link: '/governance/contribution-guide' },
        ],
      },
    ],

    // ── Sidebar ──────────────────────────────────────────────────────────────
    sidebar: [
      // ── Arquitectura ──────────────────────────────────────────────────────
      {
        text: '📐 Arquitectura',
        collapsed: false,
        items: [
          { text: 'Visión general', link: '/architecture/architecture' },
          { text: 'Backend', link: '/architecture/backend' },
          { text: 'Frontend', link: '/architecture/frontend' },
          { text: 'Firmware', link: '/architecture/firmware' },
          { text: 'Base de datos', link: '/architecture/database' },
        ],
      },

      // ── Contratos ─────────────────────────────────────────────────────────
      {
        text: '🤝 Contratos',
        collapsed: true,
        items: [
          { text: 'API REST v1', link: '/contracts/api-contract' },
          { text: 'MQTT', link: '/contracts/mqtt-contract' },
          { text: 'BLE', link: '/contracts/ble-contract' },
        ],
      },

      // ── Protocolo ─────────────────────────────────────────────────────────
      {
        text: '📡 Protocolo',
        collapsed: true,
        items: [
          { text: 'Protocolo HTTP v1', link: '/protocol/protocol-v1' },
          { text: 'Matriz de compatibilidad', link: '/protocol/compatibility-matrix' },
        ],
      },

      // ── ADR ───────────────────────────────────────────────────────────────
      {
        text: '🏛️ ADR — Decisiones',
        collapsed: true,
        items: [
          { text: 'ADR-001 · ESP32', link: '/ADR/ADR-001-ESP32' },
          { text: 'ADR-002 · Sensores AHT21/ENS160', link: '/ADR/ADR-002-AHT21-ENS160-sensors' },
          { text: 'ADR-003 · SSR 4ch', link: '/ADR/ADR-003-SSR-low-level-04ch' },
          { text: 'ADR-004 · ThingSpeak', link: '/ADR/ADR-004-ThingSpeak' },
          { text: 'ADR-005 · PostgreSQL / Sequelize', link: '/ADR/ADR-005-PostgreSQL-SequelizeORM' },
          { text: 'ADR-006 · Logs y Monitoreo', link: '/ADR/ADR-006-Logs-Monitoreo-estrategia' },
          { text: 'ADR-007 · JWT / RBAC', link: '/ADR/ADR-007-JWT-RBAC' },
          { text: 'ADR-008 · Protocolo HTTP', link: '/ADR/ADR-008-HTTP-Command-Protocol' },
          { text: 'ADR-009 · Control Histéresis/Fuzzy', link: '/ADR/ADR-009-Estrategia-Control-Histeresis-Fuzzy' },
          { text: 'ADR-010 · Fail-Safe Overheat', link: '/ADR/ADR-010-Mecanismo-Fail-Safe-Overheat' },
          { text: 'ADR-011 · Recetas por Etapas', link: '/ADR/ADR-011-Automatizacion-por-Etapas-Recipes' },
          { text: 'ADR-012 · FreeRTOS', link: '/ADR/ADR-012-FreeRTOS' },
          { text: 'ADR-013 · Seguridad', link: '/ADR/ADR-013-Seguridad-Estrategia' },
          { text: 'ADR-014 · OTA v3', link: '/ADR/ADR-014-OTA-v3' },
          { text: 'ADR-015 · Reestructura Docs', link: '/ADR/ADR-015-docs-restructure' },
          { text: 'ADR-016 · Suscripción por Capability', link: '/ADR/ADR-016-capability-based-subscription' },
          { text: 'ADR-017 · Event Bus', link: '/ADR/ADR-017-Event-Bus' },
        ],
      },

      // ── EDD ───────────────────────────────────────────────────────────────
      {
        text: '🧩 EDD — Diseño de sistemas',
        collapsed: true,
        items: [
          { text: 'EDD-001 · Control Ambiental', link: '/EDD/EDD-001-sistema-control-ambiental' },
          { text: 'EDD-002 · Motor de Reglas/Recetas', link: '/EDD/EDD-002-motor-reglas-recetas' },
          { text: 'EDD-003 · OTA v3 Canary', link: '/EDD/EDD-003-ota-v3-canary-deployment' },
          { text: 'EDD-004 · Multi-tenant', link: '/EDD/EDD-004-estrategia-multitenant' },
          { text: 'EDD-005 · BLE Provisioning', link: '/EDD/EDD-005-BLE-provisioning' },
        ],
      },

      // ── RFC ───────────────────────────────────────────────────────────────
      {
        text: '💬 RFC — Propuestas',
        collapsed: true,
        items: [
          { text: 'RFC-0001 · HTTPS/TLS Firmware', link: '/RFC/RFC-0001-https-tls-firmware' },
          { text: 'RFC-0002 · MQTT v2 Upgrade', link: '/RFC/RFC-0002-mqtt-v2-upgrade' },
          { text: 'RFC-0003 · Dashboard Multi-device', link: '/RFC/RFC-0003-multi-device-dashboard' },
          { text: 'RFC-0004 · Notificaciones Push', link: '/RFC/RFC-0004-notificaciones-push' },
          { text: 'RFC-0005 · BLE Provisioning & Bootstrap', link: '/RFC/RFC-0005-BLE-Provisioning-&-Device-Bootstrap' },
        ],
      },

      // ── DDD ───────────────────────────────────────────────────────────────
      {
        text: '🗂️ DDD — Dominio',
        collapsed: true,
        items: [
          { text: 'Lineamientos DDD', link: '/DDD/DDD-001-Lineamientos' },
          { text: 'Contexto inicial', link: '/DDD/firstDDD.context' },
        ],
      },

      // ── Diseño ────────────────────────────────────────────────────────────
      {
        text: '🎨 Diseño',
        collapsed: true,
        items: [
          { text: 'UI Standards', link: '/design/ui-standards' },
          { text: 'Design Tokens', link: '/design/design-tokens' },
          { text: 'Componentes', link: '/design/components' },
          { text: 'Catastro Técnico', link: '/design/catastro-tecnico' },
        ],
      },

      // ── Gobernanza ────────────────────────────────────────────────────────
      {
        text: '📋 Gobernanza',
        collapsed: true,
        items: [
          { text: 'Guía de contribución', link: '/governance/contribution-guide' },
          { text: 'Estándares de código', link: '/governance/coding-standards' },
          { text: 'Estrategia de branches', link: '/governance/branching-strategy' },
          { text: 'Definition of Done', link: '/governance/definition-of-done' },
          { text: 'Deuda técnica', link: '/governance/tech-debt' },
          { text: 'Versionado', link: '/governance/versioning' },
          { text: 'Árbol de decisión', link: '/governance/decision-tree' },
        ],
      },

      // ── Roadmap ───────────────────────────────────────────────────────────
      {
        text: '🗺️ Roadmap',
        collapsed: true,
        items: [
          { text: 'Roadmap principal', link: '/roadmap/roadmap' },
          { text: 'Milestones', link: '/roadmap/milestone' },
          { text: 'Contexto', link: '/roadmap/context' },
        ],
      },

      // ── Operaciones ───────────────────────────────────────────────────────
      {
        text: '⚙️ Operaciones',
        collapsed: true,
        items: [
          { text: 'Despliegue', link: '/operations/deployment' },
          { text: 'Runbook', link: '/operations/runbook' },
        ],
      },

      // ── Usuario ───────────────────────────────────────────────────────────
      {
        text: '👤 Usuario',
        collapsed: true,
        items: [
          { text: 'Manual de usuario', link: '/user/manual' },
        ],
      },

      // ── Documentos raíz ───────────────────────────────────────────────────
      {
        text: '📄 Referencia',
        collapsed: true,
        items: [
          { text: 'Requerimientos', link: '/requirements' },
          { text: 'Escalabilidad', link: '/scalability' },
        ],
      },
    ],

    // ── Social ────────────────────────────────────────────────────────────
    socialLinks: [
      {
        icon: 'github',
        link: 'https://github.com/AlejandroMaturana/mush2',
      },
    ],

    // ── Footer ────────────────────────────────────────────────────────────
    footer: {
      message: 'Mush2 — Sistema IoT de control ambiental',
      copyright: 'MIT License',
    },

    // ── Búsqueda local (sin plugins externos) ────────────────────────────
    search: {
      provider: 'local',
    },

    // ── Editar en GitHub ─────────────────────────────────────────────────
    editLink: {
      pattern: 'https://github.com/AlejandroMaturana/mush2/edit/main/docs/:path',
      text: 'Editar esta página en GitHub',
    },

    // ── Última actualización ─────────────────────────────────────────────
    lastUpdated: {
      text: 'Última actualización',
    },
  },

  // Markdown — extensiones nativas de VitePress
  markdown: {
    lineNumbers: true,
  },

  // Configuración personalizada de Vite
  vite: {
    plugins: [
      {
        name: 'redirect-to-base',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url) {
              const pathname = req.url.split('?')[0]
              if (pathname === '/' || pathname === '/index.html') {
                res.writeHead(302, { Location: '/mush2/' })
                res.end()
                return
              }
            }
            next()
          })
        }
      }
    ]
  }
})
