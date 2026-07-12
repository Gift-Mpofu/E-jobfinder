'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { askBubbl, type CompanionMessage } from '@/ai/flows/companion-flow';

export default function CompanionPage() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<CompanionMessage[]>([
    { role: 'model', content: "Hi! I'm Bubbl, your AI career companion. How can I help you improve your CV or prepare for your next interview today?" },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);
    try {
      const responseText = await askBubbl(messages.slice(1), userMsg);
      setMessages((prev) => [...prev, { role: 'model', content: responseText }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'model', content: "Oops! I hit a temporary snag. Could you try asking again?" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-[#FF6B00] flex items-center justify-center">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-[22px] font-bold text-[#1D1D1F]">Bubbl</h1>
            <p className="text-sm text-[#6E6E73]">Your AI career companion</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E5EA] flex flex-col" style={{ height: 'calc(100vh - 220px)', minHeight: 480 }}>
        <ScrollArea className="flex-1 p-5">
          <div className="flex flex-col gap-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#FF6B00] text-white'
                      : 'bg-[#F5F5F7] text-[#1D1D1F]'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-[#F5F5F7] rounded-2xl px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-[#6E6E73]" />
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-[#E5E5EA] flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
            placeholder="Ask about CV tips, interviews, or job search..."
            className="flex-1 bg-[#F5F5F7] border-[#D2D2D7] rounded-xl"
            disabled={isLoading}
          />
          <Button onClick={handleSend} disabled={isLoading || !input.trim()} className="bg-[#FF6B00] hover:bg-[#E55F00] rounded-xl">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
