import { useCallback, useState } from 'react';

const toneClassMap = {
  danger: 'bg-red-600 hover:bg-red-500 text-white',
  warning: 'bg-amber-500 hover:bg-amber-400 text-black',
  primary: 'bg-sky-600 hover:bg-sky-500 text-white',
  neutral: 'bg-gray-700 hover:bg-gray-600 text-white',
};

export default function ConfirmModal({
  title = 'Confirm Action',
  message = 'Are you sure you want to continue?',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmTone = 'primary',
  onConfirm,
  onCancel,
}) {
  const [busy, setBusy] = useState(false);

  const handleConfirm = useCallback(async () => {
    setBusy(true);
    try {
      await Promise.resolve(onConfirm?.());
    } finally {
      setBusy(false);
    }
  }, [onConfirm]);

  const toneClass = toneClassMap[confirmTone] ?? toneClassMap.primary;

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <h3 className="text-xl font-semibold text-white">{title}</h3>
        <p className="text-sm text-gray-300">{message}</p>
      </header>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          className="rounded-lg border border-gray-700 bg-gray-800/70 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700"
          onClick={() => onCancel?.()}
          disabled={busy}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${toneClass}`}
          onClick={handleConfirm}
          disabled={busy}
        >
          {busy ? 'Working...' : confirmLabel}
        </button>
      </div>
    </div>
  );
}

