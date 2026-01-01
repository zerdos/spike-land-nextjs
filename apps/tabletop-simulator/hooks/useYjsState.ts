"use client";
import { useCallback, useEffect, useState } from "react";
import * as Y from "yjs";
import { getDeckArray, getDiceArray, getPlayersMap } from "../lib/crdt/game-document";
import { Card } from "../types/card";
import { DiceState } from "../types/dice";
import { Player } from "../types/game";

export interface GameStateSnapshot {
  cards: Card[];
  dice: DiceState[];
  players: Player[];
}

export function useYjsState(doc: Y.Doc | null, isSynced: boolean = false): GameStateSnapshot {
  const [state, setState] = useState<GameStateSnapshot>({
    cards: [],
    dice: [],
    players: [],
  });

  const refreshState = useCallback(() => {
    if (!doc) return;
    const deckArray = getDeckArray(doc);
    const diceArray = getDiceArray(doc);
    const playersMap = getPlayersMap(doc);
    setState({
      cards: deckArray.toArray(),
      dice: diceArray.toArray(),
      players: Array.from(playersMap.values()),
    });
  }, [doc]);

  useEffect(() => {
    if (!doc) return;

    const deckArray = getDeckArray(doc);
    const diceArray = getDiceArray(doc);
    const playersMap = getPlayersMap(doc);

    // Initial state
    refreshState();

    // Subscribe to changes
    deckArray.observe(refreshState);
    diceArray.observe(refreshState);
    playersMap.observe(refreshState);

    return () => {
      deckArray.unobserve(refreshState);
      diceArray.unobserve(refreshState);
      playersMap.unobserve(refreshState);
    };
  }, [doc, refreshState]);

  // Re-read state when persistence sync completes
  useEffect(() => {
    if (isSynced) {
      refreshState();
    }
  }, [isSynced, refreshState]);

  return state;
}
