import { Badge } from '@/components/ui/badge';
import { Crown } from 'lucide-react';
import { getMemberBadgeText, getMemberBadgeColor, type MemberTier } from '@/lib/membership';

interface MemberBadgeProps {
  isMember: boolean;
  memberTier: MemberTier;
  size?: 'sm' | 'md' | 'lg';
}

export function MemberBadge({ isMember, memberTier, size = 'md' }: MemberBadgeProps) {
  if (!isMember || memberTier === 'free') {
    return null;
  }

  const badgeText = getMemberBadgeText(memberTier);
  const badgeColor = getMemberBadgeColor(memberTier);

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <Badge
      className={`${sizeClasses[size]} flex items-center gap-1`}
      style={{
        backgroundColor: badgeColor,
        color: memberTier === 'gold' ? '#78350F' : '#1F2937',
      }}
    >
      <Crown className="w-3 h-3" />
      {badgeText}
    </Badge>
  );
}
