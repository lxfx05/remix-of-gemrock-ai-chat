import { Wifi, WifiOff, LogOut, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface ChatHeaderProps {
  mode: 'online' | 'offline';
  onModeChange: (mode: 'online' | 'offline') => void;
}

export function ChatHeader({ mode, onModeChange }: ChatHeaderProps) {
  const { user, signOut, getUserName } = useAuth();
  const userName = getUserName();

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl gemrock-gradient flex items-center justify-center gemrock-glow">
          <span className="text-lg">💎</span>
        </div>
        <div>
          <h1 className="text-base font-semibold tracking-tight text-foreground">GemRock</h1>
          <p className="text-[11px] text-muted-foreground">
            {mode === 'online' ? 'Mixtral 8x7B' : 'Vault Mode'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Mode Toggle */}
        <div className="flex items-center bg-secondary rounded-full p-0.5">
          <button
            onClick={() => onModeChange('online')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              mode === 'online'
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Wifi size={12} />
            ONLINE
          </button>
          <button
            onClick={() => onModeChange('offline')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              mode === 'offline'
                ? 'bg-gemrock-zinc text-foreground shadow-md'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <WifiOff size={12} />
            OFFLINE
          </button>
        </div>

        {/* User info */}
        {user && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center">
              <User size={14} className="text-muted-foreground" />
            </div>
            {userName && (
              <span className="text-xs text-muted-foreground hidden sm:block">{userName}</span>
            )}
            <button
              onClick={signOut}
              className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
              title="Esci"
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
