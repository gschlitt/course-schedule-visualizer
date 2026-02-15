import { Section, Settings, Day } from '../types';

const STORAGE_KEY = 'course-schedule-sections';
const SETTINGS_KEY = 'course-schedule-settings';

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

export function loadSections(): Section[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const parsed: (LegacySection | Section)[] = JSON.parse(data);
    return parsed.map(migrateSection);
  } catch {
    return [];
  }
}

export function saveSections(sections: Section[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sections));
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
