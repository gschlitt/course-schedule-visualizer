import { Section, Day, Instructor } from '../types';

const DAY_ORDER: Day[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

interface Props {
  sections: Section[];
  instructors: Instructor[];
  onEdit: (section: Section) => void;
  onDelete: (id: string) => void;
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
}

export default function SectionList({ sections, instructors, onEdit, onDelete, selectedIds, onSelect }: Props) {
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
          <div
            key={s.id}
            className={`section-card${selectedIds.has(s.id) ? ' section-card-selected' : ''}`}
            style={{ borderLeftColor: s.color }}
            onClick={() => onSelect(s.id)}
          >
            <div className="section-card-header">
              <strong>{s.courseName}</strong>
              {s.sectionNumber && <span className="section-num">#{s.sectionNumber}</span>}
              <div className="section-card-actions">
                <button className="btn-icon" onClick={e => { e.stopPropagation(); onEdit(s); }} title="Edit">&#9998;</button>
                <button className="btn-icon btn-icon-danger" onClick={e => { e.stopPropagation(); onDelete(s.id); }} title="Delete">&times;</button>
              </div>
            </div>
            {s.instructor && <div className="section-detail">{s.instructor}{(() => { const inst = instructors.find(i => i.name === s.instructor); return inst?.abbreviation ? ` (${inst.abbreviation})` : ''; })()}</div>}
            {sorted.map((m, i) => (
              <div key={i} className="section-detail">
                {m.day} &middot; {m.startTime}–{m.endTime}
              </div>
            ))}
            {s.location && <div className="section-detail">{s.location}</div>}
          </div>
        );
      })}
    </div>
  );
}
