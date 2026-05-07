import Stripe from "stripe";
import { stripe } from "./payment.controller.js";
import { pool } from "../../config/db.js";
import type { Request, Response } from "express";

export const stripeWebhook = async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature']!;
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch (err: any) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'payment_intent.succeeded') {
        const intent = event.data.object as Stripe.PaymentIntent;
        // Update your DB using the provider_payment_id or metadata
        await pool.query(
            "UPDATE payments SET status = 'success', provider_payment_id = $1 WHERE idempotency_key = $2",
            [intent.id, intent.idempotency_key]
        );
    }

    res.json({ received: true });
};