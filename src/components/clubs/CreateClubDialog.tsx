/**
 * T15 4.3.4 俱乐部 — 创建俱乐部弹窗
 */
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  validateClubName,
  validateClubDescription,
  charCountColor,
  CLUB_NAME_MAX_LEN,
  CLUB_DESC_MAX_LEN,
} from '@/lib/clubs';
import { useCreateClub } from '@/hooks/useClubs';
import { useToast } from '@/hooks/use-toast';

interface CreateClubDialogProps {
  onCreated?: (clubId: string) => void;
}

export default function CreateClubDialog({ onCreated }: CreateClubDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const { toast } = useToast();
  const createClub = useCreateClub();

  const handleSubmit = async () => {
    const nameErr = validateClubName(name);
    if (nameErr) {
      toast({ title: nameErr, variant: 'destructive' });
      return;
    }
    const descErr = validateClubDescription(description);
    if (descErr) {
      toast({ title: descErr, variant: 'destructive' });
      return;
    }

    try {
      const clubId = await createClub.mutateAsync({ name, description, isPublic });
      toast({ title: '俱乐部创建成功' });
      setOpen(false);
      setName('');
      setDescription('');
      setIsPublic(true);
      onCreated?.(clubId);
    } catch (err: any) {
      toast({ title: '创建失败', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          创建俱乐部
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>创建俱乐部</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {/* 名称 */}
          <div className="space-y-1.5">
            <Label htmlFor="club-name">俱乐部名称 *</Label>
            <div className="relative">
              <Input
                id="club-name"
                placeholder="2-30 个字符"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={CLUB_NAME_MAX_LEN}
              />
              <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-[10px] ${charCountColor(name.length, CLUB_NAME_MAX_LEN)}`}>
                {name.length}/{CLUB_NAME_MAX_LEN}
              </span>
            </div>
          </div>

          {/* 简介 */}
          <div className="space-y-1.5">
            <Label htmlFor="club-desc">简介（可选）</Label>
            <div className="relative">
              <Textarea
                id="club-desc"
                placeholder="介绍一下你的俱乐部..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={CLUB_DESC_MAX_LEN}
                className="resize-none"
                rows={3}
              />
              <span className={`absolute right-2 bottom-2 text-[10px] ${charCountColor(description.length, CLUB_DESC_MAX_LEN)}`}>
                {description.length}/{CLUB_DESC_MAX_LEN}
              </span>
            </div>
          </div>

          {/* 公开设置 */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>公开俱乐部</Label>
              <p className="text-xs text-muted-foreground">
                {isPublic ? '所有人可直接加入' : '需要审核才能加入'}
              </p>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={createClub.isPending || name.trim().length < 2}
          >
            {createClub.isPending ? '创建中...' : '创建'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
