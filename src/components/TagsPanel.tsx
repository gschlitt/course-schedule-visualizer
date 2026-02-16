import { useState } from 'react';
import { Tag } from '../types';

interface Props {
  tags: Tag[];
  onSave: (tags: Tag[]) => void;
  onClose: () => void;
}

export default function TagsPanel({ tags, onSave, onClose }: Props) {
  const [list, setList] = useState<Tag[]>(tags);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState('');

  function isDuplicate(name: string, excludeId?: string): string | null {
    const other = list.filter(t => t.id !== excludeId);
    if (other.some(t => t.name.toLowerCase() === name.toLowerCase())) {
      return 'A tag with that name already exists.';
    }
    return null;
  }

  function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    const dup = isDuplicate(name);
    if (dup) { setError(dup); return; }
    setList([...list, { id: crypto.randomUUID(), name }]);
    setNewName('');
    setError('');
  }

  function handleDelete(id: string) {
    setList(list.filter(t => t.id !== id));
  }

  function startEdit(tag: Tag) {
    setEditingId(tag.id);
    setEditName(tag.name);
    setError('');
  }

  function saveEdit() {
    const name = editName.trim();
    if (!name || !editingId) return;
    const dup = isDuplicate(name, editingId);
    if (dup) { setError(dup); return; }
    setList(list.map(t => t.id === editingId ? { ...t, name } : t));
    setEditingId(null);
    setEditName('');
    setError('');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName('');
    setError('');
  }

  function handleSave() {
    onSave(list);
  }

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Tags</h2>
          <button className="settings-close" onClick={onClose}>&times;</button>
        </div>
        <div className="settings-body">
          {error && <p style={{ color: '#e74c3c', margin: '0 0 8px' }}>{error}</p>}
          <div className="time-input-row" style={{ marginBottom: 16 }}>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Tag name"
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
            <button className="time-add-btn" onClick={handleAdd}>Add</button>
          </div>
          <div className="instructor-list">
            {list.map(tag => (
              <div
                key={tag.id}
                className="instructor-row"
                style={{ cursor: editingId === tag.id ? 'default' : 'pointer' }}
              >
                {editingId === tag.id ? (
                  <>
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveEdit()}
                      onClick={e => e.stopPropagation()}
                      autoFocus
                    />
                    <div className="instructor-actions">
                      <button className="btn-sm" onClick={(e) => { e.stopPropagation(); saveEdit(); }}>Save</button>
                      <button className="btn-sm" onClick={(e) => { e.stopPropagation(); cancelEdit(); }}>Cancel</button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="instructor-name">{tag.name}</span>
                    <div className="instructor-actions">
                      <button className="btn-sm" onClick={(e) => { e.stopPropagation(); startEdit(tag); }}>Edit</button>
                      <button className="btn-sm btn-danger" onClick={(e) => { e.stopPropagation(); handleDelete(tag.id); }}>Delete</button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {list.length === 0 && (
              <p className="empty-msg">No tags added yet.</p>
            )}
          </div>
        </div>
        <div className="settings-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="settings-save" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}
