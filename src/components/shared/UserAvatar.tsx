import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

type Props = {
  nickname: string;
  avatar?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-xl',
};

export default function UserAvatar({ nickname, avatar, size = 'md', className }: Props) {
  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {avatar && <img src={avatar} alt={nickname} className="object-cover" />}
      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
        {nickname.slice(0, 1)}
      </AvatarFallback>
    </Avatar>
  );
}
