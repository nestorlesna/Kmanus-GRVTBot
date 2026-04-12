// E.2 — Keyboard shortcuts modal.
// Opened by pressing `?` anywhere in the app.

import { Modal } from './primitives/modal';

const SHORTCUTS = [
  { keys: 'g → o', action: 'Go to Overview' },
  { keys: 'g → b', action: 'Go to Bots' },
  { keys: 'g → s', action: 'Go to Settings' },
  { keys: 'n → b', action: 'New Bot (open wizard)' },
  { keys: 't', action: 'Toggle light/dark theme' },
  { keys: '?', action: 'Show this help' },
  { keys: 'Esc', action: 'Close modal / dialog' },
] as const;

interface Props {
  open: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({ open, onClose }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Keyboard shortcuts">
      <table className="w-full text-sm">
        <tbody>
          {SHORTCUTS.map(({ keys, action }) => (
            <tr key={keys} className="border-b border-border-subtle last:border-0">
              <td className="py-2.5 pr-4">
                <span className="inline-flex gap-1">
                  {keys.split(' → ').map((k, i) => (
                    <span key={i}>
                      {i > 0 && <span className="text-text-muted mx-0.5">then</span>}
                      <kbd className="px-1.5 py-0.5 rounded bg-bg-muted border border-border-subtle text-2xs font-mono font-semibold text-text-secondary">
                        {k}
                      </kbd>
                    </span>
                  ))}
                </span>
              </td>
              <td className="py-2.5 text-text-muted">{action}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Modal>
  );
}
