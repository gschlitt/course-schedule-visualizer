import { Section, Day } from '../types';

const DAY_ORDER: Day[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

interface Props {
  sections: Section[];
  onEdit: (section: Section) => void;
  onDelete: (id: string) => void;
}

export default function SectionList({ sections, onEdit, onDelete }: Props) {
  if (sections.length === 0) {
    return <p className="empty-msg">No sections added yet.</p>;
  }

  return (
    <div className="section-list">
      <h3>Sections ({sections.length})</h3>
      {sections.map(s => {
        const sorted = [...s.meetings].sort(
          (a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day) || a.startTime.localeCompare(b.startTime)
        );
        return (
          <div key={s.id} className="section-card" style={{ borderLeftColor: s.color }}>
            <div className="section-card-header">
              <strong>{s.courseName}</strong>
              {s.sectionNumber && <span className="section-num">#{s.sectionNumber}</span>}
            </div>
            {s.instructor && <div className="section-detail">{s.instructor}</div>}
            {sorted.map((m, i) => (
              <div key={i} className="section-detail">
                {m.day} &middot; {m.startTime}–{m.endTime}
              </div>
            ))}
            {s.location && <div className="section-detail">{s.location}</div>}
            <div className="section-card-actions">
              <button className="btn-sm" onClick={() => onEdit(s)}>Edit</button>
              <button className="btn-sm btn-danger" onClick={() => onDelete(s.id)}>Delete</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
