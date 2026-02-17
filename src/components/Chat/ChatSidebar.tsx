import { useState, useEffect } from 'react';
import { X, Plus, MessageSquare, Settings, LogOut, Trash2, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

type Conversation = {
  id: string;
  title: string;
  mode: string;
  updated_at: string;
};

interface ChatSidebarProps {
  open: boolean;
  onClose: () => void;
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
}

export function ChatSidebar({ open, onClose, activeConversationId, onSelectConversation, onNewChat }: ChatSidebarProps) {
  const { user, signOut, getUserName } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeTab, setActiveTab] = useState<'history' | 'settings'>('history');
  const userName = getUserName();
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

  useEffect(() => {
    if (user && open) loadConversations();
  }, [user, open]);

  const loadConversations = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('conversations')
      .select('id, title, mode, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(50);
    if (data) setConversations(data);
  };

  const deleteConversation = async (id: string) => {
    await supabase.from('conversations').delete().eq('id', id);
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeConversationId === id) onNewChat();
  };

  const handleSignOut = async () => {
    await signOut();
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40 animate-fade-in"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-72 bg-card border-r border-border z-50 flex flex-col transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-9 h-9 rounded-full border border-border" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                {userName?.[0]?.toUpperCase() || '?'}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{userName || 'Utente'}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground">
            <X size={18} />
          </button>
        </div>

        {/* New Chat button */}
        <button
          onClick={() => { onNewChat(); onClose(); }}
          className="mx-3 mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 transition-all active:scale-[0.98]"
        >
          <Plus size={16} />
          Nuova Chat
        </button>

        {/* Tabs */}
        <div className="flex bg-secondary mx-3 mt-3 rounded-xl p-0.5">
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition-all ${
              activeTab === 'history' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
            }`}
          >
            <Clock size={12} />
            Cronologia
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition-all ${
              activeTab === 'settings' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
            }`}
          >
            <Settings size={12} />
            Impostazioni
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin mt-2 px-2">
          {activeTab === 'history' ? (
            <div className="space-y-1">
              {conversations.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare size={32} className="mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-xs text-muted-foreground">Nessuna conversazione</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                      activeConversationId === conv.id
                        ? 'bg-primary/10 text-foreground'
                        : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
                    }`}
                    onClick={() => { onSelectConversation(conv.id); onClose(); }}
                  >
                    <MessageSquare size={14} className="shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{conv.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {conv.mode === 'online' ? '🟢' : '⚫'} {new Date(conv.updated_at).toLocaleDateString('it-IT')}
                      </p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                      className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-2 p-2">
              <div className="bg-secondary rounded-xl p-4">
                <h3 className="text-xs font-semibold text-foreground mb-2">Account</h3>
                <p className="text-[11px] text-muted-foreground">{user?.email || 'Non connesso'}</p>
                {user?.user_metadata?.phone && (
                  <p className="text-[11px] text-muted-foreground mt-1">📱 {user.user_metadata.phone}</p>
                )}
              </div>
              <div className="bg-secondary rounded-xl p-4">
                <h3 className="text-xs font-semibold text-foreground mb-2">Informazioni</h3>
                <p className="text-[11px] text-muted-foreground">GemRock AI v1.0</p>
                <p className="text-[11px] text-muted-foreground mt-1">Assistente AI personale</p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom actions */}
        {user && (
          <div className="p-3 border-t border-border">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive text-sm transition-all"
            >
              <LogOut size={16} />
              Esci
            </button>
          </div>
        )}
      </div>
    </>
  );
}
