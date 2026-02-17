import { useState } from 'react';
import { SectionAttributes, OptionItem, Tag } from '../types';

type TabKey = keyof SectionAttributes | 'tags';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'subjects', label: 'Subjects' },
  { key: 'sectionTypes', label: 'Section Types' },
  { key: 'meetingTypes', label: 'Meeting Types' },
  { key: 'campuses', label: 'Campuses' },
  { key: 'resources', label: 'Resources' },
  { key: 'levels', label: 'Levels' },
  { key: 'tags', label: 'Tags' },
];

interface Props {
  attributes: SectionAttributes;
  tags: Tag[];
  onSave: (attrs: SectionAttributes, tags: Tag[]) => void;
  onClose: () => void;
}

export default function SectionAttributesPanel({ attributes, tags: initialTags, onSave, onClose }: Props) {
  const [attrs, setAttrs] = useState<SectionAttributes>(attributes);
  const [tagList, setTagList] = useState<Tag[]>(initialTags);
  const [activeTab, setActiveTab] = useState<TabKey>('subjects');
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState('');

  const list: OptionItem[] = activeTab === 'tags' ? tagList : attrs[activeTab];

  function isDuplicate(name: string, excludeId?: string): boolean {
    return list.some(item => item.id !== excludeId && item.name.toLowerCase() === name.toLowerCase());
  }

  function updateList(newList: OptionItem[]) {
    if (activeTab === 'tags') {
      setTagList(newList);
    } else {
      setAttrs(prev => ({ ...prev, [activeTab]: newList }));
    }
  }

  function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    if (isDuplicate(name)) { setError('An item with that name already exists.'); return; }
    updateList([...list, { id: crypto.randomUUID(), name }]);
    setNewName('');
    setError('');
  }

  function handleDelete(id: string) {
    updateList(list.filter(item => item.id !== id));
  }

  function startEdit(item: OptionItem) {
    setEditingId(item.id);
    setEditName(item.name);
    setError('');
  }

  function saveEdit() {
    const name = editName.trim();
    if (!name || !editingId) return;
    if (isDuplicate(name, editingId)) { setError('An item with that name already exists.'); return; }
    updateList(list.map(item => item.id === editingId ? { ...item, name } : item));
    setEditingId(null);
    setEditName('');
    setError('');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName('');
    setError('');
  }

  function switchTab(key: TabKey) {
    setActiveTab(key);
    setNewName('');
    setEditingId(null);
    setEditName('');
    setError('');
  }

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Section Attributes</h2>
          <button className="settings-close" onClick={onClose}>&times;</button>
        </div>
        <div className="attr-tabs">
          {TABS.map(tab => (
            <button
              key={tab.key}
              className={`attr-tab${activeTab === tab.key ? ' attr-tab-active' : ''}`}
              onClick={() => switchTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="settings-body">
          {error && <p style={{ color: '#e74c3c', margin: '0 0 8px' }}>{error}</p>}
          <div className="time-input-row" style={{ marginBottom: 16 }}>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder={`New ${TABS.find(t => t.key === activeTab)?.label.replace(/s$/, '') ?? 'item'}`}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
            <button className="time-add-btn" onClick={handleAdd}>Add</button>
          </div>
          <div className="instructor-list">
            {list.map(item => (
              <div
                key={item.id}
                className="instructor-row"
                style={{ cursor: editingId === item.id ? 'default' : 'pointer' }}
              >
                {editingId === item.id ? (
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
                      <button className="btn-sm" onClick={e => { e.stopPropagation(); saveEdit(); }}>Save</button>
                      <button className="btn-sm" onClick={e => { e.stopPropagation(); cancelEdit(); }}>Cancel</button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="instructor-name">{item.name}</span>
                    <div className="instructor-actions">
                      <button className="btn-sm" onClick={e => { e.stopPropagation(); startEdit(item); }}>Edit</button>
                      <button className="btn-sm btn-danger" onClick={e => { e.stopPropagation(); handleDelete(item.id); }}>Delete</button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {list.length === 0 && (
              <p className="empty-msg">No items added yet.</p>
            )}
          </div>
        </div>
        <div className="settings-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="settings-save" onClick={() => onSave(attrs, tagList)}>Save</button>
        </div>
      </div>
    </div>
  );
}
