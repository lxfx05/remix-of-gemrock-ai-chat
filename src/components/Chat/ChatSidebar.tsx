import { useState, useEffect } from 'react';
import { X, Plus, MessageSquare, Settings, LogOut, Trash2, Clock, FileText, Link2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ServicesPanel } from '../Services/ServicesPanel';

type Conversation = {
  id: string;
  title: string;
  mode: string;
  updated_at: string;
};

type UserFile = {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  created_at: string;
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
  const [activeTab, setActiveTab] = useState<'history' | 'services' | 'files' | 'settings'>('history');
  const [userFiles, setUserFiles] = useState<UserFile[]>([]);
  const userName = getUserName();
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

  useEffect(() => {
    if (user && open) {
      loadConversations();
      loadFiles();
    }
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

  const loadFiles = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_files')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setUserFiles(data);
  };

  const deleteConversation = async (id: string) => {
    await supabase.from('conversations').delete().eq('id', id);
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeConversationId === id) onNewChat();
  };

  const deleteFile = async (id: string, fileUrl: string) => {
    const urlParts = fileUrl.split('/chat-files/');
    if (urlParts[1]) {
      await supabase.storage.from('chat-files').remove([urlParts[1]]);
    }
    await supabase.from('user_files').delete().eq('id', id);
    setUserFiles(prev => prev.filter(f => f.id !== id));
    toast.success('File eliminato');
  };

  const handleSignOut = async () => {
    await signOut();
    onClose();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const tabs = [
    { key: 'history' as const, icon: Clock, label: 'Chat' },
    { key: 'services' as const, icon: Link2, label: 'Servizi' },
    { key: 'files' as const, icon: FileText, label: 'File' },
    { key: 'settings' as const, icon: Settings, label: 'Info' },
  ];

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40 animate-fade-in"
          onClick={onClose}
        />
      )}

      <div
        className={`fixed top-0 left-0 h-full w-[280px] sm:w-80 bg-card border-r border-border z-50 flex flex-col transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-border">
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

        {/* New Chat */}
        <button
          onClick={() => { onNewChat(); onClose(); }}
          className="mx-3 mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 transition-all active:scale-[0.98]"
        >
          <Plus size={16} />
          Nuova Chat
        </button>

        {/* Tabs */}
        <div className="flex bg-secondary mx-3 mt-3 rounded-xl p-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1 py-2 text-[10px] sm:text-[11px] font-medium rounded-lg transition-all ${
                activeTab === tab.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              <tab.icon size={11} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin mt-2 px-2">
          {activeTab === 'history' && (
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
                        {new Date(conv.updated_at).toLocaleDateString('it-IT')}
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
          )}

          {activeTab === 'services' && <ServicesPanel />}

          {activeTab === 'files' && (
            <div className="space-y-1">
              {userFiles.length === 0 ? (
                <div className="text-center py-8">
                  <FileText size={32} className="mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-xs text-muted-foreground">Nessun file caricato</p>
                </div>
              ) : (
                userFiles.map((f) => (
                  <div key={f.id} className="group flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-secondary transition-all">
                    <FileText size={14} className="shrink-0 text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{f.file_name}</p>
                      <p className="text-[10px] text-muted-foreground">{formatFileSize(f.file_size)}</p>
                    </div>
                    <button
                      onClick={() => deleteFile(f.id, f.file_url)}
                      className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-2 p-2">
              <div className="bg-secondary rounded-xl p-4">
                <h3 className="text-xs font-semibold text-foreground mb-2">Account</h3>
                <p className="text-[11px] text-muted-foreground">{user?.email || 'Non connesso'}</p>
              </div>
              <div className="bg-secondary rounded-xl p-4">
                <h3 className="text-xs font-semibold text-foreground mb-2">Informazioni</h3>
                <p className="text-[11px] text-muted-foreground">GemRock AI v1.0</p>
                <p className="text-[11px] text-muted-foreground mt-1">Assistente AI personale</p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom */}
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
