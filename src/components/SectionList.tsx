import { useState } from 'react';
import { Section, Day, Instructor, Tag } from '../types';

const DAY_ORDER: Day[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

interface Props {
  sections: Section[];
  instructors: Instructor[];
  tags: Tag[];
  onEdit: (section: Section) => void;
  onDelete: (id: string) => void;
  onDuplicate: (section: Section) => void;
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
}

export default function SectionList({ sections, instructors, tags, onEdit, onDelete, onDuplicate, selectedIds, onSelect }: Props) {
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  if (sections.length === 0) {
    return <p className="empty-msg">No sections added yet.</p>;
  }

  function toggleCollapse(id: string) {
    setCollapsedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function collapseAll() {
    setCollapsedIds(new Set(sections.map(s => s.id)));
  }

  function expandAll() {
    setCollapsedIds(new Set());
  }

  return (
    <div className="section-list">
      <div className="section-list-header">
        <h3>Sections ({sections.length})</h3>
        <div className="section-list-toggle-btns">
          <button className="btn-icon" onClick={expandAll} title="Expand all">&#9654;</button>
          <button className="btn-icon" onClick={collapseAll} title="Collapse all">&#9660;</button>
        </div>
      </div>
      {sections.map(s => {
        const collapsed = collapsedIds.has(s.id);
        const sorted = [...s.meetings].sort(
          (a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day) || a.startTime.localeCompare(b.startTime)
        );
        const attrs: { label: string; value: string }[] = [];
        if (s.sectionType) attrs.push({ label: 'Type', value: s.sectionType });
        if (s.meetingType) attrs.push({ label: 'Meeting', value: s.meetingType });
        if (s.campus) attrs.push({ label: 'Campus', value: s.campus });
        if (s.resource) attrs.push({ label: 'Resource', value: s.resource });
        if (s.level) attrs.push({ label: 'Level', value: s.level });
        if (s.workload != null) attrs.push({ label: 'Workload', value: String(s.workload) });

        return (
          <div
            key={s.id}
            className={`section-card${selectedIds.has(s.id) ? ' section-card-selected' : ''}${collapsed ? ' section-card-collapsed' : ''}`}
            style={{ borderLeftColor: s.color }}
            onClick={() => onSelect(s.id)}
          >
            <div className="section-card-header">
              <button
                className="btn-icon section-collapse-btn"
                onClick={e => { e.stopPropagation(); toggleCollapse(s.id); }}
                title={collapsed ? 'Expand' : 'Collapse'}
              >
                {collapsed ? '\u25B6' : '\u25BC'}
              </button>
              <strong>{s.courseName}</strong>
              {s.sectionNumber && <span className="section-num">#{s.sectionNumber}</span>}
              <div className="section-card-actions">
                <button className="btn-icon" onClick={e => { e.stopPropagation(); onEdit(s); }} title="Edit">&#9998;</button>
                <button className="btn-icon" onClick={e => { e.stopPropagation(); onDuplicate(s); }} title="Duplicate">&#9112;</button>
                <button className="btn-icon btn-icon-delete" onClick={e => { e.stopPropagation(); if (window.confirm(`Delete section ${s.courseName} #${s.sectionNumber}?`)) onDelete(s.id); }} title="Delete">&times;</button>
              </div>
            </div>
            {!collapsed && (
              <>
                {s.instructor && <div className="section-detail">{s.instructor}{(() => { const inst = instructors.find(i => i.name === s.instructor); return inst?.abbreviation ? ` (${inst.abbreviation})` : ''; })()}</div>}
                {s.location && <div className="section-detail">{s.location}</div>}
                <div className="section-card-body">
                  <div className="section-meetings">
                    {sorted.map((m, i) => (
                      <div key={i} className="section-detail">
                        {m.day} &middot; {m.startTime}–{m.endTime}
                      </div>
                    ))}
                  </div>
                  {attrs.length > 0 && (
                    <table className="section-attr-table">
                      <tbody>
                        {attrs.map(a => (
                          <tr key={a.label}>
                            <td className="section-attr-label">{a.label}</td>
                            <td className="section-attr-value">{a.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                {s.tagIds && s.tagIds.length > 0 && (() => {
                  const resolvedTags = s.tagIds.map(id => tags.find(t => t.id === id)).filter(Boolean);
                  return resolvedTags.length > 0 ? (
                    <div className="section-tags">
                      {resolvedTags.map(tag => (
                        <span key={tag!.id} className="section-tag-badge">{tag!.name}</span>
                      ))}
                    </div>
                  ) : null;
                })()}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
