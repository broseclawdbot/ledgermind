"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-browser";
import { Save, Loader2 } from "lucide-react";
import type { Business } from "@/types/database";

export default function SettingsPage() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [name, setName] = useState("");
  const [entityType, setEntityType] = useState("llc");
  const [industry, setIndustry] = useState("general");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const businessId = localStorage.getItem("ledgermind_active_business");
    if (businessId) {
      supabase
        .from("businesses")
        .select("*")
        .eq("id", businessId)
        .single()
        .then(({ data }) => {
          if (data) {
            setBusiness(data);
            setName(data.name);
            setEntityType(data.entity_type);
            setIndustry(data.industry);
          }
        });
    }
  }, []);

  async function handleSave() {
    if (!business) return;
    setSaving(true);

    await supabase
      .from("businesses")
      .update({ name, entity_type: entityType, industry })
      .eq("id", business.id);

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Business Settings</h1>

      <div className="card p-6 space-y-5">
        <div>
          <label className="label">Business Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
          />
        </div>

        <div>
          <label className="label">Entity Type</label>
          <select value={entityType} onChange={(e) => setEntityType(e.target.value)} className="input">
            <option value="sole_prop">Sole Proprietorship</option>
            <option value="llc">LLC</option>
            <option value="s_corp">S-Corp</option>
            <option value="c_corp">C-Corp</option>
            <option value="partnership">Partnership</option>
            <option value="nonprofit">Non-Profit</option>
          </select>
        </div>

        <div>
          <label className="label">Industry</label>
          <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="input">
            <option value="general">General / Other</option>
            <option value="consulting">Consulting / Professional Services</option>
            <option value="retail">Retail / E-commerce</option>
            <option value="food_service">Food Service / Restaurant</option>
            <option value="real_estate">Real Estate / Property Management</option>
            <option value="construction">Construction / Trades</option>
            <option value="healthcare">Healthcare</option>
            <option value="technology">Technology / SaaS</option>
            <option value="creative">Creative / Media</option>
            <option value="freelance">Freelance / Gig Work</option>
          </select>
        </div>

        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          {saved ? "Saved!" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
