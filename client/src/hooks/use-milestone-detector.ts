import { useState, useEffect } from 'react';
import { GiftCard } from '@shared/schema';

export type Milestone = {
  id: string;
  title: string;
  description: string;
  threshold: number;
  type: 'count' | 'value' | 'provider';
  animationType: 'basic' | 'milestone' | 'achievement' | 'fireWorks';
};

// Lista de marcos predefinidos
const defaultMilestones: Milestone[] = [
  {
    id: 'first-gift-card',
    title: 'Primeiro Gift Card!',
    description: 'Você adicionou seu primeiro gift card à coleção!',
    threshold: 1,
    type: 'count',
    animationType: 'basic'
  },
  {
    id: 'five-gift-cards',
    title: 'Coleção Crescendo!',
    description: 'Sua coleção já possui 5 gift cards!',
    threshold: 5,
    type: 'count',
    animationType: 'milestone'
  },
  {
    id: 'ten-gift-cards',
    title: 'Coleção Notável!',
    description: 'Você atingiu 10 gift cards em sua coleção!',
    threshold: 10,
    type: 'count',
    animationType: 'achievement'
  },
  {
    id: 'twenty-gift-cards',
    title: 'Colecionador Experiente!',
    description: 'Incrível! Você já tem 20 gift cards em sua coleção!',
    threshold: 20,
    type: 'count',
    animationType: 'fireWorks'
  },
  {
    id: 'fifty-gift-cards',
    title: 'Colecionador Master!',
    description: 'Uau! 50 gift cards é uma conquista incrível!',
    threshold: 50,
    type: 'count',
    animationType: 'fireWorks'
  },
  {
    id: 'value-1000',
    title: 'Primeiro Grande Valor!',
    description: 'O valor total da sua coleção atingiu R$ 1.000!',
    threshold: 1000,
    type: 'value',
    animationType: 'milestone'
  },
  {
    id: 'value-5000',
    title: 'Coleção Valiosa!',
    description: 'Sua coleção agora vale R$ 5.000!',
    threshold: 5000,
    type: 'value',
    animationType: 'achievement'
  },
  {
    id: 'value-10000',
    title: 'Tesouro Valioso!',
    description: 'Incrível! Sua coleção atingiu R$ 10.000 em valor!',
    threshold: 10000,
    type: 'value',
    animationType: 'fireWorks'
  },
  {
    id: 'three-providers',
    title: 'Diversificando!',
    description: 'Você já possui gift cards de 3 fornecedores diferentes!',
    threshold: 3,
    type: 'provider',
    animationType: 'milestone'
  },
  {
    id: 'five-providers',
    title: 'Coleção Diversificada!',
    description: 'Sua coleção inclui 5 fornecedores diferentes!',
    threshold: 5,
    type: 'provider',
    animationType: 'achievement'
  }
];

// Array para armazenar IDs de marcos já exibidos (para persistência)
const getCompletedMilestones = (): string[] => {
  const stored = localStorage.getItem('completedMilestones');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      return [];
    }
  }
  return [];
};

// Função para salvar marcos concluídos
const saveCompletedMilestone = (id: string) => {
  const completed = getCompletedMilestones();
  if (!completed.includes(id)) {
    completed.push(id);
    localStorage.setItem('completedMilestones', JSON.stringify(completed));
  }
};

interface UseMilestoneDetectorProps {
  giftCards: GiftCard[];
  customMilestones?: Milestone[];
}

export function useMilestoneDetector({ 
  giftCards, 
  customMilestones = [] 
}: UseMilestoneDetectorProps) {
  const [activeMilestone, setActiveMilestone] = useState<Milestone | null>(null);
  const [completedMilestones, setCompletedMilestones] = useState<string[]>(getCompletedMilestones());

  useEffect(() => {
    if (!giftCards || giftCards.length === 0) return;

    // Combinamos marcos padrão e personalizados
    const allMilestones = [...defaultMilestones, ...customMilestones];
    
    // Verificamos se é um array e calculamos métricas relevantes
    if (!Array.isArray(giftCards)) return;
    
    const giftCardCount = giftCards.length;
    const totalValue = giftCards.reduce((sum, card) => sum + card.saldoAtual, 0);
    const uniqueProviders = new Set(giftCards.map(card => card.fornecedorId)).size;
    
    // Verificamos cada marco
    for (const milestone of allMilestones) {
      // Pulamos marcos já concluídos
      if (completedMilestones.includes(milestone.id)) continue;
      
      let isAchieved = false;
      
      switch (milestone.type) {
        case 'count':
          isAchieved = giftCardCount >= milestone.threshold;
          break;
        case 'value':
          isAchieved = totalValue >= milestone.threshold;
          break;
        case 'provider':
          isAchieved = uniqueProviders >= milestone.threshold;
          break;
      }
      
      if (isAchieved) {
        setActiveMilestone(milestone);
        saveCompletedMilestone(milestone.id);
        setCompletedMilestones(prev => [...prev, milestone.id]);
        break;
      }
    }
  }, [giftCards, customMilestones, completedMilestones]);

  const clearActiveMilestone = () => {
    setActiveMilestone(null);
  };

  // Para fins de testing/debugging
  const resetCompletedMilestones = () => {
    localStorage.removeItem('completedMilestones');
    setCompletedMilestones([]);
  };

  return {
    activeMilestone,
    clearActiveMilestone,
    completedMilestones,
    resetCompletedMilestones
  };
}

export default useMilestoneDetector;