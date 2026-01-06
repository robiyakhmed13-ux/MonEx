// Safe localStorage helpers
export const safeJSON = {
  get<T>(key: string, fallback: T): T {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch {
      return fallback;
    }
  },
  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      console.warn('Failed to save to localStorage');
    }
  },
};

// Unique ID generator
export const uid = () => Math.random().toString(16).slice(2) + Date.now().toString(16);

// Date helpers
export const todayISO = () => new Date().toISOString().slice(0, 10);

export const startOfWeekISO = () => {
  const d = new Date();
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
};

export const monthPrefix = () => new Date().toISOString().slice(0, 7);

// Number formatting
export const formatUZS = (n: number | null | undefined) => {
  const amount = Number(n || 0);
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) return `${(amount / 1_000_000).toFixed(1).replace(".0", "")}M`;
  return new Intl.NumberFormat("uz-UZ").format(amount).split(",").join(" ");
};

export const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

// Supabase REST helper
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

export const sb = {
  enabled: () => !!SUPABASE_URL && !!SUPABASE_KEY,
  async req(path: string, { method = "GET", body }: { method?: string; body?: unknown } = {}) {
    const url = `${SUPABASE_URL}/rest/v1/${path}`;
    const headers: Record<string, string> = {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
    };
    if (method === "POST") headers.Prefer = "return=representation";
    if (method === "PATCH") headers.Prefer = "return=representation";

    const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const txt = await res.text();
    let json = null;
    try {
      json = txt ? JSON.parse(txt) : null;
    } catch {
      json = null;
    }
    if (!res.ok) {
      const err = new Error("Supabase request failed") as Error & { status: number; payload: unknown };
      err.status = res.status;
      err.payload = json || txt;
      throw err;
    }
    return json;
  },
};
