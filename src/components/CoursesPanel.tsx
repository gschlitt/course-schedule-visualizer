import { useState } from 'react';
import { Course } from '../types';

interface Props {
  courses: Course[];
  onSave: (courses: Course[], renames: { oldAbbr: string; newAbbr: string }[]) => void;
  onClose: () => void;
}

export default function CoursesPanel({ courses, onSave, onClose }: Props) {
  const [list, setList] = useState<Course[]>(courses);
  const [newTitle, setNewTitle] = useState('');
  const [newAbbr, setNewAbbr] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAbbr, setEditAbbr] = useState('');
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [renames, setRenames] = useState<{ oldAbbr: string; newAbbr: string }[]>([]);

  function isDuplicate(title: string, abbreviation: string, excludeId?: string): string | null {
    const other = list.filter(c => c.id !== excludeId);
    if (other.some(c => c.title.toLowerCase() === title.toLowerCase())) {
      return 'A course with that title already exists.';
    }
    if (other.some(c => c.abbreviation.toLowerCase() === abbreviation.toLowerCase())) {
      return 'A course with that abbreviation already exists.';
    }
    return null;
  }

  function handleAdd() {
    const title = newTitle.trim();
    const abbreviation = newAbbr.trim();
    if (!title || !abbreviation) return;
    const dup = isDuplicate(title, abbreviation);
    if (dup) { setError(dup); return; }
    setList([...list, { id: crypto.randomUUID(), title, abbreviation }]);
    setNewTitle('');
    setNewAbbr('');
    setError('');
  }

  function handleDelete(id: string) {
    const course = list.find(c => c.id === id);
    if (course?.history) {
      const hasEntries = Object.values(course.history).some(entries => entries.length > 0);
      if (hasEntries) {
        setError(`Cannot delete "${course.abbreviation}" — has sections in past or current semesters.`);
        return;
      }
    }
    setError('');
    setList(list.filter(c => c.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function startEdit(course: Course) {
    setEditingId(course.id);
    setEditTitle(course.title);
    setEditAbbr(course.abbreviation);
    setError('');
  }

  function saveEdit() {
    const title = editTitle.trim();
    const abbreviation = editAbbr.trim();
    if (!title || !abbreviation || !editingId) return;
    const dup = isDuplicate(title, abbreviation, editingId);
    if (dup) { setError(dup); return; }
    const old = list.find(c => c.id === editingId);
    if (old && old.abbreviation !== abbreviation) {
      setRenames(prev => [...prev, { oldAbbr: old.abbreviation, newAbbr: abbreviation }]);
    }
    setList(list.map(c => c.id === editingId ? { ...c, title, abbreviation } : c));
    setEditingId(null);
    setEditTitle('');
    setEditAbbr('');
    setError('');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditTitle('');
    setEditAbbr('');
    setError('');
  }

  function handleSave() {
    onSave(list, renames);
  }

  function handleRowClick(id: string) {
    setSelectedId(prev => prev === id ? null : id);
  }

  function renderHistory(course: Course) {
    if (!course.history || Object.keys(course.history).length === 0) {
      return <div className="instructor-history-empty">No teaching history recorded.</div>;
    }
    const sortedKeys = Object.keys(course.history).sort();
    return (
      <div className="instructor-history">
        {sortedKeys.map(key => {
          const entries = course.history![key];
          if (entries.length === 0) return null;
          return (
            <div key={key} className="instructor-history-term">
              <div className="instructor-history-term-label">{key}</div>
              {entries.map((entry, i) => (
                <div key={i} className="instructor-history-entry">
                  &sect;{entry.sectionNumber} &mdash; {entry.instructor} &mdash; {entry.location}
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
          <h2>Courses</h2>
          <button className="settings-close" onClick={onClose}>&times;</button>
        </div>
        <div className="settings-body">
          {error && <p style={{ color: '#e74c3c', margin: '0 0 8px' }}>{error}</p>}
          <div className="time-input-row" style={{ marginBottom: 16 }}>
            <input
              type="text"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Course title"
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
            <input
              type="text"
              value={newAbbr}
              onChange={e => setNewAbbr(e.target.value)}
              placeholder="Abbr"
              maxLength={10}
              style={{ width: 80 }}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
            <button className="time-add-btn" onClick={handleAdd}>Add</button>
          </div>
          <div className="instructor-list">
            {list.map(course => (
              <div key={course.id}>
                <div
                  className={`instructor-row${selectedId === course.id ? ' instructor-row-selected' : ''}`}
                  onClick={() => editingId !== course.id && handleRowClick(course.id)}
                  style={{ cursor: editingId === course.id ? 'default' : 'pointer' }}
                >
                  {editingId === course.id ? (
                    <>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
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
                        maxLength={10}
                        style={{ width: 80 }}
                        placeholder="Abbr"
                      />
                      <div className="instructor-actions">
                        <button className="btn-sm" onClick={(e) => { e.stopPropagation(); saveEdit(); }}>Save</button>
                        <button className="btn-sm" onClick={(e) => { e.stopPropagation(); cancelEdit(); }}>Cancel</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="instructor-name">{course.abbreviation} — {course.title}</span>
                      <div className="instructor-actions">
                        <button className="btn-sm" onClick={(e) => { e.stopPropagation(); startEdit(course); }}>Edit</button>
                        <button className="btn-sm btn-danger" onClick={(e) => { e.stopPropagation(); handleDelete(course.id); }}>Delete</button>
                      </div>
                    </>
                  )}
                </div>
                {selectedId === course.id && editingId !== course.id && renderHistory(course)}
              </div>
            ))}
            {list.length === 0 && (
              <p className="empty-msg">No courses added yet.</p>
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
