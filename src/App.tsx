import { useState, useEffect } from 'react';
import { Section, Settings } from './types';
import { loadSections, saveSections, loadSettings, saveSettings } from './utils/storage';
import SectionForm from './components/SectionForm';
import SectionList from './components/SectionList';
import ScheduleView from './components/ScheduleView';
import SettingsPanel from './components/SettingsPanel';

export default function App() {
  const [sections, setSections] = useState<Section[]>(() => loadSections());
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    saveSections(sections);
  }, [sections]);

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
        <button className="settings-btn" onClick={() => setShowSettings(true)}>Settings</button>
      </header>
      <main className="app-main">
        <div className="left-panel">
          {showForm ? (
            <SectionForm
              onSubmit={handleSubmit}
              editingSection={editingSection}
              onCancelEdit={handleCancelEdit}
              usedColors={sections.map(s => s.color)}
              allowedStartTimes={settings.allowedStartTimes}
              allowedEndTimes={settings.allowedEndTimes}
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
          />
        </div>
        <div className="right-panel">
          <ScheduleView sections={sections} />
        </div>
      </main>
      {showSettings && (
        <SettingsPanel
          settings={settings}
          onSave={(s) => { setSettings(s); saveSettings(s); setShowSettings(false); }}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
