// input.js — keyboard and mouse. Arrows/WASD fly the plane, Shift/Ctrl
// (or +/-) work the throttle, Space flares for landing, P pauses,
// R restarts, M mutes, Enter starts. The mouse steers toward the pointer.
export function createInput(canvas) {
  const keys = new Set();
  const input = {
    keys,
    mouse: { x: null, y: null, active: false },
    pressed: new Set(),
    /** True once for the frame the key went down. */
    consume(code) {
      if (input.pressed.has(code)) { input.pressed.delete(code); return true; }
      return false;
    },
  };
  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
    if (!event.repeat) input.pressed.add(event.code);
    keys.add(event.code);
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => { keys.clear(); input.mouse.active = false; });
  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    input.mouse.x = ((event.clientX - rect.left) / rect.width) * 1280;
    input.mouse.y = ((event.clientY - rect.top) / rect.height) * 720;
    input.mouse.active = true;
  });
  canvas.addEventListener('pointerleave', () => { input.mouse.active = false; });
  return input;
}

/** -1..1 pitch input: up climbs. Mouse above/below the plane steers too. */
export function pitchInput(input, planeY) {
  let v = 0;
  if (input.keys.has('ArrowUp') || input.keys.has('KeyW')) v += 1;
  if (input.keys.has('ArrowDown') || input.keys.has('KeyS')) v -= 1;
  if (input.mouse.active && input.mouse.y !== null) {
    const dy = planeY - input.mouse.y;
    if (Math.abs(dy) > 26) v += Math.max(-1, Math.min(1, dy / 130));
  }
  return Math.max(-1, Math.min(1, v));
}

/** -1..1 roll input: left banks left. */
export function rollInput(input, planeX) {
  let v = 0;
  if (input.keys.has('ArrowLeft') || input.keys.has('KeyA')) v -= 1;
  if (input.keys.has('ArrowRight') || input.keys.has('KeyD')) v += 1;
  if (input.mouse.active && input.mouse.x !== null) {
    const dx = input.mouse.x - planeX;
    if (Math.abs(dx) > 40) v += Math.max(-1, Math.min(1, dx / 260));
  }
  return Math.max(-1, Math.min(1, v));
}

export function throttleInput(input) {
  let v = 0;
  if (input.keys.has('ShiftLeft') || input.keys.has('ShiftRight') || input.keys.has('Equal') || input.keys.has('NumpadAdd')) v += 1;
  if (input.keys.has('ControlLeft') || input.keys.has('ControlRight') || input.keys.has('Minus') || input.keys.has('NumpadSubtract')) v -= 1;
  return v;
}
