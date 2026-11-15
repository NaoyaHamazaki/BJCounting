import { useEffect } from 'react';
import { cardsOnTable, useGameStore } from '../store/useGameStore';
import { sfx } from './sfx';

/** ストアの変化を見て、効果音を鳴らす */
export function useSoundEffects() {
  useEffect(
    () =>
      useGameStore.subscribe((s, prev) => {
        if (cardsOnTable(s) > cardsOnTable(prev)) sfx.card();
        if (s.bet > prev.bet) sfx.chip();
        if (s.justShuffled && !prev.justShuffled) sfx.shuffle();
        if (s.phase === 'roundOver' && prev.phase !== 'roundOver') {
          const results = s.hands.map((h) => h.result);
          const net = s.hands.reduce((n, h) => n + (h.payout ?? 0) - h.bet, 0);
          if (results.includes('blackjack')) sfx.blackjack();
          else if (net > 0) sfx.win();
          else if (net < 0) sfx.lose();
          else sfx.push();
        }
      }),
    [],
  );
}
