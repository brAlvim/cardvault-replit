import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { storage } from "./storage";
import { GiftCard } from "@shared/schema";

// Estendendo a interface Request para incluir o usuário
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
        empresaId: number;
        perfilId: number;
      };
    }
  }
}

// Chave secreta para JWT - em produção, isso deve estar no .env
const JWT_SECRET = "cardvault-secret-key-2024-advanced-security-protocol";

// Chave para criptografia dos dados sensíveis
const ENCRYPTION_KEY = crypto.scryptSync("cardvault-encryption-key-2024", "salt", 32);
const IV_LENGTH = 16; // Para AES, este é sempre 16

// Função para criptografar dados sensíveis
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
}

// Função para descriptografar dados sensíveis
export function decrypt(text: string): string {
  try {
    const textParts = text.split(":");
    const iv = Buffer.from(textParts.shift() || "", "hex");
    const encryptedText = textParts.join(":");
    const decipher = crypto.createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    console.error("Erro ao descriptografar:", error);
    return text; // Retorna o texto original se houver erro na descriptografia
  }
}

// Schema para validação do login
const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

// Interface para o payload do token JWT
interface TokenPayload {
  userId: number;
  username: string;
  empresaId: number;
  perfilId: number;
  exp: number;
}

// Função para processar o login
export async function login(req: Request, res: Response) {
  try {
    // Validar dados de entrada
    const validatedData = loginSchema.parse(req.body);
    const { username, password } = validatedData;

    // Buscar usuário pelo nome de usuário
    const user = await storage.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ message: "Credenciais inválidas" });
    }

    // Verificar se o usuário está ativo
    if (user.status !== 'ativo') {
      return res.status(403).json({ message: "Usuário inativo. Entre em contato com o administrador." });
    }

    // Verificar a senha usando bcrypt
    // Em um ambiente de produção, todas as senhas devem ser armazenadas com hash
    let isPasswordValid = false;
    
    // Para compatibilidade com senhas em texto plano durante o desenvolvimento
    if (user.password.startsWith('$2b$') || user.password.startsWith('$2a$')) {
      // A senha está usando hash bcrypt
      try {
        isPasswordValid = await bcrypt.compare(password, user.password);
      } catch (error) {
        console.error("Erro ao comparar senhas com bcrypt:", error);
        isPasswordValid = false;
      }
    } else {
      // Temporário: comparação direta para senhas sem hash
      isPasswordValid = user.password === password;
    }
    
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Credenciais inválidas" });
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

    // Atualizar último login
    await storage.updateUserLastLogin(user.id);

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

    // Retornar dados do usuário e token
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
    console.error("Erro ao processar login:", error);
    res.status(400).json({ message: "Dados de login inválidos" });
  }
}

// Middleware para verificar autenticação
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Obter token do cabeçalho Authorization
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Autenticação necessária" });
  }

  const token = authHeader.split(" ")[1];

  try {
    // Verificar e decodificar o token
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;

    // Adicionar dados do usuário ao objeto req
    req.user = {
      id: decoded.userId,
      username: decoded.username,
      empresaId: decoded.empresaId,
      perfilId: decoded.perfilId,
    };

    next();
  } catch (error) {
    return res.status(401).json({ message: "Token inválido ou expirado" });
  }
}

