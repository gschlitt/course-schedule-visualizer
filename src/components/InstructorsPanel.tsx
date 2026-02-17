import { useState } from 'react';
import { Instructor } from '../types';

interface Props {
  instructors: Instructor[];
  onSave: (instructors: Instructor[], renames: { oldName: string; newName: string }[]) => void;
  onClose: () => void;
}

export default function InstructorsPanel({ instructors, onSave, onClose }: Props) {
  const [list, setList] = useState<Instructor[]>(instructors);
  const [newName, setNewName] = useState('');
  const [newAbbr, setNewAbbr] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editAbbr, setEditAbbr] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [renames, setRenames] = useState<{ oldName: string; newName: string }[]>([]);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function handleAdd() {
    const name = newName.trim();
    const abbreviation = newAbbr.trim();
    if (!name || !abbreviation) return;
    setList([...list, { id: crypto.randomUUID(), name, abbreviation }]);
    setNewName('');
    setNewAbbr('');
  }

  function handleDelete(id: string) {
    const inst = list.find(i => i.id === id);
    if (inst?.history) {
      const hasEntries = Object.values(inst.history).some(entries => entries.length > 0);
      if (hasEntries) {
        setDeleteError(`Cannot delete "${inst.name}" — assigned to sections in past or current semesters.`);
        return;
      }
    }
    setDeleteError(null);
    setList(list.filter(i => i.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function startEdit(instructor: Instructor) {
    setEditingId(instructor.id);
    setEditName(instructor.name);
    setEditAbbr(instructor.abbreviation);
  }

  function saveEdit() {
    const name = editName.trim();
    const abbreviation = editAbbr.trim();
    if (!name || !abbreviation || !editingId) return;
    const old = list.find(i => i.id === editingId);
    if (old && old.name !== name) {
      setRenames(prev => [...prev, { oldName: old.name, newName: name }]);
    }
    setList(list.map(i => i.id === editingId ? { ...i, name, abbreviation } : i));
    setEditingId(null);
    setEditName('');
    setEditAbbr('');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName('');
    setEditAbbr('');
  }

  function handleSave() {
    onSave(list, renames);
  }

  function handleRowClick(id: string) {
    setSelectedId(prev => prev === id ? null : id);
  }

  function renderHistory(inst: Instructor) {
    if (!inst.history || Object.keys(inst.history).length === 0) {
      return <div className="instructor-history-empty">No teaching history recorded.</div>;
    }
    const sortedKeys = Object.keys(inst.history).sort();
    return (
      <div className="instructor-history">
        {sortedKeys.map(key => {
          const entries = inst.history![key];
          if (entries.length === 0) return null;
          return (
            <div key={key} className="instructor-history-term">
              <div className="instructor-history-term-label">{key}</div>
              {entries.map((entry, i) => (
                <div key={i} className="instructor-history-entry">
                  {entry.courseName} &sect;{entry.sectionNumber} &mdash; {entry.location}{entry.workload != null ? ` (WL: ${entry.workload})` : ''}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Instructors</h2>
          <button className="settings-close" onClick={onClose}>&times;</button>
        </div>
        <div className="settings-body">
          {deleteError && <p style={{ color: '#e74c3c', margin: '0 0 8px' }}>{deleteError}</p>}
          <div className="time-input-row" style={{ marginBottom: 16 }}>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="New instructor name"
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
            <input
              type="text"
              value={newAbbr}
              onChange={e => setNewAbbr(e.target.value)}
              placeholder="Abbr"
              maxLength={4}
              style={{ width: 60 }}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
            <button className="time-add-btn" onClick={handleAdd}>Add</button>
          </div>
          <div className="instructor-list">
            {list.map(inst => (
              <div key={inst.id}>
                <div
                  className={`instructor-row${selectedId === inst.id ? ' instructor-row-selected' : ''}`}
                  onClick={() => editingId !== inst.id && handleRowClick(inst.id)}
                  style={{ cursor: editingId === inst.id ? 'default' : 'pointer' }}
                >
                  {editingId === inst.id ? (
                    <>
                      <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && saveEdit()}
                        onClick={e => e.stopPropagation()}
                        autoFocus
                      />
                      <input
                        type="text"
                        value={editAbbr}
                        onChange={e => setEditAbbr(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && saveEdit()}
                        onClick={e => e.stopPropagation()}
                        maxLength={4}
                        style={{ width: 60 }}
                        placeholder="Abbr"
                      />
                      <div className="instructor-actions">
                        <button className="btn-sm" onClick={(e) => { e.stopPropagation(); saveEdit(); }}>Save</button>
                        <button className="btn-sm" onClick={(e) => { e.stopPropagation(); cancelEdit(); }}>Cancel</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="instructor-name">{inst.name} ({inst.abbreviation})</span>
                      <div className="instructor-actions">
                        <button className="btn-sm" onClick={(e) => { e.stopPropagation(); startEdit(inst); }}>Edit</button>
                        <button className="btn-sm btn-danger" onClick={(e) => { e.stopPropagation(); handleDelete(inst.id); }}>Delete</button>
                      </div>
                    </>
                  )}
                </div>
                {selectedId === inst.id && editingId !== inst.id && renderHistory(inst)}
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
