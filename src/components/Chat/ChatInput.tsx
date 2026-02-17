import { useState } from 'react';
import { Send } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-3 border-t border-border bg-card/80 backdrop-blur-xl">
      <div className="flex items-end gap-2 bg-secondary rounded-2xl px-4 py-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Scrivi un messaggio..."
          rows={1}
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none py-1.5 max-h-32 scrollbar-thin"
          style={{ minHeight: '24px' }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = '24px';
            target.style.height = target.scrollHeight + 'px';
          }}
        />
        <button
          onClick={handleSend}
          disabled={disabled || !input.trim()}
          className="p-2 rounded-xl bg-primary text-primary-foreground disabled:opacity-30 disabled:cursor-not-allowed hover:brightness-110 transition-all active:scale-95"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
