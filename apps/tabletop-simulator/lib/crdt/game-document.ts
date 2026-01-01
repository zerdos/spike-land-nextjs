import * as Y from "yjs";
import { Card } from "../../types/card";
import { DiceState } from "../../types/dice";
import { Player } from "../../types/game";

export const GAME_DOC_KEYS = {
  PLAYERS: "players",
  DECK: "deck",
  DICE: "dice",
};

export function createGameDocument(): Y.Doc {
  return new Y.Doc();
}

export function getPlayersMap(doc: Y.Doc): Y.Map<Player> {
  return doc.getMap(GAME_DOC_KEYS.PLAYERS);
}

export function getDeckArray(doc: Y.Doc): Y.Array<Card> {
  return doc.getArray(GAME_DOC_KEYS.DECK);
}

export function getDiceArray(doc: Y.Doc): Y.Array<DiceState> {
  return doc.getArray(GAME_DOC_KEYS.DICE);
}

export function addPlayer(doc: Y.Doc, player: Player) {
  const players = getPlayersMap(doc);
  players.set(player.id, player);
}

export function updatePlayer(doc: Y.Doc, playerId: string, updates: Partial<Player>) {
  const players = getPlayersMap(doc);
  const current = players.get(playerId);
  if (current) {
    players.set(playerId, { ...current, ...updates });
  }
}

export function moveCard(
  doc: Y.Doc,
  cardId: string,
  position: { x: number; y: number; z: number; },
  rotation?: { x: number; y: number; z: number; },
) {
  doc.transact(() => {
    const deck = getDeckArray(doc);
    let index = -1;
    let found: Card | null = null;

    // Y.Array iteration to find item
    for (let i = 0; i < deck.length; i++) {
      const c = deck.get(i);
      if (c.id === cardId) {
        index = i;
        found = c;
        break;
      }
    }

    if (found && index !== -1) {
      const updated = {
        ...found,
        position,
        rotation: rotation || found.rotation,
      };
      deck.delete(index, 1);
      deck.insert(index, [updated]);
    }
  });
}

export function flipCard(doc: Y.Doc, cardId: string) {
  doc.transact(() => {
    const deck = getDeckArray(doc);
    let index = -1;
    // ... search logic duplicated, but acceptable for MVP
    for (let i = 0; i < deck.length; i++) {
      if (deck.get(i).id === cardId) {
        index = i;
        break;
      }
    }

    if (index !== -1) {
      const card = deck.get(index);
      const updated = { ...card, faceUp: !card.faceUp };
      deck.delete(index, 1);
      deck.insert(index, [updated]);
    }
  });
}

export function rollDice(doc: Y.Doc, diceId: string, seed: number) {
  const diceList = getDiceArray(doc);
  // Similar search logic
  for (let i = 0; i < diceList.length; i++) {
    if (diceList.get(i).id === diceId) {
      const die = diceList.get(i);
      const updated = {
        ...die,
        isRolling: true,
        seed,
      };
      diceList.delete(i, 1);
      diceList.insert(i, [updated]);
      break;
    }
  }
}
