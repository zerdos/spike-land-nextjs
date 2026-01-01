export type Suit = "hearts" | "diamonds" | "clubs" | "spades";
export type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
  ownerId: string | null; // If null, on table. If set, in hand.
  position: Vector3;
  rotation: Vector3;
  zIndex: number;
}

export interface DeckState {
  cards: Card[];
  isShuffling: boolean;
}
