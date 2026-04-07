import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import UserAvatar from '@/components/shared/UserAvatar';
import CreditBadge from '@/components/shared/CreditBadge';
import LoadingState from '@/components/shared/LoadingState';
import EmptyState from '@/components/shared/EmptyState';
import {
  useFrequentPartners,
  useAddPartnerTag,
  useRemovePartnerTag,
  PARTNER_TAG_OPTIONS,
  type FrequentPartner,
} from '@/hooks/useCoParticipation';
import { useToast } from '@/hooks/use-toast';
import { MessageCircle, Tag, Users, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

function TagManageDialog({
  partner,
  open,
  onClose,
}: {
  partner: FrequentPartner;
  open: boolean;
  onClose: () => void;
}) {
  const addTag = useAddPartnerTag();
  const removeTag = useRemovePartnerTag();
  const { toast } = useToast();

  const handleToggleTag = async (tag: string) => {
    const hasTag = partner.tags.includes(tag);
    try {
      if (hasTag) {
        await removeTag.mutateAsync({ partnerId: partner.userId, tag });
      } else {
        if (partner.tags.length >= 3) {
          toast({ title: '最多添加 3 个标签', variant: 'destructive' });
          return;
        }
        await addTag.mutateAsync({ partnerId: partner.userId, tag });
      }
    } catch (err: any) {
      toast({ title: '操作失败', description: err.message, variant: 'destructive' });
    }
  };

  const isPending = addTag.isPending || removeTag.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>给 {partner.nickname} 打标签</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">标签仅自己可见，最多选 3 个</p>
        <div className="flex flex-wrap gap-2 py-2">
          {PARTNER_TAG_OPTIONS.map((tag) => {
            const active = partner.tags.includes(tag);
            return (
              <button
                key={tag}
                disabled={isPending}
                onClick={() => handleToggleTag(tag)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-muted-foreground hover:border-primary hover:text-primary'
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PartnerCard({ partner }: { partner: FrequentPartner }) {
  const navigate = useNavigate();
  const [showTagDialog, setShowTagDialog] = useState(false);

  const relativeTime = partner.lastTogetherAt
    ? formatDistanceToNow(new Date(partner.lastTogetherAt), { addSuffix: true, locale: zhCN })
    : null;

  return (
    <>
      <Card>
        <CardContent className="p-3 flex items-center gap-3">
          <div className="cursor-pointer shrink-0" onClick={() => navigate(`/profile/${partner.userId}`)}>
            <UserAvatar nickname={partner.nickname} avatar={partner.avatarUrl || undefined} size="md" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{partner.nickname}</p>
            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
              <CreditBadge score={partner.creditScore} />
              <span className="text-xs text-muted-foreground">
                共局 {partner.coCount} 次
              </span>
              {relativeTime && (
                <span className="text-xs text-muted-foreground">{relativeTime}</span>
              )}
            </div>
            {partner.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {partner.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="h-4 px-1.5 text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => navigate(`/dm/${partner.userId}`)}
            title="发消息"
          >
            <MessageCircle className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => setShowTagDialog(true)}
            title="打标签"
          >
            <Tag className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
      <TagManageDialog
        partner={partner}
        open={showTagDialog}
        onClose={() => setShowTagDialog(false)}
      />
    </>
  );
}

export default function FrequentPartnersSection() {
  const { data: partners = [], isLoading } = useFrequentPartners();

  if (isLoading) return <LoadingState />;

  if (partners.length === 0) {
    return (
      <EmptyState
        icon={<Users className="h-12 w-12" />}
        title="暂无共局记录"
        description="参与并完成拼团后，会自动沉淀常约牌友"
      />
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground px-1">
        共 {partners.length} 位牌友 · 按共局次数排序 · 标签仅自己可见
      </p>
      {partners.map((partner) => (
        <PartnerCard key={partner.userId} partner={partner} />
      ))}
    </div>
  );
}
