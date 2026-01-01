"use client";

interface RadialMenuProps {
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number; };
  actions: {
    flip?: () => void;
    peek?: () => void;
  };
}

export function RadialMenu({ isOpen, onClose, position, actions }: RadialMenuProps) {
  if (!isOpen) return null;
  return (
    <div
      className="fixed w-40 h-40 rounded-full flex items-center justify-center pointer-events-auto z-50 animate-in fade-in zoom-in duration-200"
      style={{
        left: position.x - 80,
        top: position.y - 80,
        background: "radial-gradient(circle, rgba(0,0,0,0) 30%, rgba(0,0,0,0.8) 100%)",
      }}
    >
      {/* Simple layout for MVP */}
      {actions.flip && (
        <button
          onClick={() => {
            actions.flip!();
            onClose();
          }}
          className="absolute -top-4 w-16 h-16 bg-blue-600 rounded-full text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
        >
          Flip
        </button>
      )}

      <button
        onClick={onClose}
        className="absolute w-12 h-12 bg-gray-700/50 rounded-full text-white flex items-center justify-center backdrop-blur-sm"
      >
        ✕
      </button>
    </div>
  );
}
