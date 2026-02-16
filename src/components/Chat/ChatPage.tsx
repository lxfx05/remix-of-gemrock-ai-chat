import { useState, useRef, useEffect } from 'react';
import { ChatHeader } from './ChatHeader';
import { ChatBubble, TypingIndicator } from './ChatBubble';
import { ChatInput } from './ChatInput';
import { AuthModal } from '../Auth/AuthModal';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

type Message = { role: 'user' | 'assistant'; content: string };

const OFFLINE_RESPONSES = [
  "sono in modalità offline. Posso accedere solo ai dati salvati localmente. 🔒",
  "al momento sono in modalità Vault. Le mie risposte si basano sui dati cached. 💾",
  "sto operando offline. Posso comunque aiutarti con informazioni generali! 📦",
];

export function ChatPage() {
  const { user, getUserName } = useAuth();
  const [onlineMessages, setOnlineMessages] = useState<Message[]>([]);
  const [offlineMessages, setOfflineMessages] = useState<Message[]>([]);
  const [mode, setMode] = useState<'online' | 'offline'>('online');
  const [isLoading, setIsLoading] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const messages = mode === 'online' ? onlineMessages : offlineMessages;
  const setMessages = mode === 'online' ? setOnlineMessages : setOfflineMessages;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (input: string) => {
    if (!user) {
      setShowAuth(true);
      return;
    }

    const userName = getUserName();
    const userMsg: Message = { role: 'user', content: input };
    const currentMode = mode;
    const setSetter = currentMode === 'online' ? setOnlineMessages : setOfflineMessages;
    const currentMessages = currentMode === 'online' ? onlineMessages : offlineMessages;
    setSetter((prev) => [...prev, userMsg]);
    setIsLoading(true);

    if (currentMode === 'offline') {
      setTimeout(() => {
        const prefix = userName ? `Ciao ${userName}, ` : '';
        const randomResponse = OFFLINE_RESPONSES[Math.floor(Math.random() * OFFLINE_RESPONSES.length)];
        setSetter((prev) => [...prev, { role: 'assistant', content: prefix + randomResponse }]);
        setIsLoading(false);
      }, 800);
      return;
    }

    // Online mode: stream from Groq via edge function
    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-groq`;

      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...currentMessages, userMsg].map((m) => ({ role: m.role, content: m.content })),
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
                setSetter((prev) => {
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
    } catch (e) {
      console.error(e);
      toast.error('Errore di connessione');
    }

    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <ChatHeader mode={mode} onModeChange={setMode} />

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
              <p className="text-xs text-gemrock-zinc-light mt-4 bg-secondary px-4 py-2 rounded-xl">
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
