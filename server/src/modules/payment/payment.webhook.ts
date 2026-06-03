import Stripe from "stripe";
import { stripe, finalizeSuccessfulPaymentInTx } from "./payment.controller.js";
import { pool } from "../../config/db.js";
import type { Request, Response } from "express";
import { logger } from "../../config/logger.js";
import { queuePaymentSuccessEmail } from "../../jobs/queues/email.queue.js";
import { deleteProjectCache } from "../projects/projects.cache.js";

export const stripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"];

  if (!sig) {
    return res.status(400).send("Missing Stripe signature");
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(500).send("Missing STRIPE_WEBHOOK_SECRET");
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    logger.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object as Stripe.PaymentIntent;
    const paymentId = Number(intent.metadata?.payment_id);

    if (!paymentId) {
      logger.warn(`Missing payment_id metadata for intent ${intent.id}`);
      return res.json({ received: true });
    }

    const client = await pool.connect();
    let emailJob = null;
    let committed = false;

    try {
      await client.query("BEGIN");

      emailJob = await finalizeSuccessfulPaymentInTx(client, paymentId, intent.id);

      await client.query("COMMIT");
      committed = true;

      await deleteProjectCache();

      if (emailJob) {
        await queuePaymentSuccessEmail(emailJob);
      }
    } catch (err: any) {
      if (!committed) {
        await client.query("ROLLBACK");
      }

      logger.error(`Webhook payment success handling failed: ${err.message}`);
      return res.status(500).json({ message: "Webhook processing failed" });
    } finally {
      client.release();
    }
  }

  if (event.type === "payment_intent.payment_failed") {
    const intent = event.data.object as Stripe.PaymentIntent;
    const paymentId = Number(intent.metadata?.payment_id);

    if (paymentId) {
      await pool.query(
        `UPDATE payments 
         SET status = 'failed',
             provider_payment_id = $1
         WHERE id = $2`,
        [intent.id, paymentId]
      );
    }
  }

  res.json({ received: true });
};