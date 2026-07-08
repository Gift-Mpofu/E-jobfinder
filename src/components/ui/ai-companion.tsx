"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, User, Bot, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { askBubbl, type CompanionMessage } from "@/ai/flows/companion-flow";

export function AiCompanion() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<CompanionMessage[]>([
    { role: 'model', content: "Hi! I'm Bubbl, your AI career companion. How can I help you improve your CV or prepare for your next interview today?" }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput("");
    
    // Add user message to UI immediately
    const userMessagePayload: CompanionMessage = { role: 'user', content: userMsg };
    setMessages(prev => [...prev, userMessagePayload]);
    setIsLoading(true);

    try {
      // Send the history (excluding the very first welcome message if preferred, or just pass all) 
      // along with the prompt to the server action
      const responseText = await askBubbl(messages.slice(1), userMsg);
      
      setMessages(prev => [...prev, { role: 'model', content: responseText }]);
    } catch (error) {
      console.error("Bubbl error:", error);
      setMessages(prev => [...prev, { 
          role: 'model', 
          content: "Oops! I hit a temporary snag trying to process that. Could you try asking again?" 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* The Floating Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-20 right-4 w-[350px] h-[500px] shadow-2xl flex flex-col z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <CardHeader className="p-4 border-b bg-primary flex flex-row items-center justify-between rounded-t-lg">
            <CardTitle className="text-primary-foreground flex items-center gap-2 text-lg">
              <Bot className="h-5 w-5" />
              Bubbl
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-primary-foreground hover:bg-primary/90 h-8 w-8">
              <X className="h-5 w-5" />
            </Button>
          </CardHeader>
          
          <CardContent className="flex-1 p-0 overflow-hidden relative">
            <ScrollArea className="h-full w-full p-4">
              <div className="flex flex-col gap-4 pb-4">
                {messages.map((msg, index) => (
                  <div key={index} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'model' && (
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                            <Bot className="h-5 w-5 text-primary" />
                        </div>
                    )}
                    <div className={`p-3 rounded-xl max-w-[80%] text-sm ${
                        msg.role === 'user' 
                          ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                          : 'bg-muted text-foreground rounded-tl-sm'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isLoading && (
                   <div className="flex gap-3 justify-start">
                     <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                         <Bot className="h-5 w-5 text-primary" />
                     </div>
                     <div className="p-3 rounded-xl bg-muted rounded-tl-sm flex items-center gap-2">
                       <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                       <span className="text-xs text-muted-foreground">Bubbl is thinking...</span>
                     </div>
                   </div>
                )}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>
          </CardContent>

          <CardFooter className="p-3 border-t bg-card rounded-b-lg">
            <div className="flex w-full items-center space-x-2">
              <Input 
                placeholder="Ask a career question..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                className="flex-1"
                autoFocus
              />
              <Button type="button" size="icon" disabled={!input.trim() || isLoading} onClick={handleSend} className="shrink-0 bg-primary">
                <Send className="h-4 w-4" />
                <span className="sr-only">Send message</span>
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}

      {/* Floating Action Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        size="icon"
        className={`fixed bottom-4 right-4 h-14 w-14 rounded-full shadow-xl z-50 transition-transform hover:scale-105 active:scale-95 ${isOpen ? 'bg-muted text-muted-foreground hover:bg-muted/80' : 'bg-primary text-primary-foreground'}`}
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
      </Button>
    </>
  );
}
