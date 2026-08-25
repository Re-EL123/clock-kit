import { el } from '../utils/dom.js';
import { EmptyState } from './empty-state.js';

const TITLE_HEADER = /^(name|candidate|title|host|site)$/i;
const ACTION_HEADER = /^(actions|edit)$/i;

export function isActionHeader(header) {
  return ACTION_HEADER.test(String(header || ''));
}

export function isInteractiveValue(value) {
  if (!value || typeof value !== 'object') return false;
  if (value.nodeType !== 1) return false;
  if (value.matches?.('button, .btn, .btn-row, select, input, textarea, form')) return true;
  return Boolean(value.querySelector?.('button, .btn, select, input, textarea'));
}

export function listCells(headers, row) {
  return (headers || []).map((header, i) => ({
    header: String(header || ''),
    value: row[i],
    interactive: isInteractiveValue(row[i]) || isActionHeader(header),
  }));
}

export function splitListCard(cells) {
  const namedTitle = cells.find((cell) => (
    !cell.interactive
    && TITLE_HEADER.test(cell.header)
    && cell.value != null
    && cell.value !== ''
  ));
  const titleCell = namedTitle
    || cells.find((cell) => !cell.interactive && cell.value != null && cell.value !== '')
    || cells[0];
  return {
    titleCell,
    facts: cells.filter((cell) => cell !== titleCell && !cell.interactive),
    actions: cells.filter((cell) => cell !== titleCell && cell.interactive),
  };
}

function listCard(headers, row) {
  const { titleCell, facts, actions } = splitListCard(listCells(headers, row));
  const title = titleCell && titleCell.value != null && titleCell.value !== ''
    ? el('h3', { class: 'list-card-title' }, [titleCell.value])
    : null;

  return el('article', { class: 'list-card card', role: 'listitem' }, [
    title,
    facts.length
      ? el(
        'dl',
        { class: 'list-card-facts' },
        facts.map((cell) =>
          el('div', { class: 'list-fact' }, [
            el('dt', { text: cell.header }),
            el('dd', {}, [cell.value]),
          ]),
        ),
      )
      : null,
    ...actions.map((cell) =>
      el('div', { class: 'list-card-slot' }, [
        cell.header && !isActionHeader(cell.header)
          ? el('p', { class: 'list-slot-label', text: cell.header })
          : null,
        cell.value,
      ]),
    ),
  ]);
}

export function table(headers, rows) {
  if (!rows.length) {
    return el('div', { class: 'list-view table-wrap' }, [EmptyState('No records')]);
  }
  return el(
    'div',
    { class: 'list-view table-wrap', role: 'list' },
    rows.map((row) => listCard(headers, row)),
  );
}
