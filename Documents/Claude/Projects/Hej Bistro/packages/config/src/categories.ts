/**
 * Shared category definitions for all segments.
 *
 * When adding a new segment, add its category array here and
 * a case in getCategoriesForSegment().  The daily app, mobile app,
 * and admin all derive their category lists from this file.
 *
 * Field notes:
 *  - icon  : emoji character (maps to 'emoji' in the daily app)
 *  - color : hex accent color for admin/mobile UI
 *  - description : full sentence description (maps to 'desc' in daily)
 */

export interface CategoryDefinition {
  id: string
  name: string
  icon: string
  color: string
  description: string
}

// ---------------------------------------------------------------------------
// Quizine (krogen / hotell & restaurang)
// ---------------------------------------------------------------------------
export const QUIZINE_CATEGORIES: CategoryDefinition[] = [
  { id: 'food',             name: 'Mat',                 icon: '🍔', color: '#FF6B35', description: 'Testa dina kunskaper om mat, råvaror och matlagning' },
  { id: 'drink',            name: 'Dryck',               icon: '🍷', color: '#8B2FC9', description: 'Testa dina kunskaper om vin, cocktails, kaffe och andra drycker' },
  { id: 'famous_profiles',  name: 'Kända profiler',      icon: '🌟', color: '#E8B84B', description: 'Kockar, TV-profiler och restauratörer som format matvärlden' },
  { id: 'professional',     name: 'Professionellt',      icon: '👨‍🍳', color: '#F7C948', description: 'Yrkeskunskap, köksteknik och branschtermer' },
  { id: 'service_guests',   name: 'Service & Gäster',    icon: '🤝', color: '#2EC4B6', description: 'Gästhantering, service och situationer i salen' },
  { id: 'industry_culture', name: 'Branschkultur',       icon: '🏆', color: '#9B5DE5', description: 'Historia, traditioner och branschens kultur' },
  { id: 'fun_reallife',     name: 'Kul & Vardag',        icon: '😄', color: '#F15BB5', description: 'Vardagen på krogen och roliga händelser' },
  { id: 'labor_law',        name: 'Avtal & Lag',         icon: '⚖️', color: '#3A86FF', description: 'Arbetsrätt, kollektivavtal och lagar för restaurangbranschen' },
  { id: 'food_cost',        name: 'Kostnad & Lönsamhet', icon: '🧾', color: '#06D6A0', description: 'Food cost, kalkyl och lönsamhetstänk' },
  { id: 'scheduling_labor', name: 'Schema & Personal',   icon: '⏱️', color: '#FFB347', description: 'Schemaläggning, bemanningsplanering och personalfrågor' },
  { id: 'guest_psychology', name: 'Gästpsykologi',       icon: '🧍', color: '#FF6B9D', description: 'Gästbeteende, upplevelse och psykologin bakom kundmötet' },
  { id: 'service_pressure', name: 'Service Under Tryck', icon: '⚡', color: '#FF4757', description: 'Att hålla servicenivån uppe när trycket är högt' },
]

// ---------------------------------------------------------------------------
// VOO (vård & omsorg)
// ---------------------------------------------------------------------------
export const VOO_CATEGORIES: CategoryDefinition[] = [
  { id: 'anatomy_body',          name: 'Anatomi & Kroppen',                     icon: '🫀', color: '#E63946', description: 'Frågor om organ, muskler, skelett, nervsystem och kroppens funktioner.' },
  { id: 'emergency_firstaid',    name: 'Akutvård & Första hjälpen',             icon: '🚑', color: '#F4A261', description: 'HLR, triage, ambulansfall, akuta symptom och livräddande insatser.' },
  { id: 'diagnoses_symptoms',    name: 'Diagnoser & Symptom',                   icon: '🩺', color: '#E76F51', description: 'Känna igen sjukdomar utifrån symptom och patientfall.' },
  { id: 'medications_pharma',    name: 'Läkemedel & Farmakologi',               icon: '💊', color: '#2A9D8F', description: 'Vanliga mediciner, biverkningar, dosering och läkemedelsnamn.' },
  { id: 'psychiatry_psychology', name: 'Psykiatri & Psykologi',                 icon: '🧠', color: '#8338EC', description: 'Psykisk hälsa, diagnoser, beteenden, terapi och hjärnan.' },
  { id: 'healthcare_humor',      name: 'Vårdhumor & Klassiker från jobbet',     icon: '😷', color: '#06D6A0', description: 'Typiska patientcitat, interna vårdskämt och igenkänning från vardagen.' },
  { id: 'medical_history',       name: 'Medicinsk Historia & Upptäckter',       icon: '🏛️', color: '#3A86FF', description: 'Kända läkare, historiska genombrott och gamla behandlingsmetoder.' },
  { id: 'infections_hygiene',    name: 'Infektioner, Virus & Hygien',           icon: '🦠', color: '#FB5607', description: 'Smittspridning, bakterier, hygienrutiner och pandemier.' },
  { id: 'ethics_communication',  name: 'Etik, Kommunikation & Bemötande',      icon: '🤝', color: '#FFB347', description: 'Patientmöten, svåra samtal, sekretess och etiska dilemman.' },
  { id: 'popculture_healthcare', name: 'TV-serier, Film & Popkultur inom vård', icon: '🎬', color: '#FF6B9D', description: "Grey's Anatomy, Scrubs, House, medicinska myter i film och TV." },
]

