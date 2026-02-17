import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Section, Instructor } from '../types';
import WeeklyGrid from './WeeklyGrid';

interface Props {
  sections: Section[];
  instructors: Instructor[];
  selectedSectionIds: Set<string>;
  onSelectSection: (id: string) => void;
  onChangeInstructor: (sectionId: string, instructorName: string) => void;
  allowedStartTimes: string[];
  allowedEndTimes: string[];
  filterTagNames?: string[];
  onClearFilter?: () => void;
}

function copyStyles(sourceDoc: Document, targetDoc: Document) {
  for (const styleSheet of Array.from(sourceDoc.styleSheets)) {
    try {
      if (styleSheet.cssRules) {
        const style = targetDoc.createElement('style');
        for (const rule of Array.from(styleSheet.cssRules)) {
          style.appendChild(targetDoc.createTextNode(rule.cssText));
        }
        targetDoc.head.appendChild(style);
      }
    } catch {
      // Cross-origin stylesheets — copy via link
      if (styleSheet.href) {
        const link = targetDoc.createElement('link');
        link.rel = 'stylesheet';
        link.href = styleSheet.href;
        targetDoc.head.appendChild(link);
      }
    }
  }
}

export default function ScheduleView({ sections, instructors, selectedSectionIds, onSelectSection, onChangeInstructor, allowedStartTimes, allowedEndTimes, filterTagNames, onClearFilter }: Props) {
  const [detached, setDetached] = useState(false);
  const externalWindow = useRef<Window | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const closeExternal = useCallback(() => {
    if (externalWindow.current) {
      externalWindow.current.close();
      externalWindow.current = null;
    }
    containerRef.current = null;
    setDetached(false);
  }, []);

  function handlePopOut() {
    const win = window.open('', '', 'width=1000,height=800');
    if (!win) return;

    win.document.title = 'Schedule View';
    copyStyles(document, win.document);
    win.document.body.style.margin = '0';
    win.document.body.style.background = '#f5f5f5';

    const container = win.document.createElement('div');
    container.style.padding = '20px';
    win.document.body.appendChild(container);

    externalWindow.current = win;
    containerRef.current = container;

    win.addEventListener('beforeunload', () => {
      externalWindow.current = null;
      containerRef.current = null;
      setDetached(false);
    });

    setDetached(true);
  }

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (externalWindow.current) {
        externalWindow.current.close();
      }
    };
  }, []);

  const scheduleContent = (
    <div className="schedule-view">
      {filterTagNames && filterTagNames.length > 0 && (
        <div className="filter-banner">
          <span>Filtered by: {filterTagNames.join(', ')}</span>
          <button className="filter-banner-clear" onClick={onClearFilter}>Clear filter</button>
        </div>
      )}
      <div className="schedule-header">
        <h2>Schedule</h2>
        {detached ? (
          <button className="schedule-dock-btn" onClick={closeExternal}>Dock</button>
        ) : (
          <button className="schedule-dock-btn" onClick={handlePopOut}>Pop Out</button>
        )}
      </div>
      <WeeklyGrid sections={sections} instructors={instructors} selectedSectionIds={selectedSectionIds} onSelectSection={onSelectSection} onChangeInstructor={onChangeInstructor} allowedStartTimes={allowedStartTimes} allowedEndTimes={allowedEndTimes} />
    </div>
  );

  if (detached && containerRef.current) {
    return (
      <>
        <div className="schedule-view schedule-view-detached">
          <p className="empty-msg">Schedule is in a separate window.</p>
          <button className="schedule-dock-btn" onClick={closeExternal}>Dock Back</button>
        </div>
        {createPortal(scheduleContent, containerRef.current)}
      </>
    );
  }

  return scheduleContent;
}
