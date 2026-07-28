import { useState } from "react";
import AuthModal from "../components/AuthModal.jsx";

const FEATURES = [
  {
    icon: "sensors",
    label: "MONITOREO",
    desc: "Temperatura, humedad, CO₂ y flujo de aire en tiempo real.",
    color: "var(--spore-green)",
  },
  {
    icon: "potted_plant",
    label: "RECETAS",
    desc: "Perfiles de cultivo con control por fase y especies.",
    color: "var(--teal)",
  },
  {
    icon: "devices",
    label: "ACTUADORES",
    desc: "Ventiladores, humidificadores e iluminación automática.",
    color: "var(--accent-purple)",
  },
];

function Landing() {
  const [showAuth, setShowAuth] = useState(false);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: "var(--bg-deep)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative Background Glows */}
      <div
        style={{
          position: "absolute",
          top: "-10%",
          left: "-10%",
          width: "50%",
          height: "50%",
          background: "rgba(var(--spore-green-rgb), 0.08)",
          borderRadius: "50%",
          filter: "blur(120px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-10%",
          right: "-10%",
          width: "50%",
          height: "50%",
          background: "rgba(var(--accent-purple-rgb, 139, 92, 246), 0.05)",
          borderRadius: "50%",
          filter: "blur(120px)",
          pointerEvents: "none",
        }}
      />

      {/* Floating Particle Orbs */}
      <div
        className="status-dot online"
        style={{
          position: "absolute",
          top: "25%",
          right: "10%",
          animation: "ping 2s cubic-bezier(0, 0, 0.2, 1) infinite",
          opacity: 0.5,
        }}
      />
      <div
        className="status-dot online"
        style={{
          position: "absolute",
          bottom: "25%",
          left: "12%",
          animation: "ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite",
          opacity: 0.3,
          background: "var(--teal)",
        }}
      />

      {/* HEADER */}
      <header
        style={{
          position: "relative",
          zIndex: 10,
          maxWidth: "1200px",
          width: "100%",
          margin: "0 auto",
          padding: "24px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              padding: "8px 12px",
              background: "rgba(var(--spore-green-rgb), 0.1)",
              borderRadius: "12px",
              border: "1px solid rgba(var(--spore-green-rgb), 0.3)",
              color: "var(--spore-green)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: "24px",
                animation: "breathing-pulse 3s infinite ease-in-out",
              }}
            >
              grain
            </span>
          </div>
          <div>
            <span
              style={{
                fontFamily: "var(--font-body)",
                fontWeight: 900,
                fontSize: "20px",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: "var(--on-surface)",
              }}
            >
              Mush<span style={{ color: "var(--spore-green)" }}>2</span>
            </span>
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "9px",
                color: "var(--outline)",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                marginTop: "2px",
              }}
            >
              Biosfera autónoma
            </p>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <main
        style={{
          flex: 1,
          maxWidth: "1200px",
          width: "100%",
          margin: "0 auto",
          padding: "48px 24px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
          gap: "48px",
          alignItems: "center",
          position: "relative",
          zIndex: 10,
        }}
      >
        {/* Left Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Heading */}
          <h1
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "clamp(32px, 5vw, 56px)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
              color: "var(--on-surface)",
            }}
          >
            Cultiva micelio con
            <br />
            <span className="gradient-title" style={{ fontSize: "inherit" }}>
              inteligencia autónoma.
            </span>
          </h1>

          {/* Description */}
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "14px",
              lineHeight: 1.7,
              color: "var(--outline)",
              maxWidth: "480px",
            }}
          >
            Mush2 combina filtración HEPA hospitalaria, control ambiental activo
            (calefacción, ventilación, nebulización ultrasónica) y control
            autónomo para lograr rendimientos de cultivo superiores.
          </p>

          {/* CTA Buttons */}
          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
              paddingTop: "8px",
            }}
          >
            <button
              onClick={() => setShowAuth(true)}
              className="btn btn-glow"
              style={{ padding: "12px 24px", fontSize: "13px" }}
            >
              <span>Iniciar consola de cultivo</span>
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "16px" }}
              >
                arrow_forward
              </span>
            </button>
            <button
              onClick={() => setShowAuth(true)}
              className="btn btn-secondary"
              style={{ padding: "12px 24px", fontSize: "13px" }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "16px" }}
              >
                bluetooth
              </span>
              <span>Conectar mi hardware</span>
            </button>
          </div>

          {/* Quick Specs Banner */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "16px",
              paddingTop: "32px",
              borderTop: "1px solid var(--outline-variant)",
              maxWidth: "400px",
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
            }}
          ></div>
        </div>

        {/* Right Column: Hardware Preview Card */}
        <div
          className="glass-card"
          style={{ padding: "24px", position: "relative", overflow: "hidden" }}
        >
          {/* Status Badges */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "24px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: "14px",
                  color: "var(--spore-green)",
                  animation: "breathing-pulse 2s infinite ease-in-out",
                }}
              >
                radio_button_checked
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  color: "var(--spore-green)",
                  fontWeight: 700,
                }}
              >
                Conectado
              </span>
            </div>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                color: "var(--outline)",
                background: "var(--surface-container-low)",
                padding: "2px 8px",
                borderRadius: "4px",
                border: "1px solid var(--outline-variant)",
              }}
            >
              Automático
            </span>
          </div>

          {/* Hardware Wireframe Mockup */}
          <div
            style={{
              background: "var(--surface-container-low)",
              borderRadius: "12px",
              padding: "24px",
              border: "1px solid var(--outline-variant)",
              position: "relative",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "200px",
            }}
          >
            {/* Glass Container Outline */}
            <div
              style={{
                position: "absolute",
                inset: "24px 32px 48px 32px",
                border: "2px solid rgba(var(--spore-green-rgb), 0.2)",
                borderRadius: "24px 24px 8px 8px",
                borderBottom: "8px solid var(--outline-variant)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                alignItems: "center",
                padding: "16px",
              }}
            >
              {/* Simulated Mycelium Block */}
              <div
                style={{
                  width: "96px",
                  height: "56px",
                  background: "var(--surface-container)",
                  borderRadius: "8px",
                  border: "1px solid var(--outline-variant)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  padding: "4px",
                  position: "relative",
                  boxShadow: "inset 0 2px 4px rgba(0,0,0,0.3)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: "6px",
                    background: "rgba(var(--spore-green-rgb), 0.1)",
                    borderRadius: "2px",
                  }}
                />
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "8px",
                    color: "var(--outline)",
                    textAlign: "center",
                    marginTop: "4px",
                  }}
                >
                  Sustrato de micelio
                </div>
              </div>

              {/* Humidity Mist Effect */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(var(--spore-green-rgb), 0.03)",
                  borderRadius: "24px",
                  backdropFilter: "blur(1px)",
                  animation: "breathing-pulse 3s infinite ease-in-out",
                  pointerEvents: "none",
                }}
              />
            </div>

            {/* Glowing Sensor Nodes */}
            <div
              className="pulse-glow"
              style={{
                position: "absolute",
                top: "40px",
                left: "48px",
                padding: "6px 8px",
                background: "var(--surface-container-low)",
                border: "1px solid var(--spore-green)",
                borderRadius: "9999px",
                color: "var(--spore-green)",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                boxShadow: "0 0 12px rgba(var(--spore-green-rgb), 0.3)",
                zIndex: 10,
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "14px" }}
              >
                thermostat
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "8px",
                  fontWeight: 700,
                }}
              >
                24.2°C
              </span>
            </div>
            <div
              className="pulse-glow"
              style={{
                position: "absolute",
                top: "96px",
                right: "40px",
                padding: "6px 8px",
                background: "var(--surface-container-low)",
                border: "1px solid var(--teal)",
                borderRadius: "9999px",
                color: "var(--teal)",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                boxShadow: "0 0 12px rgba(var(--teal-rgb, 20, 184, 166), 0.3)",
                zIndex: 10,
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "14px" }}
              >
                water_drop
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "8px",
                  fontWeight: 700,
                }}
              >
                92% RH
              </span>
            </div>
            <div
              className="pulse-glow"
              style={{
                position: "absolute",
                bottom: "64px",
                left: "40px",
                padding: "6px 8px",
                background: "var(--surface-container-low)",
                border: "1px solid var(--accent-purple, #8b5cf6)",
                borderRadius: "9999px",
                color: "var(--accent-purple, #8b5cf6)",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                boxShadow: "0 0 12px rgba(139, 92, 246, 0.3)",
                zIndex: 10,
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "14px" }}
              >
                air
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "8px",
                  fontWeight: 700,
                }}
              >
                480 PPM
              </span>
            </div>

            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "9px",
                color: "var(--outline)",
                marginTop: "auto",
                paddingTop: "48px",
                textAlign: "center",
                userSelect: "none",
              }}
            >
              (Parámetros en rango óptimo)
            </div>
          </div>

          {/* AI Adviser Snippet */}
          <div
            className="glass-card"
            style={{
              marginTop: "16px",
              padding: "12px",
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: "24px",
                color: "var(--spore-green)",
                flexShrink: 0,
                marginTop: "2px",
              }}
            >
              developer_board
            </span>
            <div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "var(--spore-green)",
                  marginBottom: "4px",
                }}
              >
                Cámaras dedicadas
              </div>
              <p
                style={{
                  fontSize: "11px",
                  color: "var(--outline)",
                  lineHeight: 1.6,
                }}
              >
                "Mush2 tiene lo necesario para comenzar con un cultivo exitoso
                de setas, independiente de tu nivel de experiencia, podrás
                desarrollar el ambiente idóneo para el cultivo que quieras."
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer
        style={{
          borderTop: "1px solid var(--outline-variant)",
          background: "rgba(var(--surface-container-rgb, 30, 41, 59), 0.1)",
          padding: "24px",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            color: "var(--outline)",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "14px", color: "var(--spore-green)" }}
            >
              verified
            </span>
            <span>Controlador de ambientes - Biósfera autónoma</span>
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              fontWeight: 700,
              color:
                "var(--outline)" /* Cambiado a var(--outline) para que el texto general sea normal */,
              marginBottom: "4px",
            }}
          >
            <span>
              © 2026 Mush2 Corp. Diseñado para entusiastas del cultivo orgánico,
              por{" "}
              <a
                href="https://github.com/alejandromaturana"
                target="_blank"
                rel="noreferrer"
                style={{
                  color:
                    "var(--spore-green)" /* Reutiliza tu variable verde para resaltar solo el link */,
                  textDecoration: "none",
                }}
              >
                AlejandroMaturana
              </a>
              .
            </span>
          </div>
        </div>
      </footer>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  );
}

export default Landing;
