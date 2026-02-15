import { Section } from '../types';
import WeeklyGrid from './WeeklyGrid';

interface Props {
  sections: Section[];
}

export default function ScheduleView({ sections }: Props) {
  return (
    <div className="schedule-view">
      <div className="schedule-header">
        <h2>Schedule</h2>
      </div>
      <WeeklyGrid sections={sections} />
    </div>
  );
}
