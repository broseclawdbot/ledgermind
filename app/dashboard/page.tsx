import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { DashboardContent } from "@/components/layout/dashboard-content";

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: businesses } = await supabase
    .from("businesses")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true);

  if (!businesses || businesses.length === 0) {
    return (
      <div className="max-w-lg mx-auto mt-20 text-center">
        <div className="w-16 h-16 bg-brand-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to LedgerMind</h1>
        <p className="text-gray-600 mb-8">Create your first business to start tracking expenses and uploading financial documents.</p>
        <p className="text-sm text-gray-500">Click <strong>Add Business</strong> in the top navigation bar to get started.</p>
      </div>
    );
  }

  return <DashboardContent userId={user.id} />;
}
