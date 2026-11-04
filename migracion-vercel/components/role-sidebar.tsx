"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { buildFullName, DEFAULT_AVATAR, resolveAvatarUrl } from "@/lib/profile-utils";

const adminMenu = [
  {
    title: "General",
    items: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Reservas", href: "/reservas" },
      { label: "Estadísticas", href: "/estadisticas" },
    ],
  },
  {
    title: "Gestión",
    items: [
      { label: "Aulas", href: "/aulas" },
      { label: "Usuarios", href: "/usuarios" },
      { label: "Reportes", href: "/reportes" },
    ],
  },
  {
    title: "Cuenta",
    items: [{ label: "Perfil", href: "/perfil" }],
  },
];

const professorMenu = [
  {
    title: "General",
    items: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Reservas", href: "/reservas" },
      { label: "Estadísticas", href: "/estadisticas" },
    ],
  },
  {
    title: "Cuenta",
    items: [{ label: "Perfil", href: "/perfil" }],
  },
];

const menuIcons: Record<string, ReactNode> = {
  Dashboard: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 18.5V10.5l8-6 8 6v8M7 18.5v-5h10v5" />
    </svg>
  ),
  Reservas: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M7 4.5V3.8M17 4.5V3.8M5.5 8.5h13M5.5 19h13a1.5 1.5 0 0 0 1.5-1.5V7.5A1.5 1.5 0 0 0 18.5 6h-13A1.5 1.5 0 0 0 4 7.5v10A1.5 1.5 0 0 0 5.5 19Z" />
    </svg>
  ),
  Estadísticas: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M5 18.5V11M10 18.5V7M15 18.5v-4M20 18.5V5" />
    </svg>
  ),
  Aulas: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4.5 19.5V8.5h15v11M7.5 8.5V5.5h9v3M8 12.5h8M8 15.5h8" />
    </svg>
  ),
  Usuarios: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M9 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm6 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM4.5 18.5c.8-2.1 2.6-3.3 4.5-3.3s3.7 1.2 4.5 3.3M14.7 18.5c.4-1.2 1.4-2.1 2.8-2.6" />
    </svg>
  ),
  Reportes: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M7 4.5h8l4 4v11a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 6 19.5v-13A1.5 1.5 0 0 1 7.5 5H7Zm8 0v4h4M8 13h8M8 16.5h6" />
    </svg>
  ),
  Perfil: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 12.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-6.5 6c.8-2.4 3.1-4 6.5-4s5.7 1.6 6.5 4" />
    </svg>
  ),
  Salir: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M9.5 7.5V5.8A1.8 1.8 0 0 1 11.3 4h6.9A1.8 1.8 0 0 1 20 5.8v12.4a1.8 1.8 0 0 1-1.8 1.8h-6.9a1.8 1.8 0 0 1-1.8-1.8v-1.7M4 12h11M12 8.5l3.5 3.5L12 15.5" />
    </svg>
  )
};

export default function RoleSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [role, setRole] = useState("Profesor");
  const [displayName, setDisplayName] = useState("Profesor");
  const [avatar, setAvatar] = useState(DEFAULT_AVATAR);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const syncSessionState = () => {
    const storedRole = window.localStorage.getItem("session-role") ?? "Profesor";
    const storedName = window.localStorage.getItem("session-name");
    const storedUserId = Number(window.localStorage.getItem("session-user-id") ?? 0);
    const storedAvatar = window.localStorage.getItem("session-avatar") ?? "";
    const storedUsers = JSON.parse(window.localStorage.getItem("cache-usuarios") ?? "[]") as Array<Record<string, any>>;

    setRole(storedRole);

    const matchedUser = storedUsers.find((user) => Number(user.id_usuario) === storedUserId);
    const nextName = storedName || (matchedUser ? buildFullName(matchedUser) : storedRole === "Superadministrador" ? "Admin" : "Profesor");
    const nextAvatar = storedAvatar || matchedUser?.avatar || DEFAULT_AVATAR;

    setDisplayName(nextName);
    setAvatar(resolveAvatarUrl(nextAvatar));
  };

  useEffect(() => {
    syncSessionState();
    window.addEventListener("session-updated", syncSessionState);

    return () => {
      window.removeEventListener("session-updated", syncSessionState);
    };
  }, []);

  const isAdmin = role === "Superadministrador";
  const menu = isAdmin ? adminMenu : professorMenu;

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    localStorage.removeItem("session-role");
    localStorage.removeItem("session-email");
    localStorage.removeItem("session-user-id");
    localStorage.removeItem("session-name");
    localStorage.removeItem("session-avatar");
    setShowLogoutModal(false);
    router.push("/login");
  };

  return (
    <>
      <aside className={`role-sidebar ${isAdmin ? "admin" : "profesor"} ${sidebarOpen ? "menu-open" : "menu-closed"}`}>
        <div className="sidebar-header">
          <div className="brand-box">
            <img src={avatar} alt="Avatar del usuario" className="institutional-logo" onError={(event) => { event.currentTarget.src = DEFAULT_AVATAR; }} />
            <div className="brand-box-copy">
              <strong>{isAdmin ? "Admin" : displayName}</strong>
              <small>{isAdmin ? "Coordinación" : "Docente"}</small>
            </div>
          </div>

          <button
            type="button"
            className="sidebar-toggle"
            onClick={() => setSidebarOpen((prev) => !prev)}
            aria-label={sidebarOpen ? "Ocultar menú" : "Mostrar menú"}
            title={sidebarOpen ? "Ocultar menú" : "Mostrar menú"}
          >
            <span className="sidebar-toggle-icon" aria-hidden="true">
              {sidebarOpen ? (
                <svg viewBox="0 0 24 24" focusable="false">
                  <path d="M15 6l-6 6 6 6" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" focusable="false">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              )}
            </span>
          </button>
        </div>

        <nav className="sidebar-menu" aria-label="Menú lateral principal">
          {menu.map((group) => (
            <div key={group.title} className="sidebar-section">
              <span className="sidebar-section-label">{group.title}</span>
              <div className="sidebar-group">
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  const icon = menuIcons[item.label] ?? menuIcons.Dashboard;

                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      className={`sidebar-item ${isActive ? "active" : ""}`}
                    >
                      <span className="sidebar-item-icon">{icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          <button type="button" className="sidebar-logout" onClick={handleLogout}>
            <span className="sidebar-item-icon">{menuIcons.Salir}</span>
            <span>Salir</span>
          </button>
        </nav>

        <div className="sidebar-legal">
          <strong>Proyecto Grado 11</strong>
          <span>Sistema de reservas académicas</span>
        </div>
      </aside>

      {showLogoutModal ? (
        <div className="logout-modal-backdrop" onClick={() => setShowLogoutModal(false)}>
          <div className="logout-modal" onClick={(event) => event.stopPropagation()}>
            <div className="logout-modal-header">
              <span className="logout-badge">Code</span>
              <button type="button" className="logout-close" onClick={() => setShowLogoutModal(false)} aria-label="Cerrar">×</button>
            </div>
            <p>¿Deseas cerrar sesión?</p>
            <div className="logout-actions">
              <button type="button" className="primary-button" onClick={confirmLogout}>Confirmar salida</button>
              <button type="button" className="secondary-button" onClick={() => setShowLogoutModal(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
