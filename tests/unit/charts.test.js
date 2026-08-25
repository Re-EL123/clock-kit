import { describe, expect, it } from 'vitest';
import { countBy, doughnutFromCounts, hoursByDay, hoursFromSessions, reviewLabel, sessionHours } from '../../src/js/components/charts.js';

describe('chart helpers', () => {
  it('counts review status and drops empty doughnut slices', () => {
    const sessions = [
      { host_review_status: 'CONFIRMED' },
      { host_review_status: 'CONFIRMED' },
      { host_review_status: 'REJECTED' },
      {},
    ];
    const counts = countBy(sessions, (row) => reviewLabel(row.host_review_status));
    expect(counts).toEqual({ Confirmed: 2, Rejected: 1, Unreviewed: 1 });
    expect(doughnutFromCounts({ Working: 4, Absent: 0, 'On break': 1 }, ['Working', 'On break', 'Absent'])).toEqual({
      labels: ['Working', 'On break'],
      values: [4, 1],
    });
  });

  it('adds worked hours minus unpaid breaks', () => {
    expect(sessionHours({
      clocked_in_at: '2026-08-20T06:00:00.000Z',
      clocked_out_at: '2026-08-20T14:00:00.000Z',
      breaks: [{ paid: false, duration_seconds: 1800 }],
    })).toBe(7.5);
  });

  it('builds a 7-day hours series and a sparse session series', () => {
    const now = new Date(2026, 7, 25, 12);
    const sessions = [
      { clocked_in_at: new Date(2026, 7, 25, 8).toISOString(), clocked_out_at: new Date(2026, 7, 25, 16).toISOString() },
      { clocked_in_at: new Date(2026, 7, 23, 8).toISOString(), clocked_out_at: new Date(2026, 7, 23, 12).toISOString() },
    ];
    const week = hoursByDay(sessions, { days: 7, now });
    expect(week.dates).toHaveLength(7);
    expect(week.dates.at(-1)).toBe('2026-08-25');
    expect(week.clocks.reduce((sum, value) => sum + value, 0)).toBe(2);
    expect(hoursFromSessions(sessions).hours).toEqual([4, 8]);
  });
});
