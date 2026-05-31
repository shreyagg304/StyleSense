"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Send, MapPin, Tag, Heart, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";

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
  suggestedOutfitIds?: string[];
  isSaved?: boolean;
}

interface ChatbotProps {
  wardrobeItems: WardrobeItem[];
}

const CATEGORY_LABEL: Record<string, string> = {
  shirt: "Top",
  jeans: "Bottom",
  dress: "Dress",
  shoes: "Shoes",
};

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
  const [location, setLocation] = useState("");
  const [occasion, setOccasion] = useState("");
  const [loading, setLoading] = useState(false);
  const [styleProfile, setStyleProfile] = useState<any>(null);
  
  const bottomRef = useRef<HTMLDivElement>(null);

  // Fetch style profile on chat open
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) return;

        const { data } = await supabase
          .from("user_profiles")
          .select("style_profile")
          .eq("user_id", userData.user.id)
          .maybeSingle();

        if (data) {
          setStyleProfile(data.style_profile);
        }
      } catch (err) {
        console.error("Failed to fetch style profile inside Chatbot", err);
      }
    };

    if (open) {
      fetchProfile();
    }
  }, [open]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  // Helper to extract JSON outfit blocks from assistant content
  const parseAssistantResponse = (text: string): { cleanText: string; outfitIds?: string[] } => {
    try {
      const jsonRegex = /```json\s*(\{[\s\S]*?\})\s*```/i;
      const match = text.match(jsonRegex);
      if (match) {
        const parsed = JSON.parse(match[1]);
        if (parsed && Array.isArray(parsed.suggested_outfit)) {
          const cleanText = text.replace(match[0], "").trim();
          return { cleanText, outfitIds: parsed.suggested_outfit };
        }
      }

      const rawJsonRegex = /(\{[\s\S]*"suggested_outfit"[\s\S]*\})\s*$/i;
      const rawMatch = text.match(rawJsonRegex);
      if (rawMatch) {
        const parsed = JSON.parse(rawMatch[1]);
        if (parsed && Array.isArray(parsed.suggested_outfit)) {
          const cleanText = text.replace(rawMatch[1], "").trim();
          return { cleanText, outfitIds: parsed.suggested_outfit };
        }
      }
    } catch (e) {
      console.error("Failed to parse JSON outfit from assistant response", e);
    }
    return { cleanText: text };
  };

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
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          wardrobeItems,
          location: location.trim() || undefined,
          occasion: occasion || undefined,
          styleProfile: styleProfile || undefined
        }),
      });

      const data = await res.json();
      const rawReply = data.reply || "Sorry, I couldn't get a response.";
      
      const { cleanText, outfitIds } = parseAssistantResponse(rawReply);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: cleanText,
          suggestedOutfitIds: outfitIds,
          isSaved: false
        }
      ]);
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

  // Quick save outfit from Chatbot message card
  const saveChatOutfit = async (msgIndex: number, itemIds: string[]) => {
    try {
      const selected = wardrobeItems.filter(i => itemIds.includes(i.id));
      if (selected.length === 0) return;

      const top = selected.find(i => i.category === "shirt");
      const bottom = selected.find(i => i.category === "jeans");
      const dress = selected.find(i => i.category === "dress");
      const shoe = selected.find(i => i.category === "shoes");

      const outfitData = {
        top: top ? { id: top.id, image_url: top.image_url, category: top.category, color: top.color } : null,
        bottom: bottom ? { id: bottom.id, image_url: bottom.image_url, category: bottom.category, color: bottom.color } : null,
        dress: dress ? { id: dress.id, image_url: dress.image_url, category: dress.category, color: dress.color } : null,
        shoe: shoe ? { id: shoe.id, image_url: shoe.image_url, category: shoe.category, color: shoe.color } : null,
        reason: "AI Assistant styling recommendation",
        occasion: occasion || "casual"
      };

      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;

      const { error } = await supabase.from("saved_outfits").insert([
        {
          outfit_data: outfitData,
          liked: true,
          user_id: userData.user.id
        }
      ]);

      if (error) throw error;

      setMessages(prev => prev.map((m, idx) => idx === msgIndex ? { ...m, isSaved: true } : m));
    } catch (err) {
      console.error("Failed to save chat outfit:", err);
    }
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
            <div className="px-6 py-5 border-b border-stone-200 bg-white flex items-center gap-4 shrink-0">
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

            {/* Context Filters */}
            <div className="px-5 py-3 border-b border-stone-200 bg-stone-50 flex flex-col gap-2.5 shrink-0">
              <div className="flex items-center gap-2.5 bg-white border border-stone-200 rounded-md px-3 py-1.5 focus-within:border-[#1A1A1A] transition-colors">
                <MapPin className="w-3.5 h-3.5 text-stone-400" />
                <input
                  type="text"
                  placeholder="City (for weather suggestions)..."
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="flex-1 text-xs bg-transparent outline-none text-[#1A1A1A] placeholder-stone-400"
                />
              </div>
              <div className="flex items-center gap-2.5 bg-white border border-stone-200 rounded-md px-3 py-1.5 focus-within:border-[#1A1A1A] transition-colors">
                <Tag className="w-3.5 h-3.5 text-stone-400" />
                <select
                  value={occasion}
                  onChange={(e) => setOccasion(e.target.value)}
                  className="flex-1 text-xs bg-transparent outline-none text-[#1A1A1A] appearance-none cursor-pointer"
                >
                  <option value="">Any occasion</option>
                  <option value="casual">Casual</option>
                  <option value="work">Work</option>
                  <option value="date night">Date Night</option>
                  <option value="formal">Formal</option>
                </select>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6 min-h-[300px]">
              {messages.map((msg, i) => {
                const recommended = msg.suggestedOutfitIds
                  ? wardrobeItems.filter(item => msg.suggestedOutfitIds!.includes(item.id))
                  : [];

                return (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    key={i}
                    className="space-y-3"
                  >
                    <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[85%] px-5 py-4 rounded-xl text-sm leading-relaxed whitespace-pre-wrap ${
                          msg.role === "user"
                            ? "bg-[#4C5850] text-white rounded-br-sm"
                            : "bg-[#F5F5F4] text-[#1A1A1A] rounded-bl-sm"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>

                    {/* Structured Outfit Recommendation Card */}
                    {msg.role === "assistant" && recommended.length > 0 && (
                      <div className="ml-2 mr-6 border border-stone-200 rounded-xl overflow-hidden bg-[#FAFAF9] p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
                            Recommended Outfit
                          </span>
                          <button
                            onClick={() => !msg.isSaved && saveChatOutfit(i, msg.suggestedOutfitIds!)}
                            className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1.5 transition-all
                              ${msg.isSaved 
                                ? "bg-stone-100 text-stone-400 cursor-default" 
                                : "bg-white border border-stone-200 text-[#1A1A1A] hover:border-[#1A1A1A]"
                              }`}
                          >
                            {msg.isSaved ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" /> Saved
                              </>
                            ) : (
                              <>
                                <Heart className="w-3 h-3" /> Save Look
                              </>
                            )}
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {recommended.map(item => (
                            <div key={item.id} className="bg-white border border-stone-100 p-2 flex flex-col items-center text-center">
                              <img src={item.image_url} alt={item.category} className="h-14 w-14 object-contain mb-1" />
                              <span className="text-[8px] font-semibold uppercase text-stone-500 block truncate w-full">
                                {CATEGORY_LABEL[item.category] || item.category}
                              </span>
                              <span className="text-[7px] text-stone-400 uppercase tracking-widest block truncate w-full">
                                {item.color}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}

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