import { describe, expect, it } from 'vitest';
import {
  isActionHeader,
  isInteractiveValue,
  listCells,
  splitListCard,
} from '../../src/js/components/list-view.js';

function fakeNode({ tag = 'div', className = '', child = false } = {}) {
  return {
    nodeType: 1,
    matches(selector) {
      return selector.split(',').map((part) => part.trim()).some((part) => {
        if (part.startsWith('.')) return className.split(/\s+/).includes(part.slice(1));
        return part === tag;
      });
    },
    querySelector() {
      return child ? { nodeType: 1 } : null;
    },
  };
}

describe('list view cards', () => {
  it('treats action and edit headers as slots', () => {
    expect(isActionHeader('Actions')).toBe(true);
    expect(isActionHeader('Action')).toBe(false);
    expect(isActionHeader('Edit')).toBe(true);
    expect(isActionHeader('Review')).toBe(false);
  });

  it('detects buttons and nested controls', () => {
    expect(isInteractiveValue('Confirm')).toBe(false);
    expect(isInteractiveValue(fakeNode({ tag: 'button' }))).toBe(true);
    expect(isInteractiveValue(fakeNode({ className: 'btn-row' }))).toBe(true);
    expect(isInteractiveValue(fakeNode({ child: true }))).toBe(true);
  });

  it('uses Candidate or Name as the card title and keeps actions out of facts', () => {
    const cells = listCells(
      ['ID / passport', 'Candidate', 'In', 'Actions'],
      ['A123', 'Ada Cole', '08:00', fakeNode({ className: 'btn-row' })],
    );
    const { titleCell, facts, actions } = splitListCard(cells);
    expect(titleCell.value).toBe('Ada Cole');
    expect(facts.map((cell) => cell.header)).toEqual(['ID / passport', 'In']);
    expect(actions).toHaveLength(1);
    expect(actions[0].header).toBe('Actions');
  });

  it('falls back to the first scalar when no name-like header exists', () => {
    const { titleCell, facts } = splitListCard(listCells(
      ['When', 'Action', 'Actor'],
      ['13:40', 'login', 'HOST'],
    ));
    expect(titleCell.value).toBe('13:40');
    expect(facts.map((cell) => cell.value)).toEqual(['login', 'HOST']);
  });
});
