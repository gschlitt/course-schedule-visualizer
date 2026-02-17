import { Instructor, Section, Semester } from '../types';

interface Props {
  instructors: Instructor[];
  sections: Section[];
  selectedYear: number;
  selectedSemester: Semester;
  selectedIds: Set<string>;
  onSelectInstructor: (name: string) => void;
}

export default function InstructorsSummary({ instructors, sections, selectedYear, selectedSemester, selectedIds, onSelectInstructor }: Props) {
  if (instructors.length === 0) return null;

  const currentTermKey = `${selectedYear}-${selectedSemester}`;

  function getSemesterWorkload(inst: Instructor): number {
    return sections
      .filter(s => s.instructor === inst.name)
      .reduce((sum, s) => sum + (s.workload ?? 0), 0);
  }

  function getYearWorkload(inst: Instructor, liveSemesterWL: number): number {
    let otherSemestersTotal = 0;
    if (inst.history) {
      for (const [key, entries] of Object.entries(inst.history)) {
        if (key.startsWith(`${selectedYear}-`) && key !== currentTermKey) {
          otherSemestersTotal += entries.reduce((sum, e) => sum + (e.workload ?? 0), 0);
        }
      }
    }
    return otherSemestersTotal + liveSemesterWL;
  }

  return (
    <div className="instructors-summary">
      <h3>Workload</h3>
      <div className="instructors-summary-list">
        {instructors.map(inst => {
          const assigned = sections.filter(s => s.instructor === inst.name);
          const isActive = assigned.length > 0 && assigned.every(s => selectedIds.has(s.id));
          const semesterWL = getSemesterWorkload(inst);
          const yearWL = getYearWorkload(inst, semesterWL);

          return (
            <div key={inst.id} className={`instructor-summary-row${isActive ? ' instructor-summary-row-selected' : ''}`}>
              <div className="instructor-summary-info">
                <span
                  className="instructor-summary-name"
                  onClick={() => onSelectInstructor(inst.name)}
                >
                  {inst.name}{inst.abbreviation ? ` (${inst.abbreviation})` : ''}
                </span>
                <div className="instructor-summary-workload">
                  <span>Semester: {semesterWL}</span>
                  <span>Year: {yearWL}</span>
                </div>
              </div>
              {assigned.length > 0 ? (
                <div className="instructor-summary-sections">
                  {assigned.map(s => (
                    <span
                      key={s.id}
                      className="instructor-section-tag"
                      style={{ borderColor: s.color, color: s.color }}
                    >
                      {s.courseName}{s.sectionNumber ? ` #${s.sectionNumber}` : ''}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="instructor-summary-none">Unassigned</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
