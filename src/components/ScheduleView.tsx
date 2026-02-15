import { Section } from '../types';
import WeeklyGrid from './WeeklyGrid';

interface Props {
  sections: Section[];
  selectedSectionIds: Set<string>;
  onSelectSection: (id: string) => void;
}

export default function ScheduleView({ sections, selectedSectionIds, onSelectSection }: Props) {
  return (
    <div className="schedule-view">
      <div className="schedule-header">
        <h2>Schedule</h2>
      </div>
      <WeeklyGrid sections={sections} selectedSectionIds={selectedSectionIds} onSelectSection={onSelectSection} />
    </div>
  );
}
