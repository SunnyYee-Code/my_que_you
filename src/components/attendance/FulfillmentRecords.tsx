import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  useFulfillmentRecords,
  useNoShowStats,
  useSubmitAppeal,
} from '@/hooks/useAttendanceFulfillment';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, Loader2, MessageSquare } from 'lucide-react';

interface FulfillmentRecordsProps {
  userId: string;
  hideAppeal?: boolean;
}

/**
 * 履约记录显示组件
 * 展示用户的履约历史和爽约统计
 */
export function FulfillmentRecords({ userId, hideAppeal = false }: FulfillmentRecordsProps) {
  const { data: records = [], isLoading } = useFulfillmentRecords(userId);
  const { data: noShowStats } = useNoShowStats(userId);
  const [appealingRecordId, setAppealingRecordId] = useState<string | null>(null);
  const [appealReason, setAppealReason] = useState('');
  const { mutate: submitAppeal, isPending: isSubmittingAppeal } = useSubmitAppeal();
  const { toast } = useToast();

  const handleSubmitAppeal = () => {
    if (!appealingRecordId || !appealReason.trim()) {
      toast({
        variant: 'destructive',
        title: '错误',
        description: '请填写申诉理由',
      });
      return;
    }

    submitAppeal(
      {
        fulfillmentRecordId: appealingRecordId,
        reason: appealReason,
      },
      {
        onSuccess: () => {
          toast({
            title: '成功',
            description: '申诉已提交，请等待审核',
          });
          setAppealingRecordId(null);
          setAppealReason('');
        },
        onError: (error) => {
          toast({
            variant: 'destructive',
            title: '出错',
            description: error instanceof Error ? error.message : '申诉提交失败',
          });
        },
      }
    );
  };

  if (isLoading) {
    return <div className="text-center py-8">加载中...</div>;
  }

  return (
    <div className="space-y-4">
      {/* 爽约统计摘要 */}
      {noShowStats && noShowStats.totalNoShowCount > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              履约提醒
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700">
              近{noShowStats.period}内有 <span className="font-semibold text-orange-600">
                {noShowStats.totalNoShowCount}
              </span> 次爽约记录，请改进履约表现以维护信用等级。
            </p>
          </CardContent>
        </Card>
      )}

      {/* 履约记录列表 */}
      <Card>
        <CardHeader>
          <CardTitle>履约历史</CardTitle>
          <CardDescription>
            {records.length === 0 ? '暂无履约记录' : `共 ${records.length} 条记录`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>暂无履约记录</p>
            </div>
          ) : (
            <div className="space-y-3">
              {records.map((record) => (
                <div
                  key={record.id}
                  className={`p-3 border rounded-lg flex items-start justify-between ${
                    record.status === 'no_show'
                      ? 'border-red-200 bg-red-50'
                      : record.status === 'fulfilled'
                        ? 'border-green-200 bg-green-50'
                        : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm">
                      {record.status === 'fulfilled' && '✓ 履约'}
                      {record.status === 'no_show' && '✗ 爽约'}
                      {record.status === 'left_early' && '⊘ 异常离场'}
                      {record.status === 'cancelled' && '— 已取消'}
                    </div>
                    {record.no_show_reason && (
                      <div className="text-xs text-gray-600 mt-1">
                        原因：
                        {record.no_show_reason === 'not_checked_in' && '未签到'}
                        {record.no_show_reason === 'not_attended' && '未到场'}
                        {record.no_show_reason === 'not_responded' && '未响应'}
                      </div>
                    )}
                    {record.notes && (
                      <div className="text-xs text-gray-600 mt-1">
                        备注：{record.notes}
                      </div>
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(record.created_at).toLocaleString()}
                    </div>
                    {record.appeal_status && (
                      <div className="text-xs mt-2 px-2 py-1 bg-blue-100 text-blue-700 rounded inline-block">
                        申诉状态：
                        {record.appeal_status === 'pending' && '待审核'}
                        {record.appeal_status === 'approved' && '已通过'}
                        {record.appeal_status === 'rejected' && '已拒绝'}
                      </div>
                    )}
                  </div>
                  {record.status === 'no_show' && !record.appeal_status && !hideAppeal && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAppealingRecordId(record.id)}
                      className="ml-3"
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      申诉
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 申诉对话框 */}
      <Dialog open={!!appealingRecordId} onOpenChange={(open) => {
        if (!open) {
          setAppealingRecordId(null);
          setAppealReason('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>申诉爽约记录</DialogTitle>
            <DialogDescription>
              请详细说明您认为该记录有误的原因
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Textarea
              placeholder="请输入申诉理由（最多500字）"
              value={appealReason}
              onChange={(e) => setAppealReason(e.target.value.slice(0, 500))}
              rows={4}
            />
            <div className="text-xs text-gray-500">
              {appealReason.length} / 500
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAppealingRecordId(null);
                setAppealReason('');
              }}
              disabled={isSubmittingAppeal}
            >
              取消
            </Button>
            <Button
              onClick={handleSubmitAppeal}
              disabled={!appealReason.trim() || isSubmittingAppeal}
            >
              {isSubmittingAppeal ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  提交中...
                </>
              ) : (
                '提交申诉'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
