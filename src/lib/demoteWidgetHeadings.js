// The LeadConnector chat widget renders its greeting ("Hi, 👋 / How can we help
// you today?") as H1/H2 tags, which pollutes the page's heading outline. This swaps
// those headings for plain divs (keeping their look) inside the widget's DOM.
const STYLE_PROPS = ['font-size', 'font-weight', 'font-family', 'line-height', 'color', 'margin', 'letter-spacing', 'text-align'];

function demote(root) {
  root.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => {
    const div = document.createElement('div');
    const cs = getComputedStyle(h);
    for (const { name, value } of h.attributes) div.setAttribute(name, value);
    STYLE_PROPS.forEach((p) => div.style.setProperty(p, cs.getPropertyValue(p)));
    div.style.display = cs.display === 'inline' ? 'inline' : 'block';
    while (h.firstChild) div.appendChild(h.firstChild);
    h.replaceWith(div);
  });
}

function scan() {
  document.querySelectorAll('chat-widget, [id*="lc_text-widget"], [class*="lc_text-widget"]').forEach((el) => {
    demote(el);
    if (el.shadowRoot) demote(el.shadowRoot);
  });
}

export default function demoteWidgetHeadings() {
  const observed = new WeakSet();
  const observe = (target) => {
    if (observed.has(target)) return;
    observed.add(target);
    new MutationObserver(() => {
      scan();
      document.querySelectorAll('chat-widget').forEach((el) => el.shadowRoot && observe(el.shadowRoot));
    }).observe(target, { childList: true, subtree: true });
  };
  observe(document.body);
  scan();
}