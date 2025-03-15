import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCardSchema, insertCollectionSchema, insertTagSchema, insertUserSchema } from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
  const router = express.Router();
  
  // User routes
  router.post("/users", async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByUsername(userData.username);
      
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }
      
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.get("/users/:id", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Collection routes
  router.get("/collections", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.query.userId as string);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const collections = await storage.getCollections(userId);
      res.json(collections);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.post("/collections", async (req: Request, res: Response) => {
    try {
      const collectionData = insertCollectionSchema.parse(req.body);
      const collection = await storage.createCollection(collectionData);
      res.status(201).json(collection);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.get("/collections/:id", async (req: Request, res: Response) => {
    try {
      const collectionId = parseInt(req.params.id);
      const collection = await storage.getCollection(collectionId);
      
      if (!collection) {
        return res.status(404).json({ message: "Collection not found" });
      }
      
      res.json(collection);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.put("/collections/:id", async (req: Request, res: Response) => {
    try {
      const collectionId = parseInt(req.params.id);
      const collectionData = insertCollectionSchema.partial().parse(req.body);
      
      const updatedCollection = await storage.updateCollection(collectionId, collectionData);
      
      if (!updatedCollection) {
        return res.status(404).json({ message: "Collection not found" });
      }
      
      res.json(updatedCollection);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.delete("/collections/:id", async (req: Request, res: Response) => {
    try {
      const collectionId = parseInt(req.params.id);
      const success = await storage.deleteCollection(collectionId);
      
      if (!success) {
        return res.status(404).json({ message: "Collection not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Card routes
  router.get("/cards", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.query.userId as string);
      const collectionId = req.query.collectionId ? parseInt(req.query.collectionId as string) : undefined;
      const search = req.query.search as string | undefined;
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      if (search) {
        const cards = await storage.searchCards(userId, search);
        return res.json(cards);
      }
      
      const cards = await storage.getCards(userId, collectionId);
      res.json(cards);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.post("/cards", async (req: Request, res: Response) => {
    try {
      const cardData = insertCardSchema.parse(req.body);
      const card = await storage.createCard(cardData);
      res.status(201).json(card);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.get("/cards/:id", async (req: Request, res: Response) => {
    try {
      const cardId = parseInt(req.params.id);
      const card = await storage.getCard(cardId);
      
      if (!card) {
        return res.status(404).json({ message: "Card not found" });
      }
      
      res.json(card);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.put("/cards/:id", async (req: Request, res: Response) => {
    try {
      const cardId = parseInt(req.params.id);
      const cardData = insertCardSchema.partial().parse(req.body);
      
      const updatedCard = await storage.updateCard(cardId, cardData);
      
      if (!updatedCard) {
        return res.status(404).json({ message: "Card not found" });
      }
      
      res.json(updatedCard);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.delete("/cards/:id", async (req: Request, res: Response) => {
    try {
      const cardId = parseInt(req.params.id);
      const success = await storage.deleteCard(cardId);
      
      if (!success) {
        return res.status(404).json({ message: "Card not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.get("/cards/favorites/:userId", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const favoriteCards = await storage.getFavoriteCards(userId);
      res.json(favoriteCards);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Tag routes
  router.get("/tags", async (_req: Request, res: Response) => {
    try {
      const tags = await storage.getTags();
      res.json(tags);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.post("/tags", async (req: Request, res: Response) => {
    try {
      const tagData = insertTagSchema.parse(req.body);
      const tag = await storage.createTag(tagData);
      res.status(201).json(tag);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.get("/tags/:id", async (req: Request, res: Response) => {
    try {
      const tagId = parseInt(req.params.id);
      const tag = await storage.getTag(tagId);
      
      if (!tag) {
        return res.status(404).json({ message: "Tag not found" });
      }
      
      res.json(tag);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.get("/cards/tag/:tagId", async (req: Request, res: Response) => {
    try {
      const tagId = parseInt(req.params.tagId);
      const cards = await storage.getCardsByTag(tagId);
      res.json(cards);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.get("/cards/:cardId/tags", async (req: Request, res: Response) => {
    try {
      const cardId = parseInt(req.params.cardId);
      const tags = await storage.getCardTags(cardId);
      res.json(tags);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.post("/cards/:cardId/tags/:tagId", async (req: Request, res: Response) => {
    try {
      const cardId = parseInt(req.params.cardId);
      const tagId = parseInt(req.params.tagId);
      
      const cardTag = await storage.addTagToCard(cardId, tagId);
      res.status(201).json(cardTag);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.delete("/cards/:cardId/tags/:tagId", async (req: Request, res: Response) => {
    try {
      const cardId = parseInt(req.params.cardId);
      const tagId = parseInt(req.params.tagId);
      
      const success = await storage.removeTagFromCard(cardId, tagId);
      
      if (!success) {
        return res.status(404).json({ message: "Card tag relation not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Mount the API router
  app.use("/api", router);

  const httpServer = createServer(app);
  return httpServer;
}
