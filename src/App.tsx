import { useState, useEffect, useRef, useCallback } from 'react';
import { Section, Settings, Instructor } from './types';
import { loadSections, saveSections, loadSettings, saveSettings, loadInstructors, saveInstructors } from './utils/storage';
import SectionForm from './components/SectionForm';
import SectionList from './components/SectionList';
import ScheduleView from './components/ScheduleView';
import SettingsPanel from './components/SettingsPanel';
import InstructorsPanel from './components/InstructorsPanel';
import InstructorsSummary from './components/InstructorsSummary';

export default function App() {
  const [sections, setSections] = useState<Section[]>(() => loadSections());
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedSectionIds, setSelectedSectionIds] = useState<Set<string>>(new Set());
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [showSettings, setShowSettings] = useState(false);
  const [instructors, setInstructors] = useState<Instructor[]>(() => loadInstructors());
  const [showInstructors, setShowInstructors] = useState(false);
  const [leftWidth, setLeftWidth] = useState(340);
  const dragging = useRef(false);

  useEffect(() => {
    saveSections(sections);
  }, [sections]);

  const onMouseDown = useCallback(() => {
    dragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragging.current) return;
      const newWidth = Math.min(Math.max(e.clientX, 200), 600);
      setLeftWidth(newWidth);
    }
    function onMouseUp() {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  function handleSubmit(section: Section) {
    setSections(prev => {
      const idx = prev.findIndex(s => s.id === section.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = section;
        return updated;
      }
      return [...prev, section];
    });
    setEditingSection(null);
    setShowForm(false);
  }

  function handleEdit(section: Section) {
    setEditingSection(section);
    setShowForm(true);
  }

  function handleCancelEdit() {
    setEditingSection(null);
    setShowForm(false);
  }

  function handleDelete(id: string) {
    setSections(prev => prev.filter(s => s.id !== id));
    if (editingSection?.id === id) {
      setEditingSection(null);
      setShowForm(false);
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Course Schedule Visualizer</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="settings-btn" onClick={() => setShowInstructors(true)}>Instructors</button>
          <button className="settings-btn" onClick={() => setShowSettings(true)}>Settings</button>
        </div>
      </header>
      <main className="app-main">
        <div className="left-panel" style={{ width: leftWidth }}>
          {showForm ? (
            <SectionForm
              onSubmit={handleSubmit}
              editingSection={editingSection}
              onCancelEdit={handleCancelEdit}
              usedColors={sections.map(s => s.color)}
              allowedStartTimes={settings.allowedStartTimes}
              allowedEndTimes={settings.allowedEndTimes}
              instructors={instructors}
            />
          ) : (
            <button className="add-section-btn" onClick={() => setShowForm(true)}>
              + Add Section
            </button>
          )}
          <SectionList
            sections={sections}
            onEdit={handleEdit}
            onDelete={handleDelete}
            selectedIds={selectedSectionIds}
            onSelect={id => setSelectedSectionIds(prev =>
              prev.size === 1 && prev.has(id) ? new Set() : new Set([id])
            )}
          />
          <InstructorsSummary
            instructors={instructors}
            sections={sections}
            selectedIds={selectedSectionIds}
            onSelectInstructor={(name) => {
              const ids = sections.filter(s => s.instructor === name).map(s => s.id);
              if (ids.length === 0) return;
              const newSet = new Set(ids);
              const same = selectedSectionIds.size === newSet.size && ids.every(id => selectedSectionIds.has(id));
              setSelectedSectionIds(same ? new Set() : newSet);
            }}
          />
        </div>
        <div className="divider" onMouseDown={onMouseDown} />
        <div className="right-panel">
          <ScheduleView
            sections={sections}
            selectedSectionIds={selectedSectionIds}
            onSelectSection={id => setSelectedSectionIds(prev =>
              prev.size === 1 && prev.has(id) ? new Set() : new Set([id])
            )}
          />
        </div>
      </main>
      {showSettings && (
        <SettingsPanel
          settings={settings}
          onSave={(s) => { setSettings(s); saveSettings(s); setShowSettings(false); }}
          onClose={() => setShowSettings(false)}
        />
      )}
      {showInstructors && (
        <InstructorsPanel
          instructors={instructors}
          onSave={(list) => { setInstructors(list); saveInstructors(list); setShowInstructors(false); }}
          onClose={() => setShowInstructors(false)}
        />
      )}
    </div>
  );
}
