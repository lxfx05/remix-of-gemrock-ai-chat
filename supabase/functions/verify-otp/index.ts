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

    const { email, otp } = await req.json();

    if (!email || !otp) {
      return new Response(JSON.stringify({ error: 'Email e codice OTP sono obbligatori' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find OTP record
    const { data: otpRecord, error: fetchErr } = await supabase
      .from('email_otps')
      .select('*')
      .eq('email', email)
      .eq('otp_code', otp)
      .eq('verified', false)
      .single();

    if (fetchErr || !otpRecord) {
      return new Response(JSON.stringify({ error: 'Codice OTP non valido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check expiry
    if (new Date(otpRecord.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'Codice OTP scaduto. Richiedine uno nuovo.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create user account with auto-confirm since OTP was verified
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: otpRecord.email,
      password: otpRecord.password_hash,
      email_confirm: true,
      user_metadata: {
        first_name: otpRecord.first_name,
        last_name: otpRecord.last_name,
        full_name: `${otpRecord.first_name} ${otpRecord.last_name}`,
        phone: otpRecord.phone,
      },
    });

    if (authError) {
      console.error('Auth create error:', authError);
      return new Response(JSON.stringify({ error: authError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Save lead data
    if (authData.user) {
      await supabase.from('leads').insert({
        user_id: authData.user.id,
        first_name: otpRecord.first_name,
        last_name: otpRecord.last_name,
        phone: otpRecord.phone,
      });
    }

    // Clean up OTP
    await supabase.from('email_otps').delete().eq('email', email);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Account creato con successo!' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Verify OTP error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Errore sconosciuto' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
