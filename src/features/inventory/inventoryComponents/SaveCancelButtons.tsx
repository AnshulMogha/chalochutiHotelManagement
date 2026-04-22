interface SaveCancelButtonsProps {
  hasChanges: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export const SaveCancelButtons = ({ hasChanges, onSave, onCancel }: SaveCancelButtonsProps) => {
  if (!hasChanges) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-50">
      <div className="max-w-[1800px] mx-auto px-6 py-4 flex justify-end items-center gap-4">
        <button
          type="button"
          onMouseDown={(e) => {
            // Use onMouseDown to prevent input blur from firing
            e.preventDefault();
            e.stopPropagation();
            onCancel();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="px-6 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800 transition-colors"
        >
          CANCEL CHANGES
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSave();
          }}
          className="px-6 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
        >
          SAVE CHANGES
        </button>
      </div>
    </div>
  );
};