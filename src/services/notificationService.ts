import { supabase } from "@/integrations/supabase/client";

interface NotificationOptions {
  subject?: string;
  body?: string;
  to?: string;
}

export async function sendPersonalNotification(options: NotificationOptions = {}) {
  const { data, error } = await supabase.functions.invoke('send-personal-notification', {
    body: {
      subject: options.subject || 'Notifica App',
      body: options.body || 'Hai ricevuto una nuova notifica dalla tua app.',
      to: options.to,
    },
  });

  if (error) {
    console.error('Errore invio notifica:', error);
    throw error;
  }

  return data;
}
