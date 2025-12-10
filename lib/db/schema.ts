import {
  pgTable,
  serial,
  text,
  varchar,
  decimal,
  timestamp,
  boolean,
  integer,
  pgEnum,
  jsonb,
} from "drizzle-orm/pg-core";

// Enums
export const transactionTypeEnum = pgEnum("transaction_type", [
  "purchase",
  "topup",
  "adjustment",
  "refund",
]);

export const slipStatusEnum = pgEnum("slip_status", [
  "pending",
  "approved",
  "rejected",
]);

export const stockItemStatusEnum = pgEnum("stock_item_status", [
  "available",
  "sold",
  "reserved",
]);

// Admins table
export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Users table (LINE users)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  lineUserId: varchar("line_user_id", { length: 255 }).notNull().unique(),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  creditBalance: decimal("credit_balance", { precision: 10, scale: 2 })
    .default("0")
    .notNull(),
  minimumCredit: decimal("minimum_credit", { precision: 10, scale: 2 })
    .default("0")
    .notNull(),
  totalSpend: decimal("total_spend", { precision: 10, scale: 2 })
    .default("0")
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Products table
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  stock: integer("stock").default(0).notNull(),
  active: boolean("active").default(true).notNull(),
  messageTemplate: text("message_template"), // Template with {user}, {pass}, {screen}, {pin} placeholders
  retailMultiplier: integer("retail_multiplier").default(1).notNull(), // How many times product can be retailed
  category: varchar("category", { length: 100 }), // Product category
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Product short codes table (one product can have multiple short codes)
export const productShortCodes = pgTable("product_short_codes", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 50 }).notNull().unique(), // e.g., "nf7", "นฟ7"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Stock items table (individual stock items with credentials)
export const stockItems = pgTable("stock_items", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  itemData: jsonb("item_data").notNull(), // {user, pass, screen, pin, etc.}
  status: stockItemStatusEnum("status").default("available").notNull(),
  soldToUserId: integer("sold_to_user_id").references(() => users.id),
  soldAt: timestamp("sold_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Transactions table
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  type: transactionTypeEnum("type").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  productId: integer("product_id").references(() => products.id),
  stockItemId: integer("stock_item_id").references(() => stockItems.id), // Reference to purchased stock item
  beforeBalance: decimal("before_balance", { precision: 10, scale: 2 }).notNull(),
  afterBalance: decimal("after_balance", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Slips table (bank slip verifications)
export const slips = pgTable("slips", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  slipPayload: text("slip_payload").notNull(),
  transRef: varchar("trans_ref", { length: 255 }).notNull().unique(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  senderName: varchar("sender_name", { length: 255 }),
  receiverName: varchar("receiver_name", { length: 255 }),
  sendingBank: varchar("sending_bank", { length: 100 }),
  receivingBank: varchar("receiving_bank", { length: 100 }),
  transDate: varchar("trans_date", { length: 20 }),
  transTime: varchar("trans_time", { length: 20 }),
  status: slipStatusEnum("status").default("pending").notNull(),
  r2Url: text("r2_url"),
  verificationResponse: text("verification_response"),
  rejectionReason: text("rejection_reason"),
  approvedBy: integer("approved_by").references(() => admins.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  verifiedAt: timestamp("verified_at"),
});

// Credit tokens table
export const creditTokens = pgTable("credit_tokens", {
  id: serial("id").primaryKey(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  creditAmount: decimal("credit_amount", { precision: 10, scale: 2 }).notNull(),
  minimumCreditBonus: decimal("minimum_credit_bonus", { precision: 10, scale: 2 })
    .default("0")
    .notNull(),
  createdByAdminId: integer("created_by_admin_id")
    .notNull()
    .references(() => admins.id),
  usedByUserId: integer("used_by_user_id").references(() => users.id),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Credit tiers table (total_spend thresholds)
export const creditTiers = pgTable("credit_tiers", {
  id: serial("id").primaryKey(),
  minSpend: decimal("min_spend", { precision: 10, scale: 2 }).notNull(),
  creditBonus: decimal("credit_bonus", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// TypeScript types
export type Admin = typeof admins.$inferSelect;
export type NewAdmin = typeof admins.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;

export type Slip = typeof slips.$inferSelect;
export type NewSlip = typeof slips.$inferInsert;

export type CreditToken = typeof creditTokens.$inferSelect;
export type NewCreditToken = typeof creditTokens.$inferInsert;

export type CreditTier = typeof creditTiers.$inferSelect;
export type NewCreditTier = typeof creditTiers.$inferInsert;

export type ProductShortCode = typeof productShortCodes.$inferSelect;
export type NewProductShortCode = typeof productShortCodes.$inferInsert;

export type StockItem = typeof stockItems.$inferSelect;
export type NewStockItem = typeof stockItems.$inferInsert;
