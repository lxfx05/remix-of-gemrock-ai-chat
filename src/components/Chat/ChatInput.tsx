import { useState, useRef } from 'react';
import { Send, Paperclip, X, FileText, Code, Globe } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string, files?: File[], webSearch?: boolean) => void;
  disabled?: boolean;
}

const FILE_TYPES = [
  { label: 'Documenti', icon: FileText, accept: '.txt,.pdf,.doc,.docx,.ppt,.pptx,.csv,.md,.json,.xml,.yaml,.toml,.log' },
  { label: 'Codice', icon: Code, accept: '.html,.css,.js,.ts,.tsx,.jsx,.py,.c,.cpp,.h,.asm,.rb,.go,.rs,.java,.php,.sh,.sql' },
];

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [showAttach, setShowAttach] = useState(false);
  const [webSearch, setWebSearch] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [currentAccept, setCurrentAccept] = useState('');

  const handleSend = () => {
    if (!input.trim() && files.length === 0) return;
    onSend(input.trim(), files.length > 0 ? files : undefined, webSearch);
    setInput('');
    setFiles([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (accept: string) => {
    setCurrentAccept(accept);
    setShowAttach(false);
    setTimeout(() => fileRef.current?.click(), 50);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (selected) {
      setFiles(prev => [...prev, ...Array.from(selected)]);
    }
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="p-2 sm:p-3 md:p-4 border-t border-border bg-card/80 backdrop-blur-xl">
      {/* File previews */}
      {files.length > 0 && (
        <div className="flex gap-2 mb-2 flex-wrap px-1">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-1.5 bg-secondary rounded-lg px-2.5 py-1.5 text-xs text-foreground animate-slide-up">
              <FileText size={12} className="text-muted-foreground shrink-0" />
              <span className="truncate max-w-[120px]">{f.name}</span>
              <button onClick={() => removeFile(i)} className="p-0.5 hover:text-destructive transition-colors">
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Web search indicator */}
      {webSearch && (
        <div className="flex items-center gap-1.5 mb-2 px-1">
          <span className="flex items-center gap-1 bg-primary/15 text-primary text-[11px] font-medium px-2.5 py-1 rounded-lg animate-fade-in">
            <Globe size={12} />
            Ricerca web attiva
          </span>
        </div>
      )}

      <div className="flex items-end gap-2 bg-secondary rounded-2xl px-3 sm:px-4 py-2 relative">
        {/* Attach button */}
        <div className="relative">
          <button
            onClick={() => setShowAttach(!showAttach)}
            className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-all active:scale-95"
            type="button"
          >
            <Paperclip size={18} />
          </button>

          {showAttach && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowAttach(false)} />
              <div className="absolute bottom-full left-0 mb-2 bg-card border border-border rounded-xl shadow-xl z-20 overflow-hidden animate-slide-up min-w-[180px]">
                {FILE_TYPES.map((ft) => (
                  <button
                    key={ft.label}
                    onClick={() => handleFileSelect(ft.accept)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-secondary transition-colors"
                  >
                    <ft.icon size={16} className="text-primary" />
                    {ft.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Web search toggle */}
        <button
          onClick={() => setWebSearch(!webSearch)}
          className={`p-2 rounded-xl transition-all active:scale-95 ${
            webSearch
              ? 'bg-primary/20 text-primary'
              : 'hover:bg-muted text-muted-foreground hover:text-foreground'
          }`}
          type="button"
          title="Ricerca web"
        >
          <Globe size={18} />
        </button>

        <input
          ref={fileRef}
          type="file"
          accept={currentAccept}
          onChange={handleFileChange}
          className="hidden"
          multiple
        />

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
          disabled={disabled || (!input.trim() && files.length === 0)}
          className="p-2 rounded-xl bg-primary text-primary-foreground disabled:opacity-30 disabled:cursor-not-allowed hover:brightness-110 transition-all active:scale-95"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
