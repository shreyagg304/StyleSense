"use client";
 
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import Chatbot from "@/components/Chatbot"; 
import { useRouter } from "next/navigation";

// ── CONSTANTS ──────────────────────────────────────────────────────────────
 
const CATEGORY_LABEL: Record<string, string> = {
  shirt: "Top",
  jeans: "Bottom",
  dress: "Dress",
  shoes: "Shoes",
};
 
const CATEGORY_BG: Record<string, string> = {
  shirt: "bg-purple-50",
  jeans: "bg-blue-50",
  dress: "bg-pink-50",
  shoes: "bg-green-50",
};
 
const COLOR_DOT = {
  white: "bg-white border border-gray-300",
  black: "bg-gray-900",
  gray: "bg-gray-400",
  red: "bg-red-500",
  green: "bg-green-500",
  blue: "bg-blue-500",
  yellow: "bg-yellow-400",
  purple: "bg-purple-500",
  orange: "bg-orange-400",   // 👈 ADD THIS
  unknown: "bg-stone-300",   // 👈 fallback
  mixed: "bg-gradient-to-br from-pink-400 via-yellow-300 to-blue-400",
};
 
// ── [NEW] COLOR MATCHING ───────────────────────────────────────────────────
// Maps each color to colors it pairs well with
const COLOR_MATCH: Record<string, string[]> = {
  black:  ["white", "gray", "blue", "red", "yellow", "purple", "green", "mixed"],
  white:  ["black", "gray", "blue", "red", "green", "yellow", "purple", "mixed"],
  gray:   ["black", "white", "blue", "red", "purple"],
  blue:   ["white", "gray", "black", "yellow"],
  red:    ["black", "white", "gray"],
  green:  ["white", "black", "yellow"],
  yellow: ["black", "blue", "green"],
  purple: ["white", "black", "gray"],
  orange: ["black", "white", "blue"],
  mixed:  ["black", "white", "gray"],
};
 
// Returns true if two colors are compatible
const isColorMatch = (c1: string, c2: string): boolean => {
  if (!c1 || !c2) return true; // if color unknown, allow it
  if (c1 === c2) return true;  // same color always matches
  return COLOR_MATCH[c1]?.includes(c2) || COLOR_MATCH[c2]?.includes(c1) || false;
};
 
// ── [NEW] OCCASION / STYLE SYSTEM ─────────────────────────────────────────
type Occasion = "casual" | "party" | "office";
 
// Which item styles are appropriate for each occasion
const OCCASION_STYLES: Record<Occasion, string[]> = {
  casual: ["casual", "everyday", "relaxed", "streetwear"],
  party:  ["party", "evening", "formal", "chic", "glamour"],
  office: ["office", "formal", "business", "smart", "professional"],
};
 
// Returns true if an item's style fits the selected occasion
// Falls back to "casual" if item has no style field
const isStyleMatch = (itemStyle: string | undefined, occasion: Occasion): boolean => {
  const style = (itemStyle || "casual").toLowerCase();
  return OCCASION_STYLES[occasion].includes(style);
};
 
// ── [NEW] OUTFIT REASON BUILDER ────────────────────────────────────────────
const buildReason = (occasion: Occasion, topColor: string, bottomColor: string): string => {
  const colorNote = topColor === bottomColor
    ? "tonal color pairing"
    : "complementary colors";
 
  const occasionLabel = {
    casual: "casual",
    party:  "evening",
    office: "office",
  }[occasion];
 
  return `${occasionLabel} look · ${colorNote}`;
};
 
// ── TYPES ──────────────────────────────────────────────────────────────────
interface WardrobeItem {
  id: string;
  image_url: string;
  category: string;
  color: string;
  style?: string;
  created_at: string;
}
 
interface Outfit {
  top?: WardrobeItem;
  bottom?: WardrobeItem;
  dress?: WardrobeItem;
  shoe?: WardrobeItem;
  reason: string;
  score: number;
}
 