// Middleware para verificar permissões
export function requirePermission(permission: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      // Obter perfil do usuário
      const perfil = await storage.getPerfil(user.perfilId);
      if (!perfil) {
        return res.status(403).json({ message: "Perfil do usuário não encontrado" });
      }

      // Administradores têm acesso a tudo
      if (perfil.permissoes.includes('*')) {
        return next();
      }

      // Verificar se o perfil tem a permissão exata ou permissão mais ampla
      // Por exemplo, 'fornecedor.*' concede 'fornecedor.visualizar'
      const hasPermission = perfil.permissoes.some(p => {
        // Permissão exata
        if (p === permission) return true;
        
        // Permissão wildcard (exemplo: 'fornecedor.*')
        const wildcardParts = p.split('.');
        const permParts = permission.split('.');
        
        if (wildcardParts.length === 2 && permParts.length === 2) {
          return wildcardParts[0] === permParts[0] && wildcardParts[1] === '*';
        }
        
        return false;
      });

      if (!hasPermission) {
        return res.status(403).json({ message: "Você não tem permissão para acessar este recurso" });
      }

      next();
    } catch (error) {
      console.error("Erro ao verificar permissão:", error);
      res.status(500).json({ message: "Erro ao verificar permissões" });
    }
  };
}

// Função para verificar se o usuário é do perfil "convidado"
export async function isGuestProfile(perfilId: number): Promise<boolean> {
  try {
    const perfil = await storage.getPerfil(perfilId);
    return perfil?.nome === "convidado";
  } catch (error) {
    console.error("Erro ao verificar perfil de convidado:", error);
    return false;
  }
}

// Função para filtrar informações confidenciais para convidados e aplicar criptografia
export function filterConfidentialData(giftCard: GiftCard, isGuest: boolean): GiftCard {
  if (isGuest) {
    // Cria uma cópia do objeto para não modificar o original
    const filteredCard = { ...giftCard };
    
    // Remove informações confidenciais completamente para convidados
    filteredCard.gcNumber = "********"; // Mascara o número do gift card
    filteredCard.gcPass = "********";   // Mascara a senha do gift card
    
    return filteredCard;
  } else {
    // Para usuários autorizados, criptografa os dados sensíveis
    const card = { ...giftCard };
    
    // Criptografa valores sensíveis se não estiverem vazios
    if (card.gcNumber && !card.gcNumber.startsWith('***')) {
      try {
        // Verificamos se o número já está criptografado
        if (!card.gcNumber.includes(':')) {
          card.gcNumber = encrypt(card.gcNumber);
        }
      } catch (err) {
        console.error("Erro ao criptografar gcNumber:", err);
      }
    }
    
    if (card.gcPass && !card.gcPass.startsWith('***')) {
      try {
        // Verificamos se a senha já está criptografada
        if (!card.gcPass.includes(':')) {
          card.gcPass = encrypt(card.gcPass);
        }
      } catch (err) {
        console.error("Erro ao criptografar gcPass:", err);
      }
    }
    
    return card;
  }
}

// Função para descriptografar dados sensíveis de gift cards
export function decryptGiftCardData(giftCard: GiftCard): GiftCard {
  const decryptedCard = { ...giftCard };
  
  // Descriptografa somente se o campo estiver preenchido e criptografado
  if (decryptedCard.gcNumber && decryptedCard.gcNumber.includes(':')) {
    try {
      decryptedCard.gcNumber = decrypt(decryptedCard.gcNumber);
    } catch (err) {
      console.error("Erro ao descriptografar gcNumber:", err);
    }
  }
  
  if (decryptedCard.gcPass && decryptedCard.gcPass.includes(':')) {
    try {
      decryptedCard.gcPass = decrypt(decryptedCard.gcPass);
    } catch (err) {
      console.error("Erro ao descriptografar gcPass:", err);
    }
  }
  
  return decryptedCard;
}

// Função para filtrar array de gift cards com base no perfil
export function filterGiftCardArray(giftCards: GiftCard[], isGuest: boolean): GiftCard[] {
  if (!isGuest) return giftCards;
  
  return giftCards.map(card => filterConfidentialData(card, true));
}

