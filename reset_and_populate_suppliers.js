// Script para resetar e repopular fornecedores e suppliers para todos os usuários
import { config } from 'dotenv';
import { storage } from './server/storage.js';
import { db } from './server/db.js';
import { suppliers, fornecedores } from './shared/schema.js';
import { eq } from 'drizzle-orm';

config();

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

async function resetAndPopulateFornecedores() {
  try {
    console.log("Iniciando reset e população de fornecedores e suppliers...");

    // 1. Buscar todos os usuários
    const users = await storage.getUsersByEmpresa(1); // Assumindo que a empresa padrão é 1
    console.log(`Encontrados ${users.length} usuários para atualização.`);

    // 2. Limpar tabelas existentes (opcional - remover em produção se quiser preservar dados)
    console.log("Removendo fornecedores existentes...");
    await db.delete(fornecedores);
    
    console.log("Removendo suppliers existentes...");
    await db.delete(suppliers);

    // 3. Para cada usuário, criar os fornecedores e suppliers padrão
    for (const user of users) {
      console.log(`Criando fornecedores para o usuário ${user.username} (ID: ${user.id})`);
      
      // Criar fornecedores
      for (const fornecedorData of defaultFornecedores) {
        await storage.createFornecedor({
          nome: fornecedorData.nome,
          descricao: fornecedorData.descricao,
          website: fornecedorData.website,
          logo: fornecedorData.logo,
          status: "ativo",
          userId: user.id,
          empresaId: user.empresaId
        });
      }
      
      // Criar suppliers
      for (const supplierData of defaultSuppliers) {
        await storage.createSupplier({
          nome: supplierData.nome,
          descricao: supplierData.descricao,
          website: supplierData.website,
          logo: supplierData.logo,
          status: "ativo",
          userId: user.id,
          empresaId: user.empresaId
        });
      }
      
      console.log(`Fornecedores e suppliers criados com sucesso para o usuário ${user.username}`);
    }

    console.log("Reset e população de fornecedores concluídos com sucesso!");
  } catch (error) {
    console.error("Erro ao resetar e popular fornecedores:", error);
  } finally {
    process.exit(0);
  }
}

// Executar o script
resetAndPopulateFornecedores().catch(err => {
  console.error("Erro na execução:", err);
  process.exit(1);
});