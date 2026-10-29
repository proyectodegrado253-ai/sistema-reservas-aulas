'use client';

import Link from "next/link";
import { useState } from "react";

const navItems = [
  { label: "Inicio", href: "#top" },
  { label: "Funciones", href: "#funciones" },
  { label: "Equipo", href: "#equipo" },
  { label: "Contacto", href: "#contacto" },
];

const features = [
  {
    icon: "calendar3",
    title: "Reservas ágiles",
    description: "Solicita, aprueba y coordina espacios con un flujo claro y ordenado.",
  },
  {
    icon: "search",
    title: "Disponibilidad real",
    description: "Consulta horarios y disponibilidad del campus sin confusiones ni duplicados.",
  },
  {
    icon: "clipboard-check",
    title: "Control institucional",
    description: "Gestiona aulas, docentes y aprobaciones desde una sola vista centralizada.",
  },
];

const creatorNames = [
  "Maureen Yepes",
  "Hassly Menco",
  "Keisha Payares",
  "Juan Sebastian Rodriguez",
];

const surveyData = [
  { label: "Reducción de conflictos", value: 91, tone: "#2563eb" },
  { label: "Ahorro de tiempo", value: 86, tone: "#10b981" },
  { label: "Facilidad de uso", value: 81, tone: "#8b5cf6" },
];

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSurvey, setActiveSurvey] = useState(0);
  const activeMetric = surveyData[activeSurvey];

  return (
    <main className="landing-shell landing-page" id="top">
      <header className="app-header">
        <div className="container">
          <div className="topbar">
            <Link href="/" className="brand" aria-label="Inicio institucional">
              <span className="brand-mark brand-mark-image">
                <img src="/logo-institucion.png" alt="Logo institucional" className="institutional-logo" />
                <strong>Reservas</strong>
              </span>
            </Link>

            <nav className={`main-nav ${mobileMenuOpen ? "is-open" : ""}`} aria-label="Menú principal">
              {navItems.map((item) => (
                <Link key={item.label} href={item.href} className="nav-link" onClick={() => setMobileMenuOpen(false)}>
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="header-actions">
              <Link href="/login" className="btn btn-ghost btn-compact">
                Iniciar sesión
              </Link>
              <Link href="/registro" className="btn btn-primary btn-compact">
                Registro
              </Link>
            </div>

            <button
              type="button"
              className={`menu-toggle ${mobileMenuOpen ? "is-open" : ""}`}
              aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((open) => !open)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      <div className="landing-inner">
        <section className="hero-block">
          <div className="hero-surface">
            <div className="hero-copy">
              <span className="eyebrow">Sistema institucional</span>
              <h1>
                Reserva de aulas
                <span>simple, ordenada y profesional.</span>
              </h1>
              <p className="hero-subtitle">
                Organiza el uso del espacio académico con un flujo claro para docentes, administradores y coordinación universitaria.
              </p>

              <div className="hero-actions">
                <Link href="/login" className="btn btn-primary">
                  Iniciar sesión
                </Link>
                <Link href="/registro" className="btn btn-ghost">
                  Registrarse
                </Link>
              </div>

              <div className="mini-stats" aria-label="Indicadores del sistema">
                <div>
                  <strong>18</strong>
                  <span>Aulas</span>
                </div>
                <div>
                  <strong>42</strong>
                  <span>Docentes</span>
                </div>
                <div>
                  <strong>24/7</strong>
                  <span>Disponibilidad</span>
                </div>
              </div>
            </div>

            <div className="hero-visual" aria-label="Vista visual del sistema">
              <div className="visual-card" aria-label="Docente observando laboratorio de computación">
                <img src="/docente-hero.png" alt="Docente observando laboratorio de computación" />
              </div>
              <span className="floating-pill pill-top">Disponible</span>
              <span className="floating-pill pill-bottom">Control académico</span>
            </div>
          </div>
        </section>

        <section id="equipo" className="creator-banner">
          <div className="section-heading creator-heading">
            <span className="eyebrow">Proyecto</span>
            <h2>Creadores del Proyecto</h2>
          </div>

          <div className="creator-grid">
            <div className="creator-list">
              <ul>
                {creatorNames.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </div>

            <div className="creator-photo-card">
              <img src="/creator-group.png" alt="Grupo de creadores del proyecto" />
            </div>

            <div className="creator-photo-card">
              <img src="/presentation-event.png" alt="Foto de evento de presentación" />
            </div>
          </div>
        </section>

        <section id="funciones" className="feature-showcase">
          <div className="section-heading">
            <span className="eyebrow">Funciones</span>
            <h2>Todo lo que necesita tu gestión académica</h2>
          </div>

          <div className="feature-grid">
            {features.map((feature) => (
              <article key={feature.title} className="feature-card">
                <span className="feature-icon">
                  <i className={`bi bi-${feature.icon}`} aria-hidden="true" />
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="story-grid">
          <article className="story-card">
            <span className="eyebrow">¿Qué es?</span>
            <h2>Una plataforma pensada para la operación institucional.</h2>
            <p>
              Permite reservar aulas, revisar disponibilidad y mantener el calendario académico
              bajo control, con una experiencia clara para docentes y administración.
            </p>
          </article>

          <article className="story-card accent">
            <span className="eyebrow">Beneficios</span>
            <ul>
              <li>Optimiza tiempos de coordinación académica.</li>
              <li>Reduce conflictos de horario y doble reserva.</li>
              <li>Mejora la experiencia del usuario con una interfaz clara.</li>
            </ul>
          </article>
        </section>

        <section className="visual-story">
          <div className="visual-story-copy">
            <span className="eyebrow">Ambiente académico</span>
            <h2>Espacios de aprendizaje preparados para cada actividad.</h2>
            <p>
              La gestión de aulas va más allá de reservar un salón: impacta directamente en la
              experiencia docente, la organización curricular y la disponibilidad de los laboratorios.
            </p>
          </div>

          <div className="visual-story-gallery">
            <div className="gallery-image teacher-image">
              <img src="/docente-hero.png" alt="Docente observando laboratorio de computación" />
              <div className="image-caption">
                <strong>Docente</strong>
                <span>Monitoreo y coordinación de la sesión.</span>
              </div>
            </div>

            <div className="gallery-image lab-image">
              <img src="/laboratorio-hero.png" alt="Laboratorio escolar de programación" />
              <div className="image-caption">
                <strong>Laboratorio</strong>
                <span>Ambiente ideal para prácticas, talleres y clases técnicas.</span>
              </div>
            </div>
          </div>
        </section>

        <section className="survey-panel" aria-label="Encuestas sobre gestión de aulas">
          <div className="survey-header">
            <div>
              <span className="eyebrow">Encuestas</span>
              <h2>Impacto del sistema en la gestión académica</h2>
            </div>
            <span className="survey-pill">Resultados</span>
          </div>

          <div className="survey-layout">
            <div className="survey-bars" aria-label="Gráfico de resultados">
              {surveyData.map((item, index) => (
                <button
                  key={item.label}
                  type="button"
                  className={`survey-bar ${index === activeSurvey ? "is-active" : ""}`}
                  onMouseEnter={() => setActiveSurvey(index)}
                  onFocus={() => setActiveSurvey(index)}
                  onClick={() => setActiveSurvey(index)}
                >
                  <span className="survey-label">{item.label}</span>
                  <span className="survey-track" aria-hidden="true">
                    <span className="survey-fill" style={{ width: `${item.value}%`, background: item.tone }} />
                  </span>
                  <span className="survey-value">{item.value}%</span>
                </button>
              ))}
            </div>

            <div className="survey-insight">
              <span className="survey-insight-label">Indicador principal</span>
              <strong>{activeMetric.label}</strong>
              <p>
                La experiencia de uso y la coordinación académica mejoran claramente cuando la disponibilidad se gestiona
                desde un único flujo centralizado.
              </p>
            </div>
          </div>
        </section>

        <section id="contacto" className="cta-section">
          <div className="cta-panel">
            <p>¿Listo para llevar la gestión de aulas al siguiente nivel?</p>
            <div className="cta-actions">
              <Link href="/login" className="btn btn-primary">
                Entrar
              </Link>
              <Link href="/registro" className="btn btn-ghost">
                Crear cuenta
              </Link>
            </div>
          </div>
        </section>
      </div>

      <footer className="site-footer">
        <div className="container footer-inner">
          <div className="footer-brand">
            <div className="brand-mark brand-mark-image">
              <img src="/logo-institucion.png" alt="Logo institucional" className="institutional-logo" />
              <strong>Reservas</strong>
            </div>
            <p>Sistema institucional para la gestión ordenada de aulas, horarios y reservas académicas.</p>
          </div>

          <div className="footer-links">
            <h4>Secciones</h4>
            <ul>
              <li><Link href="#top">Inicio</Link></li>
              <li><Link href="#funciones">Funciones</Link></li>
              <li><Link href="#equipo">Equipo</Link></li>
              <li><Link href="#contacto">Contacto</Link></li>
            </ul>
          </div>

          <div className="footer-links">
            <h4>Acceso</h4>
            <ul>
              <li><Link href="/login">Iniciar sesión</Link></li>
              <li><Link href="/registro">Registrarse</Link></li>
              <li><Link href="/dashboard">Panel</Link></li>
            </ul>
          </div>

          <div className="footer-links">
            <h4>Contacto</h4>
            <ul>
              <li>Gestión académica</li>
              <li>Coordinación institucional</li>
              <li>reservas@institucion.edu</li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="container footer-bottom-inner">
            <span>© 2026 Sistema de Reservas</span>
            <span>Prototipo académico · uso educativo y demostrativo · no oficial</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
