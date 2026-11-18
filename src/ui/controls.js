const LIGHT_STOPS = [
  { upTo: 0.2, label: 'Dawn' },
  { upTo: 0.55, label: 'Day' },
  { upTo: 0.85, label: 'Dusk' },
  { upTo: 2, label: 'Night' },
];

const labelFor = (value) => LIGHT_STOPS.find((stop) => value <= stop.upTo).label;

const MARKUP = `
  <section class="panel" aria-label="Aquarium controls">
    <div class="panel__head">
      <h1>Aquarium</h1>
      <button class="panel__toggle" type="button" aria-expanded="true" aria-controls="panel-body">Hide</button>
    </div>
    <div class="panel__body" id="panel-body">
      <label class="field">
        <span class="field__label"><span>Light</span><output>Day</output></span>
        <input class="field__input" type="range" min="0" max="1" step="0.01" value="0.35" aria-label="Light" />
      </label>
      <div class="actions">
        <button class="action" type="button" data-act="feed">Feed</button>
        <button class="action" type="button" data-act="startle">Startle</button>
      </div>
      <p class="hint">Click the water to drop food. Move the pointer to look through the glass.</p>
      <p class="stats" data-stats></p>
    </div>
  </section>
`;

/**
 * The small glass panel in the corner. Returns handles rather than exposing
 * DOM nodes, so the scene never queries the page for its own controls.
 */
export function mountControls(root, { mood, onMood, onFeed, onStartle }) {
  root.innerHTML = MARKUP;

  const panelBody = root.querySelector('.panel__body');
  const toggle = root.querySelector('.panel__toggle');
  const slider = root.querySelector('.field__input');
  const output = root.querySelector('.field output');
  const stats = root.querySelector('[data-stats]');

  slider.value = String(mood);
  output.value = labelFor(mood);
  output.textContent = labelFor(mood);

  slider.addEventListener('input', () => {
    const value = Number(slider.value);
    output.value = labelFor(value);
    output.textContent = labelFor(value);
    onMood(value);
  });

  toggle.addEventListener('click', () => {
    const open = panelBody.hasAttribute('hidden');
    if (open) panelBody.removeAttribute('hidden');
    else panelBody.setAttribute('hidden', '');
    toggle.textContent = open ? 'Hide' : 'Show';
    toggle.setAttribute('aria-expanded', String(open));
  });

  root.querySelector('[data-act="feed"]').addEventListener('click', onFeed);
  root.querySelector('[data-act="startle"]').addEventListener('click', onStartle);

  return {
    setStats(text) {
      stats.textContent = text;
    },
  };
}
