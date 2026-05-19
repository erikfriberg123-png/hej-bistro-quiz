import { Category } from '../types';
import { type Area } from '../lib/branding';

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

export const VOO_CATEGORIES: Category[] = [
  {
    id: 'anatomy_body',
    name: 'Anatomi & Kroppen',
    icon: '🫀',
    color: '#FF6B35',
    description: 'Kroppens organ, system och funktioner',
  },
  {
    id: 'diagnoses_symptoms',
    name: 'Diagnoser & Symtom',
    icon: '🩺',
    color: '#9B5DE5',
    description: 'Sjukdomstillstånd, symtom och diagnostik',
  },
  {
    id: 'emergency_firstaid',
    name: 'Akut & Första hjälpen',
    icon: '🚨',
    color: '#FF5555',
    description: 'Akutvård, HLR och livräddande åtgärder',
  },
  {
    id: 'ethics_communication',
    name: 'Etik & Kommunikation',
    icon: '🤝',
    color: '#2EC4B6',
    description: 'Vårdrelationer, sekretess och bemötande',
  },
  {
    id: 'infections_hygiene',
    name: 'Infektioner & Hygien',
    icon: '🦠',
    color: '#06D6A0',
    description: 'Smittspridning, vårdhygien och skyddsåtgärder',
  },
  {
    id: 'medical_history',
    name: 'Medicinsk Historia',
    icon: '📚',
    color: '#E8B84B',
    description: 'Medicinska genombrott och historiska milstolpar',
  },
  {
    id: 'medications_pharma',
    name: 'Läkemedel & Farmakologi',
    icon: '💊',
    color: '#3A86FF',
    description: 'Läkemedelsgrupper, verkningsmekanismer och biverkningar',
  },
  {
    id: 'popculture_healthcare',
    name: 'Populärkultur & Vård',
    icon: '🌟',
    color: '#F15BB5',
    description: 'Kända läkare, TV-serier och vård i media',
  },
  {
    id: 'psychiatry_psychology',
    name: 'Psykiatri & Psykologi',
    icon: '🧠',
    color: '#8B2FC9',
    description: 'Psykiska tillstånd, behandlingsmetoder och psykologi',
  },
];

export function getCategoriesForArea(area: Area): Category[] {
  return area === 'sjukvard' ? VOO_CATEGORIES : CATEGORIES;
}

export function getCategoryById(id: string): Category | undefined {
  return [...CATEGORIES, ...VOO_CATEGORIES].find(c => c.id === id);
}
