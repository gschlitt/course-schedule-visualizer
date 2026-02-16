interface ConflictDialogProps {
  onOverwrite: () => void;
  onReload: () => void;
}

export default function ConflictDialog({ onOverwrite, onReload }: ConflictDialogProps) {
  return (
    <div className="conflict-overlay">
      <div className="conflict-dialog">
        <h3>File Modified</h3>
        <p>This file was modified by another user since you last loaded it.</p>
        <div className="conflict-actions">
          <button className="btn-secondary" onClick={onReload}>
            Reload (use their version)
          </button>
          <button className="conflict-overwrite-btn" onClick={onOverwrite}>
            Overwrite (use your version)
          </button>
        </div>
      </div>
    </div>
  );
}
