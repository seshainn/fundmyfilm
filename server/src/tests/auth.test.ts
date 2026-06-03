import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest"
import jwt from "jsonwebtoken";
import app from "../app.js"
import { pool } from "../config/db.js";
import bcrypt from "bcrypt";
import { generateTokens, sha256 } from "../modules/auth/auth.utils.js";
import { MyJwtPayload } from "../middleware/auth.middleware.js";

describe("POST /api/auth/register", () => {
    beforeEach(async () => {
        await pool.query("DELETE FROM users")
    })

    it("registers user successfully", async () => {
        const response = await request(app).post("/api/auth/register").send({
            username: "testuser",
            email: "test@example.com",
            password: "password123"
        })
        expect(response.status).toBe(201)
        expect(response.body.message).toBe("User created successfully")
        const result = await pool.query("SELECT * FROM users WHERE email = $1", ["test@example.com"])
        expect(result.rows.length).toBe(1)
        const user = result.rows[0]
        expect(user.username).toBe("testuser")
        expect(user.email).toBe("test@example.com")
        expect(user.password_hash).not.toBe("password123")
        expect(user.role).toBe("user")
        expect(user.id).toBe(1)
        expect(user.created_at).toBeInstanceOf(Date)
    })
    
    it("returns validation error when email is missing", async () => {
    const response = await request(app)
        .post("/api/auth/register")
        .send({
            username: "testuser",
            password: "password123"
        });

        expect(response.status).toBe(400);

        expect(response.body.message).toBe("Validation failed");

        expect(response.body.errors).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    path: ["email"]
                })
            ])
        );
    });

    it("stores a hashed password", async () => {
        const password = "password123";

        await request(app)
        .post("/api/auth/register")
        .send({
        username: "testuser",
        email: "test@example.com",
        password
        });

        const result = await pool.query(
            "SELECT password_hash FROM users WHERE email = $1",
            ["test@example.com"]
        );

        const hash = result.rows[0].password_hash;

        expect(hash).not.toBe(password);

        const matches = await bcrypt.compare(password, hash);

        expect(matches).toBe(true);
    });

    it("returns error for duplicate email", async () => {
        await request(app)
            .post("/api/auth/register")
            .send({
            username: "user1",
            email: "duplicate@example.com",
            password: "password123"
            });

        const response = await request(app)
            .post("/api/auth/register")
            .send({
            username: "user2",
            email: "duplicate@example.com",
            password: "password123"
            });

        expect(response.status).toBeGreaterThanOrEqual(400);

        expect(response.body.message).toBe("Duplicate entry");
    });
})

describe("POST /api/auth/login", () => {
    beforeEach(async () => {
        await pool.query("DELETE FROM users")
    })

    it("user logs in successfully", async () => {
        await request(app).post("/api/auth/register").send({
            username: "testuser",
            email: "test@example.com",
            password: "password123"
        })
        const response = await request(app).post("/api/auth/login").send({
            email: "test@example.com",
            password: "password123"
        })
        expect(response.status).toBe(200)
        expect(response.body.message).toBe("Login successful")
        const result = await pool.query("SELECT * FROM users WHERE email = $1", ["test@example.com"])
        expect(result.rows.length).toBe(1)
        const user = result.rows[0]
        expect(user.username).toBe("testuser")
        expect(user.email).toBe("test@example.com")
        expect(user.password_hash).not.toBe("password123")
        expect(user.role).toBe("user")
        expect(user.id).toBe(1)
        expect(user.created_at).toBeInstanceOf(Date)

        expect(response.body).toHaveProperty("accessToken")
        
        const cookies = response.headers["set-cookie"];
        expect(cookies).toBeDefined();
        expect(cookies.length).toBe(2);
        const refreshCookie = cookies[0]
        const csrfCookie = cookies[1]
        expect(refreshCookie).toBeDefined();
        expect(refreshCookie).toContain("HttpOnly");
        expect(refreshCookie).toContain("SameSite=Strict");
        expect(refreshCookie).toContain(`Path="/api/auth"`);

        expect(csrfCookie).toBeDefined();
        expect(csrfCookie).toContain("SameSite=Strict");
        expect(csrfCookie).toContain("Path=/");
    })

    it("user logs in with incorrect password", async () => {
        await request(app).post("/api/auth/register").send({
            username: "testuser",
            email: "test@example.com",
            password: "password123"
        })
        const response = await request(app).post("/api/auth/login").send({
            email: "test@example.com",
            password: "password876"
        })
        expect(response.status).toBe(401)
        expect(response.body.message).toBe("Invalid credentials")
    })

    it("user logs in with incorrect email", async () => {
        await request(app).post("/api/auth/register").send({
            username: "testuser",
            email: "test@example.com",
            password: "password123"
        })
        const response = await request(app).post("/api/auth/login").send({
            email: "test@example.com",
            password: "password123"
        })
        expect(response.status).toBe(401)
        expect(response.body.message).toBe("Invalid credentials")
    })

    it("generates access token, refresh token hash and csrf token", async () => {

        const tokens = generateTokens({ id: 1, role: 'user' });

        expect(tokens.accessToken).toBeTruthy();
        expect(tokens.refreshToken).toBeTruthy();
        expect(tokens.refreshTokenHash).toBe(sha256(tokens.refreshToken));
        expect(tokens.csrfToken).toBeTruthy();

        const decoded = jwt.verify(
            tokens.accessToken,
            process.env.AUTH_SECRET_KEY!
        ) as MyJwtPayload;

        expect(decoded.id).toBe(1);
        expect(decoded.role).toBe("user");
  });

})

describe("POST /api/auth/refresh", () => {})

describe("POST /api/auth/logout", () => {})
