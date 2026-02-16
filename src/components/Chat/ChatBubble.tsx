import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, FileText, Download } from 'lucide-react';

export type MessageAttachment = {
  url: string;
  name: string;
  type: 'image' | 'video' | 'document';
};

interface ChatBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  attachments?: MessageAttachment[];
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 p-1.5 rounded-md bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-all opacity-0 group-hover:opacity-100"
      title="Copia codice"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

function AttachmentPreview({ attachments }: { attachments: MessageAttachment[] }) {
  return (
    <div className="flex flex-col gap-2 mb-2">
      {attachments.map((att, i) => {
        if (att.type === 'image') {
          return <img key={i} src={att.url} alt={att.name} className="rounded-lg max-w-full max-h-60 object-contain" />;
        }
        if (att.type === 'video') {
          return <video key={i} src={att.url} controls className="rounded-lg max-w-full max-h-60" />;
        }
        return (
          <a key={i} href={att.url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 text-xs hover:bg-muted transition-colors">
            <FileText size={14} className="text-primary shrink-0" />
            <span className="truncate flex-1">{att.name}</span>
            <Download size={12} className="text-muted-foreground shrink-0" />
          </a>
        );
      })}
    </div>
  );
}

export function ChatBubble({ role, content, attachments }: ChatBubbleProps) {
  const isUser = role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end animate-fade-in">
        <div className="max-w-[85%] sm:max-w-[75%] px-4 py-3 text-sm leading-relaxed bg-primary text-primary-foreground rounded-[20px] rounded-br-md">
          {attachments && attachments.length > 0 && <AttachmentPreview attachments={attachments} />}
          {content && <span className="whitespace-pre-wrap">{content}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start animate-fade-in">
      <div className="max-w-[85%] sm:max-w-[75%] px-4 py-3 text-sm leading-relaxed bg-gemrock-bubble-ai text-foreground rounded-[20px] rounded-bl-md prose prose-invert prose-sm max-w-none">
        {attachments && attachments.length > 0 && <AttachmentPreview attachments={attachments} />}
        <ReactMarkdown
          components={{
            code({ className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              const codeString = String(children).replace(/\n$/, '');
              if (match) {
                return (
                  <div className="relative group my-3 rounded-lg overflow-hidden border border-border">
                    <div className="flex items-center justify-between px-3 py-1.5 bg-muted/50 text-xs text-muted-foreground border-b border-border">
                      <span>{match[1]}</span>
                      <CopyButton text={codeString} />
                    </div>
                    <SyntaxHighlighter style={oneDark} language={match[1]} PreTag="div"
                      customStyle={{ margin: 0, borderRadius: 0, background: 'hsl(0 0% 8%)', fontSize: '0.8rem', padding: '1rem' }}>
                      {codeString}
                    </SyntaxHighlighter>
                  </div>
                );
              }
              return (
                <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-accent-foreground" {...props}>
                  {children}
                </code>
              );
            },
            p({ children }) { return <p className="mb-2 last:mb-0">{children}</p>; },
            ul({ children }) { return <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>; },
            ol({ children }) { return <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>; },
            a({ href, children }) {
              return <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{children}</a>;
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex justify-start animate-fade-in">
      <div className="bg-gemrock-bubble-ai rounded-[20px] rounded-bl-md px-5 py-4 flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-muted-foreground animate-typing-dot-1" />
        <div className="w-2 h-2 rounded-full bg-muted-foreground animate-typing-dot-2" />
        <div className="w-2 h-2 rounded-full bg-muted-foreground animate-typing-dot-3" />
      </div>
    </div>
  );
}
