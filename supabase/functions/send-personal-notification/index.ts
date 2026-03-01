import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import nodemailer from "npm:nodemailer@6.9.12";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const smtpUser = Deno.env.get('SMTP_USER');
    const smtpPass = Deno.env.get('SMTP_PASS');

    if (!smtpUser || !smtpPass) {
      console.error('Missing SMTP_USER or SMTP_PASS secrets');
      return new Response(JSON.stringify({ error: 'Configurazione SMTP mancante' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: smtpUser, pass: smtpPass },
    });

    let recipient: string;
    let emailSubject: string;
    let emailBody: string;

    if (payload.type === 'welcome') {
      // Triggered automatically by database webhook on new user signup
      recipient = payload.email || smtpUser;
      const name = [payload.first_name, payload.last_name].filter(Boolean).join(' ') || 'Utente';
      emailSubject = `🎉 Benvenuto su GemRock, ${name}!`;
      emailBody = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; background: #1a1a2e; border-radius: 16px; color: #e0e0e0;">
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="font-size: 48px;">💎</span>
            <h1 style="color: #a78bfa; margin: 12px 0 4px;">Benvenuto su GemRock!</h1>
            <p style="color: #9ca3af; font-size: 14px;">Il tuo assistente AI personale</p>
          </div>
          <p style="font-size: 15px; line-height: 1.6;">
            Ciao <strong style="color: #a78bfa;">${name}</strong>,<br><br>
            Il tuo account è stato creato con successo. Ora puoi accedere a tutte le funzionalità di GemRock AI.
          </p>
          <div style="text-align: center; margin: 24px 0;">
            <span style="display: inline-block; padding: 10px 28px; background: linear-gradient(135deg, #7c3aed, #a78bfa); color: white; border-radius: 12px; font-weight: 600; font-size: 14px;">Inizia a chattare →</span>
          </div>
          <p style="color: #6b7280; font-size: 12px; text-align: center; margin-top: 20px;">
            Questa email è stata inviata automaticamente da GemRock App.
          </p>
        </div>
      `;
    } else {
      // Manual notification (button click or custom call)
      recipient = payload.to || smtpUser;
      emailSubject = payload.subject || 'Notifica App';
      emailBody = payload.body || 'Hai ricevuto una nuova notifica dalla tua app.';
    }

    const info = await transporter.sendMail({
      from: `"GemRock App" <${smtpUser}>`,
      to: recipient,
      subject: emailSubject,
      html: emailBody,
    });

    console.log('Email inviata:', info.messageId, 'to:', recipient, 'type:', payload.type || 'manual');

    return new Response(JSON.stringify({ success: true, messageId: info.messageId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Errore invio email:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
