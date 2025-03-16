import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import jwt from "jsonwebtoken";
import { storage } from "./storage";

// Chave secreta para JWT - em produção, isso deve estar no .env
const JWT_SECRET = "cardvault-secret-key-2024";

// Schema para validação do login
const loginSchema = z.object({
  email: z.string().email(),
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
    const { email, password } = validatedData;

    // Buscar usuário pelo email
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: "Credenciais inválidas" });
    }

    // Verificar se o usuário está ativo
    if (user.status !== 'ativo') {
      return res.status(403).json({ message: "Usuário inativo. Entre em contato com o administrador." });
    }

    // Verificar a senha (em produção, deve-se usar bcrypt ou similar)
    if (user.password !== password) {
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
    (req as any).user = {
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
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      // Obter perfil do usuário
      const perfil = await storage.getPerfil(user.perfilId);
      if (!perfil) {
        return res.status(403).json({ message: "Perfil do usuário não encontrado" });
      }

      // Verificar se o perfil tem a permissão necessária
      if (!perfil.permissoes.includes(permission)) {
        return res.status(403).json({ message: "Você não tem permissão para acessar este recurso" });
      }

      next();
    } catch (error) {
      console.error("Erro ao verificar permissão:", error);
      res.status(500).json({ message: "Erro ao verificar permissões" });
    }
  };
}