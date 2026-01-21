import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder");

// 10% deposit amount in cents (assuming $100 total = $10 deposit)
const DEPOSIT_AMOUNT = 1000; // $10.00

export async function POST(request: NextRequest) {
  try {
    const { walletAddress } = await request.json();

    // Validate inputs
    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address required" },
        { status: 400 }
      );
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json(
        { error: "Invalid wallet address format" },
        { status: 400 }
      );
    }

    // Validate Stripe configuration
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Stripe is not configured" },
        { status: 500 }
      );
    }

    // Get the base URL for redirect
    const origin =
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    // Create Stripe Checkout Session for one-time deposit payment
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment", // One-time payment
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: DEPOSIT_AMOUNT, // $10.00 in cents
            product_data: {
              name: "DNA Batcher - 10% Deposit",
              description: "Initial deposit to join DNA testing batch",
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/payment/deposit-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/payment/cancel`,
      metadata: {
        walletAddress: walletAddress.toLowerCase(),
        paymentType: "deposit",
      },
    });

    console.log(
      `[Stripe] Created deposit checkout session: ${session.id} for wallet ${walletAddress}`
    );

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      checkoutUrl: session.url,
    });
  } catch (error: unknown) {
    console.error("[Stripe] Deposit checkout creation error:", error);

    return NextResponse.json(
      {
        error: "Failed to create checkout session",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
