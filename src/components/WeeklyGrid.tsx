import { Section, Day, Instructor } from '../types';

const DAYS: Day[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const START_HOUR = 7;
const END_HOUR = 22;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function formatHour(hour: number): string {
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${h} ${suffix}`;
}

interface DayBlock {
  section: Section;
  startTime: string;
  endTime: string;
}

interface Props {
  sections: Section[];
  instructors: Instructor[];
  selectedSectionIds: Set<string>;
  onSelectSection: (id: string) => void;
  allowedStartTimes: string[];
  allowedEndTimes: string[];
}

interface OverlapGroup {
  blocks: DayBlock[];
  exactMatch: boolean;
}

function groupOverlaps(dayBlocks: DayBlock[]): OverlapGroup[] {
  if (dayBlocks.length === 0) return [];

  const sorted = [...dayBlocks].sort(
    (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
  );

  const groups: OverlapGroup[] = [];

  for (const block of sorted) {
    const bStart = timeToMinutes(block.startTime);
    const bEnd = timeToMinutes(block.endTime);

    let placed = false;
    for (const group of groups) {
      const gStart = timeToMinutes(group.blocks[0].startTime);
      const gEnd = Math.max(...group.blocks.map(b => timeToMinutes(b.endTime)));

      if (bStart < gEnd && bEnd > gStart) {
        const isExact = group.blocks.every(
          b => b.startTime === block.startTime && b.endTime === block.endTime
        );
        group.blocks.push(block);
        group.exactMatch = isExact;
        placed = true;
        break;
      }
    }

    if (!placed) {
      groups.push({ blocks: [block], exactMatch: true });
    }
  }

  return groups;
}

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const display = h > 12 ? h - 12 : h === 0 ? 12 : h;
  if (m === 0) return `${display} ${suffix}`;
  return `${display}:${String(m).padStart(2, '0')} ${suffix}`;
}

export default function WeeklyGrid({ sections, instructors, selectedSectionIds, onSelectSection, allowedStartTimes, allowedEndTimes }: Props) {
  function getAbbr(instructorName: string): string {
    const inst = instructors.find(i => i.name === instructorName);
    return inst?.abbreviation || '';
  }
  const totalMinutes = (END_HOUR - START_HOUR) * 60;
  const hasSelection = selectedSectionIds.size > 0;

  function blockOpacity(sectionId: string): number {
    if (!hasSelection) return 1;
    return selectedSectionIds.has(sectionId) ? 1 : 0.4;
  }

  function getBlocksForDay(day: Day): DayBlock[] {
    const blocks: DayBlock[] = [];
    for (const section of sections) {
      for (const meeting of section.meetings) {
        if (meeting.day === day) {
          blocks.push({ section, startTime: meeting.startTime, endTime: meeting.endTime });
        }
      }
    }
    return blocks;
  }

  function renderMergedBlock(group: OverlapGroup) {
    const first = group.blocks[0];
    const startMin = timeToMinutes(first.startTime) - START_HOUR * 60;
    const endMin = timeToMinutes(first.endTime) - START_HOUR * 60;
    const top = (startMin / totalMinutes) * 100;
    const height = ((endMin - startMin) / totalMinutes) * 100;

    const mergedOpacity = hasSelection
      ? (group.blocks.some(b => selectedSectionIds.has(b.section.id)) ? 1 : 0.4)
      : 1;

    return (
      <div
        key={group.blocks.map(b => b.section.id + b.startTime).join('-')}
        className="grid-block grid-block-merged"
        style={{
          top: `${top}%`,
          height: `${height}%`,
          backgroundColor: first.section.color,
          opacity: mergedOpacity,
          transition: 'opacity 0.15s',
        }}
      >
        {group.blocks.map((b, i) => (
          <div key={b.section.id} className="merged-entry" style={i > 0 ? { borderTop: '1px solid rgba(255,255,255,0.3)' } : undefined}>
            <span className="block-name block-name-clickable" style={{ color: '#fff', backgroundColor: b.section.color, borderRadius: 2, padding: '0 2px' }} onClick={() => onSelectSection(b.section.id)}>
              {b.section.courseName}{getAbbr(b.section.instructor) ? ` (${getAbbr(b.section.instructor)})` : ''}
            </span>
            {b.section.location && <span className="block-loc">{b.section.location}</span>}
          </div>
        ))}
      </div>
    );
  }

  function renderSideBySide(group: OverlapGroup) {
    const count = group.blocks.length;
    return group.blocks.map((block, idx) => {
      const startMin = timeToMinutes(block.startTime) - START_HOUR * 60;
      const endMin = timeToMinutes(block.endTime) - START_HOUR * 60;
      const top = (startMin / totalMinutes) * 100;
      const height = ((endMin - startMin) / totalMinutes) * 100;
      const width = 100 / count;
      const left = width * idx;

      return (
        <div
          key={block.section.id + '-' + block.startTime}
          className="grid-block"
          style={{
            top: `${top}%`,
            height: `${height}%`,
            backgroundColor: block.section.color,
            left: `${left}%`,
            right: 'auto',
            width: `${width}%`,
            opacity: blockOpacity(block.section.id),
            transition: 'opacity 0.15s',
          }}
          title={`${block.section.courseName}${getAbbr(block.section.instructor) ? ` (${getAbbr(block.section.instructor)})` : ''} ${block.section.sectionNumber}\n${block.startTime}–${block.endTime}\n${block.section.instructor}\n${block.section.location}`}
        >
          <span className="block-name block-name-clickable" onClick={() => onSelectSection(block.section.id)}>{block.section.courseName}{getAbbr(block.section.instructor) ? ` (${getAbbr(block.section.instructor)})` : ''}</span>
          {block.section.location && <span className="block-loc">{block.section.location}</span>}
        </div>
      );
    });
  }

  // Filter start times to those within the grid range
  const endTimesSet = new Set(allowedEndTimes);
  const visibleStartTimes = allowedStartTimes
    .filter(t => {
      const mins = timeToMinutes(t);
      return mins >= START_HOUR * 60 && mins < END_HOUR * 60;
    })
    .sort();
  // Labels: only start times that are NOT also end times
  const labelTimes = visibleStartTimes.filter(t => !endTimesSet.has(t));

  return (
    <div className="weekly-grid">
      <div className="grid-header">
        <div className="time-col-header"></div>
        {DAYS.map(day => (
          <div key={day} className="day-header">{day}</div>
        ))}
      </div>
      <div className="grid-body">
        <div className="time-column">
          {labelTimes.map(time => {
            const mins = timeToMinutes(time) - START_HOUR * 60;
            const top = (mins / totalMinutes) * 100;
            return (
              <div key={time} className="time-label time-label-abs" style={{ top: `${top}%` }}>
                {formatTime(time)}
              </div>
            );
          })}
        </div>
        {DAYS.map(day => {
          const dayBlocks = getBlocksForDay(day);
          const groups = groupOverlaps(dayBlocks);

          return (
            <div key={day} className="day-column">
              {visibleStartTimes.map(time => {
                const mins = timeToMinutes(time) - START_HOUR * 60;
                const top = (mins / totalMinutes) * 100;
                return (
                  <div
                    key={time}
                    className="start-time-rule"
                    style={{ top: `${top}%` }}
                  />
                );
              })}
              {groups.map(group => {
                if (group.blocks.length === 1) {
                  const block = group.blocks[0];
                  const startMin = timeToMinutes(block.startTime) - START_HOUR * 60;
                  const endMin = timeToMinutes(block.endTime) - START_HOUR * 60;
                  const top = (startMin / totalMinutes) * 100;
                  const height = ((endMin - startMin) / totalMinutes) * 100;

                  return (
                    <div
                      key={block.section.id + '-' + block.startTime}
                      className="grid-block"
                      style={{
                        top: `${top}%`,
                        height: `${height}%`,
                        backgroundColor: block.section.color,
                        opacity: blockOpacity(block.section.id),
                        transition: 'opacity 0.15s',
                      }}
                      title={`${block.section.courseName}${getAbbr(block.section.instructor) ? ` (${getAbbr(block.section.instructor)})` : ''} ${block.section.sectionNumber}\n${block.startTime}–${block.endTime}\n${block.section.instructor}\n${block.section.location}`}
                    >
                      <span className="block-name block-name-clickable" onClick={() => onSelectSection(block.section.id)}>{block.section.courseName}{getAbbr(block.section.instructor) ? ` (${getAbbr(block.section.instructor)})` : ''}</span>
                      {block.section.location && <span className="block-loc">{block.section.location}</span>}
                    </div>
                  );
                }

                if (group.exactMatch) {
                  return renderMergedBlock(group);
                }

                return renderSideBySide(group);
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
