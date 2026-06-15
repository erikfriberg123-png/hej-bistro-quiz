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

export const BILDSPEL_CATEGORY: CategoryDefinition = {
  id: 'bildspel',
  name: 'Bildspel',
  icon: '🖼️',
  color: '#64748B',
  description: 'Bildbaserade frågor – gissa vad som är på bilden.',
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
  BILDSPEL_CATEGORY,
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
  BILDSPEL_CATEGORY,
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
  BILDSPEL_CATEGORY,
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
  BILDSPEL_CATEGORY,
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
  BILDSPEL_CATEGORY,
]

// ---------------------------------------------------------------------------
// Bygg (bygg & konstruktion)
// ---------------------------------------------------------------------------
export const BYGG_CATEGORIES: CategoryDefinition[] = [
  { id: 'vvs_rordragning_varme_avlopp_och_ventilation',                    name: 'VVS',                      icon: '🔧', color: '#F5E0B0', description: 'Rördragning, värme, avlopp och ventilation.' },
  { id: 'arbetsmiljo_sakerhet',                                            name: 'Arbetsmiljö & Säkerhet',   icon: '⚠️', color: '#F5E0B0', description: 'Skyddsregler, AFS och riskbedömning på byggarbetsplatsen.' },
  { id: 'lyftteknik_maskiner_kranar_truckar_och_sakra_lyft',               name: 'Lyftteknik & Maskiner',    icon: '🏗️', color: '#F5E0B0', description: 'Kranar, truckar och säkra lyft.' },
  { id: 'mark_grundlaggning_schakt_sprangning_och_grundkonstruktion',      name: 'Mark & Grundläggning',     icon: '⛏️', color: '#F5E0B0', description: 'Schakt, sprängning och grundkonstruktion.' },
  { id: 'film_serier',                                                     name: 'Film & Serier',            icon: '🎬', color: '#F5E0B0', description: 'Filmer och serier om bygg och konstruktion.' },
  { id: 'el_och_watt_elektriker',                                          name: 'El & Watt',                icon: '🔌', color: '#F5E0B0', description: 'Elinstallationer och elektriker på byggarbetsplatsen.' },
  { id: 'betong_cement',                                                   name: 'Betong & Cement',          icon: '🧱', color: '#F5E0B0', description: 'Betongarbeten, gjutning och cementteknik.' },
  { id: 'snickare',                                                        name: 'Snickare',                 icon: '🪚', color: '#F5E0B0', description: 'Träarbeten, snickerier och träkonstruktioner.' },
  { id: 'malare',                                                          name: 'Målare',                   icon: '🎨', color: '#F5E0B0', description: 'Målningsarbeten, ytbehandling och färglära.' },
  { id: 'roligt_och_intressant',                                           name: 'Roligt och Intressant',   icon: '🤓', color: '#F5E0B0', description: 'Roliga fakta och klassiska historier från bygget.' },
  BILDSPEL_CATEGORY,
]

// ---------------------------------------------------------------------------
// HR Lön (HR & löneadministration)
// ---------------------------------------------------------------------------
export const HR_LON_CATEGORIES: CategoryDefinition[] = [
  { id: 'anstallning_och_personalregister',                        name: 'Anställning och personalregister',                    icon: '👤', color: '#d85118', description: 'Anställningsformer, personalregister och grundläggande HR-administration.' },
  { id: 'arbetstid_schema_och_narvaro',                            name: 'Arbetstid, schema och närvaro',                       icon: '🕒', color: '#d85118', description: 'Arbetstidsregler, schemaläggning och hantering av närvaro och frånvaro.' },
  { id: 'loneberakning_och_lonekorning',                           name: 'Löneberäkning och lönekörning',                       icon: '💰', color: '#d85118', description: 'Löneberäkning, lönekörning och utbetalningsprocesser.' },
  { id: 'semester_och_ledighet',                                   name: 'Semester och ledighet',                              icon: '🌴', color: '#d85118', description: 'Semesterregler, ledighetsansökningar och föräldraledighet.' },
  { id: 'kollektivavtal_och_arbetsratt',                           name: 'Kollektivavtal och arbetsrätt',                       icon: '⚖️', color: '#d85118', description: 'Kollektivavtal, LAS, MBL och grundläggande arbetsrätt.' },
  { id: 'skatt_arbetsgivaravgifter_och_myndighetsrapporterin',     name: 'Skatt, arbetsgivaravgifter och myndighetsrapportering', icon: '🏛️', color: '#d85118', description: 'Skatteavdrag, arbetsgivaravgifter och rapportering till Skatteverket.' },
  { id: 'ersattningar_och_formaner',                               name: 'Ersättningar och förmåner',                          icon: '🎁', color: '#d85118', description: 'Traktamente, förmåner, ersättningar och personalförmåner.' },
  { id: 'bemanning_och_personalplanering',                         name: 'Bemanning och personalplanering',                    icon: '📊', color: '#d85118', description: 'Bemanningsplanering, rekrytering och personalförsörjning.' },
  { id: 'rapporter_analys_och_uppfoljning',                        name: 'Rapporter, analys och uppföljning',                  icon: '📈', color: '#d85118', description: 'HR-rapporter, nyckeltal och uppföljning av personaldata.' },
  { id: 'system_integrationer_och_administration',                 name: 'System, integrationer och administration',           icon: '⚙️', color: '#d85118', description: 'HR-system, lönesystem, integrationer och systemadministration.' },
  { id: 'spannande_fakta_och_roligt',                              name: 'Spännande fakta och roligt',                         icon: '🤓', color: '#d85118', description: 'Roliga fakta, klassiska HR-situationer och branschhumor.' },
  BILDSPEL_CATEGORY,
]

