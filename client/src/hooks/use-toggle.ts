import { useState, useCallback } from 'react';

export function useToggle(initialState = false): [boolean, (nextState?: boolean) => void] {
  const [state, setState] = useState<boolean>(initialState);

  const toggle = useCallback((nextState?: boolean) => {
    if (typeof nextState === 'boolean') {
      setState(nextState);
    } else {
      setState(state => !state);
    }
  }, []);

  return [state, toggle];
}
