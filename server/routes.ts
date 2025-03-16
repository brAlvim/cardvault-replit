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
  Transacao // Adiciona a importação do tipo
} from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { login, requireAuth, requirePermission } from "./auth";

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
      const empresaId = req.query.empresaId ? parseInt(req.query.empresaId as string) : undefined;
      const search = req.query.search as string | undefined;
      
      if (search) {
        // TODO: Atualizar o método searchGiftCards para suportar empresaId quando necessário
        const giftCards = await storage.searchGiftCards(userId, search);
        
        // Filtrar por empresa se necessário
        const filteredGiftCards = empresaId 
          ? giftCards.filter(card => card.empresaId === empresaId)
          : giftCards;
          
        return res.json(filteredGiftCards);
      }
      
      const giftCards = await storage.getGiftCards(userId, fornecedorId, empresaId);
      res.json(giftCards);
    } catch (error) {
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

  router.get("/gift-cards/:id", async (req: Request, res: Response) => {
    try {
      const giftCardId = parseInt(req.params.id);
      const empresaId = req.query.empresaId ? parseInt(req.query.empresaId as string) : undefined;
      const giftCard = await storage.getGiftCard(giftCardId, empresaId);
      
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

  router.get("/gift-cards/vencimento/:dias/:userId", async (req: Request, res: Response) => {
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
      
      res.json(giftCards);
    } catch (error) {
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

  router.get("/gift-cards/tag/:tagId", async (req: Request, res: Response) => {
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
      const filteredGiftCards = empresaId 
        ? giftCards.filter(card => card.empresaId === empresaId)
        : giftCards;
        
      res.json(filteredGiftCards);
    } catch (error) {
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
    console.log("Recebendo requisição para criar transação:", req.body);
    try {
      // Verificar se os campos obrigatórios estão presentes
      if (!req.body.valor || !req.body.descricao || !req.body.giftCardId) {
        console.error("Campos obrigatórios ausentes:", { 
          temValor: !!req.body.valor, 
          temDescricao: !!req.body.descricao, 
          temGiftCardId: !!req.body.giftCardId 
        });
        return res.status(400).json({ 
          message: "Campos obrigatórios ausentes", 
          detalhes: "Os campos valor, descricao e giftCardId são obrigatórios" 
        });
      }

      // Garantir que status tenha um valor padrão se não estiver definido
      if (!req.body.status) {
        req.body.status = "concluida";
      }

      // Garantir que giftCardIds tenha um valor padrão se não estiver definido
      if (!req.body.giftCardIds && req.body.giftCardId) {
        req.body.giftCardIds = String(req.body.giftCardId);
      }

      // Garantir que empresaId seja incluído se vier como query parameter mas não no body
      if (!req.body.empresaId && req.query.empresaId) {
        req.body.empresaId = parseInt(req.query.empresaId as string);
      }

      // Se o giftCardId for fornecido, verificar se o cartão pertence à empresa
      const empresaId = req.body.empresaId || (req.query.empresaId ? parseInt(req.query.empresaId as string) : undefined);
      if (empresaId && req.body.giftCardId) {
        const giftCard = await storage.getGiftCard(req.body.giftCardId, empresaId);
        if (!giftCard) {
          return res.status(404).json({ message: "Gift Card not found for this company" });
        }
      }

      console.log("Dados normalizados:", req.body);
      
      const transacaoData = insertTransacaoSchema.parse(req.body);
      console.log("Dados validados pelo schema:", transacaoData);
      
      const transacao = await storage.createTransacao(transacaoData);
      console.log("Transação criada com sucesso:", transacao);
      
      res.status(201).json(transacao);
    } catch (error) {
      console.error("Erro ao criar transação:", error);
      if (error instanceof z.ZodError) {
        console.error("Erro de validação ZodError:", error.errors);
        return res.status(400).json({ 
          message: fromZodError(error).message,
          detalhes: error.errors
        });
      }
      res.status(500).json({ message: "Internal server error", erro: String(error) });
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
