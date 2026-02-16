import { useState, useEffect } from 'react';
import { Section, Day, Meeting, Instructor, Course, Tag } from '../types';
import { getNextColor } from '../utils/colors';

const ALL_DAYS: Day[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const display = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${display}:${String(m).padStart(2, '0')} ${suffix}`;
}

interface Props {
  onSubmit: (section: Section) => void;
  editingSection: Section | null;
  onCancelEdit: () => void;
  usedColors: string[];
  allowedStartTimes: string[];
  allowedEndTimes: string[];
  instructors: Instructor[];
  courses: Course[];
  tags: Tag[];
  defaultSectionColor?: string;
  existingSections: Section[];
}

const emptyForm = {
  courseName: '',
  sectionNumber: '',
  instructor: '',
  meetings: [] as Meeting[],
  location: '',
  color: '',
  tagIds: [] as string[],
};

export default function SectionForm({ onSubmit, editingSection, onCancelEdit, usedColors, allowedStartTimes, allowedEndTimes, instructors, courses, tags, defaultSectionColor, existingSections }: Props) {
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (editingSection) {
      setForm({
        courseName: editingSection.courseName,
        sectionNumber: editingSection.sectionNumber,
        instructor: editingSection.instructor,
        meetings: editingSection.meetings,
        location: editingSection.location,
        color: editingSection.color,
        tagIds: editingSection.tagIds ?? [],
      });
    }
  }, [editingSection]);

  const selectedDays = [...new Set(form.meetings.map(m => m.day))];

  const defaultStart = allowedStartTimes[0] || '09:00';
  const defaultEnd = allowedEndTimes[0] || '10:00';

  function handleDayToggle(day: Day) {
    setForm(f => {
      const hasMeetings = f.meetings.some(m => m.day === day);
      if (hasMeetings) {
        return { ...f, meetings: f.meetings.filter(m => m.day !== day) };
      } else {
        return { ...f, meetings: [...f.meetings, { day, startTime: defaultStart, endTime: defaultEnd }] };
      }
    });
  }

  function updateMeeting(index: number, field: 'startTime' | 'endTime', value: string) {
    setForm(f => {
      const meetings = [...f.meetings];
      meetings[index] = { ...meetings[index], [field]: value };
      return { ...f, meetings };
    });
  }

  function removeMeeting(index: number) {
    setForm(f => ({ ...f, meetings: f.meetings.filter((_, i) => i !== index) }));
  }

  function addMeetingForDay(day: Day) {
    setForm(f => ({ ...f, meetings: [...f.meetings, { day, startTime: defaultStart, endTime: defaultEnd }] }));
  }

  const sectionNumberTrimmed = form.sectionNumber.trim();
  const isDuplicate = sectionNumberTrimmed !== '' && form.courseName !== '' && existingSections.some(
    s => s.courseName === form.courseName && s.sectionNumber === sectionNumberTrimmed && s.id !== editingSection?.id
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.courseName || form.meetings.length === 0 || !sectionNumberTrimmed || isDuplicate) return;

    const section: Section = {
      id: editingSection?.id ?? crypto.randomUUID(),
      courseName: form.courseName,
      sectionNumber: form.sectionNumber,
      instructor: form.instructor,
      meetings: form.meetings,
      location: form.location,
      color: form.color || defaultSectionColor || getNextColor(usedColors),
      tagIds: form.tagIds.length > 0 ? form.tagIds : undefined,
    };
    onSubmit(section);
    setForm(emptyForm);
  }

  function handleCancel() {
    setForm(emptyForm);
    onCancelEdit();
  }

  // Sort meetings by day order, then by start time
  const sortedMeetings = form.meetings
    .map((m, i) => ({ ...m, origIndex: i }))
    .sort((a, b) => {
      const dayDiff = ALL_DAYS.indexOf(a.day) - ALL_DAYS.indexOf(b.day);
      if (dayDiff !== 0) return dayDiff;
      return a.startTime.localeCompare(b.startTime);
    });

  return (
    <form className="section-form" onSubmit={handleSubmit}>
      <h3>{editingSection ? 'Edit Section' : 'Add Section'}</h3>

      <label>
        Course Name *
        <select
          value={form.courseName}
          onChange={e => setForm(f => ({ ...f, courseName: e.target.value }))}
          required
        >
          <option value="">— Select Course —</option>
          {courses.map(c => (
            <option key={c.id} value={c.abbreviation}>{c.abbreviation} — {c.title}</option>
          ))}
        </select>
      </label>

      <label>
        Section Number *
        <input
          type="text"
          value={form.sectionNumber}
          onChange={e => setForm(f => ({ ...f, sectionNumber: e.target.value }))}
          placeholder="001"
          required
        />
        {isDuplicate && <span className="form-error">Section number already exists for this course</span>}
      </label>

      <label>
        Instructor
        <select
          value={form.instructor}
          onChange={e => setForm(f => ({ ...f, instructor: e.target.value }))}
        >
          <option value="">— None —</option>
          {instructors.map(inst => (
            <option key={inst.id} value={inst.name}>{inst.name}</option>
          ))}
        </select>
      </label>

      <div className="form-field">
        <span>Days *</span>
        <div className="day-toggles">
          {ALL_DAYS.map(day => (
            <button
              key={day}
              type="button"
              className={`day-btn ${selectedDays.includes(day) ? 'active' : ''}`}
              onClick={() => handleDayToggle(day)}
            >
              {day}
            </button>
          ))}
        </div>
      </div>

      {sortedMeetings.length > 0 && (
        <div className="meetings-list">
          {sortedMeetings.map(({ origIndex, day, startTime, endTime }) => (
            <div key={origIndex} className="meeting-row">
              <span className="meeting-day">{day}</span>
              <select
                value={startTime}
                onChange={e => updateMeeting(origIndex, 'startTime', e.target.value)}
              >
                {allowedStartTimes.map(t => (
                  <option key={t} value={t}>{formatTime(t)}</option>
                ))}
              </select>
              <span>–</span>
              <select
                value={endTime}
                onChange={e => updateMeeting(origIndex, 'endTime', e.target.value)}
              >
                {allowedEndTimes.map(t => (
                  <option key={t} value={t}>{formatTime(t)}</option>
                ))}
              </select>
              <button type="button" className="btn-sm btn-danger" onClick={() => removeMeeting(origIndex)}>×</button>
            </div>
          ))}

          {selectedDays.length > 0 && (
            <div className="add-meeting-row">
              {selectedDays.sort((a, b) => ALL_DAYS.indexOf(a) - ALL_DAYS.indexOf(b)).map(day => (
                <button
                  key={day}
                  type="button"
                  className="btn-sm"
                  onClick={() => addMeetingForDay(day)}
                >
                  + {day}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <label>
        Location
        <input
          type="text"
          value={form.location}
          onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
          placeholder="Room 204"
        />
      </label>

      {tags.length > 0 && (
        <div className="form-field">
          <span>Tags</span>
          <select
            value=""
            onChange={e => {
              const id = e.target.value;
              if (id && !form.tagIds.includes(id)) {
                setForm(f => ({ ...f, tagIds: [...f.tagIds, id] }));
              }
            }}
          >
            <option value="">— Add Tag —</option>
            {tags.filter(t => !form.tagIds.includes(t.id)).map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          {form.tagIds.length > 0 && (
            <div className="tag-chips">
              {form.tagIds
                .map(id => tags.find(t => t.id === id))
                .filter(Boolean)
                .map(tag => (
                  <span key={tag!.id} className="tag-chip">
                    {tag!.name}
                    <button
                      type="button"
                      className="tag-chip-remove"
                      onClick={() => setForm(f => ({ ...f, tagIds: f.tagIds.filter(id => id !== tag!.id) }))}
                    >
                      &times;
                    </button>
                  </span>
                ))}
            </div>
          )}
        </div>
      )}

      <label>
        Color
        <input
          type="color"
          value={form.color || defaultSectionColor || '#4A90D9'}
          onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
        />
      </label>

      <div className="form-actions">
        <button type="submit">{editingSection ? 'Update' : 'Add Section'}</button>
        <button type="button" className="btn-secondary" onClick={handleCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
