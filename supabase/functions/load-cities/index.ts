// One-time loader for new environments: imports GeoNames cities15000 (CC BY 4.0) into public.cities.
// Deploy, set the LOAD_CITIES_TOKEN secret, call once with header `x-load-token`, then delete the function.
//   supabase functions deploy load-cities --no-verify-jwt
//   supabase secrets set LOAD_CITIES_TOKEN=$(openssl rand -hex 24)
//   curl -X POST https://<ref>.supabase.co/functions/v1/load-cities -H "x-load-token: <token>"
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { unzipSync } from "npm:fflate@0.8.2";

Deno.serve(async (req: Request) => {
  const token = Deno.env.get("LOAD_CITIES_TOKEN");
  if (!token || req.headers.get("x-load-token") !== token) {
    return new Response(JSON.stringify({ error: "unauthorised" }), { status: 401 });
  }
  const res = await fetch("https://download.geonames.org/export/dump/cities15000.zip");
  if (!res.ok) return new Response(JSON.stringify({ error: "download_failed", status: res.status }), { status: 502 });
  const files = unzipSync(new Uint8Array(await res.arrayBuffer()));
  const text = new TextDecoder().decode(files["cities15000.txt"]);
  const rows = text
    .split("\n")
    .filter((l) => l.trim())
    .map((line) => {
      const f = line.split("\t");
      return {
        id: Number(f[0]),
        name: f[1].slice(0, 200),
        ascii_name: (f[2] || f[1]).slice(0, 200),
        country_code: f[8],
        admin_code: f[10] || null,
        population: Number(f[14]) || 0,
        location: `SRID=4326;POINT(${Number(f[5])} ${Number(f[4])})`,
      };
    })
    .filter((r) => /^[A-Z]{2}$/.test(r.country_code) && Number.isFinite(r.id));

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  let loaded = 0;
  for (let i = 0; i < rows.length; i += 1000) {
    const batch = rows.slice(i, i + 1000);
    const { error } = await sb.from("cities").upsert(batch, { onConflict: "id" });
    if (error) return new Response(JSON.stringify({ error: error.message, at: i, loaded }), { status: 500 });
    loaded += batch.length;
  }
  return new Response(JSON.stringify({ loaded, total: rows.length }), { headers: { "Content-Type": "application/json" } });
});
