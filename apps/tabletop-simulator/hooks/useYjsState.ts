"use client";
import { useEffect, useState } from "react";
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

export function useYjsState(doc: Y.Doc | null): GameStateSnapshot {
  const [state, setState] = useState<GameStateSnapshot>({
    cards: [],
    dice: [],
    players: [],
  });

  useEffect(() => {
    if (!doc) return;

    const deckArray = getDeckArray(doc);
    const diceArray = getDiceArray(doc);
    const playersMap = getPlayersMap(doc);

    const updateState = () => {
      setState({
        cards: deckArray.toArray(),
        dice: diceArray.toArray(),
        players: Array.from(playersMap.values()),
      });
    };

    // Initial state
    updateState();

    // Subscribe to changes
    deckArray.observe(updateState);
    diceArray.observe(updateState);
    playersMap.observe(updateState);

    return () => {
      deckArray.unobserve(updateState);
      diceArray.unobserve(updateState);
      playersMap.unobserve(updateState);
    };
  }, [doc]);

  return state;
}
