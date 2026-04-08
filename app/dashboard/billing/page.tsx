"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-browser";
import { Check, Loader2, Sparkles } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: "$29",
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_STARTER || "price_starter",
    plan: "starter",
    features: [
      "1 business",
      "50 document uploads/month",
      "50 AI categorizations/month",
      "P&L report",
      "PDF export",
      "Email support",
    ],
  },
  {
    name: "Pro",
    price: "$49",
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO || "price_pro",
    plan: "pro",
    popular: true,
    features: [
      "Up to 3 businesses",
      "250 document uploads/month",
      "250 AI categorizations/month",
      "All reports",
      "PDF + Excel export",
      "Priority email support",
    ],
  },
  {
    name: "Business",
    price: "$99",
    priceId: "",
    plan: "business",
    features: [
      "Up to 10 businesses",
      "Unlimited uploads",
      "Unlimited AI categorizations",
      "All reports + consolidated",
      "Up to 5 users",
      "Priority support + chat",
    ],
    comingSoon: true,
  },
];

export default function BillingPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string>("trial");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        const { data: profile } = await supabase
          .from("profiles")
          .select("plan")
          .eq("id", data.user.id)
          .single();
        if (profile) setCurrentPlan(profile.plan);
      }
    });
  }, []);

  async function handleSubscribe(priceId: string, plan: string) {
    if (!userId || !priceId) return;
    setLoadingPlan(plan);

    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, priceId, plan }),
    });

    const { url, error } = await res.json();
    if (url) {
      window.location.href = url;
    } else {
      console.error("Checkout error:", error);
      setLoadingPlan(null);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Choose Your Plan</h1>
        <p className="text-gray-500 mt-2">
          {currentPlan === "trial"
            ? "Your 14-day trial includes full Pro features. Subscribe to continue after trial."
            : `You're currently on the ${currentPlan} plan.`}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`card p-6 relative ${
              plan.popular ? "ring-2 ring-brand-500 shadow-lg" : ""
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-brand-600 text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Most Popular
                </span>
              </div>
            )}

            <div className="text-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900">{plan.name}</h2>
              <div className="mt-2">
                <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                <span className="text-gray-500">/month</span>
              </div>
            </div>

            <ul className="space-y-3 mb-6">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-gray-600">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>

            {plan.comingSoon ? (
              <button disabled className="btn-secondary w-full opacity-50">
                Coming Soon
              </button>
            ) : currentPlan === plan.plan ? (
              <button disabled className="btn-secondary w-full">
                Current Plan
              </button>
            ) : (
              <button
                onClick={() => handleSubscribe(plan.priceId, plan.plan)}
                disabled={loadingPlan === plan.plan}
                className={`w-full ${plan.popular ? "btn-primary" : "btn-secondary"}`}
              >
                {loadingPlan === plan.plan ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Subscribe
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
