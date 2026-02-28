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
    const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');
    console.log('BREVO_API_KEY configured:', !!BREVO_API_KEY);
    if (!BREVO_API_KEY) throw new Error('BREVO_API_KEY not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { email } = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ error: 'Email obbligatoria' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Delete old OTPs for this email
    await supabase.from('email_otps').delete().eq('email', email);

    // Store OTP
    const { error: insertError } = await supabase.from('email_otps').insert({
      email,
      otp_code: otp,
      expires_at: expiresAt.toISOString(),
    });

    if (insertError) {
      console.error('OTP insert error:', insertError);
      return new Response(JSON.stringify({ error: 'Errore nel salvataggio OTP' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send OTP email via Brevo
    const emailRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'GemRock', email: 'noreply@gemrock.ai' },
        to: [{ email }],
        subject: `${otp} - Verifica accesso GemRock`,
        htmlContent: `
          <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 32px; background: #0a0a0a; color: #f0f0f0; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <span style="font-size: 48px;">💎</span>
              <h1 style="font-size: 20px; margin: 8px 0 4px;">GemRock AI</h1>
              <p style="color: #888; font-size: 13px;">Verifica di sicurezza</p>
            </div>
            <div style="background: #1a1a1a; border-radius: 12px; padding: 24px; text-align: center;">
              <p style="color: #888; font-size: 13px; margin-bottom: 12px;">Il tuo codice di verifica è:</p>
              <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #3b82f6;">${otp}</div>
              <p style="color: #666; font-size: 11px; margin-top: 16px;">Valido per 10 minuti</p>
            </div>
            <p style="color: #666; font-size: 11px; text-align: center; margin-top: 16px;">Se non hai richiesto questo codice, ignora questa email.</p>
          </div>
        `,
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error('Brevo error:', errText);
      return new Response(JSON.stringify({ error: "Errore nell'invio email" }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Send login OTP error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Errore sconosciuto' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
