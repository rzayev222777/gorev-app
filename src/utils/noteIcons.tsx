import { Briefcase, Home, ShoppingCart, Lightbulb, Heart, Star, Zap, Coffee, Music, FileText, LucideIcon } from 'lucide-react';

export const NOTE_ICONS: Record<string, LucideIcon> = {
  'briefcase': Briefcase,
  'home': Home,
  'shopping-cart': ShoppingCart,
  'lightbulb': Lightbulb,
  'heart': Heart,
  'star': Star,
  'zap': Zap,
  'coffee': Coffee,
  'music': Music,
};

export const getNoteIcon = (iconId: string | null): LucideIcon => {
  if (!iconId || !NOTE_ICONS[iconId]) {
    return FileText;
  }
  return NOTE_ICONS[iconId];
};

export const NOTE_ICON_LIST = [
  { id: 'briefcase', icon: Briefcase, label: 'İş' },
  { id: 'home', icon: Home, label: 'Ev' },
  { id: 'shopping-cart', icon: ShoppingCart, label: 'Alışveriş' },
  { id: 'lightbulb', icon: Lightbulb, label: 'Fikir' },
  { id: 'heart', icon: Heart, label: 'Kişisel' },
  { id: 'star', icon: Star, label: 'Önemli' },
  { id: 'zap', icon: Zap, label: 'Acil' },
  { id: 'coffee', icon: Coffee, label: 'Sosyal' },
  { id: 'music', icon: Music, label: 'Hobi' },
];
