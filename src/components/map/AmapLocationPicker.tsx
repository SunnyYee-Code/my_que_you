import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Search, Crosshair } from 'lucide-react';

// Amap Key - configured in project
const AMAP_KEY = '8bd0cd75d89a2202ab623dc7402a9a16';
const AMAP_SECURITY_CODE = '4a831fbd9393d2a1c0fb8818ea8b232b';

declare global {
  interface Window {
    AMap: any;
    __AMAP_KEY__?: string;
    _AMapSecurityConfig?: { securityJsCode: string };
  }
}

interface AmapLocationPickerProps {
  onSelect: (location: { address: string; lat: number; lng: number }) => void;
  initialAddress?: string;
  initialLat?: number;
  initialLng?: number;
}

function loadAmapScript(key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.AMap) { resolve(); return; }
    window._AMapSecurityConfig = { securityJsCode: AMAP_SECURITY_CODE };
    const script = document.createElement('script');
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${key}&plugin=AMap.PlaceSearch,AMap.Geocoder,AMap.Geolocation`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('高德地图加载失败'));
    document.head.appendChild(script);
  });
}

export default function AmapLocationPicker({ onSelect, initialAddress, initialLat, initialLng }: AmapLocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);
  const [searchText, setSearchText] = useState(initialAddress || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const updateMarker = useCallback((lng: number, lat: number) => {
    if (!mapInstance.current) return;
    if (markerRef.current) {
      markerRef.current.setPosition([lng, lat]);
    } else {
      markerRef.current = new window.AMap.Marker({
        position: [lng, lat],
        draggable: true,
      });
      markerRef.current.on('dragend', (e: any) => {
        const pos = markerRef.current.getPosition();
        reverseGeocode(pos.getLng(), pos.getLat());
      });
      mapInstance.current.add(markerRef.current);
    }
    mapInstance.current.setCenter([lng, lat]);
  }, []);

  const reverseGeocode = useCallback((lng: number, lat: number) => {
    if (!geocoderRef.current) return;
    geocoderRef.current.getAddress([lng, lat], (status: string, result: any) => {
      if (status === 'complete') {
        const addr = result.regeocode.formattedAddress;
        setSearchText(addr);
        onSelect({ address: addr, lat, lng });
      }
    });
  }, [onSelect]);

  useEffect(() => {
    loadAmapScript(AMAP_KEY).then(() => {
      if (!mapRef.current) return;
      const map = new window.AMap.Map(mapRef.current, {
        zoom: 14,
        center: initialLng && initialLat ? [initialLng, initialLat] : [104.065735, 30.659462],
      });
      mapInstance.current = map;
      geocoderRef.current = new window.AMap.Geocoder();

      if (initialLng && initialLat) {
        updateMarker(initialLng, initialLat);
      }

      map.on('click', (e: any) => {
        const { lng, lat } = e.lnglat;
        updateMarker(lng, lat);
        reverseGeocode(lng, lat);
      });

      setLoading(false);
    }).catch(() => {
      setLoading(false);
      setError('地图加载失败，请检查网络');
    });

    return () => {
      mapInstance.current?.destroy();
    };
  }, []);

  useEffect(() => {
    setSearchText(initialAddress || '');
  }, [initialAddress]);

  useEffect(() => {
    if (typeof initialLng !== 'number' || typeof initialLat !== 'number') return;
    if (!window.AMap || !mapInstance.current) return;

    updateMarker(initialLng, initialLat);
  }, [initialLat, initialLng, updateMarker]);

  const handleSearch = () => {
    if (!searchText.trim() || !window.AMap) return;
    const placeSearch = new window.AMap.PlaceSearch({ city: '' });
    placeSearch.search(searchText, (status: string, result: any) => {
      if (status === 'complete' && result.poiList?.pois?.length) {
        const poi = result.poiList.pois[0];
        const { lng, lat } = poi.location;
        updateMarker(lng, lat);
        setSearchText(poi.name + ' ' + (poi.address || ''));
        onSelect({ address: poi.name + ' ' + (poi.address || ''), lat, lng });
      }
    });
  };

  const handleLocate = () => {
    if (!window.AMap || !mapInstance.current) return;
    const geolocation = new window.AMap.Geolocation({ enableHighAccuracy: true });
    geolocation.getCurrentPosition((status: string, result: any) => {
      if (status === 'complete') {
        const { lng, lat } = result.position;
        updateMarker(lng, lat);
        reverseGeocode(lng, lat);
      }
    });
  };


  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="搜索地址..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <Button variant="outline" size="icon" onClick={handleSearch}>
          <Search className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={handleLocate} title="定位当前位置">
          <Crosshair className="h-4 w-4" />
        </Button>
      </div>

      {error ? (
        <div className="h-48 rounded-lg border border-dashed flex items-center justify-center text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 mr-2" />{error}
        </div>
      ) : (
        <div
          ref={mapRef}
          className="h-48 sm:h-64 rounded-lg border overflow-hidden"
          style={{ minHeight: 192 }}
        >
          {loading && (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              加载地图中...
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground">点击地图或拖动标记选择位置</p>
    </div>
  );
}
