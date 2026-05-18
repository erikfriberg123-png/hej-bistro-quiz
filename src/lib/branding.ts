export type Area = 'krogen' | 'sjukvard';

export interface AreaBranding {
  label: string;
  brandName: string;
  brandColor: string;
  icon: string;
  tagline: string;
  authTagline: string;
  storyButtonText: string;
  storyButtonIcon: string;
  storyTitle: string;
  storySubtitle: string;
  storyPlaceholder: string;
}

export const AREA_BRANDING: Record<Area, AreaBranding> = {
  krogen: {
    label: 'Hotel & Restaurang',
    brandName: 'Hej Bistro',
    brandColor: '#9B5DE5',
    icon: '🍺',
    tagline: 'Quiz för kroganställda',
    authTagline: 'Quiz för restaurangfolk',
    storyButtonText: 'Berätta en kroghistoria',
    storyButtonIcon: '🍽️',
    storyTitle: '🍽️ Berätta en kroghistoria',
    storySubtitle: 'Intressanta historier kan publiceras på sajten.',
    storyPlaceholder: 'Berätta en intressant händelse som du varit med om på restaurang.',
  },
  sjukvard: {
    label: 'Vård & Omsorg',
    brandName: 'Den vakna',
    brandColor: '#FF38A5',
    icon: '💗',
    tagline: 'Quiz för vårdpersonal',
    authTagline: 'Quiz för vårdpersonal',
    storyButtonText: 'Berätta en arbetshistoria',
    storyButtonIcon: '🏥',
    storyTitle: '🏥 Berätta en arbetshistoria',
    storySubtitle: 'Intressanta historier kan publiceras på sajten.',
    storyPlaceholder: 'Berätta en intressant händelse som du varit med om på jobbet.',
  },
};

export const DEFAULT_AREA: Area = 'krogen';

export const AREAS: Area[] = ['krogen', 'sjukvard'];
