export function parseLegal(body = '') {
  const text = String(body || '').replace(/\r\n/g, '\n').trim();
  const sections = [];
  let heading = '';
  let parts = [];
  const flush = () => {
    const paragraph = parts.join('\n').trim();
    if (heading || paragraph) sections.push({ heading: heading || 'Document', body: paragraph });
    heading = '';
    parts = [];
  };
  if (!text) return sections;
  for (const line of text.split('\n')) {
    const match = line.match(/^##\s+(.+)/);
    if (match) {
      flush();
      heading = match[1].trim();
    } else parts.push(line);
  }
  flush();
  return sections.length ? sections : [{ heading: 'Document', body: text }];
}

export function sectionsToBody(sections) {
  return (sections || [])
    .map((section) => `## ${section.heading}\n${section.body}`)
    .join('\n\n');
}

export function formatPublished(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });
}
