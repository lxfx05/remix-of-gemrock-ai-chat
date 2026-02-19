import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';

interface ChatBubbleProps {
  role: 'user' | 'assistant';
  content: string;
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

export function ChatBubble({ role, content }: ChatBubbleProps) {
  const isUser = role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end animate-fade-in">
        <div className="max-w-[85%] sm:max-w-[75%] px-4 py-3 text-sm leading-relaxed bg-primary text-primary-foreground rounded-[20px] rounded-br-md break-words overflow-hidden">
          <span className="whitespace-pre-wrap break-words">{content}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start animate-fade-in">
      <div className="max-w-[85%] sm:max-w-[75%] px-4 py-3 text-sm leading-relaxed bg-gemrock-bubble-ai text-foreground rounded-[20px] rounded-bl-md overflow-hidden">
        <div className="prose prose-invert prose-sm max-w-none break-words [&_pre]:overflow-x-auto [&_pre]:max-w-full [&_code]:break-all [&_p]:break-words">
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
                      <div className="overflow-x-auto">
                        <SyntaxHighlighter style={oneDark} language={match[1]} PreTag="div"
                          customStyle={{ margin: 0, borderRadius: 0, background: 'hsl(0 0% 8%)', fontSize: '0.75rem', padding: '0.75rem', overflowX: 'auto' }}
                          wrapLongLines={false}>
                          {codeString}
                        </SyntaxHighlighter>
                      </div>
                    </div>
                  );
                }
                return (
                  <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-accent-foreground break-all" {...props}>
                    {children}
                  </code>
                );
              },
              p({ children }) { return <p className="mb-2 last:mb-0 break-words">{children}</p>; },
              ul({ children }) { return <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>; },
              ol({ children }) { return <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>; },
              a({ href, children }) {
                return <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">{children}</a>;
              },
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
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
