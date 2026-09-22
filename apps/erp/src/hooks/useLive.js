import { useEffect, useRef } from 'react';

export function useLive(fn, ms = 4000) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      if (!cancelled) fnRef.current();
    };
    tick();
    const id = setInterval(tick, ms);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [ms]);
}
