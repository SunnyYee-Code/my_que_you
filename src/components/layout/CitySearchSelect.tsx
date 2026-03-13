import { useState } from 'react';
import { MapPin, Search, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCity } from '@/contexts/CityContext';
import { cn } from '@/lib/utils';

export default function CitySearchSelect({ className }: { className?: string }) {
  const { currentCity, setCurrentCity, allCities } = useCity();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = allCities.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className={cn('gap-1.5 text-sm font-medium', className)}>
          <MapPin className="h-4 w-4 text-primary" />
          {currentCity.name}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="搜索城市..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
            autoFocus
          />
        </div>
        <ScrollArea className="max-h-52">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">未找到城市</p>
          ) : (
            <div className="space-y-0.5">
              {filtered.map(city => (
                <button
                  key={city.id}
                  onClick={() => { setCurrentCity(city); setOpen(false); setSearch(''); }}
                  className={cn(
                    'w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-sm transition-colors',
                    city.id === currentCity.id
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'hover:bg-muted'
                  )}
                >
                  {city.name}
                  {city.id === currentCity.id && <Check className="h-3.5 w-3.5" />}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
