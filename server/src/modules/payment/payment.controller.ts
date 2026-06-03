import type { Request, Response } from "express";
import type { PoolClient } from "pg";
import catchAsync from "../../config/catchAsync.js";
import ExpressError from "../../config/expressError.js";
import { pool } from "../../config/db.js";
import Stripe from "stripe";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import {
  queuePaymentSuccessEmail,
  type PaymentSuccessEmailJob
} from "../../jobs/queues/email.queue.js";
import { deleteProjectCache } from "../projects/projects.cache.js";

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("STRIPE_SECRET_KEY is missing");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_dummy", {
  typescript: true
});

const paymentSchema = z.object({
  amount: z.coerce.number().positive().max(1_000_000),
  project_id: z.coerce.number().int().positive(),
  payment_method_id: z.string().min(1),
  receipt_email: z.string().email().optional()
});

export const finalizeSuccessfulPaymentInTx = async (
  client: PoolClient,
  paymentId: number,
  stripePaymentIntentId: string
): Promise<PaymentSuccessEmailJob | null> => {
  const paymentResult = await client.query(
    `SELECT 
        p.id AS payment_id,
        p.status AS payment_status,
        p.amount,
        c.id AS contribution_id,
        c.project_id,
        c.user_id,
        u.email,
        u.username,
        pr.title AS project_title
     FROM payments p
     JOIN contributions c ON p.contribution_id = c.id
     JOIN users u ON c.user_id = u.id
     JOIN projects pr ON c.project_id = pr.id
     WHERE p.id = $1
     FOR UPDATE`,
    [paymentId]
  );

  const payment = paymentResult.rows[0];

  if (!payment) {
    throw new ExpressError("Payment not found", 404);
  }

  if (payment.payment_status === "success") {
    return null;
  }

  await client.query(
    `UPDATE payments
     SET status = 'success',
         provider_payment_id = $1,
         paid_at = NOW()
     WHERE id = $2`,
    [stripePaymentIntentId, paymentId]
  );

  await client.query(
    `UPDATE contributions
     SET status = 'success'
     WHERE id = $1`,
    [payment.contribution_id]
  );

  await client.query(
    `UPDATE projects
     SET amount_collected = amount_collected + $1
     WHERE id = $2`,
    [payment.amount, payment.project_id]
  );

  return {
    to: payment.email,
    username: payment.username,
    projectTitle: payment.project_title,
    amount: Number(payment.amount),
    paymentId: Number(payment.payment_id),
    contributionId: Number(payment.contribution_id)
  };
};

export const paymentHandler = catchAsync(async (req: Request, res: Response) => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new ExpressError("Stripe is not configured", 500);
  }

  const { amount, project_id, payment_method_id, receipt_email } =
    paymentSchema.parse(req.body);

  const user_id = req.user?.id;

  if (!user_id) {
    throw new ExpressError("Unauthorized", 401);
  }

  const idempotencyKey = uuidv4();
  const client = await pool.connect();

  let emailJob: PaymentSuccessEmailJob | null = null;
  let committed = false;

  try {
    await client.query("BEGIN");

    const userResult = await client.query(
      "SELECT id, email, username FROM users WHERE id = $1",
      [user_id]
    );

    const user = userResult.rows[0];

    if (!user) {
      throw new ExpressError("User not found", 404);
    }

    const projectResult = await client.query(
      `SELECT id, title, budget, amount_collected 
       FROM projects 
       WHERE id = $1`,
      [project_id]
    );

    const project = projectResult.rows[0];

    if (!project) {
      throw new ExpressError("Project not found", 404);
    }

    const budget = Number(project.budget);
    const amountCollected = Number(project.amount_collected);

    if (amountCollected + amount > budget) {
      throw new ExpressError("Contribution exceeds remaining project budget", 400);
    }

    const contributionResult = await client.query(
      `INSERT INTO contributions 
        (user_id, project_id, amount, status) 
       VALUES 
        ($1, $2, $3, 'pending') 
       RETURNING id`,
      [user_id, project_id, amount]
    );

    const contributionId = contributionResult.rows[0].id;

    const paymentResult = await client.query(
      `INSERT INTO payments 
        (idempotency_key, contribution_id, provider, amount, status) 
       VALUES 
        ($1, $2, 'stripe', $3, 'pending') 
       RETURNING id`,
      [idempotencyKey, contributionId, amount]
    );

    const paymentId = Number(paymentResult.rows[0].id);

    const intent = await stripe.paymentIntents.create(
      {
        amount: Math.round(amount * 100),
        currency: "inr",
        payment_method: payment_method_id,
        confirm: true,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: "never"
        },
        description: `Contribution for project ${project_id}`,
        receipt_email: receipt_email || user.email,
        metadata: {
          payment_id: String(paymentId),
          contribution_id: String(contributionId),
          project_id: String(project_id),
          user_id: String(user_id)
        }
      },
      {
        idempotencyKey
      }
    );

    await client.query(
      `UPDATE payments
       SET provider_payment_id = $1,
           status = $2
       WHERE id = $3`,
      [intent.id, intent.status, paymentId]
    );

    if (intent.status === "succeeded") {
      emailJob = await finalizeSuccessfulPaymentInTx(client, paymentId, intent.id);
    }

    await client.query("COMMIT");
    committed = true;

    if (intent.status === "succeeded") {
      await deleteProjectCache();

      if (emailJob) {
        await queuePaymentSuccessEmail(emailJob);
      }

      return res.status(200).json({
        status: "succeeded",
        paymentId,
        paymentIntentId: intent.id
      });
    }

    if (intent.status === "requires_action") {
      return res.status(200).json({
        status: "requires_action",
        paymentId,
        paymentIntentId: intent.id,
        clientSecret: intent.client_secret
      });
    }

    if (intent.status === "processing") {
      return res.status(200).json({
        status: "processing",
        paymentId,
        paymentIntentId: intent.id
      });
    }

    return res.status(402).json({
      status: intent.status,
      message: "Payment was not completed"
    });
  } catch (error: any) {
    if (!committed) {
      await client.query("ROLLBACK");
    }

    throw new ExpressError(error.message || "Payment failed", error.statusCode || 500);
  } finally {
    client.release();
  }
});