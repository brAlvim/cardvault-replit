import express, { type Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import { 
  insertGiftCardSchema, 
  insertFornecedorSchema, 
  insertTagSchema, 
  insertUserSchema,
  insertTransacaoSchema,
  insertGiftCardTagSchema,
  insertSupplierSchema,
  Transacao,
  Fornecedor,
  Supplier,
  GiftCard
} from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { format } from "date-fns";
import { 
  login, 
  requireAuth, 
  requirePermission, 
  isGuestProfile, 
  filterConfidentialData, 
  filterGiftCardArray, 
  encrypt, 
  decrypt, 
  decryptGiftCardData, 
  requireResourceOwnership,
  canUserAccessResource,
  canUserManageOtherUser
} from "./auth";
import jwt from "jsonwebtoken";

// Chave secreta para JWT - em produção, isso deve estar no .env
const JWT_SECRET = "cardvault-secret-key-2024-advanced-security-protocol";

export async function registerRoutes(app: Express): Promise<Server> {
  const router = express.Router();

  // Rotas de autenticação
  router.post("/auth/login", login);
  
  router.post("/auth/logout", (req: Request, res: Response) => {
    // No back-end não precisamos fazer nada para o logout
    // O cliente é responsável por remover o token JWT
    res.status(200).json({ message: "Logout realizado com sucesso" });
  });
  
  router.get("/auth/me", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // Buscar dados adicionais para enriquecer a resposta
      const perfil = await storage.getPerfil(user.perfilId);
      const empresa = await storage.getEmpresa(user.empresaId);
      
      // Retornar dados do usuário sem informações sensíveis
      res.json({
        id: user.id,
        username: user.username,
        nome: user.nome,
        email: user.email,
        empresaId: user.empresaId,
        empresaNome: empresa?.nome,
        perfilId: user.perfilId,
        perfilNome: perfil?.nome,
      });
    } catch (error) {
      console.error("Erro ao obter dados do usuário:", error);
      res.status(500).json({ message: "Erro ao obter dados do usuário" });
    }
  });
  
  // Rota de emergência para desenvolvimento - REMOVER EM PRODUÇÃO
  router.get("/auth/dev-token", async (req: Request, res: Response) => {
    try {
      // Buscar usuário demo para desenvolvimento
      const user = await storage.getUserByUsername("demo");
      
      if (!user) {
        return res.status(404).json({ message: "Usuário demo não encontrado" });
      }
      
      // Buscar o perfil e empresa
      const perfil = await storage.getPerfil(user.perfilId);
      const empresa = await storage.getEmpresa(user.empresaId);
      
      if (!perfil || !empresa) {
        return res.status(500).json({ message: "Dados de usuário incompletos" });
      }
      
      // Gerar token
      const token = jwt.sign(
        {
          userId: user.id,
          username: user.username,
          empresaId: user.empresaId,
          perfilId: user.perfilId,
        },
        JWT_SECRET,
        { expiresIn: "7d" } // Token de desenvolvimento com validade estendida
      );
      
      // Responder com o token e dados básicos do usuário
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
  
  // Função para inicializar fornecedores padrão para um usuário
  async function initializeDefaultSuppliersForUser(userId: number, empresaId: number) {
    try {
      console.log(`Inicializando suppliers padrão para usuário ${userId}`);
      // Dados dos fornecedores de gift cards (marketplace)
      const defaultSuppliers = [
        {
          nome: "CARDCOOKIE",
          descricao: "Marketplace especializado em gift cards",
          website: "https://www.cardcookie.com",
          logo: "https://www.cardcookie.com/assets/images/logo.png"
        },
        {
          nome: "CARD CASH",
          descricao: "Compra e venda de gift cards com desconto",
          website: "https://www.cardcash.com",
          logo: "https://www.cardcash.com/ccfeprism/img/cc-logo-black.svg"
        },
        {
          nome: "CARD DEPOT",
          descricao: "Marketplace de gift cards premium",
          website: "https://www.carddepot.com",
          logo: null
        },
        {
          nome: "GCX / RAISE",
          descricao: "GCX (anteriormente Raise) - Plataforma de gift cards com desconto",
          website: "https://www.raise.com",
          logo: "https://d2hbxkrooc.execute-api.us-east-1.amazonaws.com/prod/logos/primary/rise.svg"
        },
        {
          nome: "ARBITRAGE CARD",
          descricao: "Especializada em gift cards com descontos",
          website: "https://arbitragecard.com",
          logo: null
        },
        {
          nome: "FLUZ",
          descricao: "Cashback e desconto em gift cards",
          website: "https://fluz.app",
          logo: "https://fluz.app/assets/images/fluz-blue-logo.svg"
        },
        {
          nome: "EGIFTER",
          descricao: "Plataforma de compra e gestão de gift cards",
          website: "https://www.egifter.com",
          logo: "https://www.egifter.com/Content/Images/logov2.png"
        },
        {
          nome: "GIFTCARD OUTLET",
          descricao: "Marketplace com gift cards com desconto",
          website: "https://www.giftcardoutlet.com",
          logo: null
        }
      ];
      
      for (const supplierData of defaultSuppliers) {
        console.log(`Criando supplier ${supplierData.nome} para usuário ${userId}`);
        await storage.createSupplier({
          nome: supplierData.nome,
          descricao: supplierData.descricao,
          website: supplierData.website,
          logo: supplierData.logo,
          status: "ativo",
          userId: userId,
          empresaId: empresaId
        });
      }
      console.log(`Suppliers padrão criados com sucesso para usuário ${userId}`);
    } catch (error) {
      console.error("Erro ao criar suppliers padrão:", error);
    }
  }
  
  // Função para inicializar fornecedores de giftcards padrão para um usuário
  async function initializeDefaultFornecedoresForUser(userId: number, empresaId: number) {
    try {
      console.log(`Inicializando fornecedores padrão para usuário ${userId}`);
      // Dados dos fornecedores (lojas/brands)
      const defaultFornecedores = [
        {
          nome: "TARGET",
          descricao: "Gift cards da Target",
          website: "https://www.target.com",
          logo: "https://corporate.target.com/_media/TargetCorp/Press/B-roll%20and%20Press%20Materials/Logos/Target_Bullseye-Logo_Red.jpg"
        },
        {
          nome: "BESTBUY",
          descricao: "Gift cards da Best Buy",
          website: "https://www.bestbuy.com",
          logo: "https://pisces.bbystatic.com/image2/BestBuy_US/Gallery/BestBuy_Logo_2020-190616.png"
        },
        {
          nome: "WALMART",
          descricao: "Gift cards do Walmart",
          website: "https://www.walmart.com",
          logo: "https://cdn.corporate.walmart.com/dims4/default/ade7de9/2147483647/strip/true/crop/2389x930+0+0/resize/980x381!/quality/90/?url=https%3A%2F%2Fcdn.corporate.walmart.com%2Fd6%2Fe7%2F48e91bac4a7cb88cdb96d807b741%2Fwalmart-logos-lockupwtag-horiz-blu-rgb.png"
        },
        {
          nome: "HOMEDEPOT",
          descricao: "Gift cards da Home Depot",
          website: "https://www.homedepot.com",
          logo: "https://assets.thdstatic.com/images/v1/home-depot-logo.svg"
        },
        {
          nome: "LOWES",
          descricao: "Gift cards da Lowe's",
          website: "https://www.lowes.com",
          logo: "https://mobileimages.lowes.com/static/Lowes_desktop.png"
        },
        {
          nome: "BOSCOVS",
          descricao: "Gift cards da Boscov's",
          website: "https://www.boscovs.com",
          logo: "https://www.boscovs.com/wcsstore/boscovs/images/logo-214x47.png"
        },
        {
          nome: "WALGREENS",
          descricao: "Gift cards da Walgreens",
          website: "https://www.walgreens.com",
          logo: "https://www.walgreens.com/images/adaptive/sp/w-logo.png"
        },
        {
          nome: "SEPHORA",
          descricao: "Gift cards da Sephora",
          website: "https://www.sephora.com",
          logo: "https://www.sephora.com/img/ufe/logo.svg"
        },
        {
          nome: "NORDSTROM",
          descricao: "Gift cards da Nordstrom",
          website: "https://www.nordstrom.com",
          logo: "https://n.nordstrommedia.com/id/c34dc588-d740-4e2d-97f2-0f8584ab81f6.png"
        },
        {
          nome: "BARNES NOBLES",
          descricao: "Gift cards da Barnes & Noble",
          website: "https://www.barnesandnoble.com",
          logo: "https://dispatch.barnesandnoble.com/content/dam/ccr/site/bnlogo-new.png"
        },
        {
          nome: "ULTA",
          descricao: "Gift cards da Ulta Beauty",
          website: "https://www.ulta.com",
          logo: "https://www.ulta.com/media/images/logo-default.png"
        },
        {
          nome: "WAYFAIR",
          descricao: "Gift cards da Wayfair",
          website: "https://www.wayfair.com",
          logo: "https://assets.wfcdn.com/asset/logo/wayfair.svg"
        },
        {
          nome: "AMAZON",
          descricao: "Gift cards da Amazon",
          website: "https://www.amazon.com",
          logo: "https://logos-world.net/wp-content/uploads/2020/04/Amazon-Logo.png"
        },
        {
          nome: "MACYS",
          descricao: "Gift cards da Macy's",
          website: "https://www.macys.com",
          logo: "https://assets.macysassets.com/navapp/dyn_img/mlogo/macysLogo-180.png"
        },
        {
          nome: "DICKS SPORTING GOODS",
          descricao: "Gift cards da Dick's Sporting Goods",
          website: "https://www.dickssportinggoods.com",
          logo: "https://dks.scene7.com/is/image/GolfGalaxy/dks-logo-v6?hei=48&wid=173&fmt=png-alpha"
        },
        {
          nome: "ACADEMY SPORTS",
          descricao: "Gift cards da Academy Sports + Outdoors",
          website: "https://www.academy.com",
          logo: "https://assets.academy.com/mgen/assets/logo.svg"
        },
        {
          nome: "GAME STOP",
          descricao: "Gift cards da GameStop",
          website: "https://www.gamestop.com",
          logo: "https://www.gamestop.com/on/demandware.static/Sites-gamestop-us-Site/-/default/dw4de8eb3c/images/svg-icons/logo-gamestop-red.svg"
        }
      ];
      
      for (const fornecedorData of defaultFornecedores) {
        console.log(`Criando fornecedor ${fornecedorData.nome} para usuário ${userId}`);
        await storage.createFornecedor({
          nome: fornecedorData.nome,
          descricao: fornecedorData.descricao,
          website: fornecedorData.website,
          logo: fornecedorData.logo,
          status: "ativo",
          userId: userId,
          empresaId: empresaId
        });
      }
      console.log(`Fornecedores padrão criados com sucesso para usuário ${userId}`);
    } catch (error) {
      console.error("Erro ao criar fornecedores padrão:", error);
    }
  }

// User routes - Registro de novos usuários
  router.post("/users", async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Verificar se o nome de usuário já existe
      const existingUsername = await storage.getUserByUsername(userData.username);
      if (existingUsername) {
        return res.status(409).json({ message: "Nome de usuário já está em uso" });
      }
      
      // Verificar se o email já existe
      if (userData.email) {
        const existingEmail = await storage.getUserByEmail(userData.email);
        if (existingEmail) {
          return res.status(409).json({ message: "Email já está em uso" });
        }
      }
      
      // Criptografar a senha com bcrypt
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(userData.password, saltRounds);
      
      // Substituir a senha em texto puro pela senha criptografada
      const userDataWithHashedPassword = {
        ...userData,
        password: hashedPassword,
        // Por padrão, novos usuários são do perfil 'convidado' (id 4)
        perfilId: userData.perfilId || 4,
        status: 'ativo'
      };
      
      // Criar o usuário no banco de dados
      const newUser = await storage.createUser(userDataWithHashedPassword);
      
      // Inicializar fornecedores e fornecedores de gift card padrão para o novo usuário
      if (newUser) {
        await initializeDefaultFornecedoresForUser(newUser.id, newUser.empresaId);
        await initializeDefaultSuppliersForUser(newUser.id, newUser.empresaId);
      }
      
      // Remover a senha da resposta por segurança
      const { password, ...userWithoutPassword } = newUser;
      
      // Gerar JWT token para o novo usuário
      const token = jwt.sign(
        {
          userId: newUser.id,
          username: newUser.username,
          empresaId: newUser.empresaId,
          perfilId: newUser.perfilId,
        },
        JWT_SECRET,
        { expiresIn: "24h" }
      );
      
      // Buscar dados adicionais para a resposta
      const perfil = await storage.getPerfil(newUser.perfilId);
      const empresa = await storage.getEmpresa(newUser.empresaId);
      
      // Retornar dados do usuário e token
      res.status(201).json({
        token,
        user: {
          id: newUser.id,
          username: newUser.username,
          nome: newUser.nome,
          email: newUser.email,
          empresaId: newUser.empresaId,
          empresaNome: empresa?.nome,
          perfilId: newUser.perfilId,
          perfilNome: perfil?.nome,
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error("Erro ao criar usuário:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
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
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      // ISOLAMENTO ESTRITO DE DADOS - CORREÇÃO DE SEGURANÇA
      // Usar SEMPRE e APENAS os dados do usuário autenticado
      const userId = user.id;
      const empresaId = user.empresaId;
      
      console.log(`[SEGURANÇA] Busca global por "${searchTerm}" pelo usuário ${user.username} (ID: ${userId})`);

      if (!searchTerm) {
        return res.status(400).json({ message: "Search term is required" });
      }

      // CORREÇÃO CRÍTICA: Buscar APENAS fornecedores do próprio usuário
      // Utilizando o método de storage que já implementa o isolamento
      const fornecedores = await storage.getFornecedores(userId, empresaId);
      
      console.log(`[SEGURANÇA] Fornecedores do usuário ${userId} encontrados: ${fornecedores.length}`);
      
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

      // Buscar em transações - RESTRITO aos gift cards do usuário
      // Em vez de buscar todas as transações da empresa, primeiro obtemos os gift cards do usuário
      // e depois buscamos apenas as transações relacionadas a esses gift cards
      const userGiftCards = await storage.getGiftCards(userId, undefined, empresaId);
      const userGiftCardIds = userGiftCards.map(gc => gc.id);
      
      // Buscar APENAS transações relacionadas aos gift cards do próprio usuário
      // Se não houver gift cards, retorna array vazio
      let transacoes: Transacao[] = [];
      if (userGiftCardIds.length > 0) {
        // Para cada gift card do usuário, buscar suas transações
        const transacoesPromises = userGiftCardIds.map(gcId => 
          storage.getTransacoes(gcId, empresaId)
        );
        
        // Combinar os resultados
        const transacoesArrays = await Promise.all(transacoesPromises);
        transacoes = transacoesArrays.flat();
        
        // Adicionar log de segurança
        console.log(`[SEGURANÇA] Buscando transações APENAS para os gift cards do usuário ${userId}. Gift cards encontrados: ${userGiftCardIds.length}, transações encontradas: ${transacoes.length}`);
      } else {
        console.log(`[SEGURANÇA] Usuário ${userId} não possui gift cards, nenhuma transação será mostrada.`);
      }
      
      // Filtrar as transações pelo termo de busca
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
  router.get("/fornecedores", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      // ISOLAMENTO ESTRITO DE DADOS - VERSÃO 2.0
      // NENHUM usuário pode ver os fornecedores de outros usuários, nem mesmo administradores
      const userId = user.id;
      
      // Usar apenas a empresa do usuário autenticado para garantir isolamento 
      const empresaId = user.empresaId;
      
      console.log(`[SEGURANÇA] Requisição /fornecedores de usuário ${user.username} (ID: ${userId})`);
      console.log(`[SEGURANÇA - ISOLAMENTO TOTAL] Aplicando isolamento estrito para ${user.username} (ID: ${userId})`);
      
      // Carregar APENAS os fornecedores criados pelo próprio usuário
      // NINGUÉM pode ver dados criados por outros usuários
      let fornecedores: Fornecedor[] = await storage.getFornecedores(userId, empresaId);
      
      // DUPLA VERIFICAÇÃO: filtrar explicitamente pelo userId para garantir isolamento
      fornecedores = fornecedores.filter(f => f.userId === userId);
      
      console.log(`[AUDITORIA] Usuário ${user.username} (ID: ${user.id}) consultou a lista de fornecedores (${fornecedores.length} resultados)`);
      
      res.json(fornecedores);
    } catch (error) {
      console.error("Erro ao buscar fornecedores:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.post("/fornecedores", requireAuth, async (req: Request, res: Response) => {
    try {
      // Garantir que empresaId seja incluído se vier como query parameter mas não no body
      if (!req.body.empresaId && req.query.empresaId) {
        req.body.empresaId = parseInt(req.query.empresaId as string);
      } else if (!req.body.empresaId && req.user?.empresaId) {
        // Usar empresaId do usuário autenticado se disponível
        req.body.empresaId = req.user.empresaId;
      }
      
      // Garantir que userId seja do usuário autenticado se disponível
      if (!req.body.userId && req.user?.id) {
        req.body.userId = req.user.id;
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

  router.get("/fornecedores/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      // ISOLAMENTO ESTRITO DE DADOS - VERSÃO 2.0
      // NENHUM usuário pode ver os fornecedores de outros usuários, nem mesmo administradores
      const userId = user.id;
      
      console.log(`[SEGURANÇA] Requisição /fornecedores/${req.params.id} de usuário ${user.username} (ID: ${userId})`);
      console.log(`[SEGURANÇA - ISOLAMENTO TOTAL] Aplicando isolamento estrito para ${user.username} (ID: ${userId})`);
      
      const fornecedorId = parseInt(req.params.id);
      if (isNaN(fornecedorId)) {
        return res.status(400).json({ message: "ID de fornecedor inválido" });
      }
      
      const empresaId = user.empresaId;
      const fornecedor = await storage.getFornecedor(fornecedorId, empresaId);
      
      if (!fornecedor) {
        return res.status(404).json({ message: "Fornecedor não encontrado" });
      }
      
      // ISOLAMENTO ESTRITO - verificar se o fornecedor pertence ao usuário
      if (fornecedor.userId !== userId) {
        console.log(`[SEGURANÇA - TENTATIVA NEGADA] Usuário ${user.username} (ID: ${userId}) tentou acessar fornecedor ID: ${fornecedorId} que pertence ao usuário ID: ${fornecedor.userId}`);
        return res.status(403).json({ 
          message: "Você não tem permissão para acessar este fornecedor" 
        });
      }
      
      console.log(`[AUDITORIA] Usuário ${user.username} (ID: ${userId}) consultou o fornecedor ID: ${fornecedorId}`);
      res.json(fornecedor);
    } catch (error) {
      console.error("[ERRO CRÍTICO] Falha ao buscar fornecedor:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.put("/fornecedores/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      // ISOLAMENTO ESTRITO DE DADOS - VERSÃO 2.0
      // NENHUM usuário pode modificar os fornecedores de outros usuários, nem mesmo administradores
      const userId = user.id;
      
      console.log(`[SEGURANÇA] Requisição PUT /fornecedores/${req.params.id} de usuário ${user.username} (ID: ${userId})`);
      
      const fornecedorId = parseInt(req.params.id);
      if (isNaN(fornecedorId)) {
        return res.status(400).json({ message: "ID de fornecedor inválido" });
      }
      
      const empresaId = user.empresaId;
      
      // Buscar o fornecedor antes para verificar permissão
      const fornecedor = await storage.getFornecedor(fornecedorId, empresaId);
      
      if (!fornecedor) {
        return res.status(404).json({ message: "Fornecedor não encontrado" });
      }
      
      // ISOLAMENTO ESTRITO - verificar se o fornecedor pertence ao usuário
      if (fornecedor.userId !== userId) {
        console.log(`[SEGURANÇA - TENTATIVA NEGADA] Usuário ${user.username} (ID: ${userId}) tentou modificar fornecedor ID: ${fornecedorId} que pertence ao usuário ID: ${fornecedor.userId}`);
        return res.status(403).json({ 
          message: "Você não tem permissão para modificar este fornecedor" 
        });
      }
      
      // Passar adiante somente se o fornecedor pertencer ao usuário
      console.log(`[AUDITORIA] Usuário ${user.username} (ID: ${userId}) está modificando seu fornecedor ID: ${fornecedorId}`);
      
      // Garantindo que userId não será alterado
      const fornecedorData = insertFornecedorSchema.partial().parse({
        ...req.body,
        userId: userId // Forçar userId do usuário autenticado
      });
      
      const updatedFornecedor = await storage.updateFornecedor(fornecedorId, fornecedorData);
      
      if (!updatedFornecedor) {
        return res.status(404).json({ message: "Erro ao atualizar fornecedor" });
      }
      
      console.log(`[AUDITORIA] Fornecedor ID: ${fornecedorId} atualizado com sucesso pelo usuário ${user.username} (ID: ${userId})`);
      
      res.json(updatedFornecedor);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error("[ERRO CRÍTICO] Falha ao atualizar fornecedor:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.delete("/fornecedores/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      // ISOLAMENTO ESTRITO DE DADOS - VERSÃO 2.0
      // NENHUM usuário pode excluir os fornecedores de outros usuários
      const userId = user.id;
      
      console.log(`[SEGURANÇA] Requisição DELETE /fornecedores/${req.params.id} de usuário ${user.username} (ID: ${userId})`);
      
      const fornecedorId = parseInt(req.params.id);
      if (isNaN(fornecedorId)) {
        return res.status(400).json({ message: "ID de fornecedor inválido" });
      }
      
      const empresaId = user.empresaId;
      
      // Buscar o fornecedor antes para verificar permissão de exclusão
      const fornecedor = await storage.getFornecedor(fornecedorId, empresaId);
      
      if (!fornecedor) {
        return res.status(404).json({ message: "Fornecedor não encontrado" });
      }
      
      // ISOLAMENTO ESTRITO - verificar se o fornecedor pertence ao usuário
      if (fornecedor.userId !== userId) {
        console.log(`[SEGURANÇA - TENTATIVA NEGADA] Usuário ${user.username} (ID: ${userId}) tentou excluir fornecedor ID: ${fornecedorId} que pertence ao usuário ID: ${fornecedor.userId}`);
        return res.status(403).json({ 
          message: "Você não tem permissão para excluir este fornecedor" 
        });
      }
      
      // Passar adiante somente se o fornecedor pertencer ao usuário
      console.log(`[AUDITORIA] Usuário ${user.username} (ID: ${userId}) está excluindo seu fornecedor ID: ${fornecedorId}`);
      
      const success = await storage.deleteFornecedor(fornecedorId);
      
      if (!success) {
        return res.status(404).json({ message: "Erro ao excluir fornecedor" });
      }
      
      console.log(`[AUDITORIA] Fornecedor ID: ${fornecedorId} excluído com sucesso pelo usuário ${user.username} (ID: ${userId})`);
      
      res.status(204).send();
    } catch (error) {
      console.error("[ERRO CRÍTICO] Falha ao excluir fornecedor:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Supplier routes (fornecedores de gift cards)
  router.get("/suppliers", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      // ISOLAMENTO ESTRITO DE DADOS - VERSÃO 2.0
      // NENHUM usuário pode ver os suppliers de outros usuários, nem mesmo administradores
      const userId = user.id;
      
      console.log(`[SEGURANÇA] Requisição GET /suppliers de usuário ${user.username} (ID: ${userId})`);
      
      // Se qualquer usuário tentar acessar dados de outro usuário, bloquear imediatamente
      if (req.query.userId) {
        const requestedUserId = parseInt(req.query.userId as string);
        if (isNaN(requestedUserId) || requestedUserId !== userId) {
          console.log(`[SEGURANÇA - ISOLAMENTO TOTAL] Usuário ${user.username} (ID: ${userId}) tentou acessar dados do usuário ID: ${requestedUserId}`);
          console.log(`[SEGURANÇA - TENTATIVA NEGADA] Bloqueando acesso - Ninguém pode ver os dados de outro usuário`);
          return res.status(403).json({ 
            message: "Você não tem permissão para acessar os suppliers de outros usuários" 
          });
        }
      }
      
      // Ignorar qualquer parâmetro de empresaId que não corresponda à empresa do usuário
      if (req.query.empresaId) {
        const requestedEmpresaId = parseInt(req.query.empresaId as string);
        if (isNaN(requestedEmpresaId) || requestedEmpresaId !== user.empresaId) {
          console.log(`[SEGURANÇA - TENTATIVA NEGADA] Usuário ${user.username} (ID: ${userId}) tentou acessar dados da empresa ID: ${requestedEmpresaId}`);
          return res.status(403).json({ 
            message: "Você não tem permissão para acessar dados de outras empresas" 
          });
        }
      }
      
      // Usar APENAS o ID do usuário autenticado - sem exceções
      console.log(`[SEGURANÇA - ISOLAMENTO TOTAL] Aplicando isolamento estrito para ${user.username} (ID: ${userId})`);
      
      // Forçar sempre usar apenas o ID do usuário autenticado para buscar suppliers
      const empresaId = user.empresaId;
      let suppliers: Supplier[] = await storage.getSuppliers(userId, empresaId);
      
      // CORREÇÃO DE SEGURANÇA CRÍTICA: Filtrar explicitamente pelo userId
      // Isso garante que mesmo se houver algum erro no storage, ainda teremos esse filtro
      suppliers = suppliers.filter(supplier => supplier.userId === userId);
      
      console.log(`[SEGURANÇA] Suppliers encontrados para usuário ${userId}: ${suppliers.length}`);
      console.log(`[SEGURANÇA] IDs dos suppliers: ${suppliers.map(s => s.id).join(', ') || 'nenhum'}`);
      
      console.log(`[AUDITORIA] Usuário ${user.username} (ID: ${userId}) consultou suppliers (${suppliers.length} resultados)`);
      
      res.json(suppliers);
    } catch (error) {
      console.error("[ERRO CRÍTICO] Falha ao listar suppliers:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.post("/suppliers", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      // ISOLAMENTO ESTRITO DE DADOS - VERSÃO 2.0
      console.log(`[SEGURANÇA] Requisição POST /suppliers de usuário ${user.username} (ID: ${user.id})`);
      
      // FORÇAR dados do usuário autenticado para evitar spoofing
      // Um usuário não pode criar suppliers associados a outros usuários
      const supplierData = insertSupplierSchema.parse({
        ...req.body,
        empresaId: user.empresaId, // Sempre usar a empresa do usuário atual
        userId: user.id            // Sempre usar o ID do usuário atual
      });
      
      console.log(`[AUDITORIA] Usuário ${user.username} (ID: ${user.id}) está criando um novo supplier`);
      
      const supplier = await storage.createSupplier(supplierData);
      
      console.log(`[AUDITORIA] Supplier ID: ${supplier.id} criado com sucesso pelo usuário ${user.username} (ID: ${user.id})`);
      
      res.status(201).json(supplier);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error("[ERRO CRÍTICO] Falha ao criar supplier:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.get("/suppliers/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      // ISOLAMENTO ESTRITO DE DADOS - VERSÃO 2.0
      // NENHUM usuário pode ver os suppliers de outros usuários, nem mesmo administradores
      const userId = user.id;
      
      console.log(`[SEGURANÇA] Requisição /suppliers/${req.params.id} de usuário ${user.username} (ID: ${userId})`);
      console.log(`[SEGURANÇA - ISOLAMENTO TOTAL] Aplicando isolamento estrito para ${user.username} (ID: ${userId})`);
      
      const supplierId = parseInt(req.params.id);
      if (isNaN(supplierId)) {
        return res.status(400).json({ message: "ID de supplier inválido" });
      }
      
      const empresaId = user.empresaId;
      const supplier = await storage.getSupplier(supplierId, empresaId);
      
      if (!supplier) {
        return res.status(404).json({ message: "Supplier não encontrado" });
      }
      
      // ISOLAMENTO ESTRITO - verificar se o supplier pertence ao usuário
      if (supplier.userId !== userId) {
        console.log(`[SEGURANÇA - TENTATIVA NEGADA] Usuário ${user.username} (ID: ${userId}) tentou acessar supplier ID: ${supplierId} que pertence ao usuário ID: ${supplier.userId}`);
        return res.status(403).json({ 
          message: "Você não tem permissão para acessar este supplier" 
        });
      }
      
      console.log(`[AUDITORIA] Usuário ${user.username} (ID: ${userId}) consultou o supplier ID: ${supplierId}`);
      res.json(supplier);
    } catch (error) {
      console.error("[ERRO CRÍTICO] Falha ao buscar supplier:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.put("/suppliers/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      // ISOLAMENTO ESTRITO DE DADOS - VERSÃO 2.0
      // NENHUM usuário pode modificar os suppliers de outros usuários, nem mesmo administradores
      const userId = user.id;
      
      console.log(`[SEGURANÇA] Requisição PUT /suppliers/${req.params.id} de usuário ${user.username} (ID: ${userId})`);
      
      const supplierId = parseInt(req.params.id);
      if (isNaN(supplierId)) {
        return res.status(400).json({ message: "ID de supplier inválido" });
      }
      
      const empresaId = user.empresaId;
      
      // Buscar o supplier antes para verificar permissão
      const supplier = await storage.getSupplier(supplierId, empresaId);
      
      if (!supplier) {
        return res.status(404).json({ message: "Supplier não encontrado" });
      }
      
      // ISOLAMENTO ESTRITO - verificar se o supplier pertence ao usuário
      if (supplier.userId !== userId) {
        console.log(`[SEGURANÇA - TENTATIVA NEGADA] Usuário ${user.username} (ID: ${userId}) tentou modificar supplier ID: ${supplierId} que pertence ao usuário ID: ${supplier.userId}`);
        return res.status(403).json({ 
          message: "Você não tem permissão para modificar este supplier" 
        });
      }
      
      // Passar adiante somente se o supplier pertencer ao usuário
      console.log(`[AUDITORIA] Usuário ${user.username} (ID: ${userId}) está modificando seu supplier ID: ${supplierId}`);
      
      // Garantindo que userId não será alterado
      const supplierData = insertSupplierSchema.partial().parse({
        ...req.body,
        userId: userId // Forçar userId do usuário autenticado
      });
      
      const updatedSupplier = await storage.updateSupplier(supplierId, supplierData);
      
      if (!updatedSupplier) {
        return res.status(404).json({ message: "Erro ao atualizar supplier" });
      }
      
      console.log(`[AUDITORIA] Supplier ID: ${supplierId} atualizado com sucesso pelo usuário ${user.username} (ID: ${userId})`);
      
      res.json(updatedSupplier);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error("[ERRO CRÍTICO] Falha ao atualizar supplier:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.delete("/suppliers/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      // ISOLAMENTO ESTRITO DE DADOS - VERSÃO 2.0
      // NENHUM usuário pode excluir os suppliers de outros usuários
      const userId = user.id;
      
      console.log(`[SEGURANÇA] Requisição DELETE /suppliers/${req.params.id} de usuário ${user.username} (ID: ${userId})`);
      
      const supplierId = parseInt(req.params.id);
      if (isNaN(supplierId)) {
        return res.status(400).json({ message: "ID de supplier inválido" });
      }
      
      const empresaId = user.empresaId;
      
      // Buscar o supplier antes para verificar permissão de exclusão
      const supplier = await storage.getSupplier(supplierId, empresaId);
      
      if (!supplier) {
        return res.status(404).json({ message: "Supplier não encontrado" });
      }
      
      // ISOLAMENTO ESTRITO - verificar se o supplier pertence ao usuário
      if (supplier.userId !== userId) {
        console.log(`[SEGURANÇA - TENTATIVA NEGADA] Usuário ${user.username} (ID: ${userId}) tentou excluir supplier ID: ${supplierId} que pertence ao usuário ID: ${supplier.userId}`);
        return res.status(403).json({ 
          message: "Você não tem permissão para excluir este supplier" 
        });
      }
      
      // Verificar se existem gift cards associados a este supplier
      // Buscar todos os gift cards do usuário para este supplier
      let giftCards = await storage.getGiftCards(userId, undefined, empresaId);
      giftCards = giftCards.filter(card => card.supplierId === supplierId);
      
      if (giftCards.length > 0) {
        console.log(`[SEGURANÇA - DEPENDÊNCIA] Supplier ID: ${supplierId} possui ${giftCards.length} gift cards associados`);
        return res.status(409).json({ 
          message: "Este supplier não pode ser excluído pois possui gift cards associados",
          giftCardsCount: giftCards.length,
          giftCardIds: giftCards.map(card => card.id)
        });
      }
      
      // Passar adiante somente se o supplier pertencer ao usuário
      console.log(`[AUDITORIA] Usuário ${user.username} (ID: ${userId}) está excluindo seu supplier ID: ${supplierId}`);
      
      const success = await storage.deleteSupplier(supplierId);
      
      if (!success) {
        return res.status(404).json({ message: "Erro ao excluir supplier" });
      }
      
      console.log(`[AUDITORIA] Supplier ID: ${supplierId} excluído com sucesso pelo usuário ${user.username} (ID: ${userId})`);
      
      res.status(204).send();
    } catch (error) {
      console.error("[ERRO CRÍTICO] Falha ao excluir supplier:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Gift Card routes (antigo Card)
  router.get("/gift-cards", requireAuth, requirePermission("giftcard.visualizar"), async (req: Request, res: Response) => {
    try {
      // Usar o ID do usuário autenticado por padrão
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      let userId = user.id;
      
      // ISOLAMENTO ESTRITO DE DADOS - VERSÃO 2.0
      // NENHUM usuário pode ver os gift cards de outros usuários, nem mesmo administradores
      console.log(`[SEGURANÇA] Requisição /gift-cards de usuário ${user.username} (ID: ${userId})`);
      
      // Se qualquer usuário tentar acessar dados de outro usuário, bloquear imediatamente
      if (req.query.userId) {
        const requestedUserId = parseInt(req.query.userId as string);
        
        // Verificar se é um userId válido
        if (isNaN(requestedUserId)) {
          console.log(`[SEGURANÇA - ERRO] ID de usuário inválido na consulta: ${req.query.userId}`);
          return res.status(400).json({ message: "ID de usuário inválido" });
        }
        
        // Se o usuário tenta acessar dados de outro usuário, bloquear
        if (requestedUserId !== userId) {
          console.log(`[SEGURANÇA - ISOLAMENTO TOTAL] Usuário ${user.username} (ID: ${userId}) tentou acessar dados do usuário ID: ${requestedUserId}`);
          console.log(`[SEGURANÇA - TENTATIVA NEGADA] Bloqueando acesso - Ninguém pode ver os dados de outro usuário`);
          return res.status(403).json({ 
            message: "Você não tem permissão para acessar os gift cards de outros usuários" 
          });
        }
        
        // Se está consultando seus próprios dados, permitir
        console.log(`[SEGURANÇA - VALIDADO] Usuário ${user.username} (ID: ${userId}) acessando seus próprios dados`);
      }
      
      // Usar APENAS o ID do usuário autenticado - sem exceções
      console.log(`[SEGURANÇA - ISOLAMENTO TOTAL] Aplicando isolamento estrito para ${user.username} (ID: ${userId})`);
      
      const fornecedorId = req.query.fornecedorId ? parseInt(req.query.fornecedorId as string) : undefined;
      // Sempre usa a empresa do usuário autenticado para garantir isolamento de dados
      const empresaId = user.empresaId;
      const search = req.query.search as string | undefined;
      
      // Verificar se o usuário é do perfil convidado
      const isGuest = await isGuestProfile(user.perfilId);
      
      if (search) {
        console.log(`[SEGURANÇA] Busca por gift cards com termo: "${search}"`);
        
        // Buscar por gift cards que correspondem ao termo de pesquisa
        // Aplicando filtro rigoroso: mostrar APENAS gift cards do próprio usuário
        let giftCards = await storage.searchGiftCards(userId, search);
        
        console.log(`[SEGURANÇA] Gift cards encontrados na busca para o usuário ${userId}: ${giftCards.length}`);
        
        // CORREÇÃO DE SEGURANÇA: Garantir que só mostraremos gift cards deste usuário
        // Filtragem EXPLÍCITA por userId para garantir isolamento de dados
        giftCards = giftCards.filter(card => card.userId === userId);
        
        console.log(`[SEGURANÇA] Gift cards após verificação de permissão: ${giftCards.length}`);
        
        // Aplicar criptografia ou mascaramento conforme o perfil
        if (isGuest) {
          giftCards = filterGiftCardArray(giftCards, true, user.empresaId);
        } else {
          giftCards = giftCards.map(card => decryptGiftCardData(card, user.empresaId));
        }
        
        console.log(`[AUDITORIA] Usuário ${user.username} (ID: ${userId}) pesquisou gift cards (${giftCards.length} resultados)`);
        return res.json(giftCards);
      }
      
      // Buscar gift cards por fornecedor ou todos
      console.log(`[SEGURANÇA] Buscando gift cards para usuário ${userId}${fornecedorId ? ` e fornecedor ${fornecedorId}` : ''}`);
      
      // Aplicação de isolamento estrito: cada usuário SÓ PODE ver seus próprios gift cards
      let giftCards = await storage.getGiftCards(userId, fornecedorId, empresaId);
      
      // CORREÇÃO DE SEGURANÇA CRÍTICA: Filtrar explicitamente pelo userId
      // Isso garante que mesmo se houver algum erro no storage, ainda teremos esse filtro
      giftCards = giftCards.filter(card => card.userId === userId);
      
      console.log(`[SEGURANÇA] Gift cards encontrados para usuário ${userId}: ${giftCards.length}`);
      console.log(`[SEGURANÇA] IDs dos gift cards: ${giftCards.map(c => c.id).join(', ') || 'nenhum'}`);
      
      // Filtrar dados confidenciais conforme o perfil
      if (isGuest) {
        giftCards = filterGiftCardArray(giftCards, true, user.empresaId);
      } else {
        giftCards = giftCards.map(card => decryptGiftCardData(card, user.empresaId));
      }
      
      console.log(`[AUDITORIA] Usuário ${user.username} (ID: ${userId}) consultou gift cards (${giftCards.length} resultados)`);
      res.json(giftCards);
    } catch (error) {
      console.error("[ERRO CRÍTICO] Falha ao listar gift cards:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.post("/gift-cards", requireAuth, async (req: Request, res: Response) => {
    try {
      // Obter o usuário autenticado
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      // Garantir que a empresaId seja sempre a do usuário autenticado para evitar vazamento de dados
      req.body.empresaId = user.empresaId;
      
      // Garantir que userId seja o do usuário autenticado
      req.body.userId = user.id;
      
      // Validar os dados com o schema
      const giftCardData = insertGiftCardSchema.parse(req.body);
      
      // Criptografar dados sensíveis antes de salvar
      if (giftCardData.gcNumber) {
        giftCardData.gcNumber = encrypt(giftCardData.gcNumber, user.empresaId);
      }
      
      if (giftCardData.gcPass) {
        giftCardData.gcPass = encrypt(giftCardData.gcPass, user.empresaId);
      }
      
      // Criar o gift card com dados criptografados
      const giftCard = await storage.createGiftCard(giftCardData);
      
      // Descriptografar para a resposta
      const decryptedGiftCard = decryptGiftCardData(giftCard, user.empresaId);
      
      res.status(201).json(decryptedGiftCard);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error("Erro ao criar gift card:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  router.get("/gift-cards/:id", requireAuth, requirePermission("giftcard.visualizar"), requireResourceOwnership("giftCard"), async (req: Request, res: Response) => {
    try {
      const giftCardId = parseInt(req.params.id);
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      // Buscar gift card (middleware requireResourceOwnership já verifica permissão)
      const giftCard = await storage.getGiftCard(giftCardId);
      
      if (!giftCard) {
        return res.status(404).json({ message: "Gift Card não encontrado" });
      }
      
      // Verificar se o usuário é do perfil convidado
      const isGuest = await isGuestProfile(user.perfilId);
      
      // Processar o gift card conforme o perfil do usuário
      let processedGiftCard;
      if (isGuest) {
        // Para convidados, mascarar informações sensíveis
        processedGiftCard = filterConfidentialData(giftCard, true);
      } else {
        // Para usuários autorizados, descriptografar dados sensíveis
        processedGiftCard = decryptGiftCardData(giftCard, user.empresaId);
      }
      
      res.json(processedGiftCard);
    } catch (error) {
      console.error("Erro ao buscar gift card:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  router.put("/gift-cards/:id", requireAuth, requirePermission("giftcard.editar"), requireResourceOwnership("giftCard"), async (req: Request, res: Response) => {
    try {
      const giftCardId = parseInt(req.params.id);
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      // Buscar o gift card para verificações (middleware requireResourceOwnership já verificou permissão)
      const giftCard = await storage.getGiftCard(giftCardId);
      
      if (!giftCard) {
        return res.status(404).json({ message: "Gift Card não encontrado" });
      }
      
      // Realizar validação dos dados com Zod
      const giftCardData = insertGiftCardSchema.partial().parse(req.body);
      
      // Criptografar dados sensíveis se forem modificados
      if (giftCardData.gcNumber) {
        giftCardData.gcNumber = encrypt(giftCardData.gcNumber, user.empresaId);
      }
      
      if (giftCardData.gcPass) {
        giftCardData.gcPass = encrypt(giftCardData.gcPass, user.empresaId);
      }
      
      // Garantir que empresaId e userId não sejam alterados
      if (giftCardData.empresaId) {
        delete giftCardData.empresaId;
      }
      
      if (giftCardData.userId) {
        delete giftCardData.userId;
      }
      
      // Atualizar o gift card com dados criptografados
      const updatedGiftCard = await storage.updateGiftCard(giftCardId, giftCardData);
      
      if (!updatedGiftCard) {
        return res.status(404).json({ message: "Gift Card não encontrado" });
      }
      
      // Descriptografar dados para a resposta
      const decryptedGiftCard = decryptGiftCardData(updatedGiftCard, user.empresaId);
      
      res.json(decryptedGiftCard);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error("Erro ao atualizar gift card:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  router.delete("/gift-cards/:id", requireAuth, requirePermission("giftcard.excluir"), requireResourceOwnership("giftCard"), async (req: Request, res: Response) => {
    try {
      const giftCardId = parseInt(req.params.id);
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      // Verificar transações associadas antes de excluir
      const transacoes = await storage.getTransacoes(giftCardId);
      if (transacoes.length > 0) {
        return res.status(409).json({ 
          message: "Este Gift Card não pode ser excluído pois possui transações associadas",
          transacoesCount: transacoes.length
        });
      }
      
      // Registrar evento de exclusão para auditoria
      console.log(`[AUDITORIA] Usuário ${user.username} (ID: ${user.id}) excluiu o Gift Card ID: ${giftCardId}`);
      
      // Excluir o gift card
      const success = await storage.deleteGiftCard(giftCardId);
      
      if (!success) {
        return res.status(404).json({ message: "Gift Card não encontrado" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Erro ao excluir gift card:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  router.get("/gift-cards/vencimento/:dias/:userId?", requireAuth, requirePermission("giftcard.visualizar"), async (req: Request, res: Response) => {
    try {
      // Usar o ID do usuário autenticado por padrão
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      // ISOLAMENTO ESTRITO DE DADOS - VERSÃO 2.0
      // Usar APENAS o ID do usuário autenticado - NINGUÉM pode ver os dados de outros usuários
      const userId = user.id;
      
      console.log(`[SEGURANÇA] Requisição /gift-cards/vencimento de usuário ${user.username} (ID: ${userId})`);
      
      // Se qualquer usuário tentar acessar dados de outro usuário, bloquear imediatamente
      if (req.params.userId) {
        const requestedUserId = parseInt(req.params.userId);
        
        // Verificar se é um userId válido
        if (isNaN(requestedUserId)) {
          console.log(`[SEGURANÇA - ERRO] ID de usuário inválido na consulta: ${req.params.userId}`);
          return res.status(400).json({ message: "ID de usuário inválido" });
        }
        
        // Se o usuário tenta acessar dados de outro usuário, bloquear
        if (requestedUserId !== userId) {
          console.log(`[SEGURANÇA - ISOLAMENTO TOTAL] Usuário ${user.username} (ID: ${userId}) tentou acessar dados do usuário ID: ${requestedUserId}`);
          console.log(`[SEGURANÇA - TENTATIVA NEGADA] Bloqueando acesso - Ninguém pode ver os dados de outro usuário`);
          return res.status(403).json({ 
            message: "Você não tem permissão para acessar os gift cards de outros usuários" 
          });
        }
        
        // Se está consultando seus próprios dados, permitir
        console.log(`[SEGURANÇA - VALIDADO] Usuário ${user.username} (ID: ${userId}) acessando seus próprios dados`);
      }
      
      console.log(`[SEGURANÇA - ISOLAMENTO TOTAL] Aplicando isolamento estrito para ${user.username} (ID: ${userId})`);
      
      // Validar o parâmetro de dias
      const dias = parseInt(req.params.dias);
      if (isNaN(dias) || dias < 0 || dias > 365) {
        return res.status(400).json({ message: "Parâmetro de dias inválido. Deve ser um número entre 0 e 365." });
      }
      
      // Garantir que o empresaId seja sempre o do usuário autenticado para evitar vazamento de dados
      const empresaId = user.empresaId;
      
      // Buscar gift cards com vencimento próximo
      // Passamos o perfilId para aplicar as restrições baseadas em perfil
      let giftCards = await storage.getGiftCardsVencimento(userId, dias, user.perfilId);
      
      // Garantir isolamento de dados por empresa
      giftCards = giftCards.filter(giftCard => giftCard.empresaId === empresaId);
      
      // Verificar se o usuário é do perfil convidado para aplicar filtros de confidencialidade
      const isGuest = await isGuestProfile(user.perfilId);
      
      // Processar os gift cards conforme o perfil do usuário
      if (isGuest) {
        // Para convidados, mascarar informações sensíveis
        giftCards = filterGiftCardArray(giftCards, true, user.empresaId);
      } else {
        // Para usuários autorizados, descriptografar dados sensíveis
        giftCards = giftCards.map(card => decryptGiftCardData(card, user.empresaId));
      }
      
      // Registrar evento para auditoria
      console.log(`[AUDITORIA] Usuário ${user.username} (ID: ${user.id}) consultou gift cards com vencimento em ${dias} dias`);
      
      res.json(giftCards);
    } catch (error) {
      console.error("Erro ao buscar gift cards com vencimento próximo:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Tag routes
  router.get("/tags", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      // Garantir que o empresaId seja sempre o do usuário autenticado para evitar vazamento de dados
      const empresaId = user.empresaId;
      
      // Buscar tags da empresa do usuário
      const tags = await storage.getTags(empresaId);
      
      // Registrar evento para auditoria
      console.log(`[AUDITORIA] Usuário ${user.username} (ID: ${user.id}) consultou a lista de tags`);
      
      res.json(tags);
    } catch (error) {
      console.error("Erro ao buscar tags:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  router.post("/tags", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      // Garantir que o empresaId seja sempre o do usuário autenticado para evitar vazamento de dados
      req.body.empresaId = user.empresaId;
      req.body.userId = user.id;
      
      // Validar e sanitizar os dados
      const tagData = insertTagSchema.parse(req.body);
      
      // Prevenir injeção de código e XSS
      if (tagData.nome) {
        tagData.nome = tagData.nome.trim().substring(0, 50);
      }
      
      if (tagData.cor) {
        // Garantir que a cor seja um valor hexadecimal válido
        if (!/^#[0-9A-F]{6}$/i.test(tagData.cor)) {
          tagData.cor = "#3B82F6"; // Cor padrão azul
        }
      }
      
      // Criar a tag com os dados validados
      const tag = await storage.createTag(tagData);
      
      // Registrar evento para auditoria
      console.log(`[AUDITORIA] Usuário ${user.username} (ID: ${user.id}) criou a tag "${tag.nome}" (ID: ${tag.id})`);
      
      res.status(201).json(tag);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error("Erro ao criar tag:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  router.get("/tags/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      const tagId = parseInt(req.params.id);
      if (isNaN(tagId)) {
        return res.status(400).json({ message: "ID de tag inválido" });
      }
      
      // Garantir que as tags sejam buscadas apenas da empresa do usuário
      const empresaId = user.empresaId;
      
      // Buscar a tag
      const tag = await storage.getTag(tagId, empresaId);
      
      if (!tag) {
        return res.status(404).json({ message: "Tag não encontrada" });
      }
      
      // Verificar se a tag pertence à empresa do usuário
      if (tag.empresaId !== user.empresaId) {
        return res.status(403).json({ 
          message: "Você não tem permissão para acessar esta tag" 
        });
      }
      
      // Registrar evento para auditoria
      console.log(`[AUDITORIA] Usuário ${user.username} (ID: ${user.id}) consultou a tag "${tag.nome}" (ID: ${tag.id})`);
      
      res.json(tag);
    } catch (error) {
      console.error("Erro ao buscar tag:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
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
      
      // Obter o usuário autenticado
      const user = (req as any).user;
      const userId = user.id;
      const userEmpresaId = user.empresaId;
      
      // Log para auditoria de segurança
      console.log(`[SEGURANÇA] Usuário ${userId} da empresa ${userEmpresaId} acessando gift cards com tagId ${tagId}`);
      
      // Aplicar filtros de segurança diretamente na camada de storage
      // O método atualizado já inclui isolamento de dados por userId e empresaId
      const giftCards = await storage.getGiftCardsByTag(
        tagId,
        empresaId || userEmpresaId, // Usar o empresaId da query ou do usuário logado
        user.perfilId === 1 ? undefined : userId, // Se for admin, não filtrar por userId
        user.perfilId // Passamos o perfil do usuário para aplicar restrições baseadas em perfil
      );
      
      // Lista já filtrada pelo storage, não precisamos filtrar novamente
      let filteredGiftCards = giftCards;
      
      // Verificar se o usuário é do perfil convidado
      const isGuest = await isGuestProfile(user.perfilId);
      
      // Filtrar dados confidenciais se for perfil convidado
      if (isGuest) {
        filteredGiftCards = filterGiftCardArray(filteredGiftCards, true, user.empresaId);
      }
        
      res.json(filteredGiftCards);
    } catch (error) {
      console.error("Erro ao buscar gift cards por tag:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.get("/gift-cards/:giftCardId/tags", requireAuth, requirePermission("giftcard.visualizar"), requireResourceOwnership("giftCard"), async (req: Request, res: Response) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      const giftCardId = parseInt(req.params.giftCardId);
      if (isNaN(giftCardId)) {
        return res.status(400).json({ message: "ID de Gift Card inválido" });
      }
      
      // Verificar se o gift card existe
      const giftCard = await storage.getGiftCard(giftCardId);
      if (!giftCard) {
        return res.status(404).json({ message: "Gift Card não encontrado" });
      }
      
      // Garantir que só busque tags da empresa do usuário
      const empresaId = user.empresaId;
      
      // Buscar as tags associadas ao gift card
      const tags = await storage.getGiftCardTags(giftCardId, empresaId, user.id, user.perfilId);
      
      // Registrar evento para auditoria
      console.log(`[AUDITORIA] Usuário ${user.username} (ID: ${user.id}) consultou as tags do Gift Card ID: ${giftCardId}`);
      
      res.json(tags);
    } catch (error) {
      console.error("Erro ao buscar tags do gift card:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  router.post("/gift-cards/:giftCardId/tags/:tagId", requireAuth, requirePermission("giftcard.editar"), requireResourceOwnership("giftCard"), async (req: Request, res: Response) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      const giftCardId = parseInt(req.params.giftCardId);
      const tagId = parseInt(req.params.tagId);
      
      if (isNaN(giftCardId) || isNaN(tagId)) {
        return res.status(400).json({ message: "IDs inválidos" });
      }
      
      // Verificar se o gift card existe
      const giftCard = await storage.getGiftCard(giftCardId);
      if (!giftCard) {
        return res.status(404).json({ message: "Gift Card não encontrado" });
      }
      
      // Verificar se a tag existe e pertence à empresa do usuário
      const tag = await storage.getTag(tagId, user.empresaId);
      if (!tag) {
        return res.status(404).json({ message: "Tag não encontrada" });
      }
      
      // Associar a tag ao gift card com verificação de empresa
      const giftCardTag = await storage.addTagToGiftCard(giftCardId, tagId, user.empresaId, user.id, user.perfilId);
      
      // Registrar evento para auditoria
      console.log(`[AUDITORIA] Usuário ${user.username} (ID: ${user.id}) da empresa ${user.empresaId} associou a tag "${tag.nome}" (ID: ${tagId}) ao Gift Card ID: ${giftCardId}`);
      
      res.status(201).json(giftCardTag);
    } catch (error) {
      console.error("Erro ao associar tag ao gift card:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  router.delete("/gift-cards/:giftCardId/tags/:tagId", requireAuth, requirePermission("giftcard.editar"), requireResourceOwnership("giftCard"), async (req: Request, res: Response) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      const giftCardId = parseInt(req.params.giftCardId);
      const tagId = parseInt(req.params.tagId);
      
      if (isNaN(giftCardId) || isNaN(tagId)) {
        return res.status(400).json({ message: "IDs inválidos" });
      }
      
      // Verificar se a relação entre gift card e tag existe antes de remover
      const tags = await storage.getGiftCardTags(giftCardId, user.empresaId, user.id, user.perfilId);
      const tagExists = tags.some(tag => tag.id === tagId);
      if (!tagExists) {
        return res.status(404).json({ message: "Relação entre Gift Card e Tag não encontrada" });
      }
      
      // Remover a tag do gift card com verificação de empresa
      const success = await storage.removeTagFromGiftCard(giftCardId, tagId, user.empresaId, user.id, user.perfilId);
      
      if (!success) {
        return res.status(500).json({ message: "Falha ao remover tag do Gift Card" });
      }
      
      // Registrar evento para auditoria
      console.log(`[AUDITORIA] Usuário ${user.username} (ID: ${user.id}) da empresa ${user.empresaId} removeu a tag ID: ${tagId} do Gift Card ID: ${giftCardId}`);
      
      res.status(204).send();
    } catch (error) {
      console.error("Erro ao remover tag do gift card:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  // Transação routes (novo)
  // Nova rota para buscar todas as transações
  router.get("/transacoes", requireAuth, async (req: Request, res: Response) => {
    try {
      // Obter o usuário autenticado
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      // ISOLAMENTO ESTRITO DE DADOS - VERSÃO 2.0
      // NENHUM usuário pode ver as transações de outros usuários, nem mesmo administradores
      const userId = user.id;
      
      console.log(`[SEGURANÇA] Requisição GET /transacoes de usuário ${user.username} (ID: ${userId})`);
      
      // Se qualquer usuário tentar acessar dados de outro usuário, bloquear imediatamente
      if (req.query.userId) {
        const requestedUserId = parseInt(req.query.userId as string);
        
        // Verificar se é um userId válido
        if (isNaN(requestedUserId)) {
          console.log(`[SEGURANÇA - ERRO] ID de usuário inválido na consulta: ${req.query.userId}`);
          return res.status(400).json({ message: "ID de usuário inválido" });
        }
        
        // Se o usuário tenta acessar dados de outro usuário, bloquear
        if (requestedUserId !== userId) {
          console.log(`[SEGURANÇA - ISOLAMENTO TOTAL] Usuário ${user.username} (ID: ${userId}) tentou acessar dados do usuário ID: ${requestedUserId}`);
          console.log(`[SEGURANÇA - TENTATIVA NEGADA] Bloqueando acesso - Ninguém pode ver os dados de outro usuário`);
          return res.status(403).json({ 
            message: "Você não tem permissão para acessar as transações de outros usuários" 
          });
        }
        
        // Se está consultando seus próprios dados, permitir
        console.log(`[SEGURANÇA - VALIDADO] Usuário ${user.username} (ID: ${userId}) acessando suas próprias transações`);
      }
      
      // Verificar requisição para empresaId diferente da empresa do usuário
      if (req.query.empresaId) {
        const requestedEmpresaId = parseInt(req.query.empresaId as string);
        
        // Verificar se é um empresaId válido
        if (isNaN(requestedEmpresaId)) {
          console.log(`[SEGURANÇA - ERRO] ID de empresa inválido na consulta: ${req.query.empresaId}`);
          return res.status(400).json({ message: "ID de empresa inválido" });
        }
        
        // Forçar uso apenas da empresa do usuário
        if (requestedEmpresaId !== user.empresaId) {
          console.log(`[SEGURANÇA - TENTATIVA NEGADA] Usuário ${user.username} (ID: ${userId}) tentou acessar dados da empresa ID: ${requestedEmpresaId}`);
          return res.status(403).json({ 
            message: "Você não tem permissão para acessar dados de outras empresas" 
          });
        }
      }
      
      console.log(`[SEGURANÇA - ISOLAMENTO TOTAL] Aplicando isolamento estrito para ${user.username} (ID: ${userId})`);
      
      // Implementação com isolamento total de dados
      const empresaId = user.empresaId; // Sempre usar a empresa do usuário
      const todasTransacoes: Transacao[] = [];
      
      // Obter todos os gift cards do usuário atual (isolamento rígido)
      const giftCards = await storage.getGiftCards(userId, undefined, empresaId);
      
      // Filtro de segurança explícito - dupla verificação
      const meusgiftCards = giftCards.filter(card => card.userId === userId);
      
      console.log(`[SEGURANÇA] Encontrados ${meusgiftCards.length} gift cards do usuário ${userId}`);
      
      // Coletar transações somente dos gift cards do próprio usuário
      for (const card of meusgiftCards) {
        const transacoes = await storage.getTransacoes(card.id);
        
        // Dupla verificação para garantir que só temos transações ligadas aos cartões do usuário
        const transacoesSeguras = transacoes.filter(t => {
          const cardOwner = meusgiftCards.find(c => c.id === t.giftCardId);
          return cardOwner && cardOwner.userId === userId;
        });
        
        todasTransacoes.push(...transacoesSeguras);
      }
      
      // Ordenar por data mais recente
      todasTransacoes.sort((a, b) => {
        return new Date(b.dataTransacao).getTime() - new Date(a.dataTransacao).getTime();
      });
      
      console.log(`[AUDITORIA] Usuário ${user.username} (ID: ${userId}) consultou transações (${todasTransacoes.length} resultados)`);
      
      res.json(todasTransacoes);
    } catch (error) {
      console.error("[ERRO CRÍTICO] Falha ao buscar transações:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Rota para buscar transações de um gift card específico
  router.get("/transacoes/:giftCardId", requireAuth, requirePermission("giftcard.visualizar"), requireResourceOwnership("giftCard"), async (req: Request, res: Response) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      const giftCardId = parseInt(req.params.giftCardId);
      if (isNaN(giftCardId)) {
        return res.status(400).json({ message: "ID de Gift Card inválido" });
      }
      
      // Verificar se o gift card existe
      const giftCard = await storage.getGiftCard(giftCardId);
      if (!giftCard) {
        return res.status(404).json({ message: "Gift Card não encontrado" });
      }
      
      // Garantir que o usuário só veja transações de gift cards da sua empresa
      const empresaId = user.empresaId;
      
      // Buscar as transações do gift card
      const transacoes = await storage.getTransacoes(giftCardId, empresaId);
      
      // Registrar evento para auditoria
      console.log(`[AUDITORIA] Usuário ${user.username} (ID: ${user.id}) consultou as transações do Gift Card ID: ${giftCardId}`);
      
      res.json(transacoes);
    } catch (error) {
      console.error("Erro ao buscar transações do gift card:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  router.post("/transacoes", requireAuth, async (req: Request, res: Response) => {
    try {
      // Obter usuário autenticado
      const user = req.user;
      if (!user) {
        console.log(`[SEGURANÇA - ERRO] Tentativa de criação de transação sem autenticação`);
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      // Log de segurança e auditoria
      console.log(`[SEGURANÇA] Usuário ${user.username} (ID: ${user.id}) tentando criar transação`);
      console.log(`[SEGURANÇA - DADOS] Recebendo transação:`, JSON.stringify(req.body, null, 2));
      
      // Extrai dados básicos do corpo da requisição
      const {
        valor = 0,
        descricao = "",
        giftCardId,
        giftCardIds = giftCardId ? String(giftCardId) : "",
        status = "concluida",
        nomeUsuario = req.body.nomeUsuario || user.username
      } = req.body;
      
      // Validações básicas
      if (!valor || !descricao || !giftCardId) {
        console.log(`[VALIDAÇÃO] Campos obrigatórios ausentes na requisição de ${user.username}`);
        return res.status(400).json({ 
          message: "Campos obrigatórios ausentes", 
          detalhes: "Os campos valor, descricao e giftCardId são obrigatórios" 
        });
      }
      
      // SEGURANÇA: Verificar se o gift card pertence ao usuário
      const giftCard = await storage.getGiftCard(parseInt(giftCardId));
      if (!giftCard) {
        console.log(`[SEGURANÇA - ERRO] Gift card ID ${giftCardId} não encontrado`);
        return res.status(404).json({ message: "Gift Card não encontrado" });
      }
      
      // SEGURANÇA: Verificação de propriedade do recurso
      if (giftCard.userId !== user.id || giftCard.empresaId !== user.empresaId) {
        console.log(`[SEGURANÇA - VIOLAÇÃO] Usuário ${user.username} (ID: ${user.id}) tentou criar transação no gift card ID: ${giftCardId} que pertence ao usuário ${giftCard.userId} da empresa ${giftCard.empresaId}`);
        return res.status(403).json({ 
          message: "Você não tem permissão para realizar transações neste Gift Card" 
        });
      }
      
      // Cria objeto de transação básico com segurança aprimorada
      const transacaoObj = {
        valor: parseFloat(valor),
        descricao,
        giftCardId: parseInt(giftCardId || 0),
        giftCardIds: giftCardIds || String(giftCardId || ""),
        userId: user.id, // SEGURANÇA: Sempre usar o ID do usuário autenticado
        status,
        dataTransacao: new Date(),
        empresaId: user.empresaId, // SEGURANÇA: Sempre usar a empresa do usuário autenticado
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
      
      // SEGURANÇA: Nunca usar empresaId enviado pelo cliente, sempre usar do token JWT
      // Isso evita manipulação do ID da empresa na criação de transações
      // if (req.body.empresaId) {
      //   transacaoObj.empresaId = parseInt(req.body.empresaId);
      // }
      
      // CRÍTICO: Garante que a transação sempre pertence à empresa do usuário logado
      transacaoObj.empresaId = user.empresaId;
      
      // Inclui campos opcionais se presentes
      if (req.body.comprovante) transacaoObj.comprovante = req.body.comprovante;
      if (req.body.motivoCancelamento) transacaoObj.motivoCancelamento = req.body.motivoCancelamento;
      if (req.body.ordemInterna) transacaoObj.ordemInterna = req.body.ordemInterna;
      if (req.body.ordemCompra) transacaoObj.ordemCompra = req.body.ordemCompra;
      
      // Cria a transação diretamente pelo storage sem usar Schema Zod
      console.log("Criando transação com:", transacaoObj);
      const transacao = await storage.createTransacao(transacaoObj);
      
      // Atualiza o saldo dos gift cards se a transação for concluída ou for um reembolso
      if (transacao.status === 'concluida' || transacao.status === 'refund') {
        try {
          // Fator para determinar se soma ou subtrai o valor (adiciona para reembolso, subtrai para transação normal)
          const fator = transacao.status === 'refund' ? 1 : -1;
          
          // Verifica se temos múltiplos gift cards
          if (transacao.giftCardIds && transacao.giftCardIds.includes(',')) {
            console.log(`Processando múltiplos gift cards: ${transacao.giftCardIds}`);
            const cardIds = transacao.giftCardIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
            
            // Primeiro carrega todos os gift cards para calcular a distribuição de valores
            const cards = await Promise.all(
              cardIds.map(async (id) => await storage.getGiftCard(id))
            );
            
            // Remove gift cards que não foram encontrados
            const validCards = cards.filter(card => card !== undefined) as any[];
            console.log(`Gift cards válidos encontrados: ${validCards.length}`);
            
            if (validCards.length > 0) {
              // Calcula o total de saldo disponível (só relevante para transações de débito)
              const totalSaldo = validCards.reduce((sum, card) => sum + card.saldoAtual, 0);
              console.log(`Saldo total disponível: ${totalSaldo}`);
              
              // Verifica se temos a distribuição manual de valores
              let valoresPorCard: {[cardId: number]: number} = {};
              
              // Se temos valores específicos por cartão (cardValores)
              if (req.body.cardValores) {
                try {
                  valoresPorCard = JSON.parse(req.body.cardValores);
                  console.log("Valores específicos por cartão:", valoresPorCard);
                } catch (e) {
                  console.error("Erro ao fazer parse de cardValores:", e);
                }
              }
              
              // Para reembolso, não precisamos verificar se o valor é maior que o saldo
              // Para transações normais, limitamos ao saldo disponível
              const valorTransacao = transacao.status === 'refund' 
                ? transacao.valor 
                : Math.min(transacao.valor, totalSaldo);
              
              let valorRestante = valorTransacao;
              
              // Processa cada cartão com seus valores específicos ou distribuição automática
              for (let i = 0; i < validCards.length; i++) {
                const card = validCards[i];
                const isLastCard = i === validCards.length - 1;
                let valorAlterar;
                
                // Se temos um valor específico para este cartão
                if (valoresPorCard && Object.keys(valoresPorCard).length > 0 && valoresPorCard[card.id] !== undefined) {
                  valorAlterar = transacao.status === 'refund' 
                    ? valoresPorCard[card.id] 
                    : Math.min(valoresPorCard[card.id], card.saldoAtual);
                } else if (isLastCard) {
                  // Para o último cartão (sem valor específico), usamos o que sobrar
                  valorAlterar = transacao.status === 'refund'
                    ? valorRestante
                    : Math.min(valorRestante, card.saldoAtual);
                } else {
                  // Distribuição proporcional para os demais cartões
                  valorAlterar = transacao.status === 'refund'
                    ? valorRestante
                    : Math.min(valorRestante, card.saldoAtual);
                }
                
                // Para reembolso, adicionamos o valor, para transações normais subtraímos
                const novoSaldo = card.saldoAtual + (valorAlterar * fator);
                
                if (transacao.status === 'refund') {
                  console.log(`Gift card ${card.codigo}: adicionando ${valorAlterar} (REEMBOLSO), novo saldo: ${novoSaldo}`);
                } else {
                  console.log(`Gift card ${card.codigo}: debitando ${valorAlterar}, novo saldo: ${novoSaldo}`);
                }
                
                await storage.updateGiftCard(card.id, {
                  saldoAtual: novoSaldo
                });
                
                valorRestante -= valorAlterar;
                
                // Se não há mais valor para distribuir, saímos do loop
                if (valorRestante <= 0) break;
              }
            }
          } 
          // Compatibilidade com transações antigas (gift card único)
          else if (transacao.giftCardId) {
            if (transacao.status === 'refund') {
              console.log(`Atualizando saldo do gift card ${transacao.giftCardId} após reembolso`);
            } else {
              console.log(`Atualizando saldo do gift card ${transacao.giftCardId} após transação concluída`);
            }
            
            const giftCard = await storage.getGiftCard(transacao.giftCardId);
            
            if (giftCard) {
              console.log(`Gift card encontrado: ${giftCard.codigo}, saldo atual: ${giftCard.saldoAtual}`);
              
              // Para reembolso, adicionamos o valor, para transações normais subtraímos
              const novoSaldo = giftCard.saldoAtual + (transacao.valor * fator);
              
              if (transacao.status === 'refund') {
                console.log(`Novo saldo calculado após reembolso: ${novoSaldo} (adicionando ${transacao.valor})`);
              } else {
                console.log(`Novo saldo calculado após débito: ${novoSaldo} (subtraindo ${transacao.valor})`);
              }
              
              await storage.updateGiftCard(giftCard.id, {
                saldoAtual: novoSaldo
              });
              
              console.log(`Saldo atualizado com sucesso para: ${novoSaldo}`);
            }
          }
        } catch (error) {
          console.error(`Erro ao atualizar saldo dos gift cards: ${error}`);
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
  
  router.get("/transacoes/detalhes/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      // Obter o usuário autenticado
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      // ISOLAMENTO ESTRITO DE DADOS - VERSÃO 2.0
      // NENHUM usuário pode ver transações de outros usuários, nem mesmo administradores
      const userId = user.id;
      const empresaId = user.empresaId;
      
      console.log(`[SEGURANÇA] Requisição GET /transacoes/detalhes/${req.params.id} de usuário ${user.username} (ID: ${userId})`);
      
      // Verificar se param ID é válido
      const transacaoId = parseInt(req.params.id);
      if (isNaN(transacaoId)) {
        return res.status(400).json({ message: "ID de transação inválido" });
      }
      
      // Verificar requisição para empresaId diferente da empresa do usuário
      if (req.query.empresaId) {
        const requestedEmpresaId = parseInt(req.query.empresaId as string);
        
        // Verificar se é um empresaId válido
        if (isNaN(requestedEmpresaId)) {
          console.log(`[SEGURANÇA - ERRO] ID de empresa inválido na consulta: ${req.query.empresaId}`);
          return res.status(400).json({ message: "ID de empresa inválido" });
        }
        
        // Forçar uso apenas da empresa do usuário
        if (requestedEmpresaId !== empresaId) {
          console.log(`[SEGURANÇA - TENTATIVA NEGADA] Usuário ${user.username} (ID: ${userId}) tentou acessar dados da empresa ID: ${requestedEmpresaId}`);
          return res.status(403).json({ 
            message: "Você não tem permissão para acessar dados de outras empresas" 
          });
        }
      }
      
      console.log(`[SEGURANÇA] Buscando transação ${transacaoId} para o usuário ${userId}`);
      
      // Busca a transação usando apenas a empresa do usuário autenticado
      const transacao = await storage.getTransacao(transacaoId, empresaId);
      
      if (!transacao) {
        return res.status(404).json({ message: "Transação não encontrada" });
      }
      
      // ISOLAMENTO ESTRITO - verificar proprietário da transação
      // Fase 1: Verificar se a transação pertence diretamente ao usuário
      if (transacao.userId !== userId) {
        console.log(`[SEGURANÇA] Transação ${transacaoId} não pertence diretamente ao usuário ${userId}`);
        
        // Fase 2: Verificar se a transação está associada a um gift card do usuário
        const giftCardId = transacao.giftCardId;
        if (giftCardId) {
          const giftCard = await storage.getGiftCard(giftCardId, empresaId);
          
          if (!giftCard || giftCard.userId !== userId) {
            console.log(`[SEGURANÇA - TENTATIVA NEGADA] Usuário ${user.username} (ID: ${userId}) tentou acessar transação ID: ${transacaoId} que não lhe pertence`);
            return res.status(403).json({ 
              message: "Você não tem permissão para acessar esta transação" 
            });
          }
          
          console.log(`[SEGURANÇA - VALIDADO] Transação pertence ao gift card ${giftCardId} do usuário ${userId}`);
        } else {
          // Se não tem giftCardId e não pertence ao usuário, negar acesso
          console.log(`[SEGURANÇA - TENTATIVA NEGADA] Usuário ${user.username} (ID: ${userId}) tentou acessar transação ID: ${transacaoId} que não lhe pertence`);
          return res.status(403).json({ 
            message: "Você não tem permissão para acessar esta transação" 
          });
        }
      } else {
        console.log(`[SEGURANÇA - VALIDADO] Transação pertence diretamente ao usuário ${userId}`);
      }
      
      console.log(`[AUDITORIA] Usuário ${user.username} (ID: ${userId}) consultou detalhes da transação ID: ${transacaoId}`);
      
      res.json(transacao);
    } catch (error) {
      console.error("[ERRO CRÍTICO] Falha ao buscar detalhes da transação:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  router.put("/transacoes/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      // Obter o usuário autenticado
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      // ISOLAMENTO ESTRITO DE DADOS - VERSÃO 2.0
      // NENHUM usuário pode modificar transações de outros usuários, nem mesmo administradores
      const userId = user.id;
      const empresaId = user.empresaId;
      
      console.log(`[SEGURANÇA] Requisição PUT /transacoes/${req.params.id} de usuário ${user.username} (ID: ${userId})`);
      
      // Verificar se param ID é válido
      const transacaoId = parseInt(req.params.id);
      if (isNaN(transacaoId)) {
        return res.status(400).json({ message: "ID de transação inválido" });
      }
      
      // Verificar requisição para empresaId diferente da empresa do usuário
      if (req.query.empresaId) {
        const requestedEmpresaId = parseInt(req.query.empresaId as string);
        
        // Verificar se é um empresaId válido
        if (isNaN(requestedEmpresaId)) {
          console.log(`[SEGURANÇA - ERRO] ID de empresa inválido na consulta: ${req.query.empresaId}`);
          return res.status(400).json({ message: "ID de empresa inválido" });
        }
        
        // Forçar uso apenas da empresa do usuário
        if (requestedEmpresaId !== empresaId) {
          console.log(`[SEGURANÇA - TENTATIVA NEGADA] Usuário ${user.username} (ID: ${userId}) tentou acessar dados da empresa ID: ${requestedEmpresaId}`);
          return res.status(403).json({ 
            message: "Você não tem permissão para acessar dados de outras empresas" 
          });
        }
      }
      
      // Buscar a transação usando apenas a empresa do usuário autenticado
      const transacao = await storage.getTransacao(transacaoId, empresaId);
      
      if (!transacao) {
        return res.status(404).json({ message: "Transação não encontrada" });
      }
      
      // ISOLAMENTO ESTRITO - verificar proprietário da transação
      // Fase 1: Verificar se a transação pertence diretamente ao usuário
      if (transacao.userId !== userId) {
        console.log(`[SEGURANÇA] Transação ${transacaoId} não pertence diretamente ao usuário ${userId}`);
        
        // Fase 2: Verificar se a transação está associada a um gift card do usuário
        const giftCardId = transacao.giftCardId;
        if (giftCardId) {
          const giftCard = await storage.getGiftCard(giftCardId, empresaId);
          
          if (!giftCard || giftCard.userId !== userId) {
            console.log(`[SEGURANÇA - TENTATIVA NEGADA] Usuário ${user.username} (ID: ${userId}) tentou modificar transação ID: ${transacaoId} que não lhe pertence`);
            return res.status(403).json({ 
              message: "Você não tem permissão para modificar esta transação" 
            });
          }
          
          console.log(`[SEGURANÇA - VALIDADO] Transação pertence ao gift card ${giftCardId} do usuário ${userId}`);
        } else {
          // Se não tem giftCardId e não pertence ao usuário, negar acesso
          console.log(`[SEGURANÇA - TENTATIVA NEGADA] Usuário ${user.username} (ID: ${userId}) tentou modificar transação ID: ${transacaoId} que não lhe pertence`);
          return res.status(403).json({ 
            message: "Você não tem permissão para modificar esta transação" 
          });
        }
      } else {
        console.log(`[SEGURANÇA - VALIDADO] Transação pertence diretamente ao usuário ${userId}`);
      }
      
      // Garantir que empresaId seja o do usuário autenticado (nunca o de outro usuário)
      req.body.empresaId = empresaId;
      
      // Impedir modificação do userId para outro usuário (garantia extra)
      if (req.body.userId && req.body.userId !== userId) {
        console.log(`[SEGURANÇA - TENTATIVA NEGADA] Usuário ${user.username} (ID: ${userId}) tentou modificar userId de transação para: ${req.body.userId}`);
        req.body.userId = userId; // Forçar userId como o do usuário atual
      }
      
      const transacaoData = insertTransacaoSchema.partial().parse(req.body);
      
      console.log(`[AUDITORIA] Usuário ${user.username} (ID: ${userId}) editando transação ID: ${transacaoId}`);
      const updatedTransacao = await storage.updateTransacao(transacaoId, transacaoData);
      
      if (!updatedTransacao) {
        return res.status(404).json({ message: "Falha ao atualizar transação" });
      }
      
      console.log(`[SEGURANÇA] Transação ${transacaoId} atualizada com sucesso pelo usuário ${userId}`);
      res.json(updatedTransacao);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error("[ERRO CRÍTICO] Falha ao atualizar transação:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  router.delete("/transacoes/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      // Obter o usuário autenticado
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      // ISOLAMENTO ESTRITO DE DADOS - VERSÃO 2.0
      // NENHUM usuário pode excluir transações de outros usuários, nem mesmo administradores
      const userId = user.id;
      const empresaId = user.empresaId;
      
      console.log(`[SEGURANÇA] Requisição DELETE /transacoes/${req.params.id} de usuário ${user.username} (ID: ${userId})`);
      
      // Verificar se param ID é válido
      const transacaoId = parseInt(req.params.id);
      if (isNaN(transacaoId)) {
        return res.status(400).json({ message: "ID de transação inválido" });
      }
      
      // Verificar requisição para empresaId diferente da empresa do usuário
      if (req.query.empresaId) {
        const requestedEmpresaId = parseInt(req.query.empresaId as string);
        
        // Verificar se é um empresaId válido
        if (isNaN(requestedEmpresaId)) {
          console.log(`[SEGURANÇA - ERRO] ID de empresa inválido na consulta: ${req.query.empresaId}`);
          return res.status(400).json({ message: "ID de empresa inválido" });
        }
        
        // Forçar uso apenas da empresa do usuário
        if (requestedEmpresaId !== empresaId) {
          console.log(`[SEGURANÇA - TENTATIVA NEGADA] Usuário ${user.username} (ID: ${userId}) tentou acessar dados da empresa ID: ${requestedEmpresaId}`);
          return res.status(403).json({ 
            message: "Você não tem permissão para acessar dados de outras empresas" 
          });
        }
      }
      
      // Buscar a transação usando apenas a empresa do usuário autenticado
      const transacao = await storage.getTransacao(transacaoId, empresaId);
      
      if (!transacao) {
        return res.status(404).json({ message: "Transação não encontrada" });
      }
      
      // ISOLAMENTO ESTRITO - verificar proprietário da transação
      // Fase 1: Verificar se a transação pertence diretamente ao usuário
      if (transacao.userId !== userId) {
        console.log(`[SEGURANÇA] Transação ${transacaoId} não pertence diretamente ao usuário ${userId}`);
        
        // Fase 2: Verificar se a transação está associada a um gift card do usuário
        const giftCardId = transacao.giftCardId;
        if (giftCardId) {
          const giftCard = await storage.getGiftCard(giftCardId, empresaId);
          
          if (!giftCard || giftCard.userId !== userId) {
            console.log(`[SEGURANÇA - TENTATIVA NEGADA] Usuário ${user.username} (ID: ${userId}) tentou excluir transação ID: ${transacaoId} que não lhe pertence`);
            return res.status(403).json({ 
              message: "Você não tem permissão para excluir esta transação" 
            });
          }
          
          console.log(`[SEGURANÇA - VALIDADO] Transação pertence ao gift card ${giftCardId} do usuário ${userId}`);
        } else {
          // Se não tem giftCardId e não pertence ao usuário, negar acesso
          console.log(`[SEGURANÇA - TENTATIVA NEGADA] Usuário ${user.username} (ID: ${userId}) tentou excluir transação ID: ${transacaoId} que não lhe pertence`);
          return res.status(403).json({ 
            message: "Você não tem permissão para excluir esta transação" 
          });
        }
      } else {
        console.log(`[SEGURANÇA - VALIDADO] Transação pertence diretamente ao usuário ${userId}`);
      }
      
      console.log(`[AUDITORIA] Usuário ${user.username} (ID: ${userId}) excluindo transação ID: ${transacaoId}`);
      const success = await storage.deleteTransacao(transacaoId);
      
      if (!success) {
        return res.status(404).json({ message: "Falha ao excluir transação" });
      }
      
      console.log(`[SEGURANÇA] Transação ${transacaoId} excluída com sucesso pelo usuário ${userId}`);
      res.status(204).send();
    } catch (error) {
      console.error("[ERRO CRÍTICO] Falha ao excluir transação:", error);
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
      
      // Se o formato solicitado for CSV
      if (req.query.format === 'csv') {
        // Adicionados campos: valorPago, percentualDesconto, valorEconomizado
        let csvData = '"ID","Código","Fornecedor","Valor Inicial","Valor Pago","Desconto (%)","Economia","Saldo Atual","Data Validade","Status","Data Criação","Última Atualização"\n';
        
        for (const card of giftCards) {
          const fornecedor = await storage.getFornecedor(card.fornecedorId, empresaId);
          
          // Filtrar dados confidenciais
          const filteredCard = isGuest ? filterConfidentialData(card, true) : card;
          
          // Cálculo do valor economizado para exportação
          const valorEconomizado = (filteredCard.valorInicial - (filteredCard.valorPago || 0)).toFixed(2);
          
          csvData += `"${card.id}","${filteredCard.codigo}","${fornecedor?.nome || ''}"`;
          csvData += `,"${filteredCard.valorInicial}","${filteredCard.valorPago || '0'}"`;
          csvData += `,"${filteredCard.percentualDesconto || '0'}","${valorEconomizado}"`;
          csvData += `,"${filteredCard.saldoAtual}"`;
          csvData += `,"${filteredCard.dataValidade ? format(filteredCard.dataValidade, 'dd/MM/yyyy') : ''}"`;
          csvData += `,"${filteredCard.status}"`;
          csvData += `,"${format(card.createdAt, 'dd/MM/yyyy HH:mm')}"`;
          csvData += `,"${card.updatedAt ? format(card.updatedAt, 'dd/MM/yyyy HH:mm') : ''}"\n`;
        }

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=gift-cards.csv');
        return res.send(csvData);
      }
      
      // Padrão: retornar JSON com dados enriquecidos para exportação
      const enrichedGiftCards = await Promise.all(giftCards.map(async (card) => {
        const fornecedor = await storage.getFornecedor(card.fornecedorId, empresaId);
        // Adiciona campos calculados e informações do fornecedor
        const valorEconomizado = (card.valorInicial - (card.valorPago || 0));
        return {
          ...card,
          fornecedorNome: fornecedor?.nome || '',
          valorEconomizado: valorEconomizado
        };
      }));
      
      res.json(enrichedGiftCards);
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
      
      // Se o formato solicitado for CSV
      if (req.query.format === 'csv') {
        // Buscar informações adicionais para o relatório
        let csvData = '"ID","Gift Card","Valor","Data da Transação","Descrição","Status","Ordem de Compra","Usuário"\n';
        
        for (const transacao of transacoes) {
          // Buscar informações do gift card associado
          const giftCard = await storage.getGiftCard(transacao.giftCardId, empresaId);
          
          csvData += `"${transacao.id}","${giftCard?.codigo || ''}"`;
          csvData += `,"${transacao.valor}","${format(transacao.dataTransacao, 'dd/MM/yyyy HH:mm')}"`;
          csvData += `,"${transacao.descricao || ''}","${transacao.status || ''}"`;
          csvData += `,"${transacao.ordemCompra || ''}","${transacao.nomeUsuario || ''}"\n`;
        }

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=transacoes.csv');
        return res.send(csvData);
      }
      
      // Padrão: retornar JSON
      res.json(transacoes);
    } catch (error) {
      console.error("Erro ao exportar transações:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Rota para estatísticas de relatórios
  router.get("/relatorios/estatisticas", requireAuth, async (req: Request, res: Response) => {
    try {
      // Obter o usuário autenticado
      const user = req.user;
      if (!user) {
        console.log(`[SEGURANÇA - ERRO] Tentativa de acesso a relatórios sem autenticação`);
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      // ISOLAMENTO ESTRITO DE DADOS
      // NENHUM usuário pode ver estatísticas de outros usuários, nem mesmo administradores
      const userId = user.id;
      const empresaId = user.empresaId;
      
      console.log(`[SEGURANÇA] Requisição GET /relatorios/estatisticas de usuário ${user.username} (ID: ${userId})`);
      
      // Verificar requisição para userId diferente do usuário autenticado
      if (req.query.userId) {
        const requestedUserId = parseInt(req.query.userId as string);
        
        // Verificar se é um userId válido
        if (isNaN(requestedUserId)) {
          console.log(`[SEGURANÇA - ERRO] ID de usuário inválido na consulta: ${req.query.userId}`);
          return res.status(400).json({ message: "ID de usuário inválido" });
        }
        
        // Se o usuário tenta acessar dados de outro usuário, bloquear
        if (requestedUserId !== userId) {
          console.log(`[SEGURANÇA - ISOLAMENTO TOTAL] Usuário ${user.username} (ID: ${userId}) tentou acessar estatísticas do usuário ID: ${requestedUserId}`);
          console.log(`[SEGURANÇA - TENTATIVA NEGADA] Bloqueando acesso - Ninguém pode ver os dados de outro usuário`);
          return res.status(403).json({ 
            message: "Você não tem permissão para acessar estatísticas de outros usuários" 
          });
        }
        
        // Se está consultando seus próprios dados, permitir
        console.log(`[SEGURANÇA - VALIDADO] Usuário ${user.username} (ID: ${userId}) acessando suas próprias estatísticas`);
      }
      
      // Verificar requisição para empresaId diferente da empresa do usuário
      if (req.query.empresaId) {
        const requestedEmpresaId = parseInt(req.query.empresaId as string);
        
        // Verificar se é um empresaId válido
        if (isNaN(requestedEmpresaId)) {
          console.log(`[SEGURANÇA - ERRO] ID de empresa inválido na consulta: ${req.query.empresaId}`);
          return res.status(400).json({ message: "ID de empresa inválido" });
        }
        
        // Forçar uso apenas da empresa do usuário
        if (requestedEmpresaId !== empresaId) {
          console.log(`[SEGURANÇA - TENTATIVA NEGADA] Usuário ${user.username} (ID: ${userId}) tentou acessar dados da empresa ID: ${requestedEmpresaId}`);
          return res.status(403).json({ 
            message: "Você não tem permissão para acessar dados de outras empresas" 
          });
        }
      }
      
      console.log(`[SEGURANÇA - ISOLAMENTO TOTAL] Aplicando isolamento estrito para ${user.username} (ID: ${userId})`);
      
      // Buscar todos os gift cards do usuário com segurança reforçada
      console.log(`[SEGURANÇA] Buscando gift cards para estatísticas do usuário ${userId}`);
      const giftCards = await storage.getGiftCards(userId, undefined, empresaId);
      
      // Aplicar filtro extra de segurança para garantir que somente dados do usuário sejam processados
      const meusGiftCards = giftCards.filter(gc => gc.userId === userId);
      console.log(`[SEGURANÇA] Gift cards encontrados para usuário ${userId}: ${meusGiftCards.length}`);
      
      // Buscar fornecedores do usuário com segurança reforçada
      console.log(`[SEGURANÇA] Buscando fornecedores do usuário ${userId}`);
      const fornecedores = await storage.getFornecedores(userId, empresaId);
      
      // Aplicar filtro extra de segurança para garantir isolamento de fornecedores
      const meusFornecedores = fornecedores.filter(f => f.userId === userId);
      console.log(`[SEGURANÇA] Fornecedores encontrados para usuário ${userId}: ${meusFornecedores.length}`);
      
      // Calcular estatísticas por fornecedor com dados seguros
      const estatisticasPorFornecedor = meusFornecedores
        .filter(f => f.status === "ativo")
        .map(fornecedor => {
          // Usar apenas gift cards verificados do usuário
          const fornecedorGiftCards = meusGiftCards.filter(gc => gc.fornecedorId === fornecedor.id);
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
      
      console.log(`[SEGURANÇA] Calculadas estatísticas para ${estatisticasPorFornecedor.length} fornecedores do usuário ${userId}`);
      
      // Calcular estatísticas por mês (últimos 6 meses) com dados seguros
      const hoje = new Date();
      const estatisticasPorMes = [];
      
      for (let i = 5; i >= 0; i--) {
        const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        const mes = data.toLocaleString('default', { month: 'short' });
        const ano = data.getFullYear();
        
        // Usar apenas gift cards verificados do usuário
        const cardsNoMes = meusGiftCards.filter(gc => {
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
  // Adicionado middleware requireAuth para garantir autenticação
  router.get("/collections", requireAuth, async (req: Request, res: Response) => {
    try {
      // Verificar se o usuário está autenticado
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      // CORREÇÃO CRITICA DE SEGURANÇA: ISOLAMENTO ABSOLUTO POR USUÁRIO
      // Usar SEMPRE o ID do usuário autenticado - isolamento estrito de dados
      const userId = user.id;
      
      // Usar SEMPRE a empresa do usuário autenticado para garantir isolamento
      const empresaId = user.empresaId;
      
      console.log(`[SEGURANÇA] Requisição /collections de usuário ${user.username} (ID: ${userId}) da empresa ID: ${empresaId}`);
      console.log(`[SEGURANÇA CRÍTICA - PROTEÇÃO ATIVADA] Aplicando isolamento estrito de dados para o usuário ${user.username} (ID: ${userId})`);
      
      // IMPLEMENTAÇÃO DE SEGURANÇA RIGOROSA:
      // 1. Chamar diretamente getFornecedores que já tem filtro por userId e empresaId
      let fornecedores = await storage.getFornecedores(userId, empresaId);
      
      // TRIPLA VERIFICAÇÃO DE SEGURANÇA: Filtrar explicitamente para garantir que apenas
      // dados do usuário logado sejam retornados, mesmo se houver falha em outro nível
      fornecedores = fornecedores.filter(f => f.userId === userId);
      
      console.log(`[SEGURANÇA CRÍTICA] Fornecedores encontrados para userId=${userId}: ${fornecedores.length}`);
      console.log(`[SEGURANÇA CRÍTICA] IDs de fornecedores acessíveis: ${fornecedores.map(f => f.id).join(', ')}`);
      
      // 2. Filtrar para retornar apenas fornecedores ativos
      const fornecedoresAtivos = fornecedores.filter(f => f.status === "ativo");
      
      // 3. Mapear para o formato esperado pelo sidebar com informações mínimas necessárias
      const collections = fornecedoresAtivos.map(f => ({
        id: f.id,
        nome: f.nome,
        logo: f.logo,
        userId: f.userId, // Incluir userId para auditoria de segurança
        empresaId: f.empresaId // Necessário para validação de segurança no frontend
      }));
      
      console.log(`[AUDITORIA DE SEGURANÇA] Usuário ${user.username} (ID: ${userId}) consultou collections (${collections.length} resultados)`);
      
      res.json(collections);
    } catch (error) {
      console.error("[ERRO CRÍTICO DE SEGURANÇA] Falha ao buscar collections:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
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
  
  // Rota para buscar gift cards pelo código (completo ou últimos 4 dígitos)
  router.get("/gift-cards/search/:codigo/:empresaId", requireAuth, async (req: Request, res: Response) => {
    try {
      const { codigo, empresaId } = req.params;
      
      // Obter o usuário autenticado
      const user = req.user;
      if (!user) {
        console.log(`[SEGURANÇA - ERRO] Tentativa de busca de gift cards sem autenticação`);
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      // ISOLAMENTO ESTRITO DE DADOS
      // NENHUM usuário pode ver gift cards de outros usuários, nem mesmo administradores
      const userId = user.id;
      const userEmpresaId = user.empresaId;
      const parsedEmpresaId = parseInt(empresaId);
      
      console.log(`[SEGURANÇA] Requisição de busca de gift card por código "${codigo}" de usuário ${user.username} (ID: ${userId})`);
      
      // Verificar se a empresa do parâmetro coincide com a empresa do usuário logado
      if (userEmpresaId !== parsedEmpresaId) {
        console.log(`[SEGURANÇA - TENTATIVA NEGADA] Usuário ${user.username} (ID: ${userId}) tentou acessar dados da empresa ID: ${parsedEmpresaId}`);
        return res.status(403).json({ error: "Acesso negado a dados de outra empresa" });
      }
      
      console.log(`[SEGURANÇA] Buscando gift cards pelo código ${codigo} para o usuário ${userId} da empresa ${empresaId}`);
      
      // SEGURANÇA APRIMORADA: Buscar apenas gift cards do usuário logado, não todos da empresa
      const userGiftCards = await storage.getGiftCards(userId, undefined, parsedEmpresaId);
      
      // TRIPLA VERIFICAÇÃO DE SEGURANÇA: Filtrar explicitamente por userId
      const meusgiftCards = userGiftCards.filter(card => card.userId === userId);
      
      console.log(`[SEGURANÇA] Encontrados ${meusgiftCards.length} gift cards do usuário ${userId}`);
      
      // Filtra os gift cards pelo código OU pelo gcNumber com lógica mais flexível
      const matchingGiftCards = meusgiftCards.filter(card => {
        // Se ambos os campos estiverem vazios, não incluir
        if (!card.codigo && !card.gcNumber) return false;
        
        // Normaliza os códigos para busca (remove espaços, traços, etc.)
        const normalizedCardCode = (card.codigo || '').toLowerCase().replace(/[^a-z0-9]/gi, '');
        const normalizedGcNumber = (card.gcNumber || '').toLowerCase().replace(/[^a-z0-9]/gi, '');
        const normalizedSearchCode = codigo.toLowerCase().replace(/[^a-z0-9]/gi, '');
        
        // Busca PRIORITÁRIA pelo gcNumber (número do gift card)
        if (normalizedGcNumber === normalizedSearchCode) return true;
        if (normalizedGcNumber.includes(normalizedSearchCode)) return true;
        if (normalizedGcNumber.endsWith(normalizedSearchCode)) return true;
        
        // Busca secundária pelo código
        if (normalizedCardCode === normalizedSearchCode) return true;
        if (normalizedCardCode.includes(normalizedSearchCode)) return true;
        if (normalizedCardCode.endsWith(normalizedSearchCode)) return true;
        
        return false;
      });
      
      // Adiciona dados de fornecedor para cada gift card
      const enrichedGiftCards = await Promise.all(matchingGiftCards.map(async (card) => {
        const fornecedor = await storage.getFornecedor(card.fornecedorId, parsedEmpresaId);
        return {
          ...card,
          fornecedorNome: fornecedor?.nome || 'Fornecedor Desconhecido'
        };
      }));
      
      // Verifica se o usuário é convidado para filtrar dados confidenciais
      const userPerfilId = user.perfilId;
      const isGuest = await isGuestProfile(userPerfilId);
      
      // Filtra dados confidenciais se o usuário for convidado
      const filteredGiftCards = filterGiftCardArray(enrichedGiftCards, isGuest);
      
      console.log(`[AUDITORIA] Usuário ${user.username} (ID: ${userId}) encontrou ${filteredGiftCards.length} gift cards na busca por código "${codigo}"`);
      return res.json(filteredGiftCards);
    } catch (error) {
      console.error("Erro ao buscar gift cards por código:", error);
      return res.status(500).json({ error: "Erro ao buscar gift cards" });
    }
  });

  // Mount the API router
  app.use("/api", router);

  const httpServer = createServer(app);
  return httpServer;
}