// Verifica se o recurso pertence ao usuário ou se o usuário tem acesso hierárquico
export async function canUserAccessResource(
  userId: number, 
  resourceOwnerId: number, 
  empresaId: number,
  perfilId: number
): Promise<boolean> {
  try {
    // Admin pode acessar qualquer recurso
    if (perfilId === 1) {
      return true;
    }
    
    // Se for o próprio recurso do usuário
    if (userId === resourceOwnerId) {
      return true;
    }
    
    // Gerente pode acessar recursos de usuários da mesma empresa
    if (perfilId === 2) {
      // Verificar se o recurso pertence à mesma empresa
      const resourceOwner = await storage.getUser(resourceOwnerId);
      return resourceOwner?.empresaId === empresaId;
    }
    
    // Outros perfis só podem acessar seus próprios recursos
    return false;
  } catch (error) {
    console.error('Erro ao verificar acesso ao recurso:', error);
    return false;
  }
}

// Verifica se um usuário pode acessar os dados de outro
export async function canUserManageOtherUser(
  currentUserId: number,
  targetUserId: number,
  currentUserPerfilId: number
): Promise<boolean> {
  // Não pode gerenciar a si mesmo neste contexto
  if (currentUserId === targetUserId) {
    return false;
  }
  
  // Admin pode gerenciar qualquer usuário
  if (currentUserPerfilId === 1) {
    return true;
  }
  
  // Gerente pode gerenciar apenas usuários com perfil inferior
  if (currentUserPerfilId === 2) {
    const targetUser = await storage.getUser(targetUserId);
    if (!targetUser) return false;
    
    // Verificar se o alvo tem perfil "usuário" ou "convidado"
    return targetUser.perfilId === 3 || targetUser.perfilId === 4;
  }
  
  // Outros perfis não podem gerenciar usuários
  return false;
}

// Middleware para verificar se um usuário pode acessar um recurso específico
export function requireResourceOwnership(resourceType: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      // Administradores têm acesso a tudo
      if (user.perfilId === 1) {
        return next();
      }
      
      const resourceId = parseInt(req.params.id);
      if (isNaN(resourceId)) {
        return res.status(400).json({ message: "ID de recurso inválido" });
      }
      
      let resourceOwnerId: number | undefined;
      
      // Obter o userId do recurso com base no tipo
      switch (resourceType) {
        case 'fornecedor':
          const fornecedor = await storage.getFornecedor(resourceId);
          resourceOwnerId = fornecedor?.userId;
          break;
        case 'supplier':
          const supplier = await storage.getSupplier(resourceId);
          resourceOwnerId = supplier?.userId;
          break;
        case 'giftCard':
          const giftCard = await storage.getGiftCard(resourceId);
          resourceOwnerId = giftCard?.userId;
          break;
        case 'transacao':
          const transacao = await storage.getTransacao(resourceId);
          // Para transações, verificamos se o usuário é dono do gift card associado
          if (transacao) {
            const giftCard = await storage.getGiftCard(transacao.giftCardId);
            resourceOwnerId = giftCard?.userId;
          }
          break;
        case 'user':
          // Para usuários, verificar se o alvo pode ser gerenciado pelo usuário atual
          const canManage = await canUserManageOtherUser(user.id, resourceId, user.perfilId);
          if (!canManage) {
            return res.status(403).json({ 
              message: "Você não tem permissão para gerenciar este usuário" 
            });
          }
          return next();
        default:
          return res.status(400).json({ message: "Tipo de recurso inválido" });
      }
      
      // Se o recurso não for encontrado
      if (!resourceOwnerId) {
        return res.status(404).json({ message: "Recurso não encontrado" });
      }
      
      // Verificar se o usuário tem acesso ao recurso
      const hasAccess = await canUserAccessResource(
        user.id, 
        resourceOwnerId, 
        user.empresaId,
        user.perfilId
      );
      
      if (!hasAccess) {
        return res.status(403).json({ 
          message: "Você não tem permissão para acessar este recurso" 
        });
      }
      
      next();
    } catch (error) {
      console.error("Erro ao verificar propriedade do recurso:", error);
      res.status(500).json({ message: "Erro ao verificar acesso ao recurso" });
    }
  };
}