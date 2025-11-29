import {
  Cat, Dog, Bird, Fish, Rabbit, Squirrel, User,
  PawPrint, Bug, Crown, Snail, Shell, BookOpen
} from 'lucide-react';

type AvatarIconProps = {
  avatarId: string | null;
  size?: number;
  className?: string;
};

const AVATAR_ICONS: Record<string, any> = {
  cat: Cat,
  dog: Dog,
  bird: Bird,
  fish: Fish,
  rabbit: Rabbit,
  squirrel: Squirrel,
  paw: PawPrint,
  bug: Bug,
  lion: Crown,
  snail: Snail,
  shell: Shell,
  book: BookOpen,
};

export const AvatarIcon = ({ avatarId, size = 32, className = '' }: AvatarIconProps) => {
  const IconComponent = avatarId && avatarId in AVATAR_ICONS
    ? AVATAR_ICONS[avatarId]
    : User;

  return <IconComponent size={size} className={className} />;
};
