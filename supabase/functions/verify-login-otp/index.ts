import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { email, otp, userId } = await req.json();

    if (!email || !otp || !userId) {
      return new Response(JSON.stringify({ error: 'Dati mancanti' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify OTP
    const { data: otpRecord, error: fetchErr } = await supabase
      .from('email_otps')
      .select('*')
      .eq('email', email)
      .eq('otp_code', otp)
      .single();

    if (fetchErr || !otpRecord) {
      return new Response(JSON.stringify({ error: 'Codice OTP non valido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (new Date(otpRecord.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'Codice OTP scaduto' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate a session for the user using admin API
    // We use generateLink to create a magic link token, then exchange it
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
    });

    if (linkError || !linkData) {
      console.error('Generate link error:', linkError);
      return new Response(JSON.stringify({ error: 'Errore generazione sessione' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract the token from the link and verify it to get a session
    const token = linkData.properties?.hashed_token;
    if (!token) {
      // Fallback: verify OTP via Supabase auth
      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        email: email,
        token: token || '',
        type: 'magiclink',
      });

      if (verifyError || !verifyData.session) {
        console.error('Verify OTP error:', verifyError);
        return new Response(JSON.stringify({ error: 'Errore verifica sessione' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await supabase.from('email_otps').delete().eq('email', email);
      return new Response(JSON.stringify({
        success: true,
        access_token: verifyData.session.access_token,
        refresh_token: verifyData.session.refresh_token,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify the magic link token to create a session
    const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
      email: email,
      token: token,
      type: 'magiclink',
    });

    if (verifyError || !verifyData.session) {
      console.error('Verify error:', verifyError);
      return new Response(JSON.stringify({ error: 'Errore creazione sessione' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Clean up OTP
    await supabase.from('email_otps').delete().eq('email', email);

    return new Response(JSON.stringify({
      success: true,
      access_token: verifyData.session.access_token,
      refresh_token: verifyData.session.refresh_token,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Verify login OTP error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Errore sconosciuto' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
