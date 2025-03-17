import express, { type Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertGiftCardSchema, 
  insertFornecedorSchema, 
  insertTagSchema, 
  insertUserSchema,
  insertTransacaoSchema,
  insertGiftCardTagSchema,
  insertSupplierSchema,
  Transacao // Adiciona a importação do tipo
} from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { login, requireAuth, requirePermission, isGuestProfile, filterConfidentialData, filterGiftCardArray } from "./auth";
import jwt from "jsonwebtoken";

// Chave secreta para JWT - em produção, isso deve estar no .env
const JWT_SECRET = "cardvault-secret-key-2024";

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
  
  // Obter todos os usuários
  router.get("/users", async (req: Request, res: Response) => {
    try {
      // Obter o empresaId do query string ou usar um padrão (empresa demo)
      const empresaId = req.query.empresaId ? parseInt(req.query.empresaId as string) : 1;
      const users = await storage.getUsersByEmpresa(empresaId);
      console.log("Enviando usuários:", users);
      res.json(users);
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Atualizar um usuário
  router.put("/users/:id", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const userData = req.body;
      
      console.log("Atualizando usuário:", userId, userData);
      
      const user = await storage.updateUser(userId, userData);
      
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Excluir um usuário
  router.delete("/users/:id", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const success = await storage.deleteUser(userId);
      
      if (!success) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Erro ao excluir usuário:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Rota para busca global
  router.get("/search", requireAuth, async (req: Request, res: Response) => {
    try {
      const searchTerm = req.query.q as string;
      const userId = (req as any).user?.id || 1; // Usuário atual
      const empresaId = (req as any).user?.empresaId || 1;

      if (!searchTerm) {
        return res.status(400).json({ message: "Search term is required" });
      }

      // Buscar em fornecedores - usamos getFornecedoresByEmpresa em vez de getFornecedores
      // pois precisamos de todos os fornecedores da empresa, não apenas do usuário específico
      const fornecedores = await storage.getFornecedoresByEmpresa(empresaId);
      console.log("Fornecedores encontrados:", fornecedores.map(f => f.nome));
      console.log("Termo de busca:", searchTerm);
      const matchingFornecedores = fornecedores.filter(f => 
        f.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (f.descricao && f.descricao.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (f.website && f.website.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      console.log("Fornecedores filtrados:", matchingFornecedores.map(f => f.nome));

      // Buscar em gift cards
      const giftCards = await storage.getGiftCards(userId, undefined, empresaId);
      const matchingGiftCards = giftCards.filter(gc => 
        gc.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (gc.observacoes && gc.observacoes.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (gc.ordemCompra && gc.ordemCompra.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (gc.gcNumber && gc.gcNumber.toLowerCase().includes(searchTerm.toLowerCase()))
      );

      // Buscar em transações
      const transacoes = await storage.getTransacoesByEmpresa(empresaId);
      const matchingTransacoes = transacoes.filter(t => 
        t.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.ordemCompra && t.ordemCompra.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.ordemInterna && t.ordemInterna.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.motivoCancelamento && t.motivoCancelamento.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.motivoRefund && t.motivoRefund.toLowerCase().includes(searchTerm.toLowerCase()))
      );

      // Verificar permissões do usuário para filtrar informações sensíveis
      const userPerfil = await storage.getPerfil((req as any).user?.perfilId || 1);
      const isGuest = userPerfil ? await isGuestProfile(userPerfil.id) : false;

      // Filtrar dados confidenciais dos gift cards se for perfil convidado
      const filteredGiftCards = isGuest ? filterGiftCardArray(matchingGiftCards, true) : matchingGiftCards;

      // Estruturar resultados por categoria
      const results = {
        fornecedores: matchingFornecedores,
        giftCards: filteredGiftCards,
        transacoes: matchingTransacoes,
        count: {
          fornecedores: matchingFornecedores.length,
          giftCards: matchingGiftCards.length,
          transacoes: matchingTransacoes.length,
          total: matchingFornecedores.length + matchingGiftCards.length + matchingTransacoes.length
        }
      };

      res.json(results);
    } catch (error) {
      console.error("Search error:", error);
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
      
      // Filtrar por empresa se especificado
      const empresaId = req.query.empresaId ? parseInt(req.query.empresaId as string) : undefined;
      
      const fornecedores = await storage.getFornecedores(userId, empresaId);
      res.json(fornecedores);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.post("/fornecedores", async (req: Request, res: Response) => {
    try {
      // Garantir que empresaId seja incluído se vier como query parameter mas não no body
      if (!req.body.empresaId && req.query.empresaId) {
        req.body.empresaId = parseInt(req.query.empresaId as string);
      }
      
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
      const empresaId = req.query.empresaId ? parseInt(req.query.empresaId as string) : undefined;
      const fornecedor = await storage.getFornecedor(fornecedorId, empresaId);
      
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
      const empresaId = req.query.empresaId ? parseInt(req.query.empresaId as string) : undefined;
      
      // Verificar se o fornecedor pertence à empresa especificada
      if (empresaId) {
        const fornecedor = await storage.getFornecedor(fornecedorId, empresaId);
        if (!fornecedor) {
          return res.status(404).json({ message: "Fornecedor not found for this company" });
        }
      }
      
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
      const empresaId = req.query.empresaId ? parseInt(req.query.empresaId as string) : undefined;
      
      // Verificar se o fornecedor pertence à empresa especificada
      if (empresaId) {
        const fornecedor = await storage.getFornecedor(fornecedorId, empresaId);
        if (!fornecedor) {
          return res.status(404).json({ message: "Fornecedor not found for this company" });
        }
      }
      
      const success = await storage.deleteFornecedor(fornecedorId);
      
      if (!success) {
        return res.status(404).json({ message: "Fornecedor not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Supplier routes (fornecedores de gift cards)
  router.get("/suppliers", async (req: Request, res: Response) => {
    try {
      // Obter o usuário logado do token
      const userId = req.user?.id || 1;
      
      // Filtrar por empresa se especificado
      const empresaId = req.user?.empresaId || (req.query.empresaId ? parseInt(req.query.empresaId as string) : undefined);
      
      const suppliers = await storage.getSuppliers(userId, empresaId);
      res.json(suppliers);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.post("/suppliers", requireAuth, async (req: Request, res: Response) => {
    try {
      // Garantir que empresaId e userId sejam incluídos
      if (!req.body.empresaId && req.user?.empresaId) {
        req.body.empresaId = req.user.empresaId;
      }
      
      if (!req.body.userId && req.user?.id) {
        req.body.userId = req.user.id;
      }
      
      const supplierData = insertSupplierSchema.parse(req.body);
      const supplier = await storage.createSupplier(supplierData);
      res.status(201).json(supplier);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.get("/suppliers/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const supplierId = parseInt(req.params.id);
      const empresaId = req.user?.empresaId || (req.query.empresaId ? parseInt(req.query.empresaId as string) : undefined);
      const supplier = await storage.getSupplier(supplierId, empresaId);
      
      if (!supplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }
      
      res.json(supplier);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.put("/suppliers/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const supplierId = parseInt(req.params.id);
      const empresaId = req.user?.empresaId || (req.query.empresaId ? parseInt(req.query.empresaId as string) : undefined);
      
      // Verificar se o supplier pertence à empresa especificada
      if (empresaId) {
        const supplier = await storage.getSupplier(supplierId, empresaId);
        if (!supplier) {
          return res.status(404).json({ message: "Supplier not found for this company" });
        }
      }
      
      const supplierData = insertSupplierSchema.partial().parse(req.body);
      
      const updatedSupplier = await storage.updateSupplier(supplierId, supplierData);
      
      if (!updatedSupplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }
      
      res.json(updatedSupplier);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.delete("/suppliers/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const supplierId = parseInt(req.params.id);
      const empresaId = req.user?.empresaId || (req.query.empresaId ? parseInt(req.query.empresaId as string) : undefined);
      
      // Verificar se o supplier pertence à empresa especificada
      if (empresaId) {
        const supplier = await storage.getSupplier(supplierId, empresaId);
        if (!supplier) {
          return res.status(404).json({ message: "Supplier not found for this company" });
        }
      }
      
      const success = await storage.deleteSupplier(supplierId);
      
      if (!success) {
        return res.status(404).json({ message: "Supplier not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Gift Card routes (antigo Card)
  router.get("/gift-cards", requireAuth, async (req: Request, res: Response) => {
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
      const empresaId = req.query.empresaId ? parseInt(req.query.empresaId as string) : undefined;
      const search = req.query.search as string | undefined;
      
      // Verificar se o usuário é do perfil convidado
      const user = (req as any).user;
      const isGuest = await isGuestProfile(user.perfilId);
      
      if (search) {
        // TODO: Atualizar o método searchGiftCards para suportar empresaId quando necessário
        const giftCards = await storage.searchGiftCards(userId, search);
        
        // Filtrar por empresa se necessário
        let filteredGiftCards = empresaId 
          ? giftCards.filter(card => card.empresaId === empresaId)
          : giftCards;
        
        // Filtrar dados confidenciais se for perfil convidado
        if (isGuest) {
          filteredGiftCards = filterGiftCardArray(filteredGiftCards, true);
        }
          
        return res.json(filteredGiftCards);
      }
      
      let giftCards = await storage.getGiftCards(userId, fornecedorId, empresaId);
      
      // Filtrar dados confidenciais se for perfil convidado
      if (isGuest) {
        giftCards = filterGiftCardArray(giftCards, true);
      }
      
      res.json(giftCards);
    } catch (error) {
      console.error("Erro ao listar gift cards:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.post("/gift-cards", async (req: Request, res: Response) => {
    try {
      // Garantir que empresaId seja incluído se vier como query parameter mas não no body
      if (!req.body.empresaId && req.query.empresaId) {
        req.body.empresaId = parseInt(req.query.empresaId as string);
      }
      
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

  router.get("/gift-cards/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const giftCardId = parseInt(req.params.id);
      const empresaId = req.query.empresaId ? parseInt(req.query.empresaId as string) : undefined;
      let giftCard = await storage.getGiftCard(giftCardId, empresaId);
      
      if (!giftCard) {
        return res.status(404).json({ message: "Gift Card not found" });
      }
      
      // Verificar se o usuário é do perfil convidado
      const user = (req as any).user;
      const isGuest = await isGuestProfile(user.perfilId);
      
      // Filtrar dados confidenciais se for perfil convidado
      if (isGuest) {
        giftCard = filterConfidentialData(giftCard, true);
      }
      
      res.json(giftCard);
    } catch (error) {
      console.error("Erro ao buscar gift card:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.put("/gift-cards/:id", async (req: Request, res: Response) => {
    try {
      const giftCardId = parseInt(req.params.id);
      const empresaId = req.query.empresaId ? parseInt(req.query.empresaId as string) : undefined;
      
      // Verificar se o gift card pertence à empresa antes de atualizar
      if (empresaId) {
        const giftCard = await storage.getGiftCard(giftCardId, empresaId);
        if (!giftCard) {
          return res.status(404).json({ message: "Gift Card not found for this company" });
        }
      }
      
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
      const empresaId = req.query.empresaId ? parseInt(req.query.empresaId as string) : undefined;
      
      // Verificar se o gift card pertence à empresa antes de excluir
      if (empresaId) {
        const giftCard = await storage.getGiftCard(giftCardId, empresaId);
        if (!giftCard) {
          return res.status(404).json({ message: "Gift Card not found for this company" });
        }
      }
      
      const success = await storage.deleteGiftCard(giftCardId);
      
      if (!success) {
        return res.status(404).json({ message: "Gift Card not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.get("/gift-cards/vencimento/:dias/:userId", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const dias = parseInt(req.params.dias);
      
      if (isNaN(dias)) {
        return res.status(400).json({ message: "Invalid number of days" });
      }
      
      // Obter o empresaId se fornecido como parâmetro de consulta
      const empresaId = req.query.empresaId ? parseInt(req.query.empresaId as string) : undefined;
      
      // TODO: Atualizar o método getGiftCardsVencimento para suportar empresaId quando necessário
      let giftCards = await storage.getGiftCardsVencimento(userId, dias);
      
      // Filtrar manualmente por empresa, se especificada (até que o método seja atualizado)
      if (empresaId) {
        giftCards = giftCards.filter(giftCard => giftCard.empresaId === empresaId);
      }
      
      // Verificar se o usuário é do perfil convidado
      const user = (req as any).user;
      const isGuest = await isGuestProfile(user.perfilId);
      
      // Filtrar dados confidenciais se for perfil convidado
      if (isGuest) {
        giftCards = filterGiftCardArray(giftCards, true);
      }
      
      res.json(giftCards);
    } catch (error) {
      console.error("Erro ao buscar gift cards com vencimento próximo:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Tag routes
  router.get("/tags", async (req: Request, res: Response) => {
    try {
      // Filtrar por empresa se especificado
      const empresaId = req.query.empresaId ? parseInt(req.query.empresaId as string) : undefined;
      const tags = await storage.getTags(empresaId);
      res.json(tags);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.post("/tags", async (req: Request, res: Response) => {
    try {
      // Garantir que o empresaId seja armazenado
      if (!req.body.empresaId && req.query.empresaId) {
        req.body.empresaId = parseInt(req.query.empresaId as string);
      }
      
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
      const empresaId = req.query.empresaId ? parseInt(req.query.empresaId as string) : undefined;
      const tag = await storage.getTag(tagId, empresaId);
      
      if (!tag) {
        return res.status(404).json({ message: "Tag not found" });
      }
      
      res.json(tag);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.get("/gift-cards/tag/:tagId", requireAuth, async (req: Request, res: Response) => {
    try {
      const tagId = parseInt(req.params.tagId);
      const empresaId = req.query.empresaId ? parseInt(req.query.empresaId as string) : undefined;
      
      // Verificar se o tagId pertence à empresa especificada, se houver
      if (empresaId) {
        const tag = await storage.getTag(tagId, empresaId);
        if (!tag) {
          return res.status(404).json({ message: "Tag not found for this company" });
        }
      }
      
      const giftCards = await storage.getGiftCardsByTag(tagId);
      
      // Filtrar os gift cards por empresa se necessário
      let filteredGiftCards = empresaId 
        ? giftCards.filter(card => card.empresaId === empresaId)
        : giftCards;
      
      // Verificar se o usuário é do perfil convidado
      const user = (req as any).user;
      const isGuest = await isGuestProfile(user.perfilId);
      
      // Filtrar dados confidenciais se for perfil convidado
      if (isGuest) {
        filteredGiftCards = filterGiftCardArray(filteredGiftCards, true);
      }
        
      res.json(filteredGiftCards);
    } catch (error) {
      console.error("Erro ao buscar gift cards por tag:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.get("/gift-cards/:giftCardId/tags", async (req: Request, res: Response) => {
    try {
      const giftCardId = parseInt(req.params.giftCardId);
      const empresaId = req.query.empresaId ? parseInt(req.query.empresaId as string) : undefined;
      const tags = await storage.getGiftCardTags(giftCardId, empresaId);
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
  // Nova rota para buscar todas as transações
  router.get("/transacoes", async (req: Request, res: Response) => {
    try {
      // Verifica se há um filtro por empresa
      const empresaId = req.query.empresaId ? parseInt(req.query.empresaId as string) : undefined;
      
      if (empresaId) {
        // Se houver empresaId, usa o método de busca específico para a empresa
        const transacoes = await storage.getTransacoesByEmpresa(empresaId);
        
        // Ordena por data decrescente (mais recentes primeiro)
        transacoes.sort((a, b) => {
          return new Date(b.dataTransacao).getTime() - new Date(a.dataTransacao).getTime();
        });
        
        return res.json(transacoes);
      }
      
      // Implementação padrão (sem filtro por empresa)
      const todasTransacoes: Transacao[] = [];
      
      // Itera por todos os gift cards para coletar suas transações
      const giftCards = await storage.getGiftCards(1); // Usuário demo fixo para simplificar
      
      // Incluir transações para cada gift card existente
      for (const card of giftCards) {
        const transacoes = await storage.getTransacoes(card.id);
        todasTransacoes.push(...transacoes);
      }
      
      // Também adicionar aqui qualquer outra transação geral que não esteja associada a gift cards
      // Exemplo: registro de adição de gift cards, pagamentos, etc.
      
      // Ordena por data decrescente (mais recentes primeiro)
      todasTransacoes.sort((a, b) => {
        return new Date(b.dataTransacao).getTime() - new Date(a.dataTransacao).getTime();
      });
      
      res.json(todasTransacoes);
    } catch (error) {
      console.error("Erro ao buscar todas as transações:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Rota para buscar transações de um gift card específico
  router.get("/transacoes/:giftCardId", async (req: Request, res: Response) => {
    try {
      const giftCardId = parseInt(req.params.giftCardId);
      if (isNaN(giftCardId)) {
        return res.status(400).json({ message: "ID de Gift Card inválido" });
      }
      
      // Verifica se há um filtro por empresa
      const empresaId = req.query.empresaId ? parseInt(req.query.empresaId as string) : undefined;
      
      // Busca o gift card para verificar se ele pertence à empresa especificada
      if (empresaId) {
        const giftCard = await storage.getGiftCard(giftCardId, empresaId);
        if (!giftCard) {
          return res.status(404).json({ message: "Gift Card not found for this company" });
        }
      }
      
      const transacoes = await storage.getTransacoes(giftCardId, empresaId);
      res.json(transacoes);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  router.post("/transacoes", async (req: Request, res: Response) => {
    try {
      // Log da requisição recebida
      console.log("Recebendo transação:", JSON.stringify(req.body, null, 2));
      
      // Extrai dados básicos do corpo da requisição
      const {
        valor = 0,
        descricao = "",
        giftCardId,
        giftCardIds = giftCardId ? String(giftCardId) : "",
        userId = 1,
        status = "concluida",
        nomeUsuario = "Usuário"
      } = req.body;
      
      // Validações básicas
      if (!valor || !descricao || !giftCardId) {
        return res.status(400).json({ 
          message: "Campos obrigatórios ausentes", 
          detalhes: "Os campos valor, descricao e giftCardId são obrigatórios" 
        });
      }
      
      // Cria objeto de transação básico
      const transacaoObj = {
        valor: parseFloat(valor),
        descricao,
        giftCardId: parseInt(giftCardId || 0),
        giftCardIds: giftCardIds || String(giftCardId || ""),
        userId: parseInt(userId || 1),
        status,
        dataTransacao: new Date(),
        empresaId: 1,
        nomeUsuario
      };
      
      // Processa opcionais
      if (req.body.dataTransacao) {
        if (typeof req.body.dataTransacao === 'string') {
          transacaoObj.dataTransacao = new Date(req.body.dataTransacao);
        } else if (req.body.dataTransacao instanceof Date) {
          transacaoObj.dataTransacao = req.body.dataTransacao;
        }
      }
      
      if (req.body.empresaId) {
        transacaoObj.empresaId = parseInt(req.body.empresaId);
      }
      
      // Inclui campos opcionais se presentes
      if (req.body.comprovante) transacaoObj.comprovante = req.body.comprovante;
      if (req.body.motivoCancelamento) transacaoObj.motivoCancelamento = req.body.motivoCancelamento;
      if (req.body.ordemInterna) transacaoObj.ordemInterna = req.body.ordemInterna;
      if (req.body.ordemCompra) transacaoObj.ordemCompra = req.body.ordemCompra;
      
      // Cria a transação diretamente pelo storage sem usar Schema Zod
      console.log("Criando transação com:", transacaoObj);
      const transacao = await storage.createTransacao(transacaoObj);
      
      // Atualiza o saldo do gift card se a transação for concluída
      if (transacao.status === 'concluida' && transacao.giftCardId) {
        try {
          console.log(`Atualizando saldo do gift card ${transacao.giftCardId} após transação concluída`);
          const giftCard = await storage.getGiftCard(transacao.giftCardId);
          
          if (giftCard) {
            console.log(`Gift card encontrado: ${giftCard.codigo}, saldo atual: ${giftCard.saldoAtual}`);
            const novoSaldo = giftCard.saldoAtual - transacao.valor;
            console.log(`Novo saldo calculado: ${novoSaldo}`);
            
            await storage.updateGiftCard(giftCard.id, {
              saldoAtual: novoSaldo
            });
            
            console.log(`Saldo atualizado com sucesso para: ${novoSaldo}`);
          }
        } catch (error) {
          console.error(`Erro ao atualizar saldo do gift card: ${error}`);
          // Não interrompe o fluxo, apenas loga o erro
        }
      }
      
      console.log("Transação criada com sucesso:", transacao);
      return res.status(201).json(transacao);
    } catch (error) {
      console.error("Erro ao criar transação:", error);
      res.status(500).json({ message: "Falha ao criar transação", error: String(error) });
    }
  });
  
  router.get("/transacoes/detalhes/:id", async (req: Request, res: Response) => {
    try {
      const transacaoId = parseInt(req.params.id);
      const empresaId = req.query.empresaId ? parseInt(req.query.empresaId as string) : undefined;
      
      // Busca a transação com possível filtro por empresa
      const transacao = await storage.getTransacao(transacaoId, empresaId);
      
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
      const empresaId = req.query.empresaId ? parseInt(req.query.empresaId as string) : undefined;
      
      // Verificar se a transação pertence à empresa especificada
      if (empresaId) {
        const transacao = await storage.getTransacao(transacaoId, empresaId);
        if (!transacao) {
          return res.status(404).json({ message: "Transação not found for this company" });
        }
      }
      
      // Garantir que empresaId seja incluído se vier como query parameter mas não no body
      if (!req.body.empresaId && req.query.empresaId) {
        req.body.empresaId = parseInt(req.query.empresaId as string);
      }
      
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
      const empresaId = req.query.empresaId ? parseInt(req.query.empresaId as string) : undefined;
      
      // Verificar se a transação pertence à empresa especificada
      if (empresaId) {
        const transacao = await storage.getTransacao(transacaoId, empresaId);
        if (!transacao) {
          return res.status(404).json({ message: "Transação not found for this company" });
        }
      }
      
      const success = await storage.deleteTransacao(transacaoId);
      
      if (!success) {
        return res.status(404).json({ message: "Transação not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Rota para exportação de relatórios
  router.get("/relatorios/gift-cards/export", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.query.userId as string) || 1;
      const empresaId = req.query.empresaId ? parseInt(req.query.empresaId as string) : undefined;
      
      // Buscar todos os gift cards do usuário ou empresa
      let giftCards = await storage.getGiftCards(userId, undefined, empresaId);
      
      // Filtrar dados confidenciais se o usuário for do perfil convidado
      const user = (req as any).user;
      const isGuest = await isGuestProfile(user.perfilId);
      if (isGuest) {
        giftCards = filterGiftCardArray(giftCards, true);
      }
      
      res.json(giftCards);
    } catch (error) {
      console.error("Erro ao exportar gift cards:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.get("/relatorios/transacoes/export", requireAuth, async (req: Request, res: Response) => {
    try {
      const empresaId = req.query.empresaId ? parseInt(req.query.empresaId as string) : undefined;
      const giftCardId = req.query.giftCardId ? parseInt(req.query.giftCardId as string) : undefined;
      
      let transacoes: Transacao[] = [];
      
      if (giftCardId) {
        // Buscar transações de um gift card específico
        transacoes = await storage.getTransacoes(giftCardId, empresaId);
      } else if (empresaId) {
        // Buscar todas as transações da empresa
        transacoes = await storage.getTransacoesByEmpresa(empresaId);
      } else {
        // Sem filtro, buscar todas as transações (com limite para não sobrecarregar)
        const giftCards = await storage.getGiftCards(1);  // ID do usuário demo
        for (const card of giftCards.slice(0, 10)) {  // Limitar para os primeiros 10 gift cards
          const cardTransacoes = await storage.getTransacoes(card.id);
          transacoes.push(...cardTransacoes);
        }
      }
      
      // Ordenar por data, mais recentes primeiro
      transacoes.sort((a, b) => {
        return new Date(b.dataTransacao).getTime() - new Date(a.dataTransacao).getTime();
      });
      
      res.json(transacoes);
    } catch (error) {
      console.error("Erro ao exportar transações:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Rota para estatísticas de relatórios
  router.get("/relatorios/estatisticas", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.query.userId as string) || 1;
      const empresaId = req.query.empresaId ? parseInt(req.query.empresaId as string) : undefined;
      
      // Buscar todos os gift cards do usuário ou empresa
      const giftCards = await storage.getGiftCards(userId, undefined, empresaId);
      const fornecedores = await storage.getFornecedores(userId, empresaId);
      
      // Calcular estatísticas por fornecedor
      const estatisticasPorFornecedor = fornecedores
        .filter(f => f.status === "ativo")
        .map(fornecedor => {
          const fornecedorGiftCards = giftCards.filter(gc => gc.fornecedorId === fornecedor.id);
          const saldoTotal = fornecedorGiftCards.reduce((sum, gc) => sum + gc.saldoAtual, 0);
          const count = fornecedorGiftCards.length;
          
          return {
            id: fornecedor.id,
            nome: fornecedor.nome,
            saldoTotal,
            count,
            valorMedio: count > 0 ? saldoTotal / count : 0
          };
        });
      
      // Calcular estatísticas por mês (últimos 6 meses)
      const hoje = new Date();
      const estatisticasPorMes = [];
      
      for (let i = 5; i >= 0; i--) {
        const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        const mes = data.toLocaleString('default', { month: 'short' });
        const ano = data.getFullYear();
        
        const cardsNoMes = giftCards.filter(gc => {
          const dataGC = new Date(gc.createdAt);
          return dataGC.getMonth() === data.getMonth() && dataGC.getFullYear() === data.getFullYear();
        });
        
        // Calcular valor economizado (diferença entre o valor inicial e preço de compra)
        const valorEconomizado = cardsNoMes.reduce((sum, gc) => {
          // Se tiver um valor de desconto, usar ele diretamente
          if (gc.desconto) return sum + gc.desconto;
          
          // Caso contrário, calcular com base na diferença entre valor facial e valor pago
          // Assumindo que a diferença entre valor inicial e valor pago é a economia
          // Este é um cálculo simplificado, você pode ajustar conforme a lógica de negócio
          const valorFacial = gc.valorInicial || 0;
          const valorPago = gc.valorInicial * 0.9; // Assumindo 10% de desconto como exemplo
          return sum + (valorFacial - valorPago);
        }, 0);
        
        // Estatísticas por fornecedor no mês
        const estatisticasFornecedoresNoMes = {};
        
        fornecedores.forEach(fornecedor => {
          const cardsFornecedor = cardsNoMes.filter(gc => gc.fornecedorId === fornecedor.id);
          
          if (cardsFornecedor.length > 0) {
            estatisticasFornecedoresNoMes[fornecedor.id] = {
              nome: fornecedor.nome,
              count: cardsFornecedor.length,
              valor: cardsFornecedor.reduce((sum, gc) => sum + gc.valorInicial, 0)
            };
          }
        });
        
        estatisticasPorMes.push({
          mes: `${mes}/${ano.toString().substring(2)}`,
          count: cardsNoMes.length,
          valor: cardsNoMes.reduce((sum, gc) => sum + gc.valorInicial, 0),
          valorEconomizado: valorEconomizado,
          fornecedores: estatisticasFornecedoresNoMes
        });
      }
      
      // Estatísticas gerais
      const estatisticasGerais = {
        totalGiftCards: giftCards.length,
        totalFornecedores: fornecedores.filter(f => f.status === "ativo").length,
        saldoTotal: giftCards.reduce((sum, gc) => sum + gc.saldoAtual, 0),
        valorTotalInicial: giftCards.reduce((sum, gc) => sum + gc.valorInicial, 0),
      };
      
      res.json({
        estatisticasPorFornecedor,
        estatisticasPorMes,
        estatisticasGerais
      });
    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Rota simplificada de teste para transação
  router.post("/transacoes-teste", async (req: Request, res: Response) => {
    try {
      console.log("TESTE - Recebendo dados:", JSON.stringify(req.body, null, 2));
      
      // Dados obrigatórios mínimos
      const dadosTransacao = {
        valor: req.body.valor || 10,
        descricao: req.body.descricao || "Transação de teste",
        giftCardId: req.body.giftCardId || 1, 
        giftCardIds: req.body.giftCardIds || "1",
        userId: req.body.userId || 1,
        status: "concluida",
        nomeUsuario: "Teste Automático",
        dataTransacao: new Date(),
        empresaId: 1
      };
      
      console.log("TESTE - Dados processados:", dadosTransacao);
      
      // Criar transação simplificada diretamente sem validação Zod
      const transacao = await storage.createTransacao(dadosTransacao);
      
      console.log("TESTE - Transação criada com sucesso:", transacao);
      
      // Retornar sucesso
      return res.status(201).json({
        success: true,
        message: "Transação de teste criada com sucesso",
        data: transacao
      });
    } catch (error) {
      console.error("TESTE - Erro ao criar transação:", error);
      return res.status(500).json({
        success: false,
        message: "Falha ao criar transação de teste",
        error: String(error)
      });
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
      
      // Filtra por empresa se especificada
      const empresaId = req.query.empresaId ? parseInt(req.query.empresaId as string) : undefined;
      
      const fornecedores = await storage.getFornecedores(userId, empresaId);
      
      // Filtrar para retornar apenas fornecedores ativos
      const fornecedoresAtivos = fornecedores.filter(f => f.status === "ativo");
      
      // Mapear para o formato esperado pelo sidebar
      const collections = fornecedoresAtivos.map(f => ({
        id: f.id,
        nome: f.nome,
        logo: f.logo,
        empresaId: f.empresaId // Inclui o empresaId para facilitar futuras filtragens
      }));
      
      res.json(collections);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Rota de login (sem autenticação)
  router.post("/auth/login", login);
  
  // Rota para obter um token de desenvolvimento sem necessidade de login
  router.get("/auth/dev-token", async (req: Request, res: Response) => {
    try {
      // Verificar se estamos em ambiente de desenvolvimento
      const isDev = process.env.NODE_ENV !== 'production';
      if (!isDev) {
        return res.status(403).json({ message: "Esta rota só está disponível em ambiente de desenvolvimento" });
      }
      
      // Buscar usuário demo
      const user = await storage.getUserByEmail("demo@cardvault.com");
      if (!user) {
        return res.status(404).json({ message: "Usuário demo não encontrado" });
      }
      
      // Buscar o perfil do usuário
      const perfil = await storage.getPerfil(user.perfilId);
      if (!perfil) {
        return res.status(403).json({ message: "Perfil do usuário não encontrado" });
      }

      // Buscar a empresa do usuário
      const empresa = await storage.getEmpresa(user.empresaId);
      if (!empresa) {
        return res.status(403).json({ message: "Empresa do usuário não encontrada" });
      }
      
      // Gerar token JWT
      const token = jwt.sign(
        {
          userId: user.id,
          username: user.username,
          empresaId: user.empresaId,
          perfilId: user.perfilId,
        },
        JWT_SECRET,
        { expiresIn: "24h" }
      );
      
      // Retornar o token e dados do usuário
      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          nome: user.nome,
          email: user.email,
          empresaId: user.empresaId,
          empresaNome: empresa.nome,
          perfilId: user.perfilId,
          perfilNome: perfil.nome,
        },
      });
    } catch (error) {
      console.error("Erro ao gerar token de desenvolvimento:", error);
      res.status(500).json({ message: "Erro ao gerar token de desenvolvimento" });
    }
  });

  // Rota para obter empresas (sem autenticação)
  router.get("/empresas", async (req: Request, res: Response) => {
    try {
      const empresas = await storage.getEmpresas();
      res.json(empresas);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Rota para obter todos os perfis
  router.get("/perfis", async (req: Request, res: Response) => {
    try {
      const perfis = await storage.getPerfis();
      console.log("Enviando perfis:", perfis); // Log para depuração
      res.json(perfis);
    } catch (error) {
      console.error("Erro ao buscar perfis:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Rota para obter um perfil específico pelo ID
  router.get("/perfis/:id", async (req: Request, res: Response) => {
    try {
      const perfilId = parseInt(req.params.id);
      const perfil = await storage.getPerfil(perfilId);
      
      if (!perfil) {
        return res.status(404).json({ message: "Perfil não encontrado" });
      }
      
      res.json(perfil);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Criar um novo perfil
  router.post("/perfis", async (req: Request, res: Response) => {
    try {
      console.log("Recebendo dados para criar perfil:", req.body);
      // Garantir que permissões seja um array
      if (req.body.permissoes && !Array.isArray(req.body.permissoes)) {
        req.body.permissoes = String(req.body.permissoes).split(',').map(p => p.trim());
      }
      
      const perfil = await storage.createPerfil(req.body);
      console.log("Perfil criado:", perfil);
      res.status(201).json(perfil);
    } catch (error) {
      console.error("Erro ao criar perfil:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Atualizar um perfil existente
  router.put("/perfis/:id", async (req: Request, res: Response) => {
    try {
      const perfilId = parseInt(req.params.id);
      
      // Garantir que permissões seja um array
      if (req.body.permissoes && !Array.isArray(req.body.permissoes)) {
        req.body.permissoes = String(req.body.permissoes).split(',').map(p => p.trim());
      }
      
      const perfil = await storage.updatePerfil(perfilId, req.body);
      
      if (!perfil) {
        return res.status(404).json({ message: "Perfil não encontrado" });
      }
      
      res.json(perfil);
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Excluir um perfil
  router.delete("/perfis/:id", async (req: Request, res: Response) => {
    try {
      const perfilId = parseInt(req.params.id);
      const success = await storage.deletePerfil(perfilId);
      
      if (!success) {
        return res.status(404).json({ message: "Perfil não encontrado" });
      }
      
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Erro ao excluir perfil:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Aplicar middleware de autenticação apenas em rotas protegidas
  // Rota para obter dados do usuário autenticado
  router.get("/auth/me", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Buscar dados adicionais
      const perfil = await storage.getPerfil(user.perfilId);
      const empresa = await storage.getEmpresa(user.empresaId);
      
      res.json({
        id: user.id,
        username: user.username,
        nome: user.nome,
        email: user.email,
        empresaId: user.empresaId,
        empresaNome: empresa?.nome,
        perfilId: user.perfilId,
        perfilNome: perfil?.nome
      });
    } catch (error) {
      console.error("Erro ao buscar dados do usuário:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Rota de logout (protegida por autenticação)
  router.post("/auth/logout", requireAuth, (req: Request, res: Response) => {
    // No backend com JWT, o logout é gerenciado pelo cliente
    // O servidor apenas confirma que a requisição foi recebida
    res.status(200).json({ message: "Logout realizado com sucesso" });
  });

  // Mount the API router
  app.use("/api", router);

  const httpServer = createServer(app);
  return httpServer;
}
