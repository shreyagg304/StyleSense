"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

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

const COLOR_DOT: Record<string, string> = {
  white: "bg-white border border-gray-300",
  black: "bg-gray-900",
  gray: "bg-gray-400",
  red: "bg-red-500",
  green: "bg-green-500",
  blue: "bg-blue-500",
  yellow: "bg-yellow-400",
  purple: "bg-purple-500",
  mixed: "bg-gradient-to-br from-pink-400 via-yellow-300 to-blue-400",
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [outfits, setOutfits] = useState<any[]>([]);
  const [likedOutfits, setLikedOutfits] = useState<Record<number, boolean>>({});
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"wardrobe" | "looks">("wardrobe");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---------------- FETCH ----------------
  const fetchItems = async () => {
    const { data } = await supabase
      .from("wardrobe_items")
      .select("*")
      .order("created_at", { ascending: false });
    setItems(data || []);
  };

  useEffect(() => { fetchItems(); }, []);

  // ---------------- FILE HANDLING ----------------
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

  // ---------------- UPLOAD ----------------
  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("http://127.0.0.1:5000/analyze", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const { color, category } = await res.json();

      const fileName = `${Date.now()}-${file.name}`;
      await supabase.storage.from("wardrobe-images").upload(fileName, file);

      const { data } = supabase.storage
        .from("wardrobe-images")
        .getPublicUrl(fileName);

      await supabase.from("wardrobe_items").insert([
        { image_url: data.publicUrl, category, color },
      ]);

      await fetchItems();
      setFile(null);
      setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      setUploadError(err.message || "Upload failed. Is Flask running?");
    }

    setLoading(false);
  };

  // ---------------- OUTFIT LOGIC ----------------
  const getGroup = (cat: string) => {
    if (cat === "shirt") return "top";
    if (cat === "jeans") return "bottom";
    if (cat === "dress") return "full";
    if (cat === "shoes") return "footwear";
    return "unknown";
  };

  const pickRandom = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];

  const generateOutfits = () => {
    const tops    = items.filter(i => getGroup(i.category) === "top");
    const bottoms = items.filter(i => getGroup(i.category) === "bottom");
    const dresses = items.filter(i => getGroup(i.category) === "full");
    const shoes   = items.filter(i => getGroup(i.category) === "footwear");

    const results: any[] = [];

    if (dresses.length && shoes.length) {
      for (let i = 0; i < 3; i++)
        results.push({ dress: pickRandom(dresses), shoe: pickRandom(shoes), reason: "Effortless minimal look" });
    }

    if (tops.length && bottoms.length && shoes.length) {
      for (let i = 0; i < 6; i++)
        results.push({ top: pickRandom(tops), bottom: pickRandom(bottoms), shoe: pickRandom(shoes), reason: "Clean everyday styling" });
    }

    const unique: any[] = [];
    const seen = new Set();
    for (const o of results) {
      const key = JSON.stringify([o.top?.id, o.bottom?.id, o.dress?.id, o.shoe?.id]);
      if (!seen.has(key)) { seen.add(key); unique.push(o); }
    }

    setOutfits(unique.slice(0, 6));
    setActiveTab("looks");
  };

  // ---------------- FEEDBACK ----------------
  const handleFeedback = async (index: number, liked: boolean) => {
    setLikedOutfits(prev => ({ ...prev, [index]: liked }));
    await supabase.from("outfit_feedback").insert([{ liked }]);
  };

  // ---------------- DELETE ----------------
  const handleDelete = async (item: any) => {
    const fileName = item.image_url.split("/").pop();
    await supabase.storage.from("wardrobe-images").remove([fileName]);
    await supabase.from("wardrobe_items").delete().eq("id", item.id);
    await fetchItems();
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 bg-stone-50/90 backdrop-blur-sm border-b border-stone-200 px-6 md:px-12 py-4 flex items-center justify-between gap-4">

        {/* Logo */}
        <h1 className="text-xl font-semibold tracking-widest uppercase text-stone-800">
          Style<span className="text-amber-900">.</span>Sense
        </h1>

        {/* Tab switcher */}
        <div className="flex items-center bg-stone-200 rounded-full p-1 gap-1">
          <button
            onClick={() => setActiveTab("wardrobe")}
            className={`px-5 py-1.5 rounded-full text-xs font-medium tracking-wide transition-all duration-200 ${
              activeTab === "wardrobe"
                ? "bg-stone-900 text-white shadow-sm"
                : "text-stone-500 hover:text-stone-800"
            }`}
          >
            Wardrobe {items.length > 0 && `(${items.length})`}
          </button>
          <button
            onClick={() => setActiveTab("looks")}
            className={`px-5 py-1.5 rounded-full text-xs font-medium tracking-wide transition-all duration-200 ${
              activeTab === "looks"
                ? "bg-stone-900 text-white shadow-sm"
                : "text-stone-500 hover:text-stone-800"
            }`}
          >
            Looks {outfits.length > 0 && `(${outfits.length})`}
          </button>
        </div>

        {/* Generate button — always visible in header */}
        <button
          onClick={generateOutfits}
          disabled={items.length < 2}
          className="flex items-center gap-2 px-5 py-2 bg-amber-800 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold tracking-wider uppercase rounded-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-200"
        >
          <span>✦</span> Generate Looks
        </button>
      </header>

      <main className="max-w-7xl mx-auto px-6 md:px-12 py-10 space-y-14">

        {/* ══════════════════════════════════
            TAB: WARDROBE
        ══════════════════════════════════ */}
        {activeTab === "wardrobe" && (
          <>
            {/* ── UPLOAD SECTION ── */}
            <div className="grid md:grid-cols-2 gap-8 items-center bg-white rounded-2xl border border-stone-200 p-8">

              {/* Drop zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`cursor-pointer rounded-xl border-2 border-dashed min-h-50 flex flex-col items-center justify-center gap-3 transition-all duration-200
                  ${dragOver
                    ? "border-amber-400 bg-amber-50"
                    : preview
                    ? "border-amber-300 bg-stone-50"
                    : "border-stone-300 bg-stone-50 hover:border-stone-400 hover:bg-stone-100"
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
                  <img
                    src={preview}
                    alt="preview"
                    className="max-h-44 max-w-full object-contain rounded-lg px-4"
                  />
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-full bg-stone-200 flex items-center justify-center text-xl text-stone-400">
                      +
                    </div>
                    <p className="text-sm text-stone-500 font-medium">Drop your item here</p>
                    <p className="text-xs text-stone-400">or click to browse · JPG, PNG, WEBP</p>
                  </>
                )}
              </div>

              {/* Upload info + CTA */}
              <div className="flex flex-col gap-5">
                <div>
                  <h2 className="text-3xl font-light text-stone-800 leading-snug mb-2">
                    Add to your{" "}
                    <span className="italic text-amber-900">wardrobe</span>
                  </h2>
                  <p className="text-sm text-stone-500 leading-relaxed">
                    Our AI detects the category — shirt, jeans, dress, or shoes — and color automatically. Just drop a photo and we handle the rest.
                  </p>
                </div>

                <button
                  onClick={handleUpload}
                  disabled={!file || loading}
                  className="self-start flex items-center gap-2 px-7 py-3 bg-stone-900 hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-full transition-all duration-200 hover:-translate-y-0.5"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                      Analysing...
                    </>
                  ) : (
                    "Add to Wardrobe"
                  )}
                </button>

                {uploadError && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 text-xs px-4 py-3 rounded-xl">
                    <span>⚠</span>
                    <span>{uploadError}</span>
                  </div>
                )}
              </div>
            </div>

            {/* ── WARDROBE GRID ── */}
            <div>
              <div className="flex items-baseline gap-3 mb-6">
                <h2 className="text-2xl font-light text-stone-800">My Wardrobe</h2>
                {items.length > 0 && (
                  <span className="text-xs text-stone-400 bg-stone-200 px-3 py-1 rounded-full">
                    {items.length} items
                  </span>
                )}
              </div>

              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <span className="text-5xl mb-4 opacity-30">👗</span>
                  <h3 className="text-xl font-light text-stone-600 mb-1">Your wardrobe is empty</h3>
                  <p className="text-sm text-stone-400">Upload your first piece to get started</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="group relative bg-white rounded-2xl border border-stone-200 overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-stone-200"
                    >
                      {/* ✅ Delete — top-right, appears on hover via group */}
                      <button
                        onClick={() => handleDelete(item)}
                        className="absolute top-2.5 right-2.5 z-10 w-7 h-7 rounded-full bg-stone-900/70 backdrop-blur-sm text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500! transition-all duration-200"
                        title="Remove"
                      >
                        ✕
                      </button>

                      {/* Image */}
                      <div className={`h-48 flex items-center justify-center p-3 ${CATEGORY_BG[item.category] || "bg-stone-50"}`}>
                        <img
                          src={item.image_url}
                          alt={item.category}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>

                      {/* Footer */}
                      <div className="px-3 py-2.5 border-t border-stone-100 flex items-center justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-700">
                          {CATEGORY_LABEL[item.category] || item.category}
                        </span>
                        <span className="flex items-center gap-1.5 text-[11px] text-stone-400 capitalize">
                          <span className={`w-2.5 h-2.5 rounded-full inline-block shrink-0 ${COLOR_DOT[item.color] || "bg-stone-300"}`} />
                          {item.color}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ══════════════════════════════════
            TAB: LOOKS
        ══════════════════════════════════ */}
        {activeTab === "looks" && (
          <div>
            <div className="flex items-baseline gap-3 mb-8">
              <h2 className="text-2xl font-light text-stone-800">Generated Looks</h2>
              {outfits.length > 0 && (
                <span className="text-xs text-stone-400 bg-stone-200 px-3 py-1 rounded-full">
                  {outfits.length} outfits
                </span>
              )}
            </div>

            {outfits.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <span className="text-5xl mb-4 opacity-30">✦</span>
                <h3 className="text-xl font-light text-stone-600 mb-1">No looks yet</h3>
                <p className="text-sm text-stone-400 mb-6">Go to your wardrobe and hit "Generate Looks"</p>
                <button
                  onClick={() => setActiveTab("wardrobe")}
                  className="px-6 py-2.5 bg-stone-900 text-white text-sm rounded-full hover:bg-stone-700 transition"
                >
                  Go to Wardrobe
                </button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {outfits.map((outfit, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-2xl border border-stone-200 overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-stone-100"
                  >
                    {/* Outfit images */}
                    <div className="bg-stone-50 p-4 flex items-center justify-center gap-3 min-h-45 flex-wrap border-b border-stone-100">
                      {outfit.top && (
                        <img src={outfit.top.image_url} className="h-32 object-contain flex-1 min-w-17.5" alt="top" />
                      )}
                      {outfit.bottom && (
                        <img src={outfit.bottom.image_url} className="h-32 object-contain flex-1 min-w-17.5" alt="bottom" />
                      )}
                      {outfit.dress && (
                        <img src={outfit.dress.image_url} className="h-32 object-contain flex-1 min-w-17.5" alt="dress" />
                      )}
                      {outfit.shoe && (
                        <img src={outfit.shoe.image_url} className="h-32 object-contain flex-1 min-w-17.5" alt="shoes" />
                      )}
                    </div>

                    {/* Card footer */}
                    <div className="px-4 py-3 flex items-center justify-between">
                      <span className="text-sm italic text-stone-400 font-light">
                        {outfit.reason}
                      </span>

                      {/* Like / Dislike */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleFeedback(index, true)}
                          title="Love it"
                          className={`w-8 h-8 rounded-full border text-sm flex items-center justify-center transition-all duration-200
                            ${likedOutfits[index] === true
                              ? "bg-stone-900 border-stone-900 text-white"
                              : "border-stone-200 text-stone-400 hover:border-amber-400 hover:text-amber-900"
                            }`}
                        >
                          {likedOutfits[index] === true ? "♥" : "♡"}
                        </button>
                        <button
                          onClick={() => handleFeedback(index, false)}
                          title="Not for me"
                          className={`w-8 h-8 rounded-full border text-xs flex items-center justify-center transition-all duration-200
                            ${likedOutfits[index] === false
                              ? "bg-stone-900 border-stone-900 text-white"
                              : "border-stone-200 text-stone-400 hover:border-stone-400"
                            }`}
                        >
                          ✕
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
    </div>
  );
}