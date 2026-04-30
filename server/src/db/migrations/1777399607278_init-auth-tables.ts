import { MigrationBuilder } from "node-pg-migrate";

export const up = (pgm: MigrationBuilder) => {

  // USERS
  pgm.createTable("users", {
    id: "id",
    username: { type: "text", notNull: true, unique: true },
    email: { type: "text", notNull: true, unique: true },
    password_hash: { type: "text", notNull: true },
    role: { type: "text", notNull: true, default: "user" },
    created_at: { type: "timestamp", default: pgm.func("now()") },
  });

  // REFRESH TOKENS
  pgm.createTable("refresh_tokens", {
    id: "id",
    token_hash: { type: "text", notNull: true, unique: true },
    user_id: {
      type: "integer",
      notNull: true,
      references: "users(id)",
      onDelete: "CASCADE",
    },
    expires_at: { type: "timestamp", notNull: true },
    created_at: { type: "timestamp", default: pgm.func("now()") },
  });

  pgm.createIndex("refresh_tokens", ["user_id"]);

  // PROJECTS
  pgm.createTable("projects", {
    id: "id",
    title: { type: "text", notNull: true },
    image: { type: "text" },
    logline: { type: "text" },
    budget: { type: "numeric", notNull: true },
    amount_collected: { type: "numeric", default: 0 },
    creator_id: {
      type: "integer",
      references: "users(id)",
      onDelete: "SET NULL",
    },
    created_at: { type: "timestamp", default: pgm.func("now()") },
  });

  pgm.createIndex("projects", ["creator_id"]);

  // CONTRIBUTIONS
  pgm.createTable("contributions", {
    id: "id",
    user_id: {
      type: "integer",
      notNull: true,
      references: "users(id)",
      onDelete: "CASCADE",
    },
    project_id: {
      type: "integer",
      notNull: true,
      references: "projects(id)",
      onDelete: "CASCADE",
    },
    amount: { type: "numeric", notNull: true },
    created_at: { type: "timestamp", default: pgm.func("now()") },
  });

  pgm.createIndex("contributions", ["user_id"]);
  pgm.createIndex("contributions", ["project_id"]);

  // PAYMENTS
  pgm.createTable("payments", {
    id: "id",
    contribution_id: {
      type: "integer",
      notNull: true,
      references: "contributions(id)",
      onDelete: "CASCADE",
    },
    provider: { type: "text", notNull: true }, // stripe, razorpay
    provider_payment_id: { type: "text", unique: true },
    status: {
      type: "text",
      notNull: true,
      default: "pending",
      check: "status IN ('pending','success','failed')",
    },
    amount: { type: "numeric", notNull: true },
    created_at: { type: "timestamp", default: pgm.func("now()") },
  });

  pgm.createIndex("payments", ["contribution_id"]);
};

export const down = (pgm: MigrationBuilder) => {
  pgm.dropTable("payments");
  pgm.dropTable("contributions");
  pgm.dropTable("projects");
  pgm.dropTable("refresh_tokens");
  pgm.dropTable("users");
};