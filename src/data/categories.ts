import { Category } from '../types';

export const CATEGORIES: Category[] = [
  {
    id: 'food_drink',
    name: 'Mat & Dryck',
    icon: '🍷',
    color: '#FF6B35',
    description: 'Testa dina kunskaper om mat, dryck och råvaror',
  },
  {
    id: 'professional',
    name: 'Professionellt',
    icon: '👨‍🍳',
    color: '#F7C948',
    description: 'Yrkeskunskap, köksteknik och branschtermer',
  },
  {
    id: 'service_guests',
    name: 'Service & Gäster',
    icon: '🤝',
    color: '#2EC4B6',
    description: 'Gästhantering, service och situationer i salen',
  },
  {
    id: 'industry_culture',
    name: 'Branschkultur',
    icon: '🏆',
    color: '#9B5DE5',
    description: 'Historia, trender och kända namn i branschen',
  },
  {
    id: 'fun_reallife',
    name: 'Kul & Vardag',
    icon: '😄',
    color: '#F15BB5',
    description: 'Igenkänningsfrågor och kul situationer från jobbet',
  },
  {
    id: 'labor_law',
    name: 'Avtal & Lag',
    icon: '⚖️',
    color: '#3A86FF',
    description: 'Kollektivavtal, arbetsrätt och anställningsvillkor i restaurangbranschen',
  },
];

export function getCategoryById(id: string): Category | undefined {
  return CATEGORIES.find(c => c.id === id);
}
