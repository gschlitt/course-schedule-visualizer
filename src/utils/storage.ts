import { Section, Settings, Instructor, Course, Semester, Tag } from '../types';

function sectionsFilename(year: number, semester: Semester): string {
  return `sections-${year}-${semester}.json`;
}

// Track last-known mtimeMs for each file (for optimistic concurrency)
const lastKnownTimestamps = new Map<string, number>();

export class ConflictError extends Error {
  currentData: unknown;
  constructor(filename: string, currentData: unknown) {
    super(`Conflict detected on ${filename}`);
    this.name = 'ConflictError';
    this.currentData = currentData;
  }
}

async function readFile<T>(filename: string, fallback: T): Promise<T> {
  try {
    const result = await window.storageApi.read(filename);
    if (result.data !== null) {
      lastKnownTimestamps.set(filename, result.lastModified);
      return result.data as T;
    }
  } catch {
    // ignore
  }
  return fallback;
}

async function writeFile(filename: string, data: unknown): Promise<void> {
  const expectedLastModified = lastKnownTimestamps.get(filename) ?? 0;
  const result = await window.storageApi.write(filename, { data, expectedLastModified });
  if (result.conflict) {
    throw new ConflictError(filename, result.currentData);
  }
  if (result.success) {
    lastKnownTimestamps.set(filename, result.lastModified);
  }
}

// Force write (skip conflict check) - used when user chooses "Overwrite"
async function forceWriteFile(filename: string, data: unknown): Promise<void> {
  const result = await window.storageApi.write(filename, { data, expectedLastModified: 0 });
  if (result.success) {
    lastKnownTimestamps.set(filename, result.lastModified);
  }
}

export async function loadYears(): Promise<number[]> {
  const years = await readFile<number[]>('years.json', [2026]);
  return years.length > 0 ? years : [2026];
}

export async function saveYears(years: number[]): Promise<void> {
  await writeFile('years.json', years);
}

export async function loadSections(year: number, semester: Semester): Promise<Section[]> {
  return readFile<Section[]>(sectionsFilename(year, semester), []);
}

export async function saveSections(sections: Section[], year: number, semester: Semester): Promise<void> {
  await writeFile(sectionsFilename(year, semester), sections);
}

export async function forceSaveSections(sections: Section[], year: number, semester: Semester): Promise<void> {
  await forceWriteFile(sectionsFilename(year, semester), sections);
}

export async function batchForceSaveSections(
  entries: { sections: Section[]; year: number; semester: Semester }[]
): Promise<void> {
  const batch = entries.map(e => ({
    filename: sectionsFilename(e.year, e.semester),
    data: e.sections,
  }));
  const result = await window.storageApi.batchWrite(batch);
  if (!result.success) {
    throw new Error(result.error || 'Batch write failed');
  }
  // Update local timestamp cache
  if (result.timestamps) {
    for (const [filename, ts] of Object.entries(result.timestamps)) {
      lastKnownTimestamps.set(filename, ts);
    }
  }
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

export async function loadSettings(): Promise<Settings> {
  return readFile<Settings>('settings.json', DEFAULT_SETTINGS);
}

export async function saveSettings(settings: Settings): Promise<void> {
  await writeFile('settings.json', settings);
}

export async function loadInstructors(): Promise<Instructor[]> {
  return readFile<Instructor[]>('instructors.json', []);
}

export async function saveInstructors(instructors: Instructor[]): Promise<void> {
  await writeFile('instructors.json', instructors);
}

export async function loadCourses(): Promise<Course[]> {
  return readFile<Course[]>('courses.json', []);
}

export async function saveCourses(courses: Course[]): Promise<void> {
  await writeFile('courses.json', courses);
}

export async function loadTags(): Promise<Tag[]> {
  return readFile<Tag[]>('tags.json', []);
}

export async function saveTags(tags: Tag[]): Promise<void> {
  await writeFile('tags.json', tags);
}

export async function batchSaveSectionsAndHistory(
  sections: Section[],
  year: number,
  semester: Semester,
  instructors?: Instructor[],
  courses?: Course[]
): Promise<void> {
  const entries: { filename: string; data: unknown }[] = [
    { filename: sectionsFilename(year, semester), data: sections },
  ];
  if (instructors) entries.push({ filename: 'instructors.json', data: instructors });
  if (courses) entries.push({ filename: 'courses.json', data: courses });

  const result = await window.storageApi.batchWrite(entries);
  if (!result.success) {
    throw new Error(result.error || 'Batch write failed');
  }
  if (result.timestamps) {
    for (const [filename, ts] of Object.entries(result.timestamps)) {
      lastKnownTimestamps.set(filename, ts);
    }
  }
}

// Refresh timestamps for a file (used after conflict resolution with "Reload")
export function refreshTimestamp(year: number, semester: Semester): void {
  // Will be updated on next read
  lastKnownTimestamps.delete(sectionsFilename(year, semester));
}
