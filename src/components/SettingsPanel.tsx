import { useState } from 'react';
import { Settings } from '../types';

interface Props {
  settings: Settings;
  onSave: (settings: Settings) => void;
  onClose: () => void;
}

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const display = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${display}:${String(m).padStart(2, '0')} ${suffix}`;
}

/** Parse user input like "9:00 AM", "9:00am", "13:00", "9am", "9:30 PM" into "HH:MM" 24h format */
function parseTimeInput(input: string): string | null {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;

  // Try 24h format: "13:00", "9:00"
  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const h = parseInt(match24[1]);
    const m = parseInt(match24[2]);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
  }

  // Try 12h with minutes: "9:00 am", "12:30pm"
  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/);
  if (match12) {
    let h = parseInt(match12[1]);
    const m = parseInt(match12[2]);
    const period = match12[3];
    if (h < 1 || h > 12 || m < 0 || m > 59) return null;
    if (period === 'am' && h === 12) h = 0;
    if (period === 'pm' && h !== 12) h += 12;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  // Try 12h without minutes: "9am", "12pm"
  const matchShort = trimmed.match(/^(\d{1,2})\s*(am|pm)$/);
  if (matchShort) {
    let h = parseInt(matchShort[1]);
    const period = matchShort[2];
    if (h < 1 || h > 12) return null;
    if (period === 'am' && h === 12) h = 0;
    if (period === 'pm' && h !== 12) h += 12;
    return `${String(h).padStart(2, '0')}:00`;
  }

  return null;
}

function TimeListEditor({ label, hint, times, onChange }: {
  label: string;
  hint: string;
  times: string[];
  onChange: (times: string[]) => void;
}) {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');

  function handleAdd() {
    const parsed = parseTimeInput(inputValue);
    if (!parsed) {
      setError('Invalid time. Try "9:00 AM", "13:30", or "2pm".');
      return;
    }
    if (times.includes(parsed)) {
      setError(`${formatTime(parsed)} is already in the list.`);
      return;
    }
    onChange([...times, parsed].sort());
    setInputValue('');
    setError('');
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  }

  function handleRemove(time: string) {
    onChange(times.filter(t => t !== time));
  }

  return (
    <div className="time-picker-section">
      <h4>{label}</h4>
      <p className="settings-hint">{hint}</p>
      <div className="time-input-row">
        <input
          type="text"
          value={inputValue}
          onChange={e => { setInputValue(e.target.value); setError(''); }}
          onKeyDown={handleKeyDown}
          placeholder="e.g. 9:00 AM, 13:30, 2pm"
        />
        <button type="button" className="time-add-btn" onClick={handleAdd}>Add</button>
      </div>
      {error && <p className="time-error">{error}</p>}
      <div className="time-tag-list">
        {times.map(time => (
          <span key={time} className="time-tag">
            {formatTime(time)}
            <button type="button" className="time-tag-remove" onClick={() => handleRemove(time)}>&times;</button>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function SettingsPanel({ settings, onSave, onClose }: Props) {
  const [startTimes, setStartTimes] = useState<string[]>(settings.allowedStartTimes);
  const [endTimes, setEndTimes] = useState<string[]>(settings.allowedEndTimes);

  function handleSave() {
    onSave({ allowedStartTimes: startTimes, allowedEndTimes: endTimes });
  }

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="settings-close" onClick={onClose}>&times;</button>
        </div>

        <div className="settings-body">
          <TimeListEditor
            label="Allowed Start Times"
            hint="Type a time and press Enter or click Add."
            times={startTimes}
            onChange={setStartTimes}
          />
          <TimeListEditor
            label="Allowed End Times"
            hint="Type a time and press Enter or click Add."
            times={endTimes}
            onChange={setEndTimes}
          />
        </div>

        <div className="settings-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="settings-save" onClick={handleSave}>Save Settings</button>
        </div>
      </div>
    </div>
  );
}
