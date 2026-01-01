"use client";
import type { Card } from "../../types/card";

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
  hearts: "text-red-500",
  diamonds: "text-red-500",
  clubs: "text-gray-800",
  spades: "text-gray-800",
};

export function HandDrawer({ hand, isOpen, onToggle, onPlayCard }: HandDrawerProps) {
  // Always show strip if there are cards, but minimize if closed
  const hasCards = hand.length > 0;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-30 transition-all duration-300 ${
        isOpen ? "h-32" : hasCards ? "h-16" : "h-12"
      }`}
      data-testid="hand-drawer"
    >
      {/* Glass background strip */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-xl border-t border-white/10" />

      {/* Toggle handle */}
      <button
        onClick={onToggle}
        className="absolute -top-8 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/80 backdrop-blur-md border border-white/10 rounded-t-lg text-white/80 text-sm font-medium hover:bg-black/90 transition-colors flex items-center gap-2"
        data-testid="hand-toggle"
      >
        <span>🃏</span>
        <span>Hand</span>
        {hand.length > 0 && (
          <span className="bg-cyan-500/80 text-white text-xs px-2 py-0.5 rounded-full">
            {hand.length}
          </span>
        )}
        <span className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>
          ▲
        </span>
      </button>

      {/* Cards container */}
      <div
        className={`relative h-full flex items-center px-4 transition-opacity duration-200 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {hand.length === 0
          ? (
            <div className="text-white/40 text-sm mx-auto">
              Click on the deck to draw cards
            </div>
          )
          : (
            <div className="flex items-end gap-3 overflow-x-auto py-2 px-2 scroll-smooth snap-x snap-mandatory w-full">
              {hand.map((card, index) => (
                <button
                  key={card.id}
                  onClick={() => onPlayCard?.(card.id)}
                  className="flex-shrink-0 snap-center group"
                  title="Click to play this card"
                  data-testid={`hand-card-${card.id}`}
                  style={{
                    // Slight overlap effect for multiple cards
                    marginLeft: index > 0 ? "-8px" : "0",
                    zIndex: index,
                  }}
                >
                  {/* 3D Card with perspective */}
                  <div
                    className="relative w-20 h-28 bg-gradient-to-br from-white to-gray-100 rounded-lg shadow-xl border border-gray-200 flex flex-col items-center justify-center transition-all duration-200 group-hover:-translate-y-3 group-hover:rotate-0 group-active:scale-95"
                    style={{
                      transform: `perspective(500px) rotateX(10deg) rotateY(${
                        (index - hand.length / 2) * 2
                      }deg)`,
                      transformStyle: "preserve-3d",
                      boxShadow: "0 10px 20px rgba(0,0,0,0.3), 0 6px 6px rgba(0,0,0,0.2)",
                    }}
                  >
                    {/* Card content */}
                    <span className={`text-2xl font-bold ${SUIT_COLORS[card.suit]}`}>
                      {card.rank}
                    </span>
                    <span className={`text-3xl ${SUIT_COLORS[card.suit]}`}>
                      {SUIT_SYMBOLS[card.suit]}
                    </span>

                    {/* Corner indicators */}
                    <span
                      className={`absolute top-1 left-1.5 text-xs font-bold ${
                        SUIT_COLORS[card.suit]
                      }`}
                    >
                      {card.rank}
                    </span>
                    <span
                      className={`absolute bottom-1 right-1.5 text-xs font-bold rotate-180 ${
                        SUIT_COLORS[card.suit]
                      }`}
                    >
                      {card.rank}
                    </span>

                    {/* Shine effect */}
                    <div
                      className="absolute inset-0 rounded-lg opacity-30 pointer-events-none"
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 50%)",
                      }}
                    />
                  </div>
                </button>
              ))}
            </div>
          )}
      </div>

      {/* Minimized view - show card count as badges when closed */}
      {!isOpen && hasCards && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-1">
            {hand.slice(0, 5).map((card, i) => (
              <div
                key={card.id}
                className="w-8 h-10 bg-white rounded shadow-md border border-gray-200 flex items-center justify-center text-xs"
                style={{ marginLeft: i > 0 ? "-12px" : "0", zIndex: i }}
              >
                <span className={SUIT_COLORS[card.suit]}>{SUIT_SYMBOLS[card.suit]}</span>
              </div>
            ))}
            {hand.length > 5 && (
              <span className="ml-2 text-white/60 text-sm">+{hand.length - 5}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
