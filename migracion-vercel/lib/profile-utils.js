const DEFAULT_AVATAR = "/default-avatar.svg";

function normalizeText(value) {
  return String(value ?? "").trim();
}

function buildFullName(user) {
  const nombre = normalizeText(user?.nombre);
  const apellido = normalizeText(user?.apellido);
  return [nombre, apellido].filter(Boolean).join(" ") || "Profesor";
}

function resolveAvatarUrl(value) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return DEFAULT_AVATAR;
  }

  if (/^https?:\/\//i.test(normalized) || normalized.startsWith("data:") || normalized.startsWith("/")) {
    return normalized;
  }

  const withoutPrefix = normalized.replace(/^\.\//, "").replace(/^\.\.\//, "");

  if (withoutPrefix.startsWith("img/")) {
    return `/${withoutPrefix}`;
  }

  return `/${withoutPrefix.replace(/^\/+/, "")}`;
}

module.exports = {
  DEFAULT_AVATAR,
  buildFullName,
  normalizeText,
  resolveAvatarUrl,
};
