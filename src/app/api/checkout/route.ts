import Stripe from "stripe";
import { NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  try {
    // 🔎 Verifica se a secret existe
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY não definida no .env");
    }

    const body = await req.json();
    console.log("BODY RECEBIDO:", body);

    const { priceId } = body;

    if (!priceId) {
      throw new Error("priceId não enviado");
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment", // troque para "subscription" se for assinatura
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_URL}/sucesso`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/cancelado`,
    });

    return NextResponse.json({ url: session.url });

  } catch (error: any) {
    console.error("ERRO STRIPE:", error);

    return NextResponse.json(
      { error: error.message || "Erro interno no servidor" },
      { status: 500 }
    );
  }
}