export type Area = 'krogen' | 'sjukvard' | 'it' | 'blaljus' | 'handel' | 'hr_lon' | 'bygg';

export interface AreaBranding {
  label: string;
  brandName: string;
  brandColor: string;
  neonLine: string;
  icon: string;
  tagline: string;
  authTagline: string;
  storyButtonText: string;
  storyButtonIcon: string;
  storyTitle: string;
  storySubtitle: string;
  storyPlaceholder: string;
  dailyPath: string;
  disabled?: boolean;
}

export const AREA_BRANDING: Record<Area, AreaBranding> = {
  krogen: {
    label: 'Hotell och Restaurang',
    brandName: 'Hej Bistro',
    brandColor: '#9B5DE5',
    neonLine: 'Quizine',
    icon: '🍺',
    tagline: 'Quizet för Hotell & Restaurang',
    authTagline: 'Quiz för restaurangfolk',
    storyButtonText: 'Berätta en kroghistoria',
    storyButtonIcon: '🍽️',
    storyTitle: '🍽️ Berätta en kroghistoria',
    storySubtitle: 'Intressanta historier kan publiceras på sajten.',
    storyPlaceholder: 'Berätta en intressant händelse som du varit med om på restaurang.',
    dailyPath: 'quizine',
  },
  sjukvard: {
    label: 'Vård och omsorg',
    brandName: 'Den vakna',
    brandColor: '#36E0E0',
    neonLine: '~ alltid i tjänst ~',
    icon: '💗',
    tagline: 'Quiz för vårdpersonal',
    authTagline: 'Quiz för vårdpersonal',
    storyButtonText: 'Berätta en arbetshistoria',
    storyButtonIcon: '🏥',
    storyTitle: '🏥 Berätta en arbetshistoria',
    storySubtitle: 'Intressanta historier kan publiceras på sajten.',
    storyPlaceholder: 'Berätta en intressant händelse som du varit med om på jobbet.',
    dailyPath: 'voo',
  },
  it: {
    label: 'IT & Software',
    brandName: 'IT',
    brandColor: '#00FF64',
    neonLine: '~ hello world ~',
    icon: '💻',
    tagline: 'Quiz för er som jobbar med mjukvara och IT',
    authTagline: 'Quiz för IT-proffs',
    storyButtonText: 'Berätta en arbetsrelaterad händelse',
    storyButtonIcon: '💻',
    storyTitle: '💻 Berätta en arbetsrelaterad händelse',
    storySubtitle: 'Intressanta historier kan publiceras på sajten.',
    storyPlaceholder: 'Berätta en intressant händelse som du varit med om på jobbet.',
    dailyPath: 'it',
    disabled: true,
  },
  blaljus: {
    label: 'Blåljuspersonal',
    brandName: 'Blåljus',
    brandColor: '#1A5BFF',
    neonLine: '~ alltid på plats ~',
    icon: '🚨',
    tagline: 'Quiz för polis, brand och ambulans',
    authTagline: 'Quiz för blåljuspersonal',
    storyButtonText: 'Berätta en historia',
    storyButtonIcon: '🚨',
    storyTitle: '🚨 Berätta en historia',
    storySubtitle: 'Intressanta historier kan publiceras på sajten.',
    storyPlaceholder: 'Berätta en intressant händelse som du varit med om på jobbet.',
    dailyPath: 'blaljus',
    disabled: true,
  },
  handel: {
    label: 'Handel & Butik',
    brandName: 'Handel',
    brandColor: '#FF6B2B',
    neonLine: '~ öppet för affärer ~',
    icon: '🛒',
    tagline: 'Quiz för dig som jobbar i butik',
    authTagline: 'Quiz för butikspersonal',
    storyButtonText: 'Berätta en historia från butiken',
    storyButtonIcon: '🛒',
    storyTitle: '🛒 Berätta en historia från butiken',
    storySubtitle: 'Intressanta historier kan publiceras på sajten.',
    storyPlaceholder: 'Berätta en intressant händelse som du varit med om i butiken.',
    dailyPath: 'handel',
    disabled: true,
  },
  hr_lon: {
    label: 'HR & Lön',
    brandName: 'HR Lön',
    brandColor: '#d85118',
    neonLine: '~ lön & arbetsrätt ~',
    icon: '👩‍💼',
    tagline: 'Quiz för HR-proffs och löneadministratörer',
    authTagline: 'Quiz för HR-proffs och löneadministratörer',
    storyButtonText: 'Berätta en HR-historia',
    storyButtonIcon: '👩‍💼',
    storyTitle: '👩‍💼 Berätta en HR-historia',
    storySubtitle: 'Intressanta historier kan publiceras på sajten.',
    storyPlaceholder: 'Berätta en intressant händelse som du varit med om på jobbet.',
    dailyPath: 'hr_lon',
  },
  bygg: {
    label: 'Bygg & Konstruktion',
    brandName: 'Bygg',
    brandColor: '#F5E0B0',
    neonLine: '~ alltid på bygget ~',
    icon: '🏗️',
    tagline: 'Quiz för byggare och hantverkare',
    authTagline: 'Quiz för byggare och hantverkare',
    storyButtonText: 'Berätta en bygghistoria',
    storyButtonIcon: '🏗️',
    storyTitle: '🏗️ Berätta en bygghistoria',
    storySubtitle: 'Intressanta historier kan publiceras på sajten.',
    storyPlaceholder: 'Berätta en intressant händelse som du varit med om på bygget.',
    dailyPath: 'bygg',
    disabled: true,
  },
};

export const DEFAULT_AREA: Area = 'krogen';

export const AREAS: Area[] = ['krogen', 'sjukvard', 'it', 'blaljus', 'handel', 'hr_lon', 'bygg'];