// ---------------------------------------------------------------------------
// Fotboll
// ---------------------------------------------------------------------------
export const FOTBOLL_CATEGORIES: CategoryDefinition[] = [
  { id: 'vm_historia',               name: 'VM‑historia',                 icon: '🏆', color: '#0EA5E9', description: 'Frågor om VM-turneringar och fotbollshistoria.' },
  { id: 'champions_league',          name: 'Champions League',            icon: '⭐', color: '#0EA5E9', description: 'Europas finaste klubbturnering — matcher, mål och myter.' },
  { id: 'svensk_fotboll',            name: 'Svensk fotboll',              icon: '📌', color: '#0EA5E9', description: 'Allsvenskan, landslaget och svenska fotbollsklubbar.' },
  { id: 'fotbollslegender',          name: 'Fotbollslegender',            icon: '👑', color: '#0EA5E9', description: 'De stora namnen som format fotbollens historia.' },
  { id: 'taktik_formationer',        name: 'Taktik & formationer',        icon: '📋', color: '#0EA5E9', description: 'Spelsystem, formationer och fotbollstaktik.' },
  { id: 'domarregler_regelkunskap',  name: 'Domarregler & regelkunskap',  icon: '🟥', color: '#0EA5E9', description: 'Offside, straff, regler och domarrollen.' },
  { id: 'klubbmarken_arenor',        name: 'Klubbmärken & arenor',        icon: '🛡️', color: '#0EA5E9', description: 'Klubbfärger, arenor och fotbollsmärken världen över.' },
  { id: 'transfers_fotbollsekonomi', name: 'Transfers & fotbollsekonomi', icon: '💰', color: '#0EA5E9', description: 'Transferrekord, agenter och ekonomi i professionell fotboll.' },
  { id: 'statistik_rekord',          name: 'Statistik & rekord',          icon: '📊', color: '#0EA5E9', description: 'Målrekord, flest matcher och andra fotbollsstatistiker.' },
  { id: 'fotbollskultur',            name: 'Fotbollskultur',              icon: '🧣', color: '#0EA5E9', description: 'Supporterkulturen, sånger och fotbollens sociala sida.' },
  { id: 'roligt_spannande',          name: 'Roligt & Spännande',          icon: '🤣', color: '#0EA5E9', description: 'Roliga fakta, klassiska ögonblick och spännande historier från fotbollen.' },
  BILDSPEL_CATEGORY,
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
  hr_lon:  HR_LON_CATEGORIES,
  bygg:    BYGG_CATEGORIES,
  fotboll: FOTBOLL_CATEGORIES,
}

const _allWithDupes: CategoryDefinition[] = [
  ...QUIZINE_CATEGORIES,
  ...VOO_CATEGORIES,
  ...IT_CATEGORIES,
  ...BLALJUS_CATEGORIES,
  ...HANDEL_CATEGORIES,
  ...HR_LON_CATEGORIES,
  ...BYGG_CATEGORIES,
  ...FOTBOLL_CATEGORIES,
]
export const ALL_CATEGORIES: CategoryDefinition[] = _allWithDupes.filter(
  (c, i, arr) => arr.findIndex(x => x.id === c.id) === i,
)

export function getCategoriesForSegment(segmentId: string): CategoryDefinition[] {
  return SEGMENT_CATEGORIES[segmentId] ?? QUIZINE_CATEGORIES
}

export function getCategoryById(id: string): CategoryDefinition | undefined {
  return ALL_CATEGORIES.find(c => c.id === id)
}
