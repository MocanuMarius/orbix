const host = document.querySelector('#gallery');

async function openChamber() {
  const { createLanternPreview } = await import('./lantern-preview.mjs?v=scroll-1');
  createLanternPreview({
    host, isPaused: () => document.hidden, play: () => {},
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches
  });
  host.removeAttribute('aria-busy');
}

openChamber().catch(() => {
  host.removeAttribute('aria-busy');
  host.textContent = 'The lantern chamber could not open. Reload to try again.';
});
