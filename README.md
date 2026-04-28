# Quantum Sandbox

Interactive single-qubit playground built with plain HTML, CSS, and JavaScript (`p5.js` for circuit/Bloch visuals).

## What It Does

- Build single-qubit circuits live by clicking/dragging gates.
- Observe real-time updates of:
  - state vector amplitudes (`α`, `β`)
  - probability bars (`|α|²`, `|β|²`)
  - Bloch sphere visualization
- Use presets, measurement collapse, undo/redo, and restore previous session.
- Export experiments as:
  - high-quality image snapshot
  - JSON session file

## Gate Set

- `X`, `Y`, `Z`, `H`, `S`, `T`, `ID`

## Core Controls

- Add gate: click a gate card or drag to circuit
- Reorder/swap: drag gates already in circuit
- Remove gate: hover gate and click red remove badge
- Edit depth: pencil icon in stats row
- Preset: left panel preset dropdown
- Measure / Reset State: left panel buttons
- Export: top-right `Export` menu (`Image` / `JSON`)
- Guide: presentation-style in-app walkthrough

## Keyboard Shortcuts

- `Ctrl/Cmd + Z`: Undo
- `Ctrl/Cmd + Y` or `Ctrl/Cmd + Shift + Z`: Redo
- `Delete` / `Backspace`: remove selected circuit gate
- `Arrow Left` / `Arrow Right`: move selection in circuit

## Session Restore

- If a meaningful prior session exists, `Restore Circuit` appears on load.
- Restores depth, gates, preset/state, and theme from `localStorage`.

## Run

Open `index.html` in a browser.

No build tools or framework setup required.
