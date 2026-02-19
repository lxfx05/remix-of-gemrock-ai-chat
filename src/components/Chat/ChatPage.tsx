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

const TEXT_EXTENSIONS = new Set([
  'txt', 'md', 'json', 'xml', 'yaml', 'yml', 'toml', 'csv', 'log', 'cfg', 'ini', 'env',
  'html', 'htm', 'css', 'js', 'ts', 'tsx', 'jsx', 'py', 'c', 'cpp', 'h', 'hpp',
  'asm', 'rb', 'go', 'rs', 'java', 'php', 'sh', 'bash', 'sql', 'r', 'swift', 'kt',
]);

async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function getFileExtension(name: string): string {
  return name.split('.').pop()?.toLowerCase() || '';
}

export function ChatPage() {
  const { user, getUserName } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
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
      setMessages(data.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })));
    }
  };

  const saveMessageToDb = async (conversationId: string, role: string, content: string) => {
    if (!user) return;
    await supabase.from('chat_messages').insert({
      user_id: user.id,
      conversation_id: conversationId,
      role,
      content,
      mode: 'online',
    });
  };

  const getOrCreateConversation = async (firstMessage: string): Promise<string | null> => {
    if (!user) return null;
    if (activeConversationId) return activeConversationId;
    const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? '...' : '');
    const { data, error } = await supabase
      .from('conversations')
      .insert({ user_id: user.id, title, mode: 'online' })
      .select('id')
      .single();
    if (error || !data) return null;
    setActiveConversationId(data.id);
    return data.id;
  };

  const extractFileContents = async (files: File[]): Promise<string> => {
    const parts: string[] = [];
    for (const file of files) {
      const ext = getFileExtension(file.name);
      if (TEXT_EXTENSIONS.has(ext)) {
        try {
          const text = await readFileAsText(file);
          const truncated = text.length > 15000 ? text.slice(0, 15000) + '\n\n[...troncato]' : text;
          parts.push(`📄 **${file.name}**:\n\`\`\`${ext}\n${truncated}\n\`\`\``);
        } catch {
          parts.push(`📄 ${file.name}: [errore lettura]`);
        }
      } else {
        // For binary files (PDF, DOC, PPT), try reading as text
        try {
          const text = await readFileAsText(file);
          // Check if it's readable text (not binary garbage)
          const printable = text.slice(0, 500).replace(/[^\x20-\x7E\n\r\t]/g, '').length;
          if (printable > text.slice(0, 500).length * 0.5) {
            const truncated = text.length > 15000 ? text.slice(0, 15000) + '\n\n[...troncato]' : text;
            parts.push(`📄 **${file.name}**:\n\`\`\`\n${truncated}\n\`\`\``);
          } else {
            parts.push(`📄 ${file.name}: [file binario - ${(file.size / 1024).toFixed(1)} KB, formato: ${ext.toUpperCase()}]`);
          }
        } catch {
          parts.push(`📄 ${file.name}: [non leggibile]`);
        }
      }
    }
    return parts.join('\n\n');
  };

  const handleSend = async (input: string, files?: File[], webSearch?: boolean) => {
    if (!user) {
      setShowAuth(true);
      return;
    }

    let messageContent = input;

    if (files && files.length > 0) {
      const fileContents = await extractFileContents(files);
      messageContent = messageContent
        ? `${messageContent}\n\n${fileContents}`
        : fileContents;
    }

    if (!messageContent) return;

    const userMsg: Message = { role: 'user', content: messageContent };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    const convId = await getOrCreateConversation(input || 'File condiviso');
    if (convId) await saveMessageToDb(convId, 'user', messageContent);

    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-groq`;
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: messageContent }].map(m => ({
            role: m.role,
            content: m.content,
          })),
          userName: getUserName(),
          webSearch: !!webSearch,
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
              setMessages(prev => {
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
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <ChatSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
      />

      <ChatHeader onToggleSidebar={() => setSidebarOpen(prev => !prev)} />

      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin px-3 sm:px-4 md:px-6 lg:px-8 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in px-4">
            <div className="w-20 h-20 rounded-3xl gemrock-gradient flex items-center justify-center mb-6 gemrock-glow animate-pulse-glow">
              <span className="text-4xl">💎</span>
            </div>
            <h2 className="text-xl font-semibold gemrock-text-gradient mb-2">GemRock AI</h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              Il tuo assistente AI personale. Scrivi un messaggio per iniziare la conversazione.
            </p>
            {!user && (
              <p className="text-xs text-muted-foreground mt-4 bg-secondary px-4 py-2 rounded-xl animate-pulse">
                🔒 Accedi per inviare messaggi
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
