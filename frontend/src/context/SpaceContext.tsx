import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const SpaceContext = createContext<any>(null);

export function SpaceProvider({ children }: { children: React.ReactNode }) {
  const [spaces, setSpaces] = useState<any[]>([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);

  useEffect(() => {
    api.get('/reference/spaces').then(res => {
      setSpaces(res.data);
    });
  }, []);

  const selectedSpace = spaces.find(s => s.id === selectedSpaceId) || null;

  return (
    <SpaceContext.Provider value={{ spaces, selectedSpaceId, setSelectedSpaceId, selectedSpace }}>
      {children}
    </SpaceContext.Provider>
  );
}

export const useSpace = () => useContext(SpaceContext);
