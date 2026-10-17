import { useEffect, useState } from 'react';

export const MOBILE_BREAKPOINT = 768;

export function isMobileViewport(): boolean {
  return typeof window !== 'undefined' ? window.innerWidth <= MOBILE_BREAKPOINT : false;
}

/** true quando a viewport é <= 768px (acompanha o resize). */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(isMobileViewport);
  useEffect(() => {
    const onResize = () => setIsMobile(isMobileViewport());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return isMobile;
}
