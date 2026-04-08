import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const plan = session.metadata?.plan || "pro";

      if (userId) {
        await supabaseAdmin
          .from("profiles")
          .update({ plan, stripe_customer_id: session.customer as string })
          .eq("id", userId);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("stripe_customer_id", customerId);

      if (profiles && profiles.length > 0) {
        await supabaseAdmin
          .from("profiles")
          .update({ plan: "trial" })
          .eq("id", profiles[0].id);
      }
      break;
    }

    case "invoice.payment_failed": {
      console.warn("Payment failed for:", (event.data.object as Stripe.Invoice).customer);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
