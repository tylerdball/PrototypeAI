"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { clsx } from "clsx";
import NPCPanel from "@/components/NPCPanel";
import EncounterPanel from "@/components/EncounterPanel";
import SessionPanel from "@/components/SessionPanel";
import CharacterPanel from "@/components/CharacterPanel";
import LorePanel from "@/components/LorePanel";
import GalleryPanel from "@/components/GalleryPanel";

type Tab = "characters" | "npcs" | "encounters" | "sessions" | "lore" | "gallery";

interface Campaign {
  id: number;
  name: string;
  setting: string;
  party_size: number;
  avg_level: number;
}

export default function CampaignPage() {
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [tab, setTab] = useState<Tab>("characters");

  useEffect(() => {
    fetch(`/api/backend/campaigns/${id}`)
      .then((r) => r.json())
      .then(setCampaign);
  }, [id]);

  if (!campaign) return <p className="text-[var(--muted)]">Loading…</p>;

  const tabs: { key: Tab; label: string }[] = [
    { key: "characters", label: "Characters" },
    { key: "npcs", label: "NPCs" },
    { key: "encounters", label: "Encounters" },
    { key: "sessions", label: "Session Notes" },
    { key: "lore", label: "Lore & Notes" },
    { key: "gallery", label: "Gallery" },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <a href="/" className="text-[var(--muted)] hover:text-[#f0ead6] transition-colors">
          <ArrowLeft size={20} />
        </a>
        <div>
          <h1 className="text-2xl font-bold text-[#f0ead6]">{campaign.name}</h1>
          <p className="text-sm text-[var(--muted)]">
            {campaign.setting || "No setting"} · Party of {campaign.party_size} · Level {campaign.avg_level}
          </p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-[var(--border)] mb-6 overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={clsx(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap",
              tab === t.key
                ? "border-brand-400 text-brand-400"
                : "border-transparent text-[var(--muted)] hover:text-[#f0ead6]"
            )}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "characters" && <CharacterPanel campaignId={Number(id)} />}
      {tab === "npcs" && <NPCPanel campaignId={Number(id)} />}
      {tab === "encounters" && <EncounterPanel campaignId={Number(id)} campaign={campaign} />}
      {tab === "sessions" && <SessionPanel campaignId={Number(id)} />}
      {tab === "lore" && <LorePanel campaignId={Number(id)} />}
      {tab === "gallery" && <GalleryPanel campaignId={Number(id)} />}
    </div>
  );
}
