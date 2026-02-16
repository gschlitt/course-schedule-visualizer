export type Day = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri';

export type Semester = 'Fall' | 'Winter' | 'Summer';

export interface Meeting {
  day: Day;
  startTime: string;
  endTime: string;
}

export interface Section {
  id: string;
  courseName: string;
  sectionNumber: string;
  instructor: string;
  meetings: Meeting[];
  location: string;
  color: string;
  tagIds?: string[];
}

export interface InstructorHistoryEntry {
  courseName: string;
  sectionNumber: string;
  location: string;
}

export interface Instructor {
  id: string;
  name: string;
  abbreviation: string;
  history?: Record<string, InstructorHistoryEntry[]>; // key = "2026-Fall"
}

export interface CourseHistoryEntry {
  sectionNumber: string;
  instructor: string;
  location: string;
}

export interface Course {
  id: string;
  title: string;
  abbreviation: string;
  history?: Record<string, CourseHistoryEntry[]>; // key = "2026-Fall"
}

export interface Tag {
  id: string;
  name: string;
}

export interface Settings {
  allowedStartTimes: string[];
  allowedEndTimes: string[];
  csvExportPath?: string;
  defaultSectionColor?: string;
}
