import type { ICode } from "@/lib/interfaces";
import React from "react";

/**
 * ChatInterface component - placeholder after assistant-ui packages removal
 */
const ChatInterface: React.FC<{
  isOpen: boolean;
  codeSession: ICode;
  codeSpace: string;
  onClose: () => void;
}> = React.memo(({ isOpen, onClose }): React.ReactElement => {
  if (!isOpen) return <></>;

  // Placeholder - assistant-ui packages were removed
  // Display a simple message indicating the feature is temporarily unavailable
  return (
    <div
      data-testid="chat-interface-placeholder"
      className="fixed inset-y-0 right-0 z-50 w-full sm:w-[400px] md:w-[512px] bg-white dark:bg-gray-800 shadow-lg flex flex-col"
    >
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Assistant</h2>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
          aria-label="Close"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 4L4 12M4 4L12 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-gray-500 dark:text-gray-400 text-center">
          Chat assistant is being updated. Please check back later.
        </p>
      </div>
    </div>
  );
});

ChatInterface.displayName = "ChatInterface";

export { ChatInterface };
