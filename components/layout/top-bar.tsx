"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import { BookOpen, ChevronDown, LogOut, Plus } from "lucide-react";
import type { Profile, Business } from "@/types/database";

interface TopBarProps {
  profile: Profile | null;
  businesses: Business[];
}

export function TopBar({ profile, businesses }: TopBarProps) {
  const [showBizMenu, setShowBizMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNewBiz, setShowNewBiz] = useState(false);
  const [newBizName, setNewBizName] = useState("");
  const [activeBiz, setActiveBiz] = useState<Business | null>(businesses[0] || null);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  async function createBusiness() {
    if (!newBizName.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("businesses")
      .insert({ name: newBizName.trim(), user_id: user.id })
      .select()
      .single();

    if (data) {
      setActiveBiz(data);
      setNewBizName("");
      setShowNewBiz(false);
      // Store active business in localStorage for client components
      localStorage.setItem("ledgermind_active_business", data.id);
      router.refresh();
    }
  }

  function selectBusiness(biz: Business) {
    setActiveBiz(biz);
    localStorage.setItem("ledgermind_active_business", biz.id);
    setShowBizMenu(false);
    router.refresh();
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">LedgerMind</span>
          </div>

          {/* Business Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowBizMenu(!showBizMenu)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm font-medium text-gray-700"
            >
              <div className="w-2 h-2 rounded-full bg-green-500" />
              {activeBiz?.name || "Select Business"}
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {showBizMenu && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-xl border border-gray-200 shadow-lg py-1 z-50">
                {businesses.map((biz) => (
                  <button
                    key={biz.id}
                    onClick={() => selectBusiness(biz)}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2 ${
                      activeBiz?.id === biz.id ? "bg-brand-50 text-brand-700 font-medium" : "text-gray-700"
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${activeBiz?.id === biz.id ? "bg-brand-500" : "bg-gray-300"}`} />
                    {biz.name}
                  </button>
                ))}
                <div className="border-t border-gray-100 mt-1 pt-1">
                  <button
                    onClick={() => { setShowNewBiz(true); setShowBizMenu(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-brand-600 hover:bg-brand-50 flex items-center gap-2 font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Add Business
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 text-sm"
          >
            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-semibold">
              {profile?.full_name?.[0] || profile?.email?.[0] || "?"}
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>

          {showUserMenu && (
            <div className="absolute top-full right-0 mt-1 w-48 bg-white rounded-xl border border-gray-200 shadow-lg py-1 z-50">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900">{profile?.full_name}</p>
                <p className="text-xs text-gray-500">{profile?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* New Business Modal */}
      {showNewBiz && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Create a New Business</h2>
            <div className="space-y-4">
              <div>
                <label className="label">Business Name</label>
                <input
                  type="text"
                  value={newBizName}
                  onChange={(e) => setNewBizName(e.target.value)}
                  className="input"
                  placeholder="e.g., My Consulting LLC"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && createBusiness()}
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowNewBiz(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={createBusiness} className="btn-primary flex-1">Create</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
