import { Card } from "../../types/card";

interface HandDrawerProps {
  hand: Card[];
  isOpen: boolean;
  onToggle: () => void;
}

export function HandDrawer({ hand, isOpen, onToggle }: HandDrawerProps) {
  return (
    <div
      className={`fixed bottom-0 left-0 right-0 bg-black/80 text-white transition-transform duration-300 ${
        isOpen ? "translate-y-0" : "translate-y-full"
      }`}
      style={{ height: "30vh", borderTopLeftRadius: "20px", borderTopRightRadius: "20px" }}
    >
      <div
        className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-10 bg-black/80 flex items-center justify-center cursor-pointer rounded-t-lg"
        onClick={onToggle}
      >
        Hand ({hand.length})
      </div>

      <div className="flex items-center justify-center h-full p-4 overflow-x-auto gap-4">
        {hand.map(card => (
          <div
            key={card.id}
            className="min-w-[100px] h-[140px] bg-white text-black rounded shadow-lg flex items-center justify-center"
          >
            {card.rank} {card.suit}
          </div>
        ))}
      </div>
    </div>
  );
}
