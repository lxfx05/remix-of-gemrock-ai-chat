import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function validatePassword(password: string, email: string): string | null {
  if (password.length < 8) return 'La password deve avere almeno 8 caratteri';
  if (!/[A-Z]/.test(password)) return 'La password deve contenere almeno una lettera maiuscola';
  if (!/[a-z]/.test(password)) return 'La password deve contenere almeno una lettera minuscola';
  if (!/[0-9]/.test(password)) return 'La password deve contenere almeno un numero';
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) return 'La password deve contenere almeno un carattere speciale';
  const emailLocal = email.split('@')[0].toLowerCase();
  if (emailLocal.length >= 3 && password.toLowerCase().includes(emailLocal)) {
    return 'La password non può contenere il tuo indirizzo email';
  }
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');
    if (!BREVO_API_KEY) throw new Error('BREVO_API_KEY not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { email, otp, newPassword, action } = await req.json();

    // Step 1: Send reset OTP
    if (action === 'send') {
      if (!email) {
        return new Response(JSON.stringify({ error: 'Email obbligatoria' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: users } = await supabase.auth.admin.listUsers();
      const userExists = users?.users?.some(u => u.email === email);
      if (!userExists) {
        return new Response(JSON.stringify({ error: 'Email non registrata. Vuoi registrarti invece?', notFound: true }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await supabase.from('email_otps').delete().eq('email', email);
      await supabase.from('email_otps').insert({
        email,
        otp_code: otpCode,
        expires_at: expiresAt.toISOString(),
      });

      const emailRes = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': BREVO_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'GemRock', email: 'noreply@gemrock.ai' },
          to: [{ email }],
          subject: `${otpCode} - Reset Password GemRock`,
          htmlContent: `
            <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 32px; background: #0a0a0a; color: #f0f0f0; border-radius: 16px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <span style="font-size: 48px;">💎</span>
                <h1 style="font-size: 20px; margin: 8px 0 4px;">GemRock AI</h1>
                <p style="color: #888; font-size: 13px;">Reset della password</p>
              </div>
              <div style="background: #1a1a1a; border-radius: 12px; padding: 24px; text-align: center;">
                <p style="color: #888; font-size: 13px; margin-bottom: 12px;">Il tuo codice di reset è:</p>
                <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #3b82f6;">${otpCode}</div>
                <p style="color: #666; font-size: 11px; margin-top: 16px;">Valido per 10 minuti</p>
              </div>
              <p style="color: #666; font-size: 11px; text-align: center; margin-top: 16px;">Se non hai richiesto il reset, ignora questa email.</p>
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
    }

    // Step 2: Verify OTP and update password
    if (action === 'reset') {
      if (!email || !otp || !newPassword) {
        return new Response(JSON.stringify({ error: 'Tutti i campi sono obbligatori' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Validate new password
      const pwError = validatePassword(newPassword, email);
      if (pwError) {
        return new Response(JSON.stringify({ error: pwError }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: otpRecord, error: fetchErr } = await supabase
        .from('email_otps')
        .select('*')
        .eq('email', email)
        .eq('otp_code', otp)
        .single();

      if (fetchErr || !otpRecord) {
        return new Response(JSON.stringify({ error: 'Codice non valido' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (new Date(otpRecord.expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: 'Codice scaduto' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: users } = await supabase.auth.admin.listUsers();
      const targetUser = users?.users?.find(u => u.email === email);
      if (!targetUser) {
        return new Response(JSON.stringify({ error: 'Utente non trovato' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error: updateErr } = await supabase.auth.admin.updateUserById(targetUser.id, {
        password: newPassword,
      });

      if (updateErr) {
        return new Response(JSON.stringify({ error: updateErr.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await supabase.from('email_otps').delete().eq('email', email);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Azione non valida' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Reset password error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Errore sconosciuto' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
