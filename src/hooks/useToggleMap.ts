import { useCallback, useState } from 'react';

/** Mapa id -> aberto/fechado para accordions mobile (cards expansíveis). */
export function useToggleMap(): [Record<string, boolean>, (id: string) => void] {
  const [map, setMap] = useState<Record<string, boolean>>({});
  const toggle = useCallback((id: string) => setMap((prev) => ({ ...prev, [id]: !prev[id] })), []);
  return [map, toggle];
}
