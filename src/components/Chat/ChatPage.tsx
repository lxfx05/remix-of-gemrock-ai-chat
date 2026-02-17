import { useState, useRef, useEffect } from 'react';
import { ChatHeader } from './ChatHeader';
import { ChatBubble, TypingIndicator } from './ChatBubble';
import { ChatInput } from './ChatInput';
import { ChatSidebar } from './ChatSidebar';
import { AuthModal } from '../Auth/AuthModal';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

const OFFLINE_RESPONSES = [
  "sono in modalità offline. Posso accedere solo ai dati salvati localmente. 🔒",
  "al momento sono in modalità Vault. Le mie risposte si basano sui dati cached. 💾",
  "sto operando offline. Posso comunque aiutarti con informazioni generali! 📦",
  "sono offline ma posso comunque rispondere con le mie conoscenze di base. 🧠",
  "modalità offline attiva. Ti aiuto con quello che so! ⚡",
];

export function ChatPage() {
  const { user, getUserName } = useAuth();
  const [onlineMessages, setOnlineMessages] = useState<Message[]>([]);
  const [offlineMessages, setOfflineMessages] = useState<Message[]>([]);
  const [mode, setMode] = useState<'online' | 'offline'>('online');
  const [isLoading, setIsLoading] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const messages = mode === 'online' ? onlineMessages : offlineMessages;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleNewChat = () => {
    setActiveConversationId(null);
    setOnlineMessages([]);
    setOfflineMessages([]);
  };

  const handleSelectConversation = async (id: string) => {
    setActiveConversationId(id);
    if (!user) return;
    const { data } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });
    if (data) {
      const msgs = data.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));
      // Load into appropriate mode based on conversation mode
      const { data: conv } = await supabase
        .from('conversations')
        .select('mode')
        .eq('id', id)
        .single();
      if (conv?.mode === 'offline') {
        setOfflineMessages(msgs);
        setMode('offline');
      } else {
        setOnlineMessages(msgs);
        setMode('online');
      }
    }
  };

  const saveMessageToDb = async (conversationId: string, role: string, content: string) => {
    if (!user) return;
    await supabase.from('chat_messages').insert({
      user_id: user.id,
      conversation_id: conversationId,
      role,
      content,
      mode,
    });
  };

  const getOrCreateConversation = async (firstMessage: string): Promise<string | null> => {
    if (!user) return null;
    if (activeConversationId) return activeConversationId;

    const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? '...' : '');
    const { data, error } = await supabase
      .from('conversations')
      .insert({ user_id: user.id, title, mode })
      .select('id')
      .single();
    if (error || !data) return null;
    setActiveConversationId(data.id);
    return data.id;
  };

  const handleSend = async (input: string) => {
    if (!user) {
      setShowAuth(true);
      return;
    }

    const userName = getUserName();
    const currentMode = mode;
    const setSetter = currentMode === 'online' ? setOnlineMessages : setOfflineMessages;
    const currentMessages = currentMode === 'online' ? onlineMessages : offlineMessages;

    const userMsg: Message = { role: 'user', content: input };
    setSetter(prev => [...prev, userMsg]);
    setIsLoading(true);

    const convId = await getOrCreateConversation(input);
    if (convId) await saveMessageToDb(convId, 'user', input);

    if (currentMode === 'offline') {
      setTimeout(async () => {
        const prefix = userName ? `Ciao ${userName}, ` : '';
        const randomResponse = OFFLINE_RESPONSES[Math.floor(Math.random() * OFFLINE_RESPONSES.length)];
        const assistantContent = prefix + randomResponse;
        setSetter(prev => [...prev, { role: 'assistant', content: assistantContent }]);
        if (convId) await saveMessageToDb(convId, 'assistant', assistantContent);
        setIsLoading(false);
      }, 800);
      return;
    }

    // Online mode: stream from Groq
    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-groq`;
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...currentMessages, { role: 'user', content: input }].map(m => ({
            role: m.role,
            content: m.content,
          })),
          userName,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Errore di rete' }));
        toast.error(err.error || 'Errore nella risposta AI');
        setIsLoading(false);
        return;
      }

      if (!resp.body) {
        toast.error('Streaming non supportato');
        setIsLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let assistantSoFar = '';
      let textBuffer = '';
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              setSetter(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                }
                return [...prev, { role: 'assistant', content: assistantSoFar }];
              });
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      if (convId && assistantSoFar) {
        await saveMessageToDb(convId, 'assistant', assistantSoFar);
      }
    } catch (e) {
      console.error(e);
      toast.error('Errore di connessione');
    }

    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <ChatSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
      />

      <ChatHeader
        mode={mode}
        onModeChange={setMode}
        onToggleSidebar={() => setSidebarOpen(prev => !prev)}
      />

      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
            <div className="w-20 h-20 rounded-3xl gemrock-gradient flex items-center justify-center mb-6 gemrock-glow animate-pulse-glow">
              <span className="text-4xl">💎</span>
            </div>
            <h2 className="text-xl font-semibold gemrock-text-gradient mb-2">GemRock AI</h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              Il tuo assistente AI personale. Scrivi un messaggio per iniziare la conversazione.
            </p>
            {!user && (
              <p className="text-xs text-muted-foreground mt-4 bg-secondary px-4 py-2 rounded-xl animate-pulse">
                🔒 Effettua l'accesso per inviare messaggi
              </p>
            )}
          </div>
        )}

        {messages.map((msg, i) => (
          <ChatBubble key={i} role={msg.role} content={msg.content} />
        ))}

        {isLoading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      <ChatInput onSend={handleSend} disabled={isLoading} />
      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  );
}
