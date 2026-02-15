import { useState } from 'react';
import { Section } from '../types';
import WeeklyGrid from './WeeklyGrid';
import ListView from './ListView';

interface Props {
  sections: Section[];
}

export default function ScheduleView({ sections }: Props) {
  const [view, setView] = useState<'grid' | 'list'>('grid');

  return (
    <div className="schedule-view">
      <div className="schedule-header">
        <h2>Schedule</h2>
        <div className="view-toggle">
          <button
            className={view === 'grid' ? 'active' : ''}
            onClick={() => setView('grid')}
          >
            Weekly Grid
          </button>
          <button
            className={view === 'list' ? 'active' : ''}
            onClick={() => setView('list')}
          >
            List View
          </button>
        </div>
      </div>
      {view === 'grid' ? (
        <WeeklyGrid sections={sections} />
      ) : (
        <ListView sections={sections} />
      )}
    </div>
  );
}