// ---------------------------------------------------------------------------
// IT (IT & Software)
// ---------------------------------------------------------------------------
export const IT_CATEGORIES: CategoryDefinition[] = [
  { id: 'programming',       name: 'Programmering',           icon: '💻', color: '#00FF64', description: 'Kod, algoritmer, designmönster och programmeringsspråk.' },
  { id: 'cloud_infra',       name: 'Cloud & Infrastruktur',   icon: '☁️', color: '#00CC50', description: 'DevOps, Kubernetes, CI/CD, nätverk och driftsättning.' },
  { id: 'cybersecurity',     name: 'Cybersäkerhet',           icon: '🔒', color: '#00FF64', description: 'Skydd, hot, sårbarheter, kryptering och säkerhetsprotokoll.' },
  { id: 'databases',         name: 'Databaser',               icon: '🗄️', color: '#00CC50', description: 'SQL, NoSQL, datamodellering och frågeoptimerring.' },
  { id: 'ai_ml',             name: 'AI & Maskininlärning',    icon: '🧠', color: '#00FF64', description: 'ChatGPT, stora språkmodeller, neurala nätverk, promptning och AI-verktyg i vardagen.' },
  { id: 'operating_systems', name: 'Operativsystem',          icon: '🖥️', color: '#00CC50', description: 'Linux, Windows, systemarkitektur och processer.' },
  { id: 'web_apis',          name: 'Webb & API:er',           icon: '🌐', color: '#00FF64', description: 'HTTP, REST, GraphQL, frontend och backend.' },
  { id: 'app_development',   name: 'Applikationsutveckling',  icon: '📱', color: '#00CC50', description: 'Appar, frameworks, livscykel och arkitektur.' },
  { id: 'tools_workflow',    name: 'Verktyg & Arbetsflöde',   icon: '🛠️', color: '#00FF64', description: 'Git, versionshantering, IDE:er, agile/scrum och felsökning.' },
  { id: 'tech_history',      name: 'Teknikhistoria & Kultur', icon: '🏛️', color: '#00CC50', description: 'Kända företag, uppfinnare, banbrytande produkter och branschmilstolpar.' },
  { id: 'fun_culture',       name: 'Roligt & Kultur',         icon: '😄', color: '#00FF64', description: 'Techhumor, memes, kända citat från programmerare och roliga IT-katastrofer.' },
]

// ---------------------------------------------------------------------------
// Blåljus (polis, brand & ambulans)
// ---------------------------------------------------------------------------
export const BLALJUS_CATEGORIES: CategoryDefinition[] = [
  { id: 'filmer_serier',        name: 'Filmer & serier',       icon: '🎬', color: '#1A5BFF', description: 'Filmer och serier om blåljusyrken.' },
  { id: 'spannande_fakta',      name: 'Spännande fakta',       icon: '⚡', color: '#FFD700', description: 'Spännande fakta om polis, brand och ambulans.' },
  { id: 'lagar_regler',         name: 'Lagar & regler',        icon: '⚖️', color: '#5599FF', description: 'Lagar, regelverk och befogenheter för blåljuspersonal.' },
  { id: 'forsta_hjalpen',       name: 'Första hjälpen',        icon: '🩺', color: '#FF4D66', description: 'Akutvård, HLR och livräddande insatser i fält.' },
  { id: 'brandbekampning',      name: 'Brandbekämpning',       icon: '🔥', color: '#FF6B35', description: 'Teknik, taktik och säkerhet vid brandsläckning.' },
  { id: 'polisarbete',          name: 'Polisarbete',           icon: '👮', color: '#3A86FF', description: 'Utredning, ingripanden och polisarbetets vardag.' },
  { id: 'akutvard_ambulans',    name: 'Akutvård & ambulans',   icon: '🚑', color: '#00E676', description: 'Prehospital vård, triagering och ambulanssjukvård.' },
  { id: 'krisberedskap',        name: 'Krisberedskap',         icon: '🚨', color: '#FF1A3C', description: 'Samordning, krishantering och samverkan vid stora insatser.' },
  { id: 'raddningsoperationer', name: 'Räddningsoperationer',  icon: '🚒', color: '#FF8C00', description: 'Räddningsteknik, fritagning och insatsledning.' },
  { id: 'trafiksakerhet',       name: 'Trafiksäkerhet',        icon: '🚦', color: '#FFB300', description: 'Trafikregler, olycksutredning och trafiksäkerhetsarbete.' },
]

// ---------------------------------------------------------------------------
// Handel (Handel & Butik)
// ---------------------------------------------------------------------------
export const HANDEL_CATEGORIES: CategoryDefinition[] = [
  { id: 'kundservice',          name: 'Kundservice',          icon: '🤝', color: '#FF6B2B', description: 'Bemötande, reklamationer, service och kundrelationer i butiken.' },
  { id: 'kassa_betalning',      name: 'Kassa & betalning',    icon: '💳', color: '#FF9A5E', description: 'Kassasystem, betalsätt, självscanning och kvitthantering.' },
  { id: 'arbetsratt',           name: 'Arbetsrätt',           icon: '⚖️', color: '#FFB830', description: 'Lagar, kollektivavtal och rättigheter för butikspersonal.' },
  { id: 'lager_logistik',       name: 'Lager och logistik',   icon: '📦', color: '#FF9A5E', description: 'Varuflöde, lagerhållning, påfyllning och inventering.' },
  { id: 'forsaljningsteknik',   name: 'Försäljningsteknik',   icon: '💼', color: '#FF6B2B', description: 'Merförsäljning, rådgivning och säljpsykologi i butik.' },
  { id: 'forlustforebyggande',  name: 'Förlustförebyggande',  icon: '🔒', color: '#FFB830', description: 'Stöldskydd, svinn, säkerhetsrutiner och förlustanalys.' },
  { id: 'detaljhandelsekonomi', name: 'Detaljhandelsekonomi', icon: '💰', color: '#FF9A5E', description: 'Marginaler, prissättning, lönsamhet och nyckeltal i butik.' },
  { id: 'halsa_sakerhet',       name: 'Hälsa & Säkerhet',     icon: '🦺', color: '#FF6B2B', description: 'Ergonomi, arbetsmiljö, brand och säkerhet i butiksmiljö.' },
  { id: 'produktkunskap',       name: 'Produktkunskap',       icon: '🏷️', color: '#FFB830', description: 'Sortiment, varuegenskaper och produktrelaterad rådgivning.' },
  { id: 'roligt',               name: 'Roligt',               icon: '😄', color: '#FF9A5E', description: 'Roliga situationer och klassiska stunder från butiksgolvet.' },
]

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

const SEGMENT_CATEGORIES: Record<string, CategoryDefinition[]> = {
  quizine: QUIZINE_CATEGORIES,
  voo:     VOO_CATEGORIES,
  it:      IT_CATEGORIES,
  blaljus: BLALJUS_CATEGORIES,
  handel:  HANDEL_CATEGORIES,
}

export const ALL_CATEGORIES: CategoryDefinition[] = [
  ...QUIZINE_CATEGORIES,
  ...VOO_CATEGORIES,
  ...IT_CATEGORIES,
  ...BLALJUS_CATEGORIES,
  ...HANDEL_CATEGORIES,
]

export function getCategoriesForSegment(segmentId: string): CategoryDefinition[] {
  return SEGMENT_CATEGORIES[segmentId] ?? QUIZINE_CATEGORIES
}

export function getCategoryById(id: string): CategoryDefinition | undefined {
  return ALL_CATEGORIES.find(c => c.id === id)
}
