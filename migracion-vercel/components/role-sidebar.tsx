"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { buildFullName, DEFAULT_AVATAR, resolveAvatarUrl } from "@/lib/profile-utils";

const adminMenu = [
  { label: "Home", href: "/admin" },
  { label: "Dashboard", href: "/admin" },
  { label: "Reservas", href: "/reservas" },
  { label: "Aulas", href: "/aulas" },
  { label: "Usuarios", href: "/usuarios" },
  { label: "Horarios", href: "/horarios" },
  { label: "Reportes", href: "/reportes" },
  { label: "Perfil", href: "/perfil" },
];

const professorMenu = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Reservas", href: "/reservas" },
  { label: "Horarios", href: "/horarios" },
  { label: "Perfil", href: "/perfil" },
];

export default function RoleSidebar() {
  const router = useRouter();
  const [role, setRole] = useState("Profesor");
  const [displayName, setDisplayName] = useState("Profesor");
  const [avatar, setAvatar] = useState(DEFAULT_AVATAR);
  const [menuOpen, setMenuOpen] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

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
      <aside className={`role-sidebar ${isAdmin ? "admin" : "profesor"} ${menuOpen ? "menu-open" : "menu-closed"}`}>
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
            aria-label="Alternar menú"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
          >
            ☰
          </button>
        </div>

        <nav className={`sidebar-menu ${menuOpen ? "open" : ""}`} aria-label="Menú lateral principal">
          {menu.map((item) => (
            <Link key={item.label} href={item.href} className="sidebar-item" onClick={() => setMenuOpen(false)}>
              {item.label}
            </Link>
          ))}

          <button type="button" className="sidebar-logout" onClick={handleLogout}>
            SALIR
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
