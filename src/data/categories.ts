import { Category } from '../types';

export const CATEGORIES: Category[] = [
  {
    id: 'food',
    name: 'Mat',
    icon: '🍔',
    color: '#FF6B35',
    description: 'Testa dina kunskaper om mat, råvaror och matlagning',
  },
  {
    id: 'drink',
    name: 'Dryck',
    icon: '🍷',
    color: '#8B2FC9',
    description: 'Testa dina kunskaper om vin, cocktails, kaffe och andra drycker',
  },
  {
    id: 'famous_profiles',
    name: 'Kända profiler',
    icon: '🌟',
    color: '#E8B84B',
    description: 'Kockar, TV-profiler och restauratörer som format matvärlden',
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
  {
    id: 'food_cost',
    name: 'Kostnad & Lönsamhet',
    icon: '🧾',
    color: '#06D6A0',
    description: 'Food cost, marginaler, menykalkyl och lönsamhet i restaurangdrift',
  },
  {
    id: 'scheduling_labor',
    name: 'Schema & Personal',
    icon: '⏱️',
    color: '#FFB347',
    description: 'Schemaläggning, personalplanering och bemanningsstrategi',
  },
  {
    id: 'guest_psychology',
    name: 'Gästpsykologi',
    icon: '🧍',
    color: '#FF6B9D',
    description: 'Psykologi bakom gästupplevelse, menybeteende och serviceinteraktion',
  },
  {
    id: 'service_pressure',
    name: 'Service Under Tryck',
    icon: '⚡',
    color: '#FF5555',
    description: 'Hantera stress, rush-situationer och kriser under service',
  },
];

export function getCategoryById(id: string): Category | undefined {
  return CATEGORIES.find(c => c.id === id);
}
