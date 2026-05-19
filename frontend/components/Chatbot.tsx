"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Send } from "lucide-react";

interface WardrobeItem {
  id: string;
  image_url: string;
  category: string;
  color: string;
  style?: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatbotProps {
  wardrobeItems: WardrobeItem[];
}

export default function Chatbot({ wardrobeItems }: ChatbotProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Welcome to your styling studio. How can I curate your look today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMessage: Message = { role: "user", content: trimmed };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          wardrobeItems,
        }),
      });

      const data = await res.json();
      const reply = data.reply || "Sorry, I couldn't get a response.";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Something went wrong. Please try again.",
        },
      ]);
    }

    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") sendMessage();
  };

  return (
    <>
      {/* Floating button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen((prev) => !prev)}
        className="fixed bottom-8 right-8 z-[60] w-14 h-14 rounded-full bg-[#4C5850] text-white flex items-center justify-center shadow-lg transition-shadow border border-[#3A453E]"
        title="Style Assistant"
        aria-label="Open style assistant chat"
      >
        {open ? <X className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed bottom-28 right-8 z-[60] w-80 sm:w-[380px] bg-white border border-stone-200 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] flex flex-col overflow-hidden"
            style={{ maxHeight: "75vh" }}
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-stone-200 bg-white flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-stone-50 flex items-center justify-center text-[#1A1A1A] border border-stone-200">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest font-semibold text-[#1A1A1A]">
                  AI Stylist
                </p>
                <p className="text-xs text-stone-500 font-light mt-0.5">
                  Editorial Curation
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6 min-h-[300px]">
              {messages.map((msg, i) => (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  key={i}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] px-5 py-4 rounded-xl text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-[#4C5850] text-white rounded-br-sm"
                        : "bg-[#F5F5F4] text-[#1A1A1A] rounded-bl-sm"
                    }`}
                  >
                    {msg.content}
                  </div>
                </motion.div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-[#F5F5F4] px-5 py-5 rounded-xl rounded-bl-sm text-sm flex items-center gap-1.5">
                    <span
                      className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-5 py-5 border-t border-stone-200 bg-white">
              <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-full px-2 py-1.5 focus-within:border-[#1A1A1A] transition-all">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask your stylist..."
                  disabled={loading}
                  className="flex-1 text-sm px-4 py-2 bg-transparent outline-none text-[#1A1A1A] placeholder-stone-400 disabled:opacity-50 font-light"
                />
                <button
                  onClick={sendMessage}
                  disabled={loading || !input.trim()}
                  className="w-10 h-10 rounded-full bg-[#4C5850] disabled:bg-stone-200 hover:bg-[#3A453E] disabled:text-stone-400 text-white flex items-center justify-center transition-all duration-300 shrink-0"
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}