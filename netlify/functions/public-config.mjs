const jsonHeaders = {
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
};

export const config = {
  path: "/api/public-config",
};

export default async () => {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY?.trim();
  const supabaseStorageBucket = process.env.SUPABASE_STORAGE_BUCKET?.trim() || "brain-lab-assets";
  const missing = [];

  if (!supabaseUrl) {
    missing.push("SUPABASE_URL");
  }

  if (!supabasePublishableKey) {
    missing.push("SUPABASE_PUBLISHABLE_KEY");
  }

  if (missing.length > 0) {
    return new Response(
      JSON.stringify({
        configured: false,
        missing,
      }),
      {
        status: 500,
        headers: jsonHeaders,
      },
    );
  }

  return new Response(
    JSON.stringify({
      configured: true,
      supabaseUrl,
      supabasePublishableKey,
      supabaseStorageBucket,
    }),
    {
      status: 200,
      headers: jsonHeaders,
    },
  );
};
