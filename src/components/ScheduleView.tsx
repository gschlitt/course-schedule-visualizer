import { Section, Instructor } from '../types';
import WeeklyGrid from './WeeklyGrid';

interface Props {
  sections: Section[];
  instructors: Instructor[];
  selectedSectionIds: Set<string>;
  onSelectSection: (id: string) => void;
  allowedStartTimes: string[];
  allowedEndTimes: string[];
}

export default function ScheduleView({ sections, instructors, selectedSectionIds, onSelectSection, allowedStartTimes, allowedEndTimes }: Props) {
  return (
    <div className="schedule-view">
      <div className="schedule-header">
        <h2>Schedule</h2>
      </div>
      <WeeklyGrid sections={sections} instructors={instructors} selectedSectionIds={selectedSectionIds} onSelectSection={onSelectSection} allowedStartTimes={allowedStartTimes} allowedEndTimes={allowedEndTimes} />
    </div>
  );
}
