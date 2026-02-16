import { Section, Semester, Instructor, Course } from '../types';

function formatTime12h(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const display = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${display}:${String(m).padStart(2, '0')} ${suffix}`;
}

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function sectionsToCsv(sections: Section[], instructors: Instructor[], courses: Course[]): string {
  const header = 'Course Name,Course Title,Section Number,Instructor,Abbreviation,Day,Start Time,End Time,Location';
  const rows: string[] = [header];

  for (const section of sections) {
    const inst = instructors.find(i => i.name === section.instructor);
    const abbreviation = inst?.abbreviation || '';
    const course = courses.find(c => c.abbreviation === section.courseName);
    const courseTitle = course?.title || '';
    for (const meeting of section.meetings) {
      rows.push([
        escapeCsvField(section.courseName),
        escapeCsvField(courseTitle),
        escapeCsvField(section.sectionNumber),
        escapeCsvField(section.instructor),
        escapeCsvField(abbreviation),
        meeting.day,
        formatTime12h(meeting.startTime),
        formatTime12h(meeting.endTime),
        escapeCsvField(section.location)
      ].join(','));
    }
  }

  return rows.join('\n');
}

export async function exportCsv(
  sections: Section[],
  instructors: Instructor[],
  courses: Course[],
  year: number,
  semester: Semester,
  csvPath: string
): Promise<void> {
  const csvContent = sectionsToCsv(sections, instructors, courses);
  const filename = `${year}-${semester}.csv`;
  await window.storageApi.writeCsv(csvPath, filename, csvContent);
}
