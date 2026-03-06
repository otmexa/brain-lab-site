const SUPABASE_JS_CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

let runtimeConfigPromise;
let supabasePromise;

const fetchRuntimeConfig = async () => {
  const response = await fetch("/api/public-config", {
    headers: {
      Accept: "application/json",
    },
  });

  const payload = await response.json();

  if (!response.ok || !payload.configured) {
    const missing = Array.isArray(payload.missing) ? payload.missing.join(", ") : "unknown variables";
    throw new Error(`Supabase runtime config missing: ${missing}`);
  }

  return {
    supabaseUrl: payload.supabaseUrl,
    supabasePublishableKey: payload.supabasePublishableKey,
    supabaseStorageBucket: payload.supabaseStorageBucket || "brain-lab-assets",
  };
};

export const loadRuntimeConfig = async () => {
  runtimeConfigPromise ||= fetchRuntimeConfig();
  return runtimeConfigPromise;
};

export const loadSupabase = async () => {
  supabasePromise ||= (async () => {
    const [{ createClient }, config] = await Promise.all([
      import(SUPABASE_JS_CDN),
      loadRuntimeConfig(),
    ]);

    return {
      config,
      client: createClient(config.supabaseUrl, config.supabasePublishableKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      }),
    };
  })();

  return supabasePromise;
};
