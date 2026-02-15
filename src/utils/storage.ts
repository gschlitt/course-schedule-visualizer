import { Section, Settings, Day, Instructor, Semester } from '../types';

const OLD_SECTIONS_KEY = 'course-schedule-sections';
const YEARS_KEY = 'course-schedule-years';
const SETTINGS_KEY = 'course-schedule-settings';
const INSTRUCTORS_KEY = 'course-schedule-instructors';

function sectionsKey(year: number, semester: Semester): string {
  return `course-schedule-sections-${year}-${semester}`;
}

interface LegacySection {
  id: string;
  courseName: string;
  sectionNumber: string;
  instructor: string;
  days: Day[];
  startTime: string;
  endTime: string;
  location: string;
  color: string;
}

function migrateSection(raw: LegacySection | Section): Section {
  if ('meetings' in raw) return raw as Section;
  const legacy = raw as LegacySection;
  return {
    id: legacy.id,
    courseName: legacy.courseName,
    sectionNumber: legacy.sectionNumber,
    instructor: legacy.instructor,
    meetings: legacy.days.map(day => ({
      day,
      startTime: legacy.startTime,
      endTime: legacy.endTime,
    })),
    location: legacy.location,
    color: legacy.color,
  };
}

let migrationDone = false;

function runMigration(): void {
  if (migrationDone) return;
  migrationDone = true;
  const oldData = localStorage.getItem(OLD_SECTIONS_KEY);
  if (!oldData) return;
  // Only migrate if no keyed data exists yet
  const targetKey = sectionsKey(2026, 'Fall');
  if (localStorage.getItem(targetKey)) return;
  try {
    const parsed: (LegacySection | Section)[] = JSON.parse(oldData);
    const migrated = parsed.map(migrateSection);
    localStorage.setItem(targetKey, JSON.stringify(migrated));
    localStorage.removeItem(OLD_SECTIONS_KEY);
  } catch {
    // If migration fails, leave old data in place
  }
}

export function loadYears(): number[] {
  try {
    const data = localStorage.getItem(YEARS_KEY);
    if (data) {
      const years: number[] = JSON.parse(data);
      return years.length > 0 ? years : [2026];
    }
    return [2026];
  } catch {
    return [2026];
  }
}

export function saveYears(years: number[]): void {
  localStorage.setItem(YEARS_KEY, JSON.stringify(years));
}

export function loadSections(year: number, semester: Semester): Section[] {
  runMigration();
  try {
    const data = localStorage.getItem(sectionsKey(year, semester));
    if (!data) return [];
    const parsed: (LegacySection | Section)[] = JSON.parse(data);
    return parsed.map(migrateSection);
  } catch {
    return [];
  }
}

export function saveSections(sections: Section[], year: number, semester: Semester): void {
  localStorage.setItem(sectionsKey(year, semester), JSON.stringify(sections));
}

function generateTimes(startHour: number, endHour: number, intervalMin: number): string[] {
  const times: string[] = [];
  for (let h = startHour; h <= endHour; h++) {
    for (let m = 0; m < 60; m += intervalMin) {
      if (h === endHour && m > 0) break;
      times.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return times;
}

export const DEFAULT_SETTINGS: Settings = {
  allowedStartTimes: generateTimes(7, 21, 30),
  allowedEndTimes: generateTimes(7, 22, 30),
};

export function loadSettings(): Settings {
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    return data ? JSON.parse(data) : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function loadInstructors(): Instructor[] {
  try {
    const data = localStorage.getItem(INSTRUCTORS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveInstructors(instructors: Instructor[]): void {
  localStorage.setItem(INSTRUCTORS_KEY, JSON.stringify(instructors));
}
