interface ChatBubbleProps {
  role: 'user' | 'assistant';
  content: string;
}

export function ChatBubble({ role, content }: ChatBubbleProps) {
  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}>
      <div
        className={`max-w-[85%] sm:max-w-[75%] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-primary text-primary-foreground rounded-[20px] rounded-br-md'
            : 'bg-gemrock-bubble-ai text-foreground rounded-[20px] rounded-bl-md'
        }`}
      >
        {content}
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
