---
layout: home

hero:
  name: "Mush2"
  text: "Documentación Técnica"
  tagline: Sistema IoT de control ambiental para hongos adaptógenos
  image:
    src: /logo.svg
    alt: Mush2
  actions:
    - theme: brand
      text: Comenzar →
      link: /architecture/architecture
    - theme: alt
      text: Ver en GitHub
      link: https://github.com/AlejandroMaturana/mush2

features:
  - icon: 📐
    title: Arquitectura
    details: Componentes del sistema, diagramas de flujo y stack tecnológico completo.
    link: /architecture/architecture
    linkText: Ver arquitectura

  - icon: 🤝
    title: Contratos
    details: Contratos de comunicación REST, MQTT y BLE entre componentes. Inmutables sin versionado.
    link: /contracts/api-contract
    linkText: Ver contratos

  - icon: 🏛️
    title: ADR — Decisiones
    details: 17 registros de decisiones de arquitectura con contexto, alternativas y justificación.
    link: /ADR/ADR-001-ESP32
    linkText: Ver ADRs

  - icon: 🧩
    title: EDD — Diseño de sistemas
    details: Documentos de diseño de alto nivel para subsistemas complejos, previos a la implementación.
    link: /EDD/EDD-001-sistema-control-ambiental
    linkText: Ver EDDs

  - icon: 💬
    title: RFC — Propuestas
    details: Propuestas formales para cambios significativos antes de decidir su implementación.
    link: /RFC/RFC-0001-https-tls-firmware
    linkText: Ver RFCs

  - icon: 📊
    title: Diagramas
    details: Diagramas de arquitectura propia de Mush2
    link: /diagrams/exports/README
    linkText: Ver diagramas

  - icon: 📋
    title: Gobernanza
    details: Normas, flujos de trabajo y estándares de código para contribuir de forma consistente.
    link: /governance/contribution-guide
    linkText: Ver gobernanza

  - icon: 🗂️
    title: DDD — Dominio
    details: Lineamientos y contexto del diseño orientado al dominio del sistema.
    link: /DDD/DDD-001-domain-model
    linkText: Ver DDD

  - icon: ⚙️
    title: Operaciones
    details: Procedimientos de despliegue, runbooks y guías operacionales del sistema.
    link: /operations/deployment
    linkText: Ver operaciones
---
