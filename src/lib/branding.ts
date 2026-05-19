export type Area = 'krogen' | 'sjukvard';

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
};

export const DEFAULT_AREA: Area = 'krogen';

export const AREAS: Area[] = ['krogen', 'sjukvard'];
