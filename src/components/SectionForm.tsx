import { useState, useEffect } from 'react';
import { Section, Day, Meeting, Instructor } from '../types';
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
}

const emptyForm = {
  courseName: '',
  sectionNumber: '',
  instructor: '',
  meetings: [] as Meeting[],
  location: '',
  color: '',
};

export default function SectionForm({ onSubmit, editingSection, onCancelEdit, usedColors, allowedStartTimes, allowedEndTimes, instructors }: Props) {
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
      });
    }
  }, [editingSection]);

  const selectedDays = [...new Set(form.meetings.map(m => m.day))];

  function handleDayToggle(day: Day) {
    setForm(f => {
      const hasMeetings = f.meetings.some(m => m.day === day);
      if (hasMeetings) {
        return { ...f, meetings: f.meetings.filter(m => m.day !== day) };
      } else {
        return { ...f, meetings: [...f.meetings, { day, startTime: '09:00', endTime: '10:00' }] };
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
    setForm(f => ({ ...f, meetings: [...f.meetings, { day, startTime: '09:00', endTime: '10:00' }] }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.courseName || form.meetings.length === 0) return;

    const section: Section = {
      id: editingSection?.id ?? crypto.randomUUID(),
      courseName: form.courseName,
      sectionNumber: form.sectionNumber,
      instructor: form.instructor,
      meetings: form.meetings,
      location: form.location,
      color: form.color || getNextColor(usedColors),
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
        <input
          type="text"
          value={form.courseName}
          onChange={e => setForm(f => ({ ...f, courseName: e.target.value }))}
          placeholder="CS 101"
          required
        />
      </label>

      <label>
        Section Number
        <input
          type="text"
          value={form.sectionNumber}
          onChange={e => setForm(f => ({ ...f, sectionNumber: e.target.value }))}
          placeholder="001"
        />
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

      <label>
        Color
        <input
          type="color"
          value={form.color || '#4A90D9'}
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
