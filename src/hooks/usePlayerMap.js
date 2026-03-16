import { useMemo } from 'react';

/**
 * Returns a Map<playerId, player> for O(1) lookups.
 */
export function usePlayerMap(players) {
  return useMemo(() => {
    const map = new Map();
    if (players) {
      for (const player of players) {
        map.set(player.id, player);
      }
    }
    return map;
  }, [players]);
}
