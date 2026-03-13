import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type City = {
  id: string;
  name: string;
};

type CityContextType = {
  currentCity: City;
  setCurrentCity: (city: City) => void;
  allCities: City[];
  loading: boolean;
};

const CityContext = createContext<CityContextType | null>(null);

export const CityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data: cities = [], isLoading } = useQuery({
    queryKey: ['cities'],
    queryFn: async () => {
      const { data, error } = await supabase.from('cities').select('*').order('name');
      if (error) throw error;
      return data as City[];
    },
  });

  const [currentCity, setCurrentCityState] = useState<City>({ id: 'chengdu', name: '成都' });

  useEffect(() => {
    if (cities.length > 0) {
      const saved = localStorage.getItem('selectedCity');
      if (saved) {
        const found = cities.find(c => c.id === saved);
        if (found) {
          setCurrentCityState(found);
          return;
        }
      }
      setCurrentCityState(cities[0]);
    }
  }, [cities]);

  const setCurrentCity = (city: City) => {
    setCurrentCityState(city);
    localStorage.setItem('selectedCity', city.id);
  };

  return (
    <CityContext.Provider value={{ currentCity, setCurrentCity, allCities: cities, loading: isLoading }}>
      {children}
    </CityContext.Provider>
  );
};

export const useCity = () => {
  const ctx = useContext(CityContext);
  if (!ctx) throw new Error('useCity must be used within CityProvider');
  return ctx;
};
