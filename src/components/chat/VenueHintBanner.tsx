// T16 4.4.2 到场辅助链路 — 场地补充说明横幅
import { Info, DoorOpen, Building2, Phone, FileText } from 'lucide-react';
import { VenueHint } from '@/lib/arrival-assist';
import { cn } from '@/lib/utils';

interface VenueHintBannerProps {
  hint: VenueHint;
  className?: string;
}

export default function VenueHintBanner({ hint, className }: VenueHintBannerProps) {
  const items: { icon: React.ReactNode; label: string; value: string }[] = [];

  if (hint.entrance) items.push({ icon: <DoorOpen className="h-3 w-3 shrink-0" />, label: '入口', value: hint.entrance });
  if (hint.floor) items.push({ icon: <Building2 className="h-3 w-3 shrink-0" />, label: '楼层', value: hint.floor });
  if (hint.contact) items.push({ icon: <Phone className="h-3 w-3 shrink-0" />, label: '联系', value: hint.contact });
  if (hint.notes) items.push({ icon: <FileText className="h-3 w-3 shrink-0" />, label: '备注', value: hint.notes });

  if (items.length === 0) return null;

  return (
    <div className={cn('mx-3 my-2 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-3 py-2 space-y-1', className)}>
      <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 text-xs font-medium">
        <Info className="h-3.5 w-3.5 shrink-0" />
        <span>房主到场提示</span>
      </div>
      {items.map(item => (
        <div key={item.label} className="flex items-start gap-1.5 text-xs text-amber-800 dark:text-amber-300">
          {item.icon}
          <span className="text-amber-600 dark:text-amber-500 shrink-0">{item.label}：</span>
          <span className="break-all">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
