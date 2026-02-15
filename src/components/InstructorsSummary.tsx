import { Instructor, Section } from '../types';

interface Props {
  instructors: Instructor[];
  sections: Section[];
}

export default function InstructorsSummary({ instructors, sections }: Props) {
  if (instructors.length === 0) return null;

  return (
    <div className="instructors-summary">
      <h3>Instructors</h3>
      <div className="instructors-summary-list">
        {instructors.map(inst => {
          const assigned = sections.filter(s => s.instructor === inst.name);
          return (
            <div key={inst.id} className="instructor-summary-row">
              <span className="instructor-summary-name">{inst.name}</span>
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
