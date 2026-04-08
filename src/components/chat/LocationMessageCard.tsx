import { MapPin, Navigation, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  LocationMessageMeta,
  isLocationExpired,
  getAmapNavigationUrl,
  getAmapStaticMapUrl,
} from '@/lib/location-message';

const AMAP_KEY = '8bd0cd75d89a2202ab623dc7402a9a16';

interface LocationMessageCardProps {
  meta: LocationMessageMeta;
  /** 是否为自己发送的消息（影响样式方向） */
  isSelf: boolean;
  className?: string;
}

export default function LocationMessageCard({ meta, isSelf, className }: LocationMessageCardProps) {
  const expired = isLocationExpired(meta.expires_at);
  const navUrl = getAmapNavigationUrl(meta.lat, meta.lng, meta.address);
  const mapImgUrl = getAmapStaticMapUrl(meta.lat, meta.lng, AMAP_KEY);

  return (
    <div
      className={cn(
        'rounded-2xl overflow-hidden border text-sm w-56',
        isSelf
          ? 'bg-primary text-primary-foreground border-primary/30 rounded-tr-sm'
          : 'bg-muted border-border rounded-tl-sm',
        className
      )}
    >
      {/* 静态地图预览 */}
      <div className="relative h-28 bg-muted/50 overflow-hidden">
        {expired ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 text-muted-foreground text-xs gap-1">
            <Clock className="h-4 w-4" />
            <span>位置已过期</span>
          </div>
        ) : (
          <img
            src={mapImgUrl}
            alt="位置预览"
            className="w-full h-full object-cover"
            onError={e => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        )}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {!expired && (
            <MapPin className={cn('h-6 w-6 drop-shadow', isSelf ? 'text-primary-foreground' : 'text-primary')} />
          )}
        </div>
      </div>

      {/* 地址信息 */}
      <div className="px-3 py-2 space-y-2">
        <p className={cn('text-xs font-medium leading-snug line-clamp-2', expired && 'opacity-50')}>
          {meta.address}
        </p>

        {!expired && (
          <Button
            size="sm"
            variant={isSelf ? 'secondary' : 'default'}
            className="w-full h-7 text-xs gap-1"
            onClick={() => window.open(navUrl, '_blank')}
          >
            <Navigation className="h-3 w-3" />
            导航前往
          </Button>
        )}
      </div>
    </div>
  );
}
