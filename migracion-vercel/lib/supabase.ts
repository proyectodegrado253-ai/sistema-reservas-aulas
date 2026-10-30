import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

const isPlaceholderValue = (value: string | undefined) => {
  if (typeof value !== "string") return true;
  const normalized = value.trim().toLowerCase();
  return (
    normalized.length === 0 ||
    normalized.includes("tu-proyecto") ||
    normalized.includes("tu_anon_key") ||
    normalized.includes("tu-url") ||
    normalized.includes("example") ||
    normalized.includes("placeholder")
  );
};

const isDashboardUrl = (value: string | undefined) => {
  if (typeof value !== "string") return false;
  const normalized = value.trim();
  return /https:\/\/supabase\.com\/dashboard\/project\//i.test(normalized);
};

const normalizeSupabaseUrl = (value: string | undefined) => {
  if (typeof value !== "string") return "";

  const trimmed = value.trim().replace(/\/rest\/v1\/?$/i, "").replace(/\/+$/, "");
  const dashboardMatch = trimmed.match(/^https:\/\/supabase\.com\/dashboard\/project\/([a-z0-9-]+)(?:\/.*)?$/i);
  if (dashboardMatch) {
    return `https://${dashboardMatch[1]}.supabase.co`;
  }

  const projectUrlMatch = trimmed.match(/^https:\/\/([a-z0-9-]+)\.supabase\.co(?:\/.*)?$/i);
  if (projectUrlMatch) {
    return `https://${projectUrlMatch[1]}.supabase.co`;
  }

  const bareProjectRef = trimmed.match(/^([a-z0-9-]{8,64})$/i);
  if (bareProjectRef) {
    return `https://${bareProjectRef[1]}.supabase.co`;
  }

  return trimmed;
};

const resolvedSupabaseUrl = normalizeSupabaseUrl(supabaseUrl);
const resolvedSupabaseAnonKey = typeof supabaseAnonKey === "string" ? supabaseAnonKey.trim() : "";

const hasPlaceholderCredentials = isPlaceholderValue(resolvedSupabaseUrl) || isPlaceholderValue(resolvedSupabaseAnonKey);
const requiresValidCredentials = hasPlaceholderCredentials;

const isValidSupabaseUrl = (value: string | undefined) => {
  if (typeof value !== "string") return false;

  const normalized = normalizeSupabaseUrl(value);
  return /^https:\/\/[a-z0-9-]+\.supabase\.co(?:\/rest\/v1)?\/?$/i.test(normalized.trim());
};

export const supabase =
  !requiresValidCredentials && isValidSupabaseUrl(supabaseUrl) && resolvedSupabaseAnonKey.length > 0
    ? createClient(resolvedSupabaseUrl, resolvedSupabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      })
    : null;

export type SupabaseConnectionStatus = {
  enabled: boolean;
  reason: string | null;
  message: string;
};

export function getSupabaseStatus(): SupabaseConnectionStatus {
  const hasMissingEnv = !resolvedSupabaseUrl || !resolvedSupabaseAnonKey;
  const hasDashboardUrl = isDashboardUrl(resolvedSupabaseUrl);
  const hasInvalidUrl = Boolean(resolvedSupabaseUrl) && !isValidSupabaseUrl(resolvedSupabaseUrl);

  if (requiresValidCredentials) {
    return {
      enabled: false,
      reason: "invalid-credentials",
      message:
        "La configuración de Supabase no es válida. Revisa SUPABASE_URL y SUPABASE_ANON_KEY (o NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY si las usas en cliente).",
    };
  }

  if (hasDashboardUrl) {
    return {
      enabled: false,
      reason: "dashboard-url",
      message:
        "Estás usando la URL del dashboard de Supabase, no la URL del proyecto. Debe ser algo como https://<ref>.supabase.co, no https://supabase.com/dashboard/project/<ref>.",
    };
  }

  if (hasMissingEnv) {
    return {
      enabled: false,
      reason: "missing-env",
      message:
        "Supabase no está configurado: faltan SUPABASE_URL y/o SUPABASE_ANON_KEY. También puedes usar NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY si la app lo requiere.",
    };
  }

  if (hasInvalidUrl) {
    return {
      enabled: false,
      reason: "invalid-url",
      message:
        "La URL de Supabase no es válida. Revisa SUPABASE_URL antes de intentar guardar reservas o usuarios reales.",
    };
  }

  if (!supabase) {
    return {
      enabled: false,
      reason: "client-unavailable",
      message:
        "Supabase no pudo inicializarse. Revisa la configuración del proyecto y las credenciales de anon key.",
    };
  }

  return {
    enabled: true,
    reason: null,
    message: "Supabase conectado y listo para guardar datos reales.",
  };
}

export const supabaseStatus = getSupabaseStatus();
export const isSupabaseConfigured = supabaseStatus.enabled;

export async function checkSupabaseConnection() {
  const status = getSupabaseStatus();

  if (!status.enabled) {
    return {
      ok: false,
      error: status.message,
    };
  }

  try {
    const { error } = await supabase!.from("roles").select("id_rol", { count: "exact", head: true });
    if (error) {
      return {
        ok: false,
        error: error.message,
      };
    }

    return { ok: true, error: null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "No fue posible conectar con Supabase.",
    };
  }
}
