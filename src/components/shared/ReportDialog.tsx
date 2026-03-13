import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Flag } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const REPORT_REASONS = [
  '言语不当',
  '恶意爽约',
  '赌博行为',
  '虚假信息',
  '骚扰他人',
  '其他',
];

type Props = {
  reportedId: string;
  groupId?: string;
  trigger?: React.ReactNode;
};

export default function ReportDialog({ reportedId, groupId, trigger }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [detail, setDetail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!user || user.id === reportedId) return null;

  const handleSubmit = async () => {
    if (!reason) {
      toast({ title: '请选择举报原因', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('reports' as any).insert({
        reporter_id: user.id,
        reported_id: reportedId,
        group_id: groupId || null,
        reason,
        detail: detail.trim() || null,
      });
      if (error) throw error;
      toast({ title: '举报已提交', description: '我们会尽快审核处理' });
      setOpen(false);
      setReason('');
      setDetail('');
    } catch (err: any) {
      toast({ title: '提交失败', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
            <Flag className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>举报用户</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">举报原因</p>
            <div className="flex flex-wrap gap-2">
              {REPORT_REASONS.map(r => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm border transition-colors',
                    reason === r
                      ? 'bg-destructive/10 border-destructive/40 text-destructive font-medium'
                      : 'border-border hover:bg-muted'
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">补充说明 <span className="text-muted-foreground font-normal">(选填)</span></p>
            <Textarea
              placeholder="请描述具体情况..."
              value={detail}
              onChange={e => setDetail(e.target.value)}
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground text-right">{detail.length}/200</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="destructive" onClick={handleSubmit} disabled={submitting || !reason}>
            {submitting ? '提交中...' : '提交举报'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
