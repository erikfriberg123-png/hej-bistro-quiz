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

export const IT_CATEGORIES: Category[] = [
  {
    id: 'programming',
    name: 'Programmering',
    icon: '💻',
    color: '#00FF64',
    description: 'Kod, algoritmer & tekniker',
  },
  {
    id: 'cloud_infra',
    name: 'Cloud & Infrastruktur',
    icon: '☁️',
    color: '#3A86FF',
    description: 'DevOps, drift & nätverk',
  },
  {
    id: 'cybersecurity',
    name: 'Cybersäkerhet',
    icon: '🔒',
    color: '#FF5555',
    description: 'Skydd, hot & sårbarheter',
  },
  {
    id: 'databases',
    name: 'Databaser',
    icon: '🗄️',
    color: '#E8B84B',
    description: 'SQL, NoSQL & datamodellering',
  },
  {
    id: 'ai_ml',
    name: 'AI & Maskininlärning',
    icon: '🧠',
    color: '#9B5DE5',
    description: 'Modeller, träning & tillämpningar',
  },
  {
    id: 'operating_systems',
    name: 'Operativsystem',
    icon: '🖥️',
    color: '#2EC4B6',
    description: 'Linux, Windows & systemarkitektur',
  },
  {
    id: 'web_apis',
    name: 'Webb & API:er',
    icon: '🌐',
    color: '#06D6A0',
    description: 'HTTP, REST, frontend & backend',
  },
  {
    id: 'app_development',
    name: 'Applikationsutveckling',
    icon: '📱',
    color: '#F15BB5',
    description: 'Appar, frameworks & livscykel',
  },
];

export const BLALJUS_CATEGORIES: Category[] = [
  { id: 'filmer_serier',        name: 'Filmer & serier',      icon: '🎬', color: '#1A5BFF', description: 'Blåljus på film och TV' },
  { id: 'spannande_fakta',      name: 'Spännande fakta',      icon: '⚡', color: '#FFD700', description: 'Häpnadsväckande fakta om blåljusyrken' },
  { id: 'lagar_regler',         name: 'Lagar & regler',       icon: '⚖️', color: '#5599FF', description: 'Lagar, förordningar och rätt' },
  { id: 'forsta_hjalpen',       name: 'Första hjälpen',       icon: '🩺', color: '#FF4D66', description: 'Akutvård och livräddning' },
  { id: 'brandbekampning',      name: 'Brandbekämpning',      icon: '🔥', color: '#FF6B35', description: 'Brand, teknik och säkerhet' },
  { id: 'polisarbete',          name: 'Polisarbete',          icon: '👮', color: '#3A86FF', description: 'Taktik, lag och ordning' },
  { id: 'akutvard_ambulans',    name: 'Akutvård & ambulans',  icon: '🚑', color: '#00E676', description: 'Medicin, ABC-protokoll och ambulanssjukvård' },
  { id: 'krisberedskap',        name: 'Krisberedskap',        icon: '🚨', color: '#FF1A3C', description: 'Larm, samverkan och krishantering' },
  { id: 'raddningsoperationer', name: 'Räddningsoperationer', icon: '🚒', color: '#FF8C00', description: 'Räddning och insatstaktik' },
  { id: 'trafiksakerhet',       name: 'Trafiksäkerhet',       icon: '🚦', color: '#FFB300', description: 'Trafik, regler och olyckor' },
];

export function getCategoriesForArea(area: Area): Category[] {
  if (area === 'sjukvard') return VOO_CATEGORIES;
  if (area === 'it') return IT_CATEGORIES;
  if (area === 'blaljus') return BLALJUS_CATEGORIES;
  return CATEGORIES;
}

export function getCategoryById(id: string): Category | undefined {
  return [...CATEGORIES, ...VOO_CATEGORIES, ...IT_CATEGORIES, ...BLALJUS_CATEGORIES].find(c => c.id === id);
}
