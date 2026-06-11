"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const SpaceContext = createContext<any>(null);

export function SpaceProvider({ children }: { children: React.ReactNode }) {
  const [spaces, setSpaces] = useState<any[]>([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (currentUser) {
      api.get('/reference/spaces')
        .then(res => setSpaces(res.data))
        .catch(() => {});
    } else {
      setSpaces([]);
    }
  }, [currentUser]);

  const selectedSpace = spaces.find(s => s.id === selectedSpaceId) || null;

  return (
    <SpaceContext.Provider value={{ spaces, selectedSpaceId, setSelectedSpaceId, selectedSpace }}>
      {children}
    </SpaceContext.Provider>
  );
}

export const useSpace = () => useContext(SpaceContext);


