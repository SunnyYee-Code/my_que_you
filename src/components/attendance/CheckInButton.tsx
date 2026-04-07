import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useCheckIn } from '@/hooks/useAttendanceFulfillment';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

interface CheckInButtonProps {
  groupId: string;
  userId?: string;
  onSuccess?: () => void;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

/**
 * 签到按钮组件
 * 支持点击确认签到或未到场
 */
export function CheckInButton({
  groupId,
  userId,
  onSuccess,
  variant = 'default',
  size = 'default',
}: CheckInButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<'checked_in' | 'not_checked_in' | null>(null);
  const { mutate: checkIn, isPending } = useCheckIn();
  const { toast } = useToast();

  const handleConfirm = () => {
    if (!selectedStatus) {
      toast({
        variant: 'destructive',
        title: '错误',
        description: '请选择签到状态',
      });
      return;
    }

    checkIn(
      {
        groupId,
        userId,
        status: selectedStatus,
      },
      {
        onSuccess: () => {
          toast({
            title: '成功',
            description: selectedStatus === 'checked_in' ? '签到成功' : '标记未到场',
          });
          setIsOpen(false);
          setSelectedStatus(null);
          onSuccess?.();
        },
        onError: (error) => {
          toast({
            variant: 'destructive',
            title: '出错',
            description: error instanceof Error ? error.message : '签到失败',
          });
        },
      }
    );
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setIsOpen(true)}
        disabled={isPending}
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            处理中...
          </>
        ) : (
          '签到确认'
        )}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>到场确认</DialogTitle>
            <DialogDescription>
              请选择您的到场状态
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <button
              onClick={() => setSelectedStatus('checked_in')}
              className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedStatus === 'checked_in'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div className="text-left">
                  <div className="font-medium">已到场</div>
                  <div className="text-sm text-gray-500">确认您已到达现场</div>
                </div>
              </div>
              {selectedStatus === 'checked_in' && (
                <div className="w-2 h-2 bg-green-600 rounded-full" />
              )}
            </button>

            <button
              onClick={() => setSelectedStatus('not_checked_in')}
              className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedStatus === 'not_checked_in'
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <XCircle className="h-5 w-5 text-red-600" />
                <div className="text-left">
                  <div className="font-medium">未到场</div>
                  <div className="text-sm text-gray-500">确认您无法到达现场</div>
                </div>
              </div>
              {selectedStatus === 'not_checked_in' && (
                <div className="w-2 h-2 bg-red-600 rounded-full" />
              )}
            </button>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsOpen(false);
                setSelectedStatus(null);
              }}
              disabled={isPending}
            >
              取消
            </Button>
            <Button onClick={handleConfirm} disabled={!selectedStatus || isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  确认中...
                </>
              ) : (
                '确认'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
