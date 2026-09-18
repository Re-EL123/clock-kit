import '@shoelace-style/shoelace/dist/components/tooltip/tooltip.js';

export function wrapTooltip(node, content, placement = 'top') {
  if (!node) return null;
  if (typeof customElements === 'undefined' || !customElements.get('sl-tooltip')) return node;
  const tip = document.createElement('sl-tooltip');
  tip.content = content;
  tip.placement = placement;
  tip.hoist = true;
  if (node.parentNode) node.replaceWith(tip);
  tip.appendChild(node);
  return tip;
}