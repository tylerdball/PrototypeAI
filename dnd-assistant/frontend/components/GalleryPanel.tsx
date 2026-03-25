"use client";

import { useEffect, useState } from "react";
import { Upload, Trash2, X } from "lucide-react";
import { clsx } from "clsx";

interface ImageEntry {
  id: number;
  filename: string;
  original_name: string;
  category: string;
  caption: string;
}

const CATEGORIES = ["general", "maps", "locations", "characters", "items", "other"];

const CAT_COLORS: Record<string, string> = {
  general: "text-gray-400 border-gray-700",
  maps: "text-green-400 border-green-800",
  locations: "text-blue-400 border-blue-800",
  characters: "text-yellow-400 border-yellow-800",
  items: "text-purple-400 border-purple-800",
  other: "text-gray-400 border-gray-700",
};

export default function GalleryPanel({ campaignId }: { campaignId: number }) {
  const [images, setImages] = useState<ImageEntry[]>([]);
  const [filter, setFilter] = useState("all");
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState("general");
  const [caption, setCaption] = useState("");
  const [lightbox, setLightbox] = useState<ImageEntry | null>(null);

  const BACKEND = "http://127.0.0.1:8003";

  useEffect(() => {
    fetch(`/api/backend/campaigns/${campaignId}/images`)
      .then((r) => r.json())
      .then(setImages);
  }, [campaignId]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("category", category);
      fd.append("caption", caption);
      const res = await fetch(`/api/backend/campaigns/${campaignId}/images`, {
        method: "POST",
        body: fd,
      });
      const img = await res.json();
      setImages((prev) => [img, ...prev]);
    }
    setCaption("");
    e.target.value = "";
    setUploading(false);
  }

  async function deleteImage(id: number) {
    await fetch(`/api/backend/campaigns/${campaignId}/images/${id}`, { method: "DELETE" });
    setImages((prev) => prev.filter((i) => i.id !== id));
    if (lightbox?.id === id) setLightbox(null);
  }

  const filtered = filter === "all" ? images : images.filter((i) => i.category === filter);

  return (
    <div className="space-y-4">
      {/* Upload bar */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
        <h2 className="font-semibold text-[#f0ead6] mb-3">Upload Images</h2>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs text-[var(--muted)] mb-1 block">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className="bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[#f0ead6] focus:outline-none focus:border-brand-400 capitalize">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-40">
            <label className="text-xs text-[var(--muted)] mb-1 block">Caption (optional)</label>
            <input value={caption} onChange={(e) => setCaption(e.target.value)}
              placeholder="e.g. The village of Barovia"
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[#f0ead6] placeholder-[var(--muted)] focus:outline-none focus:border-brand-400" />
          </div>
          <label className={clsx("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer",
            uploading ? "bg-brand-600 opacity-50" : "bg-brand-500 hover:bg-brand-600 text-white")}>
            <Upload size={14} />
            {uploading ? "Uploading…" : "Choose Files"}
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 flex-wrap">
        <button onClick={() => setFilter("all")}
          className={clsx("text-xs px-2 py-1 rounded border transition-colors", filter === "all" ? "border-brand-400 text-brand-400" : "border-[var(--border)] text-[var(--muted)] hover:text-[#f0ead6]")}>
          All ({images.length})
        </button>
        {CATEGORIES.filter((c) => images.some((i) => i.category === c)).map((c) => (
          <button key={c} onClick={() => setFilter(c)}
            className={clsx("text-xs px-2 py-1 rounded border transition-colors capitalize", filter === c ? "border-brand-400 text-brand-400" : "border-[var(--border)] text-[var(--muted)] hover:text-[#f0ead6]")}>
            {c} ({images.filter((i) => i.category === c).length})
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="text-center text-[var(--muted)] py-12">No images yet. Upload maps, character art, and location images.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((img) => (
            <div key={img.id} className="group relative bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
              <img
                src={`${BACKEND}/uploads/${campaignId}/${img.filename}`}
                alt={img.caption || img.original_name}
                className="w-full h-40 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setLightbox(img)}
              />
              <div className="p-2">
                <div className="flex items-center justify-between gap-1">
                  <span className={clsx("text-xs px-1.5 py-0.5 rounded border capitalize shrink-0", CAT_COLORS[img.category] || CAT_COLORS.other)}>
                    {img.category}
                  </span>
                  <button onClick={() => deleteImage(img.id)}
                    className="opacity-0 group-hover:opacity-100 text-[var(--muted)] hover:text-red-400 transition-all p-0.5">
                    <Trash2 size={12} />
                  </button>
                </div>
                {img.caption && <p className="text-xs text-[var(--muted)] mt-1 truncate">{img.caption}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <div className="relative max-w-4xl max-h-full" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setLightbox(null)}
              className="absolute -top-3 -right-3 bg-[var(--surface)] border border-[var(--border)] rounded-full p-1 text-[var(--muted)] hover:text-[#f0ead6] z-10">
              <X size={16} />
            </button>
            <img src={`${BACKEND}/uploads/${campaignId}/${lightbox.filename}`}
              alt={lightbox.caption || lightbox.original_name}
              className="max-w-full max-h-[80vh] rounded-xl object-contain" />
            {lightbox.caption && (
              <p className="text-center text-sm text-[var(--muted)] mt-2">{lightbox.caption}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
