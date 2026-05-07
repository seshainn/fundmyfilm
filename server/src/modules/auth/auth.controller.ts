import { registerUserSchemaZod, loginUserSchemaZod } from "./auth.model.js"
import type { Request, Response } from "express"
import bcrypt from "bcrypt"
import catchAsync from "../../config/catchAsync.js"
import ExpressError from "../../config/expressError.js"
import { pool } from "../../config/db.js"
import { generateTokens, setAuthCookies, clearAuthCookies, sha256 } from "./auth.utils.js"

export const registerUser = catchAsync(async (req: Request, res: Response) => {
    const { username, email, password } = registerUserSchemaZod.parse(req.body) //req.body
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt)
    
    await pool.query("INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3)", [username, email, password_hash])
    res.status(201).json({ message: "User created successfully" })
})

export const loginUser = catchAsync(async (req: Request, res: Response) => {
    const { email, password } = loginUserSchemaZod.parse(req.body)
    const user = await pool.query("SELECT * FROM users WHERE email = $1", [email])
    if (user.rows.length === 0) {
        throw new ExpressError("User not found", 404)
    }
    const password_hash = user.rows[0].password_hash
    const isPasswordCorrect = await bcrypt.compare(password, password_hash)
    if (isPasswordCorrect) {
        const {accessToken, refreshToken, csrfToken} = generateTokens({id: user.rows[0].id, role: user.rows[0].role})

        await pool.query(
            "INSERT INTO refresh_tokens (token, user_id, email, expires_at) VALUES ($1,$2,$3,NOW() + INTERVAL '7 days')",
            [refreshToken, user.rows[0].id, email]
        );

        setAuthCookies(res, refreshToken, csrfToken)
        
        res.status(200).json({ message: "Login successful", accessToken})

    } else {
        throw new ExpressError("Invalid credentials", 401)
    }
})

export const logoutUser = catchAsync(async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
        const hash = sha256(refreshToken);

        await pool.query(
        "DELETE FROM refresh_tokens WHERE token_hash = $1",
        [hash]
        );
    }

    clearAuthCookies(res)

    res.status(200).json({ message: "Logged out" })
})

export const refreshTokenHandler = catchAsync(async (req: Request, res: Response) => {
    const refreshToken_unhashed = req.cookies?.refreshToken;
    const refreshToken = sha256(refreshToken_unhashed);

    const tokenRecord = await pool.query(
        `SELECT rt.*, u.role
        FROM refresh_tokens rt
        JOIN users u ON rt.user_id = u.id
        WHERE rt.token_hash = $1`,
        [refreshToken]
    ).then(res => res.rows[0]);

    // ❌ REUSE DETECTED
    if (!tokenRecord) {
        // delete all tokens for that user (if you can identify user)
        
        await pool.query(
        "DELETE FROM refresh_tokens WHERE user_id = $1",
        [tokenRecord.user_id] 
        );

        clearAuthCookies(res);

        throw new ExpressError("Refresh token reuse detected", 403);
    }

    // ❌ EXPIRED
    if (new Date(tokenRecord.expires_at) < new Date()) {
        await pool.query(
        "DELETE FROM refresh_tokens WHERE token_hash = $1",
        [refreshToken]
        );

        clearAuthCookies(res);

        throw new ExpressError("Refresh token expired", 401);
    }

    // ✅ VALID → rotate token
    await pool.query(
        "DELETE FROM refresh_tokens WHERE token_hash = $1",
        [refreshToken]
    );

    const {accessToken, refreshToken: newRefreshToken, csrfToken} = generateTokens({id: tokenRecord.id, role: tokenRecord.role})
    

    await pool.query(
        "INSERT INTO refresh_tokens (token_hash, user_id, email, expires_at) VALUES ($1, $2, $3, NOW() + INTERVAL '7 days')",
        [newRefreshToken, tokenRecord.user_id, tokenRecord.email]
    );

    setAuthCookies(res, newRefreshToken, csrfToken);

    res.json({ accessToken });
});