import { useState, useRef } from 'react';
import { Send, Paperclip, X, FileText, Image, Film, File } from 'lucide-react';

export type ChatAttachment = {
  file: File;
  previewUrl: string;
  type: 'image' | 'video' | 'document';
};

const ACCEPTED_TYPES = '.pdf,.txt,.doc,.docx,.png,.jpg,.jpeg,.gif,.webp,.mp4,.mov,.webm';
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

function getFileType(file: File): ChatAttachment['type'] {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  return 'document';
}

function FileIcon({ type }: { type: ChatAttachment['type'] }) {
  if (type === 'image') return <Image size={16} className="text-primary" />;
  if (type === 'video') return <Film size={16} className="text-primary" />;
  return <FileText size={16} className="text-primary" />;
}

interface ChatInputProps {
  onSend: (message: string, attachments?: ChatAttachment[]) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (!input.trim() && attachments.length === 0) return;
    onSend(input.trim(), attachments.length > 0 ? attachments : undefined);
    setInput('');
    setAttachments([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const valid = files.filter((f) => f.size <= MAX_FILE_SIZE);
    if (valid.length < files.length) {
      // Some files were too large
    }
    const newAttachments: ChatAttachment[] = valid.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      type: getFileType(file),
    }));
    setAttachments((prev) => [...prev, ...newAttachments].slice(0, 5));
    if (fileRef.current) fileRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  return (
    <div className="p-3 border-t border-border bg-card/80 backdrop-blur-xl">
      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="flex gap-2 mb-2 flex-wrap px-1">
          {attachments.map((att, i) => (
            <div
              key={i}
              className="relative group flex items-center gap-2 bg-secondary rounded-xl px-3 py-2 text-xs text-foreground max-w-[200px]"
            >
              {att.type === 'image' ? (
                <img src={att.previewUrl} alt="" className="w-8 h-8 rounded object-cover" />
              ) : att.type === 'video' ? (
                <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                  <Film size={14} className="text-muted-foreground" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                  <FileIcon type={att.type} />
                </div>
              )}
              <span className="truncate flex-1">{att.file.name}</span>
              <button
                onClick={() => removeAttachment(i)}
                className="p-0.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2 bg-secondary rounded-2xl px-4 py-2">
        <button
          onClick={() => fileRef.current?.click()}
          className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          title="Allega file"
        >
          <Paperclip size={18} />
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES}
          onChange={handleFileSelect}
          className="hidden"
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
          disabled={disabled || (!input.trim() && attachments.length === 0)}
          className="p-2 rounded-xl bg-primary text-primary-foreground disabled:opacity-30 disabled:cursor-not-allowed hover:brightness-110 transition-all active:scale-95"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
