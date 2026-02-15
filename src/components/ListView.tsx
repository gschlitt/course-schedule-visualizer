import { Section, Day } from '../types';

const DAYS: Day[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

interface Props {
  sections: Section[];
}

export default function ListView({ sections }: Props) {
  if (sections.length === 0) {
    return <p className="empty-msg">No sections to display.</p>;
  }

  return (
    <div className="list-view">
      {DAYS.map(day => {
        const dayEntries = sections.flatMap(s =>
          s.meetings
            .filter(m => m.day === day)
            .map(m => ({ section: s, meeting: m }))
        ).sort((a, b) => a.meeting.startTime.localeCompare(b.meeting.startTime));

        if (dayEntries.length === 0) return null;

        return (
          <div key={day} className="list-day-group">
            <h4>{day}</h4>
            {dayEntries.map(({ section: s, meeting: m }, i) => (
              <div key={`${s.id}-${i}`} className="list-item" style={{ borderLeftColor: s.color }}>
                <strong>{s.courseName}</strong>
                {s.sectionNumber && <span> #{s.sectionNumber}</span>}
                <div className="list-item-detail">
                  {m.startTime}–{m.endTime}
                  {s.location && <> &middot; {s.location}</>}
                  {s.instructor && <> &middot; {s.instructor}</>}
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
