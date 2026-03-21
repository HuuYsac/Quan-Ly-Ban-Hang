import { useState, useEffect } from 'react';
import { AppData } from '../types';
import { initialData } from '../data/mockData';

const STORAGE_KEY = 'PhuocIT_vietnam_data_react';

export function useAppStore() {
  const [data, setData] = useState<AppData>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse local storage data', e);
        return initialData;
      }
    }
    return initialData;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const updateData = (newData: Partial<AppData>) => {
    setData(prev => ({ ...prev, ...newData }));
  };

  return { data, updateData };
}
