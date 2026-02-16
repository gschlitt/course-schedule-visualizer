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
}

export interface Instructor {
  id: string;
  name: string;
  abbreviation: string;
}

export interface Settings {
  allowedStartTimes: string[];
  allowedEndTimes: string[];
  csvExportPath?: string;
}
