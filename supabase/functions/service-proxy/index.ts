import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader || "" } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Non autenticato" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, service, token } = await req.json();

    // Connect a service
    if (action === "connect") {
      if (!service || !token) {
        return new Response(JSON.stringify({ error: "service e token richiesti" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate token by fetching user info
      let displayName = "";
      if (service === "github") {
        const res = await fetch("https://api.github.com/user", {
          headers: { Authorization: `Bearer ${token}`, "User-Agent": "GemRock" },
        });
        if (!res.ok) {
          return new Response(JSON.stringify({ error: "Token GitHub non valido" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const ghUser = await res.json();
        displayName = ghUser.login;
      } else if (service === "vercel") {
        const res = await fetch("https://api.vercel.com/v2/user", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          return new Response(JSON.stringify({ error: "Token Vercel non valido" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const vUser = await res.json();
        displayName = vUser.user?.username || vUser.user?.name || "Vercel User";
      } else if (service === "supabase_ext") {
        // Supabase Management API
        const res = await fetch("https://api.supabase.com/v1/projects", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          return new Response(JSON.stringify({ error: "Token Supabase non valido" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        displayName = "Supabase Account";
      } else {
        return new Response(JSON.stringify({ error: "Servizio non supportato" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Upsert the service connection
      const { error: dbError } = await supabase.from("user_services").upsert(
        { user_id: user.id, service_name: service, access_token: token, display_name: displayName },
        { onConflict: "user_id,service_name" }
      );

      if (dbError) {
        return new Response(JSON.stringify({ error: dbError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, display_name: displayName }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // List projects from a connected service
    if (action === "list_projects") {
      const { data: svc } = await supabase
        .from("user_services")
        .select("access_token")
        .eq("user_id", user.id)
        .eq("service_name", service)
        .single();

      if (!svc) {
        return new Response(JSON.stringify({ error: "Servizio non collegato" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let projects: any[] = [];

      if (service === "github") {
        const res = await fetch("https://api.github.com/user/repos?sort=updated&per_page=30", {
          headers: { Authorization: `Bearer ${svc.access_token}`, "User-Agent": "GemRock" },
        });
        const repos = await res.json();
        projects = (repos || []).map((r: any) => ({
          id: r.id,
          name: r.full_name,
          description: r.description,
          url: r.html_url,
          updated_at: r.updated_at,
          language: r.language,
        }));
      } else if (service === "vercel") {
        const res = await fetch("https://api.vercel.com/v9/projects?limit=30", {
          headers: { Authorization: `Bearer ${svc.access_token}` },
        });
        const data = await res.json();
        projects = (data.projects || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          description: p.framework || "",
          url: `https://vercel.com/${p.accountId}/${p.name}`,
          updated_at: new Date(p.updatedAt).toISOString(),
        }));
      } else if (service === "supabase_ext") {
        const res = await fetch("https://api.supabase.com/v1/projects", {
          headers: { Authorization: `Bearer ${svc.access_token}` },
        });
        const data = await res.json();
        projects = (data || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          description: p.region || "",
          url: `https://supabase.com/dashboard/project/${p.id}`,
          updated_at: p.created_at,
        }));
      }

      return new Response(JSON.stringify({ projects }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Disconnect a service
    if (action === "disconnect") {
      await supabase.from("user_services").delete().eq("user_id", user.id).eq("service_name", service);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Azione non valida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Errore interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
