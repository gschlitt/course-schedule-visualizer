import { useState, useEffect, useRef, useCallback, useMemo, type MouseEvent as ReactMouseEvent } from 'react';
import { Section, Settings, Instructor, Course, Semester, Tag, SectionAttributes } from './types';
import {
  loadSections, saveSections, forceSaveSections, batchForceSaveSections, batchSaveSectionsAndHistory,
  loadSettings, saveSettings,
  loadInstructors, saveInstructors,
  loadCourses, saveCourses,
  loadTags, saveTags,
  loadSectionAttributes, saveSectionAttributes,
  loadYears, saveYears,
  DEFAULT_SETTINGS, ConflictError, refreshTimestamp
} from './utils/storage';
import SectionForm from './components/SectionForm';
import SectionList from './components/SectionList';
import ScheduleView from './components/ScheduleView';
import SettingsPanel from './components/SettingsPanel';
import InstructorsPanel from './components/InstructorsPanel';
import CoursesPanel from './components/CoursesPanel';
import SectionAttributesPanel from './components/SectionAttributesPanel';
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
  const [sectionAttributes, setSectionAttributes] = useState<SectionAttributes>({ subjects: [], sectionTypes: [], meetingTypes: [], campuses: [], resources: [], levels: [] });
  const [showAttributes, setShowAttributes] = useState(false);
  const [leftWidth, setLeftWidth] = useState(340);
  const [showConflict, setShowConflict] = useState(false);
  const [csvBannerDismissed, setCsvBannerDismissed] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [filterTagIds, setFilterTagIds] = useState<Set<string>>(new Set());
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const initialLoadDone = useRef(false);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const saveGeneration = useRef(0);

  function logError(message: string, context?: string, err?: unknown) {
    const stack = err instanceof Error ? err.stack : undefined;
    window.storageApi.logError({ message, context, stack }).catch(() => {});
  }

  function showError(userMessage: string, context?: string, err?: unknown) {
    logError(userMessage, context, err);
    setSaveError(userMessage);
  }

  async function handleSendReport() {
    const logContents = await window.storageApi.getErrorLog();
    const logPath = await window.storageApi.getErrorLogPath();
    const body = [
      `Error: ${saveError}`,
      '',
      `App: Course Schedule Visualizer`,
      `Time: ${new Date().toISOString()}`,
      `Year/Semester: ${selectedYear} ${selectedSemester}`,
      '',
      '--- Recent log entries ---',
      // Include last ~30 lines to stay within mailto limits
      logContents.split('\n').slice(-30).join('\n'),
      '',
      `Full log file: ${logPath}`,
    ].join('\n');
    await window.storageApi.sendErrorReport(body);
  }

  // Initial load: check config, then load all data
  useEffect(() => {
    async function init() {
      const config = await window.storageApi.getConfig();
      if (!config) {
        setScreen('setup');
        return;
      }
      const [yrs, sects, sett, instr, crs, tgs, attrs] = await Promise.all([
        loadYears(),
        loadSections(2026, 'Fall'),
        loadSettings(),
        loadInstructors(),
        loadCourses(),
        loadTags(),
        loadSectionAttributes()
      ]);
      setYears(yrs);
      setSelectedYear(yrs[0]);
      setSections(sects);
      setSettings(sett);
      setInstructors(instr);
      setCourses(crs);
      setTags(tgs);
      setSectionAttributes(attrs);
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
  // Uses a serialized queue so concurrent saves never overlap or write stale data.
  useEffect(() => {
    if (!initialLoadDone.current) return;
    const gen = ++saveGeneration.current;
    // Capture current values for this save
    const sectionsSnapshot = sections;
    const yearSnapshot = selectedYear;
    const semesterSnapshot = selectedSemester;
    const csvPath = settings.csvExportPath;
    const instrSnapshot = instructors;
    const coursesSnapshot = courses;

    saveQueue.current = saveQueue.current
      .then(async () => {
        // If a newer save was queued, skip this stale one
        if (gen !== saveGeneration.current) return;

        // Compute instructor history updates
        const termKey = `${yearSnapshot}-${semesterSnapshot}`;
        const updatedInstructors = instrSnapshot.map(inst => {
          const entries = sectionsSnapshot
            .filter(s => s.instructor === inst.name)
            .map(s => ({ courseName: s.courseName, sectionNumber: s.sectionNumber, location: s.location, workload: s.workload }));
          const history = { ...inst.history, [termKey]: entries };
          return { ...inst, history };
        });
        const instrChanged = updatedInstructors.some((inst, i) =>
          JSON.stringify(inst.history) !== JSON.stringify(instrSnapshot[i].history)
        );

        // Compute course history updates
        const updatedCourses = coursesSnapshot.map(course => {
          const entries = sectionsSnapshot
            .filter(s => s.courseName === course.abbreviation)
            .map(s => ({ sectionNumber: s.sectionNumber, instructor: s.instructor, location: s.location }));
          const history = { ...course.history, [termKey]: entries };
          return { ...course, history };
        });
        const coursesChanged = updatedCourses.some((course, i) =>
          JSON.stringify(course.history) !== JSON.stringify(coursesSnapshot[i].history)
        );

        // Re-check before writing
        if (gen !== saveGeneration.current) return;

        // Atomically save sections + any changed history in one batch
        await batchSaveSectionsAndHistory(
          sectionsSnapshot, yearSnapshot, semesterSnapshot,
          instrChanged ? updatedInstructors : undefined,
          coursesChanged ? updatedCourses : undefined
        );

        // Update React state for history changes
        if (instrChanged) setInstructors(updatedInstructors);
        if (coursesChanged) setCourses(updatedCourses);

        // CSV export is secondary — surface failures but don't block
        if (csvPath) {
          try {
            await exportCsv(sectionsSnapshot, instrSnapshot, coursesSnapshot, yearSnapshot, semesterSnapshot, csvPath);
          } catch (csvErr) {
            showError('CSV export failed. Check that the export folder is accessible.', 'csv-export', csvErr);
          }
        }
      })
      .catch(err => {
        if (err instanceof ConflictError) {
          setShowConflict(true);
        } else {
          showError(`Failed to save: ${err instanceof Error ? err.message : err}`, 'save-sections', err);
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

  // Close filter dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node)) {
        setFilterDropdownOpen(false);
      }
    }
    if (filterDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [filterDropdownOpen]);

  // Test trigger: Ctrl+Shift+E simulates a save error
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        showError('Test error: this is a simulated save failure.', 'test-trigger', new Error('Simulated error for testing'));
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  async function handleSelectFolder() {
    const config = await window.storageApi.selectFolder();
    if (config) {
      const [yrs, sett, instr, crs, tgs, attrs] = await Promise.all([
        loadYears(),
        loadSettings(),
        loadInstructors(),
        loadCourses(),
        loadTags(),
        loadSectionAttributes()
      ]);
      setYears(yrs);
      setSelectedYear(yrs[0]);
      setSettings(sett);
      setInstructors(instr);
      setCourses(crs);
      setTags(tgs);
      setSectionAttributes(attrs);
      const sects = await loadSections(yrs[0], 'Fall');
      setSections(sects);
      initialLoadDone.current = true;
      setScreen('main');
    }
  }

  async function handleChangeFolder() {
    const config = await window.storageApi.changeFolder();
    if (config) {
      const [yrs, sett, instr, crs, tgs, attrs] = await Promise.all([
        loadYears(),
        loadSettings(),
        loadInstructors(),
        loadCourses(),
        loadTags(),
        loadSectionAttributes()
      ]);
      setYears(yrs);
      setSelectedYear(yrs[0]);
      setSelectedSemester('Fall');
      setSettings(sett);
      setInstructors(instr);
      setCourses(crs);
      setTags(tgs);
      setSectionAttributes(attrs);
      const sects = await loadSections(yrs[0], 'Fall');
      setSections(sects);
    }
  }

  function handleAddYear() {
    const nextYear = Math.max(...years) + 1;
    const updated = [...years, nextYear];
    setYears(updated);
    saveYears(updated).catch(err => showError('Failed to save year list.', 'save-years', err));
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

  async function renameSectionsAcrossSemesters(
    renameFn: (section: Section) => Section
  ) {
    // Collect all changes across semesters before writing anything
    const batch: { sections: Section[]; year: number; semester: Semester }[] = [];
    for (const year of years) {
      for (const sem of SEMESTERS) {
        if (year === selectedYear && sem === selectedSemester) continue;
        const sects = await loadSections(year, sem);
        const updated = sects.map(renameFn);
        if (JSON.stringify(sects) !== JSON.stringify(updated)) {
          batch.push({ sections: updated, year, semester: sem });
        }
      }
    }
    // Write all changed semesters atomically, then update current in state
    if (batch.length > 0) {
      await batchForceSaveSections(batch);
    }
    setSections(prev => prev.map(renameFn));
  }

  async function handleInstructorSave(list: Instructor[], instrRenames: { oldName: string; newName: string }[]) {
    setInstructors(list);
    saveInstructors(list);
    if (instrRenames.length > 0) {
      await renameSectionsAcrossSemesters(section => {
        let instructor = section.instructor;
        for (const r of instrRenames) {
          if (instructor === r.oldName) instructor = r.newName;
        }
        return instructor !== section.instructor ? { ...section, instructor } : section;
      });
    }
    setShowInstructors(false);
  }

  async function handleCourseSave(list: Course[], courseRenames: { oldAbbr: string; newAbbr: string }[]) {
    setCourses(list);
    saveCourses(list);
    if (courseRenames.length > 0) {
      await renameSectionsAcrossSemesters(section => {
        let courseName = section.courseName;
        for (const r of courseRenames) {
          if (courseName === r.oldAbbr) courseName = r.newAbbr;
        }
        return courseName !== section.courseName ? { ...section, courseName } : section;
      });
    }
    setShowCourses(false);
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

  const filteredSections = useMemo(() => {
    if (filterTagIds.size === 0) return sections;
    return sections.filter(s =>
      s.tagIds && [...filterTagIds].every(tagId => s.tagIds!.includes(tagId))
    );
  }, [sections, filterTagIds]);

  function toggleFilterTag(tagId: string) {
    setFilterTagIds(prev => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
  }

  // Filter tag names for display in banner
  const filterTagNames = useMemo(() =>
    [...filterTagIds].map(id => tags.find(t => t.id === id)?.name).filter(Boolean) as string[],
    [filterTagIds, tags]
  );

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
          {tags.length > 0 && (
            <div className="filter-dropdown-wrapper" ref={filterDropdownRef}>
              <button
                className={`settings-btn${filterTagIds.size > 0 ? ' filter-btn-active' : ''}`}
                onClick={() => setFilterDropdownOpen(o => !o)}
              >
                Filter{filterTagIds.size > 0 ? ` (${filterTagIds.size})` : ''}
              </button>
              {filterDropdownOpen && (
                <div className="filter-dropdown">
                  {tags.map(tag => (
                    <label key={tag.id} className="filter-dropdown-item">
                      <input
                        type="checkbox"
                        checked={filterTagIds.has(tag.id)}
                        onChange={() => toggleFilterTag(tag.id)}
                      />
                      <span>{tag.name}</span>
                    </label>
                  ))}
                  {filterTagIds.size > 0 && (
                    <button className="filter-dropdown-clear" onClick={() => { setFilterTagIds(new Set()); setFilterDropdownOpen(false); }}>Clear all</button>
                  )}
                </div>
              )}
            </div>
          )}
          <button className="settings-btn" onClick={() => setShowCourses(true)}>Courses</button>
          <button className="settings-btn" onClick={() => setShowInstructors(true)}>Instructors</button>
          <button className="settings-btn" onClick={() => setShowAttributes(true)}>Attributes</button>
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
      {saveError && (
        <div className="save-error-banner">
          <span>{saveError}</span>
          <button className="save-error-report" onClick={handleSendReport}>Send Report</button>
          <button className="save-error-dismiss" onClick={() => setSaveError(null)}>Dismiss</button>
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
              sectionAttributes={sectionAttributes}
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
            sections={filteredSections}
            instructors={instructors}
            selectedSectionIds={selectedSectionIds}
            allowedStartTimes={settings.allowedStartTimes}
            allowedEndTimes={settings.allowedEndTimes}
            onSelectSection={id => setSelectedSectionIds(prev =>
              prev.size === 1 && prev.has(id) ? new Set() : new Set([id])
            )}
            onChangeInstructor={(sectionId, instructorName) => {
              setSections(prev => prev.map(s => s.id === sectionId ? { ...s, instructor: instructorName } : s));
            }}
            filterTagNames={filterTagNames}
            onClearFilter={() => setFilterTagIds(new Set())}
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
          onSave={handleInstructorSave}
          onClose={() => setShowInstructors(false)}
        />
      )}
      {showAttributes && (
        <SectionAttributesPanel
          attributes={sectionAttributes}
          tags={tags}
          onSave={(attrs, newTags) => { setSectionAttributes(attrs); saveSectionAttributes(attrs); setTags(newTags); saveTags(newTags); setShowAttributes(false); }}
          onClose={() => setShowAttributes(false)}
        />
      )}
      {showCourses && (
        <CoursesPanel
          courses={courses}
          subjects={sectionAttributes.subjects}
          onSave={handleCourseSave}
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
