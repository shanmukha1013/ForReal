// Debate sides are told apart by tone and pattern within the three-colour
// palette (never by extra hues): solid ember, solid ink, hatched ember,
// hatched ink. Labels always accompany the tone.
const TONES = [
  { key: 'ember', swatch: 'bg-ember', text: 'text-ember', border: 'border-ember', hatched: false, chip: 'bg-ember text-ink' },
  { key: 'ink', swatch: 'bg-ink', text: 'text-ink', border: 'border-ink', hatched: false, chip: 'bg-ink text-ivory' },
  { key: 'ember-hatched', swatch: 'text-ember hatched', text: 'text-ember', border: 'border-ember', hatched: true, chip: 'bg-ivory text-ember' },
  { key: 'ink-hatched', swatch: 'text-ink hatched', text: 'text-ink', border: 'border-ink', hatched: true, chip: 'bg-ivory text-ink' },
];

export const sideTone = (index) => TONES[index % TONES.length];

export const sideIndex = (options = [], optionId) =>
  options.findIndex((opt) => String(opt._id) === String(optionId));

export const sideLetter = (index) => String.fromCharCode(65 + Math.max(0, index));
