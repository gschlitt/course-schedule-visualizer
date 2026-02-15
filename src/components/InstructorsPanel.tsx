import { useState } from 'react';
import { Instructor } from '../types';

interface Props {
  instructors: Instructor[];
  onSave: (instructors: Instructor[]) => void;
  onClose: () => void;
}

export default function InstructorsPanel({ instructors, onSave, onClose }: Props) {
  const [list, setList] = useState<Instructor[]>(instructors);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    setList([...list, { id: crypto.randomUUID(), name }]);
    setNewName('');
  }

  function handleDelete(id: string) {
    setList(list.filter(i => i.id !== id));
  }

  function startEdit(instructor: Instructor) {
    setEditingId(instructor.id);
    setEditName(instructor.name);
  }

  function saveEdit() {
    const name = editName.trim();
    if (!name || !editingId) return;
    setList(list.map(i => i.id === editingId ? { ...i, name } : i));
    setEditingId(null);
    setEditName('');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName('');
  }

  function handleSave() {
    onSave(list);
  }

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Instructors</h2>
          <button className="settings-close" onClick={onClose}>&times;</button>
        </div>
        <div className="settings-body">
          <div className="time-input-row" style={{ marginBottom: 16 }}>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="New instructor name"
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
            <button className="time-add-btn" onClick={handleAdd}>Add</button>
          </div>
          <div className="instructor-list">
            {list.map(inst => (
              <div key={inst.id} className="instructor-row">
                {editingId === inst.id ? (
                  <>
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveEdit()}
                      autoFocus
                    />
                    <div className="instructor-actions">
                      <button className="btn-sm" onClick={saveEdit}>Save</button>
                      <button className="btn-sm" onClick={cancelEdit}>Cancel</button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="instructor-name">{inst.name}</span>
                    <div className="instructor-actions">
                      <button className="btn-sm" onClick={() => startEdit(inst)}>Edit</button>
                      <button className="btn-sm btn-danger" onClick={() => handleDelete(inst.id)}>Delete</button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {list.length === 0 && (
              <p className="empty-msg">No instructors added yet.</p>
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
