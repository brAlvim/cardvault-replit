import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertGiftCardSchema, 
  insertFornecedorSchema, 
  insertTagSchema, 
  insertUserSchema,
  insertTransacaoSchema,
  insertGiftCardTagSchema
} from "@shared/schema";
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

  // Fornecedor routes (antigo Collection)
  router.get("/fornecedores", async (req: Request, res: Response) => {
    try {
      // Se userId não for fornecido, retorna todos os fornecedores (userId 1 é demo)
      let userId = 1;
      
      if (req.query.userId) {
        userId = parseInt(req.query.userId as string);
        if (isNaN(userId)) {
          return res.status(400).json({ message: "Invalid user ID format" });
        }
      }
      
      const fornecedores = await storage.getFornecedores(userId);
      res.json(fornecedores);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.post("/fornecedores", async (req: Request, res: Response) => {
    try {
      const fornecedorData = insertFornecedorSchema.parse(req.body);
      const fornecedor = await storage.createFornecedor(fornecedorData);
      res.status(201).json(fornecedor);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.get("/fornecedores/:id", async (req: Request, res: Response) => {
    try {
      const fornecedorId = parseInt(req.params.id);
      const fornecedor = await storage.getFornecedor(fornecedorId);
      
      if (!fornecedor) {
        return res.status(404).json({ message: "Fornecedor not found" });
      }
      
      res.json(fornecedor);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.put("/fornecedores/:id", async (req: Request, res: Response) => {
    try {
      const fornecedorId = parseInt(req.params.id);
      const fornecedorData = insertFornecedorSchema.partial().parse(req.body);
      
      const updatedFornecedor = await storage.updateFornecedor(fornecedorId, fornecedorData);
      
      if (!updatedFornecedor) {
        return res.status(404).json({ message: "Fornecedor not found" });
      }
      
      res.json(updatedFornecedor);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.delete("/fornecedores/:id", async (req: Request, res: Response) => {
    try {
      const fornecedorId = parseInt(req.params.id);
      const success = await storage.deleteFornecedor(fornecedorId);
      
      if (!success) {
        return res.status(404).json({ message: "Fornecedor not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Gift Card routes (antigo Card)
  router.get("/gift-cards", async (req: Request, res: Response) => {
    try {
      // Se userId não for fornecido, retorna todos os gift cards do usuário 1 (demo)
      let userId = 1;
      
      if (req.query.userId) {
        userId = parseInt(req.query.userId as string);
        if (isNaN(userId)) {
          return res.status(400).json({ message: "Invalid user ID format" });
        }
      }
      
      const fornecedorId = req.query.fornecedorId ? parseInt(req.query.fornecedorId as string) : undefined;
      const search = req.query.search as string | undefined;
      
      if (search) {
        const giftCards = await storage.searchGiftCards(userId, search);
        return res.json(giftCards);
      }
      
      const giftCards = await storage.getGiftCards(userId, fornecedorId);
      res.json(giftCards);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.post("/gift-cards", async (req: Request, res: Response) => {
    try {
      const giftCardData = insertGiftCardSchema.parse(req.body);
      const giftCard = await storage.createGiftCard(giftCardData);
      res.status(201).json(giftCard);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.get("/gift-cards/:id", async (req: Request, res: Response) => {
    try {
      const giftCardId = parseInt(req.params.id);
      const giftCard = await storage.getGiftCard(giftCardId);
      
      if (!giftCard) {
        return res.status(404).json({ message: "Gift Card not found" });
      }
      
      res.json(giftCard);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.put("/gift-cards/:id", async (req: Request, res: Response) => {
    try {
      const giftCardId = parseInt(req.params.id);
      const giftCardData = insertGiftCardSchema.partial().parse(req.body);
      
      const updatedGiftCard = await storage.updateGiftCard(giftCardId, giftCardData);
      
      if (!updatedGiftCard) {
        return res.status(404).json({ message: "Gift Card not found" });
      }
      
      res.json(updatedGiftCard);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.delete("/gift-cards/:id", async (req: Request, res: Response) => {
    try {
      const giftCardId = parseInt(req.params.id);
      const success = await storage.deleteGiftCard(giftCardId);
      
      if (!success) {
        return res.status(404).json({ message: "Gift Card not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.get("/gift-cards/vencimento/:dias/:userId", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const dias = parseInt(req.params.dias);
      
      if (isNaN(dias)) {
        return res.status(400).json({ message: "Invalid number of days" });
      }
      
      const giftCards = await storage.getGiftCardsVencimento(userId, dias);
      res.json(giftCards);
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

  router.get("/gift-cards/tag/:tagId", async (req: Request, res: Response) => {
    try {
      const tagId = parseInt(req.params.tagId);
      const giftCards = await storage.getGiftCardsByTag(tagId);
      res.json(giftCards);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.get("/gift-cards/:giftCardId/tags", async (req: Request, res: Response) => {
    try {
      const giftCardId = parseInt(req.params.giftCardId);
      const tags = await storage.getGiftCardTags(giftCardId);
      res.json(tags);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.post("/gift-cards/:giftCardId/tags/:tagId", async (req: Request, res: Response) => {
    try {
      const giftCardId = parseInt(req.params.giftCardId);
      const tagId = parseInt(req.params.tagId);
      
      const giftCardTag = await storage.addTagToGiftCard(giftCardId, tagId);
      res.status(201).json(giftCardTag);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.delete("/gift-cards/:giftCardId/tags/:tagId", async (req: Request, res: Response) => {
    try {
      const giftCardId = parseInt(req.params.giftCardId);
      const tagId = parseInt(req.params.tagId);
      
      const success = await storage.removeTagFromGiftCard(giftCardId, tagId);
      
      if (!success) {
        return res.status(404).json({ message: "Gift card tag relation not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Transação routes (novo)
  router.get("/transacoes/:giftCardId", async (req: Request, res: Response) => {
    try {
      const giftCardId = parseInt(req.params.giftCardId);
      const transacoes = await storage.getTransacoes(giftCardId);
      res.json(transacoes);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  router.post("/transacoes", async (req: Request, res: Response) => {
    try {
      const transacaoData = insertTransacaoSchema.parse(req.body);
      const transacao = await storage.createTransacao(transacaoData);
      res.status(201).json(transacao);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  router.get("/transacoes/detalhes/:id", async (req: Request, res: Response) => {
    try {
      const transacaoId = parseInt(req.params.id);
      const transacao = await storage.getTransacao(transacaoId);
      
      if (!transacao) {
        return res.status(404).json({ message: "Transação not found" });
      }
      
      res.json(transacao);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  router.put("/transacoes/:id", async (req: Request, res: Response) => {
    try {
      const transacaoId = parseInt(req.params.id);
      const transacaoData = insertTransacaoSchema.partial().parse(req.body);
      
      const updatedTransacao = await storage.updateTransacao(transacaoId, transacaoData);
      
      if (!updatedTransacao) {
        return res.status(404).json({ message: "Transação not found" });
      }
      
      res.json(updatedTransacao);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  router.delete("/transacoes/:id", async (req: Request, res: Response) => {
    try {
      const transacaoId = parseInt(req.params.id);
      const success = await storage.deleteTransacao(transacaoId);
      
      if (!success) {
        return res.status(404).json({ message: "Transação not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Rota para collections (usado pelo sidebar)
  // Esta rota retorna apenas os fornecedores ativos
  router.get("/collections", async (req: Request, res: Response) => {
    try {
      // Se userId não for fornecido, retorna todos os fornecedores (userId 1 é demo)
      let userId = 1;
      
      if (req.query.userId) {
        userId = parseInt(req.query.userId as string);
        if (isNaN(userId)) {
          return res.status(400).json({ message: "Invalid user ID format" });
        }
      }
      
      const fornecedores = await storage.getFornecedores(userId);
      
      // Filtrar para retornar apenas fornecedores ativos
      const fornecedoresAtivos = fornecedores.filter(f => f.status === "ativo");
      
      // Mapear para o formato esperado pelo sidebar
      const collections = fornecedoresAtivos.map(f => ({
        id: f.id,
        nome: f.nome,
        logo: f.logo
      }));
      
      res.json(collections);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Mount the API router
  app.use("/api", router);

  const httpServer = createServer(app);
  return httpServer;
}
