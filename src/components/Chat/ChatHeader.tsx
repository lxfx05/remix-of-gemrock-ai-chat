import { Menu, LogIn, Bell } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { sendPersonalNotification } from '@/services/notificationService';
import { toast } from 'sonner';
import { useState } from 'react';

interface ChatHeaderProps {
  onToggleSidebar: () => void;
  onLogin?: () => void;
}

function NotifyButton() {
  const [sending, setSending] = useState(false);

  const handleTest = async () => {
    setSending(true);
    try {
      await sendPersonalNotification({
        subject: '🔔 Test Notifica GemRock',
        body: '<h2>Ciao!</h2><p>Questa è una notifica di test inviata dalla tua app <strong>GemRock</strong>.</p><p style="color:#888;font-size:12px;">Inviata il ' + new Date().toLocaleString('it-IT') + '</p>',
      });
      toast.success('Email di test inviata! Controlla la inbox.');
    } catch {
      toast.error('Errore nell\'invio della notifica');
    }
    setSending(false);
  };

  return (
    <button
      onClick={handleTest}
      disabled={sending}
      className="p-2 rounded-xl hover:bg-secondary transition-all active:scale-95 text-muted-foreground hover:text-foreground disabled:opacity-50"
      title="Invia notifica email di test"
    >
      <Bell size={18} className={sending ? 'animate-pulse' : ''} />
    </button>
  );
}

export function ChatHeader({ onToggleSidebar, onLogin }: ChatHeaderProps) {
  const { user } = useAuth();
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

  return (
    <header className="flex items-center justify-between px-3 sm:px-4 md:px-6 py-3 border-b border-border bg-card/80 backdrop-blur-xl">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl hover:bg-secondary transition-all active:scale-95 text-muted-foreground hover:text-foreground"
        >
          <Menu size={20} />
        </button>
        <div className="w-9 h-9 rounded-xl gemrock-gradient flex items-center justify-center gemrock-glow shrink-0">
          <span className="text-lg">💎</span>
        </div>
        <div className="min-w-0">
          <h1 className="text-base font-semibold tracking-tight text-foreground leading-tight">GemRock</h1>
          <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">● Online</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {user && <NotifyButton />}
        {user && avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Profile"
            className="w-8 h-8 rounded-full border-2 border-primary/30 hover:border-primary transition-all cursor-pointer"
            onClick={onToggleSidebar}
          />
        ) : user ? (
          <div
            className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary cursor-pointer hover:bg-primary/30 transition-all"
            onClick={onToggleSidebar}
          >
            {user.user_metadata?.first_name?.[0] || user.email?.[0]?.toUpperCase() || '?'}
          </div>
        ) : (
          <button
            onClick={onLogin}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:brightness-110 transition-all active:scale-95"
          >
            <LogIn size={14} />
            Accedi
          </button>
        )}
      </div>
    </header>
  );
}
