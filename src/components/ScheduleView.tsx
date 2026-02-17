import { Section, Instructor } from '../types';
import WeeklyGrid from './WeeklyGrid';

interface Props {
  sections: Section[];
  instructors: Instructor[];
  selectedSectionIds: Set<string>;
  onSelectSection: (id: string) => void;
  allowedStartTimes: string[];
  allowedEndTimes: string[];
  filterTagNames?: string[];
  onClearFilter?: () => void;
}

export default function ScheduleView({ sections, instructors, selectedSectionIds, onSelectSection, allowedStartTimes, allowedEndTimes, filterTagNames, onClearFilter }: Props) {
  return (
    <div className="schedule-view">
      {filterTagNames && filterTagNames.length > 0 && (
        <div className="filter-banner">
          <span>Filtered by: {filterTagNames.join(', ')}</span>
          <button className="filter-banner-clear" onClick={onClearFilter}>Clear filter</button>
        </div>
      )}
      <div className="schedule-header">
        <h2>Schedule</h2>
      </div>
      <WeeklyGrid sections={sections} instructors={instructors} selectedSectionIds={selectedSectionIds} onSelectSection={onSelectSection} allowedStartTimes={allowedStartTimes} allowedEndTimes={allowedEndTimes} />
    </div>
  );
}
