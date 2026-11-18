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
      <div class="panel__head-actions">
        <button class="panel__toggle" type="button" data-act="sound" aria-pressed="false">Sound</button>
        <button class="panel__toggle" type="button" data-act="collapse" aria-expanded="true" aria-controls="panel-body">Hide</button>
      </div>
    </div>
    <div class="panel__body" id="panel-body">
      <label class="field">
        <span class="field__label"><span>Light</span><output>Day</output></span>
        <input class="field__input" type="range" min="0" max="1" step="0.01" value="0.35" aria-label="Light" />
      </label>
      <label class="field">
        <span class="field__label"><span>Biome</span></span>
        <select class="select" data-biome aria-label="Biome">
          <option value="clear">Clear water</option>
          <option value="blackwater">Blackwater</option>
          <option value="deep">Deep water</option>
        </select>
      </label>
      <label class="check">
        <input type="checkbox" data-cycle />
        <span>Auto day and night</span>
      </label>
      <div class="actions">
        <button class="action" type="button" data-act="feed">Feed</button>
        <button class="action" type="button" data-act="startle">Startle</button>
        <button class="action" type="button" data-act="shark">Shark</button>
        <button class="action" type="button" data-act="photo">Photo</button>
      </div>
      <p class="hint">Click the water to feed. Rest your pointer in the tank and the tetras will come to the glass.</p>
      <p class="stats" data-stats></p>
    </div>
  </section>
`;

/**
 * The small glass panel in the corner. Returns handles rather than exposing
 * DOM nodes, so the scene never queries the page for its own controls.
 */
export function mountControls(root, { mood, biome, onMood, onFeed, onStartle, onShark, onPhoto, onSound, onCycle, onBiome }) {
  root.innerHTML = MARKUP;

  const panelBody = root.querySelector('.panel__body');
  const collapse = root.querySelector('[data-act="collapse"]');
  const soundBtn = root.querySelector('[data-act="sound"]');
  const slider = root.querySelector('.field__input');
  const output = root.querySelector('.field output');
  const stats = root.querySelector('[data-stats]');
  const select = root.querySelector('[data-biome]');
  const cycle = root.querySelector('[data-cycle]');

  const setLabel = (value) => {
    output.value = labelFor(value);
    output.textContent = labelFor(value);
  };

  slider.value = String(mood);
  select.value = biome;
  setLabel(mood);

  slider.addEventListener('input', () => {
    const value = Number(slider.value);
    setLabel(value);
    onMood(value);
  });

  collapse.addEventListener('click', () => {
    const open = panelBody.hasAttribute('hidden');
    if (open) panelBody.removeAttribute('hidden');
    else panelBody.setAttribute('hidden', '');
    collapse.textContent = open ? 'Hide' : 'Show';
    collapse.setAttribute('aria-expanded', String(open));
  });

  soundBtn.addEventListener('click', () => {
    const on = soundBtn.getAttribute('aria-pressed') !== 'true';
    soundBtn.setAttribute('aria-pressed', String(on));
    soundBtn.classList.toggle('panel__toggle--on', on);
    onSound(on);
  });

  select.addEventListener('change', () => onBiome(select.value));
  cycle.addEventListener('change', () => onCycle(cycle.checked));
  root.querySelector('[data-act="feed"]').addEventListener('click', onFeed);
  root.querySelector('[data-act="startle"]').addEventListener('click', onStartle);
  root.querySelector('[data-act="shark"]').addEventListener('click', onShark);
  root.querySelector('[data-act="photo"]').addEventListener('click', onPhoto);

  return {
    setStats(text) {
      stats.textContent = text;
    },
    /** Moves the slider without firing its input event (used by auto cycle). */
    setMood(value) {
      slider.value = String(value);
      setLabel(value);
    },
    setSound(on) {
      soundBtn.setAttribute('aria-pressed', String(on));
      soundBtn.classList.toggle('panel__toggle--on', on);
    },
  };
}
