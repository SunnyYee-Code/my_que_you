/**
 * T15 4.3.5 长期局 — 创建长期局弹窗
 */
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  RECURRING_GAME_TITLE_MAX,
  RECURRING_GAME_DESC_MAX,
  WEEKDAY_OPTIONS,
  charCountColor,
  validateGameTitle,
  validateGameDescription,
  validateStartTime,
} from '@/lib/recurring-games';
import { useCreateRecurringGame } from '@/hooks/useRecurringGames';
import { useToast } from '@/hooks/use-toast';

interface CreateRecurringGameDialogProps {
  onCreated?: (gameId: string) => void;
}

export default function CreateRecurringGameDialog({ onCreated }: CreateRecurringGameDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationName, setLocationName] = useState('');
  const [weekday, setWeekday] = useState<number>(5); // 默认周五
  const [startTime, setStartTime] = useState('19:00');
  const [maxMembers, setMaxMembers] = useState<number>(4);

  const { toast } = useToast();
  const createGame = useCreateRecurringGame();

  const titleError = title ? validateGameTitle(title) : null;
  const descError = description ? validateGameDescription(description) : null;
  const timeError = startTime ? validateStartTime(startTime) : null;

  const canSubmit =
    title.trim().length >= 2 &&
    !titleError &&
    !descError &&
    !timeError &&
    !createGame.isPending;

  const handleSubmit = async () => {
    const err = validateGameTitle(title) || validateStartTime(startTime);
    if (err) { toast({ title: err, variant: 'destructive' }); return; }
    try {
      const id = await createGame.mutateAsync({
        title,
        description: description || undefined,
        locationName: locationName || undefined,
        weekday,
        startTime,
        maxMembers,
      });
      toast({ title: '长期局已创建' });
      setOpen(false);
      resetForm();
      onCreated?.(id);
    } catch (err: any) {
      toast({ title: '创建失败', description: err.message, variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setLocationName('');
    setWeekday(5);
    setStartTime('19:00');
    setMaxMembers(4);
  };

  return (
    <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          创建长期局
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>创建长期局</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* 局名 */}
          <div className="space-y-1.5">
            <Label htmlFor="game-title">局名 <span className="text-destructive">*</span></Label>
            <Input
              id="game-title"
              placeholder="如「周五晚固定局」"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={RECURRING_GAME_TITLE_MAX}
            />
            <div className="flex justify-between">
              {titleError ? (
                <span className="text-xs text-destructive">{titleError}</span>
              ) : <span />}
              <span className={`text-xs ${charCountColor(title.length, RECURRING_GAME_TITLE_MAX)}`}>
                {title.length}/{RECURRING_GAME_TITLE_MAX}
              </span>
            </div>
          </div>

          {/* 时间设置 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>每周几 <span className="text-destructive">*</span></Label>
              <Select
                value={String(weekday)}
                onValueChange={v => setWeekday(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEEKDAY_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={String(opt.value)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="start-time">开局时间 <span className="text-destructive">*</span></Label>
              <Input
                id="start-time"
                placeholder="19:00"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
              />
              {timeError && <span className="text-xs text-destructive">{timeError}</span>}
            </div>
          </div>

          {/* 人数上限 */}
          <div className="space-y-1.5">
            <Label>固定人数上限</Label>
            <Select
              value={String(maxMembers)}
              onValueChange={v => setMaxMembers(Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2, 3, 4, 5, 6, 7, 8].map(n => (
                  <SelectItem key={n} value={String(n)}>{n} 人</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 地点 */}
          <div className="space-y-1.5">
            <Label htmlFor="location">地点（可选）</Label>
            <Input
              id="location"
              placeholder="如「XX 棋牌室」"
              value={locationName}
              onChange={e => setLocationName(e.target.value)}
            />
          </div>

          {/* 简介 */}
          <div className="space-y-1.5">
            <Label htmlFor="description">简介（可选）</Label>
            <Textarea
              id="description"
              placeholder="玩法偏好、规则说明等…"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              maxLength={RECURRING_GAME_DESC_MAX}
            />
            <div className="flex justify-end">
              <span className={`text-xs ${charCountColor(description.length, RECURRING_GAME_DESC_MAX)}`}>
                {description.length}/{RECURRING_GAME_DESC_MAX}
              </span>
            </div>
          </div>

          <Button
            className="w-full"
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            {createGame.isPending ? '创建中…' : '创建长期局'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
