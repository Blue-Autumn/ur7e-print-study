/* The preview samples actual 50 mm XY columns at every original 2 mm Z layer. */
window.createFootprintPreview = function createFootprintPreview(source) {
  if (!source) return null;
  const {n, pitch_mm: pitch, first_mm: first, z_step_mm: step, heights} = source;
  const gridSize = n*n, layers = new Map();
  function layer(h) {
    if (layers.has(h)) return layers.get(h);
    if (!heights[h]) return null;
    const maps = heights[h].map(([base64, changes]) => {
      const bytes = atob(base64), base = new Uint8Array(gridSize);
      let end = 0;
      for (let i = 0; i < bytes.length; i += 3) {
        const run = bytes.charCodeAt(i) | (bytes.charCodeAt(i+1) << 8);
        base.fill(bytes.charCodeAt(i+2), end, end+run);
        end += run;
      }
      if (end !== gridSize) throw Error('预览图的列数与采样网格不一致。');
      const interval = base.slice(), patch = atob(changes);
      for (let i = 0; i < patch.length; i += 3) {
        const cell = patch.charCodeAt(i) | (patch.charCodeAt(i+1) << 8);
        interval[cell] = patch.charCodeAt(i+2);
      }
      return {base, interval};
    });
    if (layers.size >= 90) layers.delete(layers.keys().next().value);
    layers.set(h, maps);
    return maps;
  }
  return function previewMaps(h, d, mode, k) {
    const start = layer(h);
    if (!start || d % step) return null;
    const accept = mode === 'threshold' ? v => (v & 31) >= k :
                   mode === 'free' ? v => (v & 32) !== 0 : v => (v & 64) !== 0;
    const masks = start.map(({base}) => Uint8Array.from(base, accept));
    const bases = masks.map(a => a.slice());
    for (let z = h; z < h+d; z += step) {
      const current = layer(z);
      if (!current) { for (const mask of masks) mask.fill(0); break; }
      for (let j = 0; j < masks.length; j++) {
        const mask = masks[j], interval = current[j].interval;
        for (let i = 0; i < gridSize; i++) mask[i] &= accept(interval[i]);
      }
    }
    return masks.map((mask, j) => ({n, pitch, first, base:i=>bases[j][i], full:i=>mask[i]}));
  };
};
