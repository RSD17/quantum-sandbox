# Quantum Sandbox

An interactive quantum computing playground built with **HTML, CSS, JavaScript, and p5.js**, designed to make quantum mechanics and quantum circuits intuitive through real-time visualization, guided learning, and hands-on experimentation.

---

## Features

### Three Learning Modes

#### Basic Mode

Perfect for learning single-qubit quantum computing fundamentals.

* Single-qubit circuit builder
* Real-time state vector visualization
* Probability amplitude bars
* Interactive Bloch sphere
* Quantum state presets
* Measurement simulation
* Circuit explanations and educational insights

#### Advanced Mode

Explore multi-qubit systems and entanglement.

* 2–3 qubit circuits
* Multi-qubit gate support
* Entanglement detection and visualization
* Joint statevector analysis
* Basis-state probability distributions
* Bell State preset
* GHZ State preset
* SWAP Test preset
* Individual Bloch spheres for each qubit

#### Expert Mode

Experiment with larger quantum systems and real algorithms.

* Up to 6 qubits
* Universal quantum gate set
* Three-qubit gates (Toffoli, Fredkin)
* Full state-space visualization
* Phase and interference analysis
* Quantum algorithm demonstrations
* GHZ state construction
* Advanced entanglement exploration

---

## Interactive Visualizations

### State Vector Display

Observe quantum amplitudes in real time.

* Complex amplitudes
* Measurement probabilities
* Live normalization
* Mathematical state notation

### Bloch Sphere Visualization

* Interactive 3D rendering
* Animated state transitions
* Phase visualization
* Real-time updates after every gate operation

### Probability Distribution Views

* Single-qubit measurement probabilities
* Multi-qubit basis-state probabilities
* Entangled state analysis

---

## Gate Library

### Single-Qubit Gates

| Gate | Description           |
| ---- | --------------------- |
| X    | Pauli-X (Quantum NOT) |
| Y    | Pauli-Y               |
| Z    | Pauli-Z               |
| H    | Hadamard              |
| S    | Phase-S               |
| T    | Phase-T               |
| ID   | Identity              |

### Multi-Qubit Gates

* CNOT
* CZ
* SWAP

### Expert Gates

* Toffoli (CCX)
* Fredkin (CSWAP)

---

## Circuit Builder

### Create Circuits

* Click gates to add them
* Drag and drop gate placement
* Reorder gates visually
* Swap gate positions
* Remove gates directly
* Adjustable circuit depth
* Multi-wire circuit construction

### Circuit Insights

The simulator automatically explains:

* Individual gate effects
* Circuit patterns
* State evolution
* Quantum phenomena being demonstrated

---

## Educational System

### Interactive Guides

Each mode includes a dedicated walkthrough:

* Quantum computing fundamentals
* Superposition
* Phase and interference
* Measurement
* Entanglement
* Multi-qubit operations
* Quantum algorithms

### Guided Examples

Learn by building:

* Superposition circuits
* Bell states
* GHZ states
* SWAP tests
* Quantum algorithm components

---

## Presets

### Qubit Presets

* |0⟩
* |1⟩
* |+⟩
* |-⟩
* |i⟩
* |-i⟩

### Circuit Presets

* Bell State
* GHZ State
* SWAP Test

---

## Session Management

### Automatic Persistence

Quantum Sandbox automatically saves:

* Circuit configuration
* Gate sequence
* Circuit depth
* Presets
* Theme selection
* Mode configuration

### Restore Circuit

Restore a previous session instantly from local storage.

---

## Import & Export

### Export Options

#### Image Export

High-quality visual snapshots including:

* Circuit diagram
* State information
* Probability bars
* Bloch sphere visualizations

#### JSON Export

Share or archive experiments with:

* Circuit layout
* Gates
* Circuit depth
* Initial states
* Theme configuration
* Simulator settings

### Import

Reload previously exported JSON experiments directly into the simulator.

---

## Productivity Features

### Undo / Redo

* Full history tracking
* Up to 200 actions stored
* Keyboard shortcut support

### Keyboard Shortcuts

| Shortcut             | Action               |
| -------------------- | -------------------- |
| Ctrl/Cmd + Z         | Undo                 |
| Ctrl/Cmd + Y         | Redo                 |
| Ctrl/Cmd + Shift + Z | Redo                 |
| Delete               | Remove selected gate |
| Backspace            | Remove selected gate |
| ←                    | Select previous gate |
| →                    | Select next gate     |

---

## User Experience

### Themes

* Dark mode
* Light mode

### Accessibility

* Keyboard navigation
* Focus indicators
* Tooltips
* Guided onboarding

### Responsive Interface

Designed for modern desktop and laptop browsers.

---

## Technology Stack

* HTML5
* CSS3
* JavaScript (ES6+)
* p5.js
* Font Awesome

No frameworks, build tools, or package managers required.

---

## Educational Goals

Quantum Sandbox is designed to help students, educators, and enthusiasts understand:

* Qubits
* Superposition
* Phase
* Interference
* Measurement
* Entanglement
* Quantum gates
* Multi-qubit systems
* Quantum algorithms

through immediate visual feedback and experimentation.

---

## License

Open-source educational project.