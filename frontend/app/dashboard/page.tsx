"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import Chatbot from "@/components/Chatbot"; 
import { useRouter } from "next/navigation";
import { extractColorPalette } from "@/lib/colorExtractor";
import { 
  Sparkles, 
  CloudSun, 
  Heart, 
  Trash2, 
  User, 
  ClipboardList, 
  Bookmark, 
  Wand2, 
  Layers, 
  HelpCircle,
  Image as ImageIcon,
  Check,
  ChevronRight,
  Info
} from "lucide-react";

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
  orange: "bg-orange-400",
  unknown: "bg-stone-300",
  mixed: "bg-gradient-to-br from-pink-400 via-yellow-300 to-blue-400",
};

// COLOR MATCHING Map
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

const isColorMatch = (c1: string, c2: string): boolean => {
  if (!c1 || !c2) return true;
  if (c1 === c2) return true;
  return COLOR_MATCH[c1]?.includes(c2) || COLOR_MATCH[c2]?.includes(c1) || false;
};

type Occasion = "casual" | "work" | "date night" | "formal";

const OCCASION_STYLES: Record<Occasion, string[]> = {
  casual: ["casual", "everyday", "relaxed", "streetwear"],
  work:  ["work", "office", "professional", "smart", "business"],
  "date night": ["date night", "evening", "chic", "party"],
  formal: ["formal", "black-tie", "chic", "elegant"],
};

const isStyleMatch = (itemStyle: string | undefined, occasion: Occasion): boolean => {
  const style = (itemStyle || "casual").toLowerCase();
  return OCCASION_STYLES[occasion].includes(style) || OCCASION_STYLES[occasion].some(s => style.includes(s));
};

