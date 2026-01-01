import { Card } from "../../types/card";

interface HandDrawerProps {
  hand: Card[];
  isOpen: boolean;
  onToggle: () => void;
  onPlayCard?: (cardId: string) => void;
}

const SUIT_SYMBOLS: Record<string, string> = {
  hearts: "\u2665",
  diamonds: "\u2666",
  clubs: "\u2663",
  spades: "\u2660",
};

const SUIT_COLORS: Record<string, string> = {
  hearts: "text-red-600",
  diamonds: "text-red-600",
  clubs: "text-black",
  spades: "text-black",
};

export function HandDrawer({ hand, isOpen, onToggle, onPlayCard }: HandDrawerProps) {
  return (
    <div
      className={`fixed bottom-0 left-0 right-0 bg-black/80 text-white transition-transform duration-300 z-30 ${
        isOpen ? "translate-y-0" : "translate-y-full"
      }`}
      style={{ height: "30vh", borderTopLeftRadius: "20px", borderTopRightRadius: "20px" }}
      data-testid="hand-drawer"
    >
      <div
        className="absolute -top-10 left-1/2 -translate-x-1/2 w-24 h-10 bg-black/80 flex items-center justify-center cursor-pointer rounded-t-lg hover:bg-gray-800 transition-colors"
        onClick={onToggle}
        data-testid="hand-toggle"
      >
        Hand ({hand.length})
      </div>

      <div className="flex items-center justify-center h-full p-4 overflow-x-auto gap-4">
        {hand.length === 0
          ? <div className="text-gray-400">Click on the deck to draw cards</div>
          : (
            hand.map(card => (
              <button
                key={card.id}
                onClick={() => onPlayCard?.(card.id)}
                className="min-w-[100px] h-[140px] bg-white rounded-lg shadow-lg flex flex-col items-center justify-center cursor-pointer hover:scale-105 hover:-translate-y-2 transition-transform active:scale-95"
                title="Click to play card"
                data-testid={`hand-card-${card.id}`}
              >
                <span className={`text-3xl font-bold ${SUIT_COLORS[card.suit]}`}>
                  {card.rank}
                </span>
                <span className={`text-4xl ${SUIT_COLORS[card.suit]}`}>
                  {SUIT_SYMBOLS[card.suit]}
                </span>
              </button>
            ))
          )}
      </div>
    </div>
  );
}