// ── COMPONENT ──────────────────────────────────────────────────────────────
export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [likedOutfits, setLikedOutfits] = useState<Record<number, boolean>>({});
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"wardrobe" | "looks">("wardrobe");
 
  // [NEW] Occasion state
  const [occasion, setOccasion] = useState<Occasion>("casual");
 
  const fileInputRef = useRef<HTMLInputElement>(null);
 
  // ── FETCH ────────────────────────────────────────────────────────────────
  const fetchItems = async (userId: string) => {
  const { data } = await supabase
    .from("wardrobe_items")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  setItems((data as WardrobeItem[]) || []);
};
 
  const router = useRouter();

  const handleLogout = async () => {
  await supabase.auth.signOut();
  router.push("/");
};

useEffect(() => {
  const checkUser = async () => {
    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      router.push("/login");
    } else {
      fetchItems(data.user.id);
    }
  };

  checkUser();
}, []);
 
  // ── FILE HANDLING ─────────────────────────────────────────────────────────
  const handleFileChange = (f: File | null) => {
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  };
 
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFileChange(f);
  };
 
  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setUploadError(null);

    try {
      const BASE_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch(`${BASE_URL}/analyze`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const { color, category } = await res.json();

      // Upload to Supabase
      const fileName = `${Date.now()}-${file.name}`;
      await supabase.storage.from("wardrobe-images").upload(fileName, file);

      const { data } = supabase.storage
        .from("wardrobe-images")
        .getPublicUrl(fileName);

      const { data: userData } = await supabase.auth.getUser();

      if (!userData?.user) {
        return; // or show error / redirect
      }

      const userId = userData.user.id;

await supabase.from("wardrobe_items").insert([
  {
    image_url: data.publicUrl,
    category,
    color,
    user_id: userData.user.id,
  },
]);
await fetchItems(userData.user.id); 

      setFile(null);
      setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      setUploadError(err.message || "Upload failed.");
    }

    setLoading(false);
  };
 
  // ── CATEGORY GROUPING ─────────────────────────────────────────────────────
  const getGroup = (cat: string) => {
    if (cat === "shirt") return "top";
    if (cat === "jeans") return "bottom";
    if (cat === "dress") return "full";
    if (cat === "shoes") return "footwear";
    return "unknown";
  };
 
  // ── [NEW] SMART OUTFIT GENERATION ─────────────────────────────────────────
  // Replaces the old random pickRandom approach with scored, filtered generation
  const generateOutfits = () => {
    const tops    = items.filter(i => getGroup(i.category) === "top");
    const bottoms = items.filter(i => getGroup(i.category) === "bottom");
    const dresses = items.filter(i => getGroup(i.category) === "full");
    const shoes   = items.filter(i => getGroup(i.category) === "footwear");
 
    const results: Outfit[] = [];
 
    // ── DRESS + SHOES ──
    dresses.forEach(dress => {
      shoes.forEach(shoe => {
        // Style check
        const styleOk = isStyleMatch(dress.style, occasion) &&
                        isStyleMatch(shoe.style, occasion);
        if (!styleOk) return;
 
        // Color check
        const colorOk = isColorMatch(dress.color, shoe.color);
        if (!colorOk) return;
 
        // Score: same color = 1, complementary = 2
        const score = dress.color === shoe.color ? 1 : 2;
 
        results.push({
          dress,
          shoe,
          score,
          reason: `${occasion} look · dress & shoes`,
        });
      });
    });
 
    // ── TOP + BOTTOM + SHOES ──
    tops.forEach(top => {
      bottoms.forEach(bottom => {
        shoes.forEach(shoe => {
          // Style check — all 3 pieces must match occasion
          const styleOk = isStyleMatch(top.style, occasion) &&
                          isStyleMatch(bottom.style, occasion) &&
                          isStyleMatch(shoe.style, occasion);
          if (!styleOk) return;
 
          // Color check — top+bottom and bottom+shoe must be compatible
          const colorOk = isColorMatch(top.color, bottom.color) &&
                          isColorMatch(bottom.color, shoe.color);
          if (!colorOk) return;
 
          // Score based on how many pairs match
          let score = 0;
          if (isColorMatch(top.color, bottom.color)) score += 2;
          if (isColorMatch(bottom.color, shoe.color)) score += 2;
          if (isColorMatch(top.color, shoe.color))    score += 1;
 
          results.push({
            top,
            bottom,
            shoe,
            score,
            reason: buildReason(occasion, top.color, bottom.color),
          });
        });
      });
    });
 
    // ── FALLBACK: if style filter is too strict, relax it ──
    // If nothing was generated, ignore style and just use color
    if (results.length === 0) {
      tops.forEach(top => {
        bottoms.forEach(bottom => {
          shoes.forEach(shoe => {
            if (!isColorMatch(top.color, bottom.color)) return;
            if (!isColorMatch(bottom.color, shoe.color)) return;
            results.push({
              top, bottom, shoe,
              score: 1,
              reason: `${occasion} look · color coordinated`,
            });
          });
        });
      });
 
      dresses.forEach(dress => {
        shoes.forEach(shoe => {
          if (!isColorMatch(dress.color, shoe.color)) return;
          results.push({
            dress, shoe,
            score: 1,
            reason: `${occasion} look · dress & shoes`,
          });
        });
      });
    }
 
    // ── LAST RESORT: no color filter either ──
    if (results.length === 0 && items.length >= 2) {
      tops.forEach(top => {
        bottoms.forEach(bottom => {
          shoes.forEach(shoe => {
            results.push({ top, bottom, shoe, score: 0, reason: "mix & match" });
          });
        });
      });
    }
 
    // Sort by score descending, deduplicate, limit to 6
    results.sort((a, b) => b.score - a.score || Math.random() - 0.5);
 
    const unique: Outfit[] = [];
    const seen = new Set<string>();
    for (const o of results) {
      const key = JSON.stringify([
        o.top?.color,
        o.bottom?.color,
        o.dress?.color,
        o.shoe?.color
      ]);
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(o);
      }
    }
 
    setOutfits(unique.slice(0, 10));
    setLikedOutfits({});
    setActiveTab("looks");
  };
 
  // ── [NEW] SAVE OUTFIT TO SUPABASE ─────────────────────────────────────────
  // Replaces old handleFeedback — now saves full outfit_data to saved_outfits table
  const handleFeedback = async (index: number, liked: boolean) => {
    setLikedOutfits(prev => ({ ...prev, [index]: liked }));
 
    const outfit = outfits[index];
 
    // Build a clean serializable version of the outfit
    const outfitData = {
      top:    outfit.top    ? { id: outfit.top.id,    image_url: outfit.top.image_url,    category: outfit.top.category,    color: outfit.top.color }    : null,
      bottom: outfit.bottom ? { id: outfit.bottom.id, image_url: outfit.bottom.image_url, category: outfit.bottom.category, color: outfit.bottom.color } : null,
      dress:  outfit.dress  ? { id: outfit.dress.id,  image_url: outfit.dress.image_url,  category: outfit.dress.category,  color: outfit.dress.color }  : null,
      shoe:   outfit.shoe   ? { id: outfit.shoe.id,   image_url: outfit.shoe.image_url,   category: outfit.shoe.category,   color: outfit.shoe.color }   : null,
      reason: outfit.reason,
      occasion,
    };
 
    // [NEW] Save to saved_outfits table
    const { data: userData } = await supabase.auth.getUser();

    if (!userData?.user) {
      console.error("User not authenticated");
      return;
    }

    await supabase.from("saved_outfits").insert([
      {
        outfit_data: outfitData,
        liked,
        user_id: userData.user.id,
      },
    ]);
  };
 
  // ── DELETE ────────────────────────────────────────────────────────────────
  const handleDelete = async (item: WardrobeItem) => {
    const fileName = item.image_url.split("/").pop();

    await supabase.storage.from("wardrobe-images").remove([fileName!]);

    await supabase.from("wardrobe_items").delete().eq("id", item.id);

    const { data: userData } = await supabase.auth.getUser();

    if (!userData?.user) {
      console.error("User not authenticated");
      return;
    }

    await fetchItems(userData.user.id);
  };
 
  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans">
 
      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 bg-[#FAFAF8] border-b border-stone-200 px-6 md:px-12 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
 
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#1A1A1A] flex items-center justify-center">
            <span className="text-white text-xs">✦</span>
          </div>
          <h1 className="font-heading text-lg font-bold tracking-tight text-[#1A1A1A] uppercase">
            StyleSense
          </h1>
        </div>
 
        {/* Tab switcher */}
        <div className="flex items-center gap-8">
          <button
            onClick={() => setActiveTab("wardrobe")}
            className={`text-xs uppercase tracking-widest font-semibold pb-1 border-b-2 transition-all duration-300 ${
              activeTab === "wardrobe"
                ? "border-[#1A1A1A] text-[#1A1A1A]"
                : "border-transparent text-stone-400 hover:text-[#1A1A1A]"
            }`}
          >
            Wardrobe {items.length > 0 && <span className="ml-1 opacity-60">({items.length})</span>}
          </button>
          <button
            onClick={() => setActiveTab("looks")}
            className={`text-xs uppercase tracking-widest font-semibold pb-1 border-b-2 transition-all duration-300 ${
              activeTab === "looks"
                ? "border-[#1A1A1A] text-[#1A1A1A]"
                : "border-transparent text-stone-400 hover:text-[#1A1A1A]"
            }`}
          >
            Looks {outfits.length > 0 && <span className="ml-1 opacity-60">({outfits.length})</span>}
          </button>
        </div>
 
        {/* Occasion selector + Generate button grouped together */}
        <div className="flex flex-wrap items-center gap-4 justify-center md:justify-end">
          <button
            onClick={handleLogout}
            className="text-xs uppercase tracking-widest font-medium text-stone-400 hover:text-[#1A1A1A] transition-colors mr-2"
          >
            Log out
          </button>
          <div className="relative">
            <select
              value={occasion}
              onChange={(e) => setOccasion(e.target.value as Occasion)}
              className="appearance-none text-xs uppercase tracking-widest font-semibold text-[#1A1A1A] bg-transparent border border-stone-300 rounded-none pl-4 pr-8 py-2.5 outline-none cursor-pointer hover:border-[#1A1A1A] transition-colors"
            >
              <option value="casual">Casual</option>
              <option value="party">Evening</option>
              <option value="office">Office</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50 text-[10px]">
              ▼
            </div>
          </div>
 
          <button
            onClick={generateOutfits}
            disabled={items.length < 2}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#4C5850] hover:bg-[#3A453E] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs uppercase tracking-widest font-semibold transition-colors duration-300"
          >
            <span className="text-sm">✦</span> Generate Looks
          </button>
        </div>
      </header>
 
      <main className="max-w-7xl mx-auto px-6 md:px-12 py-16 space-y-16">
 
        {/* ════════════════════════════════
            TAB: WARDROBE
        ════════════════════════════════ */}
        {activeTab === "wardrobe" && (
          <div className="animate-in fade-in duration-700">
            {/* Upload section */}
            <div className="grid lg:grid-cols-5 gap-12 items-center mb-20">
 
              {/* Upload CTA Text */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                <div>
                  <h2 className="font-heading text-4xl font-bold text-[#1A1A1A] leading-tight mb-4">
                    Curate your <br /> <span className="italic font-light text-stone-500">collection.</span>
                  </h2>
                  <p className="text-sm text-stone-500 leading-relaxed max-w-sm font-light">
                    Upload a piece and let our AI instantly detect its category and extract its precise color profile.
                  </p>
                </div>
 
                <button
                  onClick={handleUpload}
                  disabled={!file || loading}
                  className="self-start flex items-center justify-center gap-3 px-8 py-3.5 bg-[#4C5850] hover:bg-[#3A453E] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs uppercase tracking-widest font-semibold transition-colors duration-300"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                      Analyzing...
                    </>
                  ) : "Add to Archive"}
                </button>
 
                {uploadError && (
                  <div className="flex items-start gap-2 bg-stone-50 border border-stone-200 text-stone-600 text-xs px-4 py-3 shadow-sm">
                    <span>⚠</span>
                    <span>{uploadError}</span>
                  </div>
                )}
              </div>

              {/* Drop zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`lg:col-span-3 cursor-pointer rounded-xl border border-dashed h-[320px] flex flex-col items-center justify-center gap-4 transition-all duration-300 relative overflow-hidden group
                  ${dragOver
                    ? "border-stone-400 bg-stone-50"
                    : preview
                    ? "border-stone-200 bg-white"
                    : "border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50"
                  }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                />
                {preview ? (
                  <div className="relative w-full h-full flex items-center justify-center p-6">
                     <img src={preview} alt="preview" className="max-h-full max-w-full object-contain" />
                     <div className="absolute inset-0 bg-white/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                       <span className="bg-[#1A1A1A] text-white text-xs uppercase tracking-widest font-semibold px-6 py-3">Change image</span>
                     </div>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 bg-stone-50 flex items-center justify-center text-stone-400 group-hover:text-[#1A1A1A] transition-colors duration-300">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                    </div>
                    <div className="text-center mt-2">
                      <p className="text-xs uppercase tracking-widest font-semibold text-[#1A1A1A] mb-2">Drag & drop your item</p>
                      <p className="text-xs text-stone-400 font-light">or click to browse</p>
                    </div>
                  </>
                )}
              </div>
 
            </div>
 
            {/* Wardrobe grid */}
            <div>
              <div className="flex items-baseline justify-between mb-8 pb-4 border-b border-stone-200">
                <h3 className="font-heading text-2xl font-bold text-[#1A1A1A] uppercase tracking-tight">The Archive</h3>
                <span className="text-xs uppercase tracking-widest font-semibold text-stone-400">
                  {items.length} {items.length === 1 ? 'piece' : 'pieces'}
                </span>
              </div>
 
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 bg-white rounded-xl border border-stone-200 text-center">
                  <div className="w-12 h-12 bg-stone-50 flex items-center justify-center text-stone-300 mb-6">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                  </div>
                  <h4 className="text-sm uppercase tracking-widest font-semibold text-[#1A1A1A] mb-3">No pieces yet</h4>
                  <p className="text-sm text-stone-400 max-w-xs font-light">Upload your first clothing item to start building your digital archive.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="group relative bg-white rounded-xl border border-stone-200 overflow-hidden transition-all duration-500 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
                    >
                      {/* Delete button — visible on hover */}
                      <button
                         onClick={() => handleDelete(item)}
                         className="absolute top-4 right-4 z-10 w-8 h-8 bg-white border border-stone-200 text-stone-400 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-stone-100 hover:text-[#1A1A1A] transition-all duration-300"
                         title="Remove"
                      >
                         ✕
                      </button>
 
                      <div className={`h-64 flex items-center justify-center p-8 bg-stone-50/50`}>
                        <img src={item.image_url} alt={item.category} className="max-h-full max-w-full object-contain transition-transform duration-700 group-hover:scale-105" />
                      </div>
 
                      <div className="px-5 py-4 border-t border-stone-200 flex flex-col gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#1A1A1A]">
                          {CATEGORY_LABEL[item.category] || item.category}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full border border-stone-200 ${COLOR_DOT[item.color as keyof typeof COLOR_DOT] || "bg-stone-300"}`} />
                          <span className="text-[11px] font-medium text-stone-500 uppercase tracking-widest">
                            {item.color}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
 
        {/* ════════════════════════════════
            TAB: LOOKS
        ════════════════════════════════ */}
        {activeTab === "looks" && (
          <div className="animate-in fade-in duration-700">
            <div className="flex items-baseline justify-between mb-10 pb-4 border-b border-stone-200">
              <h2 className="font-heading text-2xl font-bold text-[#1A1A1A] uppercase tracking-tight">Curated Looks</h2>
              {outfits.length > 0 && (
                <span className="text-xs font-semibold uppercase tracking-widest text-stone-500">
                  {occasion} Edit
                </span>
              )}
            </div>
 
            {outfits.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 bg-white rounded-xl border border-stone-200 text-center">
                <div className="w-12 h-12 bg-stone-50 text-[#1A1A1A] flex items-center justify-center mb-6">
                  <span className="text-xl">✦</span>
                </div>
                <h3 className="text-sm uppercase tracking-widest font-semibold text-[#1A1A1A] mb-3">Awaiting Inspiration</h3>
                <p className="text-sm text-stone-400 mb-8 max-w-sm font-light">Select an occasion and generate intelligent outfit combinations from your archive.</p>
                <button
                  onClick={() => setActiveTab("wardrobe")}
                  className="px-8 py-3.5 bg-transparent border border-stone-300 text-[#1A1A1A] text-xs uppercase tracking-widest font-semibold hover:border-[#1A1A1A] transition-colors"
                >
                  Return to Archive
                </button>
              </div>
            ) : (
               <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {outfits.map((outfit, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-xl border border-stone-200 overflow-hidden transition-all duration-500 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col"
                  >
                    {/* Outfit images - Minimal editorial grid */}
                    <div className="bg-stone-50/50 p-8 flex items-center justify-center gap-6 flex-wrap flex-1 min-h-[280px]">
                      {outfit.top    && <img src={outfit.top.image_url}    className="h-32 object-contain hover:scale-105 transition-transform duration-700" alt="top" />}
                      {outfit.bottom && <img src={outfit.bottom.image_url} className="h-32 object-contain hover:scale-105 transition-transform duration-700" alt="bottom" />}
                      {outfit.dress  && <img src={outfit.dress.image_url}  className="h-40 object-contain hover:scale-105 transition-transform duration-700" alt="dress" />}
                      {outfit.shoe   && <img src={outfit.shoe.image_url}   className="h-24 object-contain hover:scale-105 transition-transform duration-700" alt="shoes" />}
                    </div>
 
                    {/* Footer */}
                    <div className="px-6 py-6 border-t border-stone-200 flex items-center justify-between gap-6 bg-white">
                      <div className="flex-1">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400 block mb-2">
                          Styling Note
                        </span>
                        <span className="text-sm text-[#1A1A1A] font-light leading-relaxed block">
                          {outfit.reason}
                        </span>
                      </div>
 
                      {/* Like / dislike */}
                      <div className="flex flex-col gap-2 shrink-0">
                         <button
                           onClick={() => handleFeedback(index, true)}
                           title="Love it"
                           className={`w-10 h-10 border flex items-center justify-center transition-all duration-300
                             ${likedOutfits[index] === true
                               ? "bg-[#1A1A1A] border-[#1A1A1A] text-white"
                               : "border-stone-200 text-stone-400 hover:border-[#1A1A1A] hover:text-[#1A1A1A] bg-transparent"
                             }`}
                         >
                           <svg width="14" height="14" viewBox="0 0 24 24" fill={likedOutfits[index] === true ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                         </button>
                         <button
                           onClick={() => handleFeedback(index, false)}
                           title="Not for me"
                           className={`w-10 h-10 border flex items-center justify-center transition-all duration-300
                             ${likedOutfits[index] === false
                               ? "bg-[#1A1A1A] border-[#1A1A1A] text-white"
                               : "border-stone-200 text-stone-400 hover:border-stone-400 hover:text-stone-600 bg-transparent"
                             }`}
                         >
                           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                         </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
 
      </main>
 
      <Chatbot wardrobeItems={items} />
 
    </div>
  );
}