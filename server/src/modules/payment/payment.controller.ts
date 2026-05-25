import type { Request, Response } from "express";
import catchAsync from "../../config/catchAsync.js";
import ExpressError from "../../config/expressError.js";
import { pool } from "../../config/db.js";
import Stripe from "stripe";
import { v4 as uuidv4 } from 'uuid';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-04-22.dahlia",
    typescript: true
});

export const paymentHandler = catchAsync(async (req: Request, res: Response) => {
    const { amount, project_id } = req.body;
    const user_id = req.user?.id; 
    const idempotencyKey = uuidv4();

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // 1. Create Contribution record
        const contributionRes = await client.query(
            "INSERT INTO contributions (user_id, project_id, amount) VALUES ($1, $2, $3) RETURNING id",
            [user_id, project_id, amount]
        );
        const contributionId = contributionRes.rows[0].id;

        // 2. Create Payment record (status: pending)
        await client.query(
            "INSERT INTO payments (idempotency_key, contribution_id, provider, amount, status) VALUES ($1, $2, $3, $4, $5)",
            [idempotencyKey, contributionId, "stripe", amount, "pending"]
        );

        // 3. Call Stripe with Idempotency Key
        const charge = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100),
            currency: "inr",
            payment_method: req.body.payment_method_id,
            confirm: true,
            automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
            description: `Contribution for project ${project_id}`,
            metadata: {
                paymentIdempotencyKey: idempotencyKey
            }
        }, 
            { idempotencyKey }
        );

        // 4. Update Payment record to success
        await client.query(
            "UPDATE payments SET status = $1, provider_payment_id = $2 WHERE idempotency_key = $3",
            ["success", charge.id, idempotencyKey]
        );

        await client.query("COMMIT");
        res.status(200).json({ success: true, chargeId: charge.id });

    } catch (error: any) {
        await client.query("ROLLBACK");
        console.error("Payment Error:", error);
        throw new ExpressError(error.message || "Payment Failed", 500);
    } finally {
        client.release();
    }
});