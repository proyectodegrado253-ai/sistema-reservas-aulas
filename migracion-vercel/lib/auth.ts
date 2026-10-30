export const ADMIN_ROLE = "Superadministrador";
export const PROFESSOR_ROLE = "Profesor";

export const DEMO_USERS = {
  "admin@sistema.com": {
    password: "admin123",
    id_usuario: 1,
    nombre: "Admin",
    apellido: "Sistema",
    id_rol: 1,
    role: ADMIN_ROLE,
  },
  "profesor@sistema.com": {
    password: "profesor123",
    id_usuario: 2,
    nombre: "Profesor",
    apellido: "Asignado",
    id_rol: 2,
    role: PROFESSOR_ROLE,
  },
} as const;

export function getDemoUser(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = DEMO_USERS[normalizedEmail as keyof typeof DEMO_USERS];
  if (!user || user.password !== password) {
    return null;
  }

  return user;
}

export function getSessionState() {
  if (typeof window === "undefined") {
    return { role: null, email: "", userId: null };
  }

  return {
    role: localStorage.getItem("session-role"),
    email: (localStorage.getItem("session-email") ?? "").trim().toLowerCase(),
    userId: localStorage.getItem("session-user-id"),
  };
}

export function getSessionUserId() {
  const { userId } = getSessionState();
  return userId ? Number(userId) : null;
}

export function isAdminSession() {
  const { role, email } = getSessionState();
  return role === ADMIN_ROLE && Boolean(email);
}

export function isProfessorSession() {
  const { role, email } = getSessionState();
  return role === PROFESSOR_ROLE && Boolean(email);
}

export function isAuthenticatedRole(role: string | null) {
  return role === ADMIN_ROLE || role === PROFESSOR_ROLE;
}

export function canAccessRoute(pathname: string, role: string | null) {
  const normalizedPath = pathname.split("?")[0].replace(/\/$/, "") || "/";

  const adminRoutes = ["/admin", "/aulas", "/usuarios", "/reportes"];
  const professorRoutes = ["/dashboard", "/estadisticas", "/horarios", "/reservas", "/perfil"];

  if (role === ADMIN_ROLE) {
    return true;
  }

  if (role === PROFESSOR_ROLE) {
    return professorRoutes.includes(normalizedPath) || normalizedPath === "/login" || normalizedPath === "/";
  }

  return normalizedPath === "/login" || normalizedPath === "/";
}