const buildReason = (occasion: Occasion, topColor: string, bottomColor: string, temp?: number): string => {
  const colorNote = topColor === bottomColor ? "tonal color pairing" : "complementary colors";
  let weatherNote = "";
  
  if (temp !== undefined) {
    if (temp < 15) weatherNote = " · layered for cold weather";
    else if (temp > 25) weatherNote = " · breathable for warm weather";
  }

  return `${occasion} look · ${colorNote}${weatherNote}`;
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

interface SavedOutfit {
  id: string;
  outfit_data: {
    top?: WardrobeItem | null;
    bottom?: WardrobeItem | null;
    dress?: WardrobeItem | null;
    shoe?: WardrobeItem | null;
    reason: string;
    occasion: string;
    imageUrl?: string;
  };
  liked: boolean;
  created_at: string;
}

export default function Dashboard() {
  const router = useRouter();
  
  // File & Upload state
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Canvas color palette state
  const [colorPalette, setColorPalette] = useState<{ hex: string; styleSenseColor: string }[]>([]);
  const [selectedColor, setSelectedColor] = useState<{ hex: string; styleSenseColor: string } | null>(null);

  // Core Wardrobe / Profile state
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [savedOutfits, setSavedOutfits] = useState<SavedOutfit[]>([]);
  const [styleProfile, setStyleProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"wardrobe" | "generator" | "history" | "gap" | "profile">("wardrobe");
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Outfit Generator state
  const [occasion, setOccasion] = useState<Occasion>("casual");
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [likedOutfits, setLikedOutfits] = useState<Record<number, boolean>>({});

  // Weather state
  const [cityInput, setCityInput] = useState("");
  const [weather, setWeather] = useState<any>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  // Gap Analysis state
  const [gapAnalysis, setGapAnalysis] = useState<string | null>(null);
  const [loadingGap, setLoadingGap] = useState(false);

  // DALL-E Image Modal State
  const [visualizeModalOpen, setVisualizeModalOpen] = useState(false);
  const [visualizingOutfit, setVisualizingOutfit] = useState<any>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [imageGenError, setImageGenError] = useState<string | null>(null);

  // ── USER VERIFICATION & DATA FETCH ────────────────────────────────────────

  useEffect(() => {
    const initializeDashboard = async () => {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        router.push("/login");
        return;
      }

      setCurrentUser(data.user);

      // Check style profile
      try {
        const { data: profile, error } = await supabase
          .from("user_profiles")
          .select("style_profile")
          .eq("user_id", data.user.id)
          .maybeSingle();

        if (error) throw error;

        if (!profile) {
          router.push("/onboarding");
          return;
        }

        setStyleProfile(profile.style_profile);
      } catch (err) {
        console.error("Profile check failed, user_profiles table might be missing.", err);
      }

      // Fetch items & saved outfits
      fetchItems(data.user.id);
      fetchSavedOutfits(data.user.id);
    };

    initializeDashboard();
  }, []);

  const fetchItems = async (userId: string) => {
    const { data } = await supabase
      .from("wardrobe_items")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    setItems((data as WardrobeItem[]) || []);
  };

  const fetchSavedOutfits = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("saved_outfits")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      setSavedOutfits((data as SavedOutfit[]) || []);
    } catch (err) {
      console.error("Failed to fetch saved outfits from table saved_outfits", err);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  // ── FILE & COLOR EXTRACTION HANDLING ──────────────────────────────────────

  const handleFileChange = async (f: File | null) => {
    setFile(f);
    setUploadError(null);
    if (!f) {
      setPreview(null);
      setColorPalette([]);
      setSelectedColor(null);
      return;
    }

    setPreview(URL.createObjectURL(f));

    // Canvas extraction
    try {
      const palette = await extractColorPalette(f, 5);
      setColorPalette(palette);
      if (palette.length > 0) {
        setSelectedColor(palette[0]);
      }
    } catch (err) {
      console.error("Failed to extract color palette via Canvas API", err);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFileChange(f);
  };

  const handleUpload = async () => {
    if (!file || !currentUser) return;

    setLoading(true);
    setUploadError(null);

    try {
      const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const formData = new FormData();
      formData.append("image", file);

      // Category extraction using flask backend
      const res = await fetch(`${BASE_URL}/analyze`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(`Category classifier error: ${res.status}`);

      const { category } = await res.json();
      
      // Dominant color preference: Canvas Selected Color, otherwise fallback to API detected
      const finalColor = selectedColor ? selectedColor.styleSenseColor : "unknown";

      // Upload to Supabase storage
      const fileName = `${Date.now()}-${file.name}`;
      await supabase.storage.from("wardrobe-images").upload(fileName, file);

      const { data } = supabase.storage
        .from("wardrobe-images")
        .getPublicUrl(fileName);

      // Insert item into table
      await supabase.from("wardrobe_items").insert([
        {
          image_url: data.publicUrl,
          category,
          color: finalColor,
          user_id: currentUser.id,
        },
      ]);

      await fetchItems(currentUser.id); 

      // Reset
      setFile(null);
      setPreview(null);
      setColorPalette([]);
      setSelectedColor(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      setUploadError(err.message || "Archive upload failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (item: WardrobeItem) => {
    if (!currentUser) return;
    const fileName = item.image_url.split("/").pop();
    await supabase.storage.from("wardrobe-images").remove([fileName!]);
    await supabase.from("wardrobe_items").delete().eq("id", item.id);
    await fetchItems(currentUser.id);
  };

  // ── WEATHER INTEGRATION ───────────────────────────────────────────────────

  const handleFetchWeather = async () => {
    const trimmed = cityInput.trim();
    if (!trimmed) return;

    setWeatherLoading(true);
    setWeather(null);
    try {
      const res = await fetch(`/api/weather?location=${encodeURIComponent(trimmed)}`);
      if (res.ok) {
        const data = await res.json();
        setWeather(data);
      } else {
        console.error("Failed to fetch weather for:", trimmed);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setWeatherLoading(false);
    }
  };

  // ── SMART LOCAL OUTFIT GENERATOR ─────────────────────────────────────────

  const getGroup = (cat: string) => {
    if (cat === "shirt") return "top";
    if (cat === "jeans") return "bottom";
    if (cat === "dress") return "full";
    if (cat === "shoes") return "footwear";
    return "unknown";
  };

  const generateOutfits = () => {
    const tops    = items.filter(i => getGroup(i.category) === "top");
    const bottoms = items.filter(i => getGroup(i.category) === "bottom");
    const dresses = items.filter(i => getGroup(i.category) === "full");
    const shoes   = items.filter(i => getGroup(i.category) === "footwear");

    const temp = weather ? weather.temp : undefined;
    const results: Outfit[] = [];

    // Weather rules
    const isCold = temp !== undefined && temp < 16;
    const isHot = temp !== undefined && temp > 24;

    // ── DRESS + SHOES ──
    if (!isCold) { // Avoid suggesting simple dresses in very cold weather without layers
      dresses.forEach(dress => {
        shoes.forEach(shoe => {
          if (!isStyleMatch(dress.style, occasion) || !isStyleMatch(shoe.style, occasion)) return;
          if (!isColorMatch(dress.color, shoe.color)) return;

          results.push({
            dress,
            shoe,
            score: dress.color === shoe.color ? 2 : 4,
            reason: `${occasion} look · dress & footwear`,
          });
        });
      });
    }

    // ── TOP + BOTTOM + SHOES ──
    tops.forEach(top => {
      bottoms.forEach(bottom => {
        shoes.forEach(shoe => {
          // Weather context filtering
          if (isCold && top.color === "white" && bottom.color === "white") return; // Arbitrary styling rules
          if (isHot && shoe.color === "black" && top.color === "black") return; // Heavy hot colors

          if (!isStyleMatch(top.style, occasion) || !isStyleMatch(bottom.style, occasion) || !isStyleMatch(shoe.style, occasion)) return;
          if (!isColorMatch(top.color, bottom.color) || !isColorMatch(bottom.color, shoe.color)) return;

          let score = 3;
          if (isColorMatch(top.color, bottom.color)) score += 2;
          if (isColorMatch(bottom.color, shoe.color)) score += 2;
          if (isColorMatch(top.color, shoe.color)) score += 1;

          results.push({
            top,
            bottom,
            shoe,
            score,
            reason: buildReason(occasion, top.color, bottom.color, temp),
          });
        });
      });
    });

    // Fallbacks if criteria too strict
    if (results.length === 0) {
      tops.forEach(top => {
        bottoms.forEach(bottom => {
          shoes.forEach(shoe => {
            if (isColorMatch(top.color, bottom.color)) {
              results.push({
                top, bottom, shoe,
                score: 1,
                reason: `${occasion} look · standard combo`,
              });
            }
          });
        });
      });
    }

    results.sort((a, b) => b.score - a.score || Math.random() - 0.5);

    // Deduplicate
    const unique: Outfit[] = [];
    const seen = new Set<string>();
    for (const o of results) {
      const key = JSON.stringify([o.top?.id, o.bottom?.id, o.dress?.id, o.shoe?.id]);
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(o);
      }
    }

    setOutfits(unique.slice(0, 9));
    setLikedOutfits({});
  };

  // ── SAVE & HISTORY SYNC ───────────────────────────────────────────────────

  const handleSaveOutfit = async (index: number, liked: boolean) => {
    if (!currentUser) return;
    setLikedOutfits(prev => ({ ...prev, [index]: liked }));

    const outfit = outfits[index];

    const outfitData = {
      top: outfit.top ? { id: outfit.top.id, image_url: outfit.top.image_url, category: outfit.top.category, color: outfit.top.color } : null,
      bottom: outfit.bottom ? { id: outfit.bottom.id, image_url: outfit.bottom.image_url, category: outfit.bottom.category, color: outfit.bottom.color } : null,
      dress: outfit.dress ? { id: outfit.dress.id, image_url: outfit.dress.image_url, category: outfit.dress.category, color: outfit.dress.color } : null,
      shoe: outfit.shoe ? { id: outfit.shoe.id, image_url: outfit.shoe.image_url, category: outfit.shoe.category, color: outfit.shoe.color } : null,
      reason: outfit.reason,
      occasion,
    };

    try {
      await supabase.from("saved_outfits").insert([
        {
          outfit_data: outfitData,
          liked,
          user_id: currentUser.id,
        },
      ]);
      fetchSavedOutfits(currentUser.id);
    } catch (err) {
      console.error("Failed to insert outfit to history:", err);
    }
  };

  const handleDeleteSavedOutfit = async (id: string) => {
    if (!currentUser) return;
    try {
      await supabase.from("saved_outfits").delete().eq("id", id);
      fetchSavedOutfits(currentUser.id);
    } catch (err) {
      console.error("Failed to delete saved outfit:", err);
    }
  };

  // ── CLAUDE GAP ANALYSIS ───────────────────────────────────────────────────

  const handleRunGapAnalysis = async () => {
    if (items.length === 0) return;
    setLoadingGap(true);
    setGapAnalysis(null);

    try {
      const res = await fetch("/api/gap-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wardrobeItems: items,
          styleProfile
        }),
      });

      if (!res.ok) throw new Error("Gap analysis failed");
      const data = await res.json();
      setGapAnalysis(data.report);
    } catch (err) {
      console.error(err);
      setGapAnalysis("Error generating gap analysis. Make sure OPENROUTER_API_KEY is configured.");
    } finally {
      setLoadingGap(false);
    }
  };

  // ── DALL-E VISUALIZATION ──────────────────────────────────────────────────

  const triggerVisualizeOutfit = async (outfit: any) => {
    setVisualizingOutfit(outfit);
    setGeneratedImageUrl(null);
    setImageGenError(null);
    setVisualizeModalOpen(true);
    setGeneratingImage(true);

    // Build description
    const pieces: string[] = [];
    if (outfit.top) pieces.push(`a ${outfit.top.color} ${outfit.top.category}`);
    if (outfit.bottom) pieces.push(`a ${outfit.bottom.color} ${outfit.bottom.category}`);
    if (outfit.dress) pieces.push(`a ${outfit.dress.color} ${outfit.dress.category}`);
    if (outfit.shoe) pieces.push(`a pair of ${outfit.shoe.color} shoes`);

    const outfitDesc = pieces.join(", and ");
    const description = `A fashion model posing in a ${outfit.occasion || occasion} look showcasing: ${outfitDesc}. ${outfit.reason || ""}`;

    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });

      if (!res.ok) throw new Error("Image generation route error");
      
      const data = await res.json();
      setGeneratedImageUrl(data.imageUrl);
    } catch (err: any) {
      console.error(err);
      setImageGenError("Image generation failed. Verify your OPENAI_API_KEY.");
    } finally {
      setGeneratingImage(false);
    }
  };

  const saveVisualizedImageToHistory = async () => {
    if (!visualizingOutfit || !generatedImageUrl || !currentUser) return;
    
    try {
      const updatedData = {
        ...visualizingOutfit,
        imageUrl: generatedImageUrl
      };

      // Check if this outfit is from history list or currently generated local list
      // If it has a record ID, it's in history, we update it in Supabase
      if (visualizingOutfit.id) {
        const { error } = await supabase
          .from("saved_outfits")
          .update({ outfit_data: updatedData })
          .eq("id", visualizingOutfit.id);
        
        if (error) throw error;
      }
      
      // Update local state to reflect change immediately
      fetchSavedOutfits(currentUser.id);
      setVisualizeModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  // ── RENDER ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#1A1A1A] font-sans selection:bg-[#4C5850]/15 flex flex-col">
      
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-[#FAFAF8]/95 backdrop-blur-md border-b border-stone-200 px-6 md:px-12 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#1A1A1A] flex items-center justify-center">
            <span className="text-white text-xs">✦</span>
          </div>
          <h1 className="font-heading text-lg font-bold tracking-tight text-[#1A1A1A] uppercase">
            StyleSense
          </h1>
        </div>

        {/* Tab switch navigation */}
        <div className="flex items-center gap-6 overflow-x-auto no-scrollbar scroll-smooth">
          {[
            { id: "wardrobe", label: `Archive (${items.length})` },
            { id: "generator", label: "Generator" },
            { id: "history", label: `Saved (${savedOutfits.length})` },
            { id: "gap", label: "Gaps & Audit" },
            { id: "profile", label: "Style Profile" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`text-xs uppercase tracking-widest font-semibold pb-1 border-b-2 transition-all duration-300 whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-[#1A1A1A] text-[#1A1A1A]"
                  : "border-transparent text-stone-400 hover:text-[#1A1A1A]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 justify-end">
          <button
            onClick={handleLogout}
            className="text-xs uppercase tracking-widest font-medium text-stone-400 hover:text-[#1A1A1A] transition-colors"
          >
            Log out
          </button>
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <main className="max-w-7xl mx-auto px-6 md:px-12 py-12 flex-1 w-full space-y-12">

        {/* ── TAB: WARDROBE ARCHIVE ── */}
        {activeTab === "wardrobe" && (
          <div className="space-y-12 animate-in fade-in duration-500">
            {/* Upload Area */}
            <div className="grid lg:grid-cols-5 gap-12 items-start">
              
              <div className="lg:col-span-2 flex flex-col gap-6">
                <div>
                  <h2 className="font-heading text-4xl font-bold text-[#1A1A1A] leading-tight mb-4">
                    Curate your <br /> <span className="italic font-light text-stone-500">collection.</span>
                  </h2>
                  <p className="text-sm text-stone-500 leading-relaxed max-w-sm font-light">
                    Upload photos. We auto-detect category, extract pixel color palettes, and match profiles.
                  </p>
                </div>

                {/* Extracted Canvas Palette Preview */}
                {colorPalette.length > 0 && (
                  <div className="border border-stone-200 bg-white p-4 space-y-3">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 block">
                      Canvas Extracted Palette (Click to set primary)
                    </span>
                    <div className="flex items-center gap-3">
                      {colorPalette.map((col, idx) => {
                        const isChosen = selectedColor?.hex === col.hex;
                        return (
                          <button
                            key={idx}
                            onClick={() => setSelectedColor(col)}
                            style={{ backgroundColor: col.hex }}
                            className="w-10 h-10 border border-stone-200 relative flex items-center justify-center group"
                            title={col.styleSenseColor}
                          >
                            {isChosen && (
                              <Check className="w-4 h-4 text-white drop-shadow-md" />
                            )}
                            <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[6px] text-white opacity-0 group-hover:opacity-100 text-center font-semibold">
                              {col.styleSenseColor}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {selectedColor && (
                      <p className="text-[11px] text-stone-500 font-light">
                        Primary Color: <span className="font-semibold uppercase text-[#1A1A1A]">{selectedColor.styleSenseColor}</span>
                      </p>
                    )}
                  </div>
                )}

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
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 text-xs px-4 py-3 shadow-sm font-light">
                    <span>⚠</span>
                    <span>{uploadError}</span>
                  </div>
                )}
              </div>

              {/* Upload Drop Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`lg:col-span-3 cursor-pointer border border-dashed h-[320px] flex flex-col items-center justify-center gap-4 transition-all duration-300 relative overflow-hidden group
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

            {/* Wardrobe Grid */}
            <div className="space-y-6">
              <div className="flex items-baseline justify-between border-b border-stone-200 pb-4">
                <h3 className="font-heading text-2xl font-bold text-[#1A1A1A] uppercase tracking-tight">The Archive</h3>
                <span className="text-xs uppercase tracking-widest font-semibold text-stone-400">
                  {items.length} {items.length === 1 ? 'piece' : 'pieces'}
                </span>
              </div>

              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white border border-stone-200 text-center">
                  <div className="w-12 h-12 bg-stone-50 flex items-center justify-center text-stone-300 mb-6">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                  </div>
                  <h4 className="text-sm uppercase tracking-widest font-semibold text-[#1A1A1A] mb-2">No pieces yet</h4>
                  <p className="text-xs text-stone-400 max-w-xs font-light">Upload your clothing items to build your digital archive.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="group relative bg-white border border-stone-200 overflow-hidden transition-all duration-500 hover:shadow-md"
                    >
                      <button
                        onClick={() => handleDelete(item)}
                        className="absolute top-3 right-3 z-10 w-7 h-7 bg-white border border-stone-200 text-stone-400 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-stone-100 hover:text-red-500 transition-all duration-300"
                        title="Remove"
                      >
                        ✕
                      </button>

                      <div className="h-56 flex items-center justify-center p-6 bg-stone-50/50">
                        <img src={item.image_url} alt={item.category} className="max-h-full max-w-full object-contain transition-transform duration-700 group-hover:scale-105" />
                      </div>

                      <div className="px-4 py-3 border-t border-stone-200 flex flex-col gap-1.5">
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-[#1A1A1A]">
                          {CATEGORY_LABEL[item.category] || item.category}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full border border-stone-200 ${COLOR_DOT[item.color as keyof typeof COLOR_DOT] || "bg-stone-300"}`} />
                          <span className="text-[10px] font-medium text-stone-400 uppercase tracking-widest">
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

        {/* ── TAB: OUTFIT GENERATOR ── */}
        {activeTab === "generator" && (
          <div className="grid lg:grid-cols-4 gap-12 items-start animate-in fade-in duration-500">
            {/* Control Sidebar */}
            <div className="lg:col-span-1 space-y-8 bg-white border border-stone-200 p-6">
              <h3 className="font-heading text-lg font-bold uppercase tracking-wider">Parameters</h3>

              {/* Weather Widget */}
              <div className="space-y-4">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 flex items-center gap-1.5">
                  <CloudSun className="w-3.5 h-3.5" /> Weather Integration
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={cityInput}
                    onChange={(e) => setCityInput(e.target.value)}
                    placeholder="Enter city..."
                    className="flex-1 text-xs bg-stone-50 border border-stone-200 px-3 py-2 outline-none focus:border-[#4C5850]"
                  />
                  <button
                    onClick={handleFetchWeather}
                    disabled={weatherLoading}
                    className="bg-[#4C5850] text-white text-xs px-3 py-2 font-semibold hover:bg-[#3A453E]"
                  >
                    Go
                  </button>
                </div>

                {weather && (
                  <div className="bg-[#F1F3F0] p-4 space-y-1">
                    <p className="text-xs font-semibold uppercase text-stone-700">
                      {weather.location}
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold">{weather.temp}°C</span>
                      <span className="text-xs font-light text-stone-500 capitalize">{weather.description}</span>
                    </div>
                    {weather.isMock && (
                      <span className="text-[8px] uppercase tracking-wider text-stone-400 font-semibold flex items-center gap-1">
                        <Info className="w-2.5 h-2.5" /> Mock Data
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Occasion Selection */}
              <div className="space-y-2">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
                  Target Occasion
                </span>
                <select
                  value={occasion}
                  onChange={(e) => setOccasion(e.target.value as Occasion)}
                  className="w-full text-xs uppercase tracking-widest font-semibold text-[#1A1A1A] bg-stone-50 border border-stone-200 px-3 py-2.5 outline-none cursor-pointer hover:border-stone-400"
                >
                  <option value="casual">Casual</option>
                  <option value="work">Work</option>
                  <option value="date night">Date Night</option>
                  <option value="formal">Formal</option>
                </select>
              </div>

              <button
                onClick={generateOutfits}
                disabled={items.length < 2}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#4C5850] hover:bg-[#3A453E] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs uppercase tracking-widest font-semibold transition-colors duration-300"
              >
                ✦ Generate Looks
              </button>
            </div>

            {/* Generated Looks Grid */}
            <div className="lg:col-span-3 space-y-6">
              <h3 className="font-heading text-2xl font-bold text-[#1A1A1A] uppercase tracking-tight">Generated Combinations</h3>
              
              {outfits.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 bg-white border border-stone-200 text-center">
                  <span className="text-2xl mb-4 text-[#4C5850]">✦</span>
                  <h4 className="text-sm uppercase tracking-widest font-semibold text-[#1A1A1A] mb-2">Awaiting Inspiration</h4>
                  <p className="text-xs text-stone-400 max-w-sm font-light">Set your weather, select an occasion, and click generate to build styled outfits.</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {outfits.map((outfit, index) => (
                    <div
                      key={index}
                      className="bg-white border border-stone-200 overflow-hidden flex flex-col justify-between"
                    >
                      {/* Outfit pieces preview */}
                      <div className="bg-stone-50/50 p-6 flex flex-wrap items-center justify-center gap-4 min-h-[220px]">
                        {outfit.top && <img src={outfit.top.image_url} className="h-24 w-24 object-contain" alt="top" />}
                        {outfit.bottom && <img src={outfit.bottom.image_url} className="h-24 w-24 object-contain" alt="bottom" />}
                        {outfit.dress && <img src={outfit.dress.image_url} className="h-32 w-32 object-contain" alt="dress" />}
                        {outfit.shoe && <img src={outfit.shoe.image_url} className="h-20 w-20 object-contain" alt="shoes" />}
                      </div>

                      {/* Info Panel */}
                      <div className="p-4 border-t border-stone-200 space-y-3 bg-white">
                        <div>
                          <span className="text-[8px] font-semibold uppercase tracking-wider text-stone-400 block mb-0.5">
                            Styling Note
                          </span>
                          <span className="text-xs text-stone-700 font-light block">
                            {outfit.reason}
                          </span>
                        </div>

                        {/* Save & Visualize options */}
                        <div className="flex items-center justify-between gap-4 pt-1">
                          <button
                            onClick={() => triggerVisualizeOutfit(outfit)}
                            className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest font-bold text-[#4C5850] hover:text-[#1A1A1A]"
                          >
                            ✦ Visualize
                          </button>

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSaveOutfit(index, true)}
                              className={`w-8 h-8 border flex items-center justify-center transition-all duration-300
                                ${likedOutfits[index] === true
                                  ? "bg-[#1A1A1A] border-[#1A1A1A] text-white"
                                  : "border-stone-200 text-stone-400 hover:border-[#1A1A1A] hover:text-[#1A1A1A]"
                                }`}
                              title="Save Look"
                            >
                              <Heart className="w-3.5 h-3.5 fill-current" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB: SAVED OUTFIT HISTORY ── */}
        {activeTab === "history" && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <h3 className="font-heading text-2xl font-bold text-[#1A1A1A] uppercase tracking-tight">Saved Looks History</h3>

            {savedOutfits.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white border border-stone-200 text-center">
                <Bookmark className="w-10 h-10 text-stone-300 mb-4" />
                <h4 className="text-sm uppercase tracking-widest font-semibold text-[#1A1A1A] mb-2">No saved looks</h4>
                <p className="text-xs text-stone-400 font-light max-w-xs">Looks liked in the generator or saved via Chat will appear in this archive.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedOutfits.map((saved) => {
                  const od = saved.outfit_data;
                  return (
                    <div
                      key={saved.id}
                      className="bg-white border border-stone-200 overflow-hidden flex flex-col justify-between"
                    >
                      {/* Outfit pieces preview */}
                      <div className="bg-stone-50/50 p-6 relative flex flex-wrap items-center justify-center gap-4 min-h-[220px]">
                        {od.imageUrl ? (
                          <img src={od.imageUrl} className="absolute inset-0 w-full h-full object-cover" alt="AI visual" />
                        ) : (
                          <>
                            {od.top && <img src={od.top.image_url} className="h-24 w-24 object-contain" alt="top" />}
                            {od.bottom && <img src={od.bottom.image_url} className="h-24 w-24 object-contain" alt="bottom" />}
                            {od.dress && <img src={od.dress.image_url} className="h-32 w-32 object-contain" alt="dress" />}
                            {od.shoe && <img src={od.shoe.image_url} className="h-20 w-20 object-contain" alt="shoes" />}
                          </>
                        )}
                      </div>

                      {/* Info Panel */}
                      <div className="p-4 border-t border-stone-200 space-y-3 bg-white z-10">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[8px] font-semibold uppercase tracking-wider text-stone-400 block mb-0.5">
                              {od.occasion || "casual"} styling note
                            </span>
                            <span className="text-xs text-stone-700 font-light block">
                              {od.reason}
                            </span>
                          </div>
                        </div>

                        {/* Save & Visualize options */}
                        <div className="flex items-center justify-between gap-4 pt-1">
                          <button
                            onClick={() => triggerVisualizeOutfit(saved.outfit_data)}
                            className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest font-bold text-[#4C5850] hover:text-[#1A1A1A]"
                          >
                            ✦ {od.imageUrl ? "Re-visualize" : "Visualize Look"}
                          </button>

                          <button
                            onClick={() => handleDeleteSavedOutfit(saved.id)}
                            className="w-8 h-8 border border-stone-200 text-stone-400 hover:text-red-500 flex items-center justify-center"
                            title="Delete Look"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: WARDROBE GAP AUDIT ── */}
        {activeTab === "gap" && (
          <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="text-center space-y-4">
              <h2 className="font-heading text-3xl font-bold tracking-tight uppercase">Wardrobe Gap Analysis</h2>
              <p className="text-sm text-stone-500 font-light max-w-md mx-auto">
                Claude will analyze your active wardrobe list and your quiz profile to find out what essential items are missing to complete your style.
              </p>
              
              <button
                onClick={handleRunGapAnalysis}
                disabled={loadingGap || items.length === 0}
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#4C5850] hover:bg-[#3A453E] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs uppercase tracking-widest font-semibold transition-all duration-300"
              >
                {loadingGap ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                    Generating Audit...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" /> Run Gap Analysis
                  </>
                )}
              </button>
            </div>

            {gapAnalysis && (
              <div className="bg-white border border-stone-200 p-8 shadow-sm prose max-w-none text-stone-800 font-light leading-relaxed whitespace-pre-wrap text-sm">
                {gapAnalysis}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: STYLE PROFILE ── */}
        {activeTab === "profile" && (
          <div className="max-w-xl mx-auto bg-white border border-stone-200 p-8 space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center gap-3 border-b border-stone-200 pb-4">
              <User className="w-5 h-5 text-[#4C5850]" />
              <h3 className="font-heading text-xl font-bold uppercase tracking-tight">User Style Profile</h3>
            </div>

            {styleProfile ? (
              <div className="grid gap-4">
                {[
                  { label: "Aesthetic style", val: styleProfile.aesthetic },
                  { label: "Preferred color palette", val: styleProfile.palette },
                  { label: "Silhouette & fit", val: styleProfile.fit },
                  { label: "Primary fashion focus", val: styleProfile.priority },
                  { label: "Formal dressing frequency", val: styleProfile.formal_frequency },
                ].map((profileField, idx) => (
                  <div key={idx} className="flex justify-between items-baseline py-2 border-b border-stone-100 last:border-0">
                    <span className="text-xs uppercase tracking-widest font-semibold text-stone-400">{profileField.label}</span>
                    <span className="text-sm font-semibold text-[#1A1A1A]">{profileField.val}</span>
                  </div>
                ))}
                
                <button
                  onClick={() => router.push("/onboarding")}
                  className="mt-6 border border-stone-200 py-3 text-xs uppercase tracking-widest font-semibold hover:border-[#1A1A1A] transition-colors text-center w-full"
                >
                  Retake Style Quiz
                </button>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-stone-400 font-light mb-4">No style profile exists.</p>
                <button
                  onClick={() => router.push("/onboarding")}
                  className="px-6 py-2 bg-[#4C5850] text-white text-xs uppercase tracking-widest font-semibold"
                >
                  Take Style Quiz
                </button>
              </div>
            )}
          </div>
        )}

      </main>

      {/* CHATBOT */}
      <Chatbot wardrobeItems={items} />

      {/* ── VISUALIZATION IMAGE MODAL ── */}
      {visualizeModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#1A1A1A]/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FAFAF8] border border-stone-200 max-w-lg w-full flex flex-col overflow-hidden relative shadow-2xl animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setVisualizeModalOpen(false)}
              className="absolute top-4 right-4 z-10 w-8 h-8 bg-white border border-stone-200 text-stone-500 hover:text-black flex items-center justify-center"
            >
              ✕
            </button>

            <div className="p-6 space-y-6">
              <h4 className="font-heading text-lg font-bold uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#4C5850]" /> AI Outfit Visualization
              </h4>

              {generatingImage && (
                <div className="h-80 flex flex-col items-center justify-center space-y-4 bg-stone-50 border border-stone-200">
                  <span className="w-8 h-8 border-4 border-[#4C5850]/30 border-t-[#4C5850] rounded-full animate-spin" />
                  <p className="text-xs uppercase tracking-widest font-semibold text-stone-400 animate-pulse">
                    AI is weaving your vision...
                  </p>
                </div>
              )}

              {imageGenError && (
                <div className="h-80 flex flex-col items-center justify-center p-6 space-y-4 bg-red-50 border border-red-200 text-center">
                  <span className="text-2xl text-red-500">⚠</span>
                  <p className="text-xs text-red-600 font-light leading-relaxed max-w-xs">{imageGenError}</p>
                </div>
              )}

              {generatedImageUrl && (
                <div className="space-y-4">
                  <div className="h-80 border border-stone-200 overflow-hidden relative">
                    <img src={generatedImageUrl} className="w-full h-full object-cover" alt="AI Generated Outfit" />
                  </div>
                  
                  <div className="flex gap-4">
                    <button
                      onClick={saveVisualizedImageToHistory}
                      className="flex-1 py-3 bg-[#4C5850] hover:bg-[#3A453E] text-white text-xs uppercase tracking-widest font-semibold transition-colors"
                    >
                      Save Visualization to Outfit
                    </button>
                    <button
                      onClick={() => setVisualizeModalOpen(false)}
                      className="px-6 py-3 border border-stone-200 hover:border-black text-xs uppercase tracking-widest font-semibold transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}