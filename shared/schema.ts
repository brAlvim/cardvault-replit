import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Card schema
export const cards = pgTable("cards", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  imageUrl: text("image_url").notNull(),
  rarity: text("rarity").notNull(),
  setName: text("set_name").notNull(),
  setNumber: text("set_number").notNull(),
  price: doublePrecision("price").notNull(),
  condition: text("condition").default("Near Mint"),
  description: text("description"),
  notes: text("notes"),
  purchasePrice: doublePrecision("purchase_price"),
  purchaseDate: timestamp("purchase_date"),
  isFavorite: boolean("is_favorite").default(false),
  collectionId: integer("collection_id").notNull(),
  userId: integer("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Collection schema
export const collections = pgTable("collections", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  userId: integer("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tag schema
export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});

// Card tags relationship
export const cardTags = pgTable("card_tags", {
  id: serial("id").primaryKey(),
  cardId: integer("card_id").notNull(),
  tagId: integer("tag_id").notNull(),
});

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertCardSchema = createInsertSchema(cards).omit({
  id: true,
  createdAt: true,
});

export const insertCollectionSchema = createInsertSchema(collections).omit({
  id: true,
  createdAt: true,
});

export const insertTagSchema = createInsertSchema(tags).omit({
  id: true
});

export const insertCardTagSchema = createInsertSchema(cardTags).omit({
  id: true
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Card = typeof cards.$inferSelect;
export type InsertCard = z.infer<typeof insertCardSchema>;

export type Collection = typeof collections.$inferSelect;
export type InsertCollection = z.infer<typeof insertCollectionSchema>;

export type Tag = typeof tags.$inferSelect;
export type InsertTag = z.infer<typeof insertTagSchema>;

export type CardTag = typeof cardTags.$inferSelect;
export type InsertCardTag = z.infer<typeof insertCardTagSchema>;
