import { useState, useEffect, useRef, useCallback } from 'react';
import { Section, Settings, Instructor, Course, Semester, Tag } from './types';
import {
  loadSections, saveSections, forceSaveSections,
  loadSettings, saveSettings,
  loadInstructors, saveInstructors,
  loadCourses, saveCourses,
  loadTags, saveTags,
  loadYears, saveYears,
  DEFAULT_SETTINGS, ConflictError, refreshTimestamp
} from './utils/storage';
import SectionForm from './components/SectionForm';
import SectionList from './components/SectionList';
import ScheduleView from './components/ScheduleView';
import SettingsPanel from './components/SettingsPanel';
import InstructorsPanel from './components/InstructorsPanel';
import CoursesPanel from './components/CoursesPanel';
import TagsPanel from './components/TagsPanel';
import InstructorsSummary from './components/InstructorsSummary';
import ConflictDialog from './components/ConflictDialog';
import { exportCsv } from './utils/csv';
import { getNextColor } from './utils/colors';

const SEMESTERS: Semester[] = ['Fall', 'Winter', 'Summer'];

type AppScreen = 'loading' | 'setup' | 'main';

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('loading');
  const [years, setYears] = useState<number[]>([2026]);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedSemester, setSelectedSemester] = useState<Semester>('Fall');
  const [sections, setSections] = useState<Section[]>([]);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedSectionIds, setSelectedSectionIds] = useState<Set<string>>(new Set());
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [showInstructors, setShowInstructors] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [showCourses, setShowCourses] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [showTags, setShowTags] = useState(false);
  const [leftWidth, setLeftWidth] = useState(340);
  const [showConflict, setShowConflict] = useState(false);
  const [csvBannerDismissed, setCsvBannerDismissed] = useState(false);
  const dragging = useRef(false);
  const initialLoadDone = useRef(false);

  // Initial load: check config, then load all data
  useEffect(() => {
    async function init() {
      const config = await window.storageApi.getConfig();
      if (!config) {
        setScreen('setup');
        return;
      }
      const [yrs, sects, sett, instr, crs, tgs] = await Promise.all([
        loadYears(),
        loadSections(2026, 'Fall'),
        loadSettings(),
        loadInstructors(),
        loadCourses(),
        loadTags()
      ]);
      setYears(yrs);
      setSelectedYear(yrs[0]);
      setSections(sects);
      setSettings(sett);
      setInstructors(instr);
      setCourses(crs);
      setTags(tgs);
      initialLoadDone.current = true;
      setScreen('main');
    }
    init();
  }, []);

  // Reload sections when year/semester changes (after initial load)
  useEffect(() => {
    if (!initialLoadDone.current) return;
    async function reload() {
      const sects = await loadSections(selectedYear, selectedSemester);
      setSections(sects);
      setEditingSection(null);
      setShowForm(false);
      setSelectedSectionIds(new Set());
    }
    reload();
  }, [selectedYear, selectedSemester]);

  // Save sections when they change (after initial load)
  useEffect(() => {
    if (!initialLoadDone.current) return;
    saveSections(sections, selectedYear, selectedSemester)
      .then(() => {
        if (settings.csvExportPath) {
          exportCsv(sections, instructors, courses, selectedYear, selectedSemester, settings.csvExportPath).catch(() => {});
        }
        // Update instructor history for current year/semester
        const termKey = `${selectedYear}-${selectedSemester}`;
        const updatedInstructors = instructors.map(inst => {
          const entries = sections
            .filter(s => s.instructor === inst.name)
            .map(s => ({ courseName: s.courseName, sectionNumber: s.sectionNumber, location: s.location }));
          const history = { ...inst.history, [termKey]: entries };
          return { ...inst, history };
        });
        const changed = updatedInstructors.some((inst, i) =>
          JSON.stringify(inst.history) !== JSON.stringify(instructors[i].history)
        );
        if (changed) {
          setInstructors(updatedInstructors);
          saveInstructors(updatedInstructors).catch(() => {});
        }

        // Update course history for current year/semester
        const updatedCourses = courses.map(course => {
          const entries = sections
            .filter(s => s.courseName === course.abbreviation)
            .map(s => ({ sectionNumber: s.sectionNumber, instructor: s.instructor, location: s.location }));
          const history = { ...course.history, [termKey]: entries };
          return { ...course, history };
        });
        const coursesChanged = updatedCourses.some((course, i) =>
          JSON.stringify(course.history) !== JSON.stringify(courses[i].history)
        );
        if (coursesChanged) {
          setCourses(updatedCourses);
          saveCourses(updatedCourses).catch(() => {});
        }
      })
      .catch(err => {
        if (err instanceof ConflictError) {
          setShowConflict(true);
        }
      });
  }, [sections, selectedYear, selectedSemester, settings.csvExportPath]);

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

  async function handleSelectFolder() {
    const config = await window.storageApi.selectFolder();
    if (config) {
      const [yrs, sett, instr, crs, tgs] = await Promise.all([
        loadYears(),
        loadSettings(),
        loadInstructors(),
        loadCourses(),
        loadTags()
      ]);
      setYears(yrs);
      setSelectedYear(yrs[0]);
      setSettings(sett);
      setInstructors(instr);
      setCourses(crs);
      setTags(tgs);
      const sects = await loadSections(yrs[0], 'Fall');
      setSections(sects);
      initialLoadDone.current = true;
      setScreen('main');
    }
  }

  async function handleChangeFolder() {
    const config = await window.storageApi.changeFolder();
    if (config) {
      const [yrs, sett, instr, crs, tgs] = await Promise.all([
        loadYears(),
        loadSettings(),
        loadInstructors(),
        loadCourses(),
        loadTags()
      ]);
      setYears(yrs);
      setSelectedYear(yrs[0]);
      setSelectedSemester('Fall');
      setSettings(sett);
      setInstructors(instr);
      setCourses(crs);
      setTags(tgs);
      const sects = await loadSections(yrs[0], 'Fall');
      setSections(sects);
    }
  }

  function handleAddYear() {
    const nextYear = Math.max(...years) + 1;
    const updated = [...years, nextYear];
    setYears(updated);
    saveYears(updated).catch(() => {});
  }

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

  function advanceSectionNumber(sectionNumber: string): string {
    const match = sectionNumber.match(/^(.*?)(\d+)$/);
    if (!match) return sectionNumber;
    const prefix = match[1];
    const num = parseInt(match[2], 10) + 1;
    const padded = String(num).padStart(match[2].length, '0');
    return prefix + padded;
  }

  function handleDuplicate(section: Section) {
    const match = section.sectionNumber.match(/^(.*?)(\d+)$/);
    if (!match) return;
    const existingNumbers = new Set(
      sections.filter(s => s.courseName === section.courseName).map(s => s.sectionNumber)
    );
    let newNumber = advanceSectionNumber(section.sectionNumber);
    if (match) {
      // Keep incrementing until we find an unused number
      const prefix = match[1];
      const padLen = match[2].length;
      let num = parseInt(match[2], 10) + 1;
      while (existingNumbers.has(prefix + String(num).padStart(padLen, '0'))) {
        num++;
      }
      newNumber = prefix + String(num).padStart(padLen, '0');
    }
    const newSection: Section = {
      id: crypto.randomUUID(),
      courseName: section.courseName,
      sectionNumber: newNumber,
      instructor: '',
      meetings: [],
      location: '',
      color: settings.defaultSectionColor || getNextColor(sections.map(s => s.color)),
    };
    setSections(prev => [...prev, newSection]);
  }

  function handleDelete(id: string) {
    setSections(prev => prev.filter(s => s.id !== id));
    if (editingSection?.id === id) {
      setEditingSection(null);
      setShowForm(false);
    }
  }

  async function handleConflictOverwrite() {
    setShowConflict(false);
    await forceSaveSections(sections, selectedYear, selectedSemester);
  }

  async function handleConflictReload() {
    setShowConflict(false);
    refreshTimestamp(selectedYear, selectedSemester);
    const sects = await loadSections(selectedYear, selectedSemester);
    setSections(sects);
  }

  if (screen === 'loading') {
    return (
      <div className="setup-screen">
        <div className="setup-card">
          <h1>Course Schedule Visualizer</h1>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (screen === 'setup') {
    return (
      <div className="setup-screen">
        <div className="setup-card">
          <h1>Course Schedule Visualizer</h1>
          <p>Select a shared folder to store schedule data. This folder should be accessible to all users who need to view or edit schedules.</p>
          <button className="add-section-btn" onClick={handleSelectFolder}>
            Select Folder
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Course Schedule Visualizer</h1>
        <div className="header-controls">
          <select
            className="header-select"
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button className="header-add-year" onClick={handleAddYear} title="Add year">+</button>
          <select
            className="header-select"
            value={selectedSemester}
            onChange={e => setSelectedSemester(e.target.value as Semester)}
          >
            {SEMESTERS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button className="settings-btn" onClick={() => setShowCourses(true)}>Courses</button>
          <button className="settings-btn" onClick={() => setShowInstructors(true)}>Instructors</button>
          <button className="settings-btn" onClick={() => setShowTags(true)}>Tags</button>
          <button className="settings-btn" onClick={() => setShowSettings(true)}>Settings</button>
        </div>
      </header>
      {!settings.csvExportPath && !csvBannerDismissed && (
        <div className="csv-prompt-banner">
          <span>CSV export folder not configured. Set it in Settings to auto-export readable schedule files.</span>
          <button className="csv-banner-link" onClick={() => setShowSettings(true)}>Set up</button>
          <button className="csv-banner-dismiss" onClick={() => setCsvBannerDismissed(true)}>Dismiss</button>
        </div>
      )}
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
              courses={courses}
              tags={tags}
              defaultSectionColor={settings.defaultSectionColor}
              existingSections={sections}
            />
          ) : (
            <button className="add-section-btn" onClick={() => setShowForm(true)}>
              + Add Section
            </button>
          )}
          <SectionList
            sections={sections}
            instructors={instructors}
            tags={tags}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
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
            instructors={instructors}
            selectedSectionIds={selectedSectionIds}
            allowedStartTimes={settings.allowedStartTimes}
            allowedEndTimes={settings.allowedEndTimes}
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
          onChangeFolder={handleChangeFolder}
        />
      )}
      {showInstructors && (
        <InstructorsPanel
          instructors={instructors}
          onSave={(list) => { setInstructors(list); saveInstructors(list); setShowInstructors(false); }}
          onClose={() => setShowInstructors(false)}
        />
      )}
      {showTags && (
        <TagsPanel
          tags={tags}
          onSave={(list) => { setTags(list); saveTags(list); setShowTags(false); }}
          onClose={() => setShowTags(false)}
        />
      )}
      {showCourses && (
        <CoursesPanel
          courses={courses}
          onSave={(list) => { setCourses(list); saveCourses(list); setShowCourses(false); }}
          onClose={() => setShowCourses(false)}
        />
      )}
      {showConflict && (
        <ConflictDialog
          onOverwrite={handleConflictOverwrite}
          onReload={handleConflictReload}
        />
      )}
    </div>
  );
}
