# Quantum Sandbox

An interactive quantum computing education platform designed to make quantum mechanics intuitive through visualization, experimentation, and guided learning.

Quantum Sandbox allows users to build quantum circuits, observe state evolution in real time, explore entanglement and interference, and experiment with foundational quantum algorithms directly in the browser. Rather than treating quantum computing as a collection of abstract equations, the platform emphasizes visual understanding and hands-on exploration.

Built entirely with HTML, CSS, JavaScript, and p5.js, Quantum Sandbox combines simulation, education, and interactive design into a single learning environment.

---

## Why Quantum Sandbox?

Quantum computing is often introduced through dense mathematics and complex notation, making it difficult for beginners to develop intuition for what is actually happening inside a quantum system.

Quantum Sandbox was created to answer a simple question:

> What if learners could see quantum mechanics instead of only reading about it?

The platform transforms concepts such as superposition, phase, interference, measurement, and entanglement into interactive experiences that can be explored visually and experimentally.

Whether you are a student encountering quantum computing for the first time or an educator looking for a teaching tool, Quantum Sandbox provides an accessible environment for understanding the foundations of quantum information science.

---

## Key Features

### Interactive Circuit Builder

Design and experiment with quantum circuits directly in the browser.

* Click-to-place and drag-and-drop gate placement
* Adjustable circuit depth
* Real-time circuit updates
* Undo and redo functionality
* Import and export support
* Visual circuit editing and reordering

### Real-Time Quantum State Visualization

Observe how every gate transforms the underlying quantum state.

* Statevector visualization
* Complex amplitude display
* Measurement probability bars
* Mathematical state notation
* Continuous state updates

### Bloch Sphere Visualization

Develop intuition for single-qubit quantum states through geometry.

* Interactive 3D Bloch sphere
* Real-time state transitions
* Phase-aware visualization
* Animated state evolution

### Multi-Qubit Simulation

Explore systems that extend beyond a single qubit.

* Support for up to 6 qubits
* Multi-qubit statevectors
* Basis-state probability distributions
* Entanglement visualization
* Joint quantum state analysis

---

## Learning Modes

### Basic Mode

Designed for learners who are completely new to quantum computing.

Topics include:

* Qubits
* Superposition
* Phase
* Interference
* Measurement
* Quantum gates

### Advanced Mode

Introduces multi-qubit systems and quantum correlations.

Topics include:

* Controlled operations
* Bell states
* GHZ states
* SWAP tests
* Entanglement
* Multi-qubit visualization

### Expert Mode

Provides access to larger systems, advanced gates, and algorithm demonstrations.

Topics include:

* Quantum Fourier Transform (QFT)
* Grover's Search Algorithm
* Quantum Teleportation
* Deutsch's Algorithm
* Advanced entanglement exploration
* Three-qubit gates
* Phase and interference analysis

---

## Included Quantum Gates

### Single-Qubit Gates

| Gate | Description |
| ---- | ----------- |
| X    | Pauli-X     |
| Y    | Pauli-Y     |
| Z    | Pauli-Z     |
| H    | Hadamard    |
| S    | Phase-S     |
| T    | Phase-T     |
| ID   | Identity    |

### Two-Qubit Gates

* CNOT
* CZ
* SWAP

### Three-Qubit Gates

* Toffoli (CCX)
* Fredkin (CSWAP)

---

## Built-In Learning System

Quantum Sandbox includes a structured learning pathway consisting of lessons, walkthroughs, guided explanations, and interactive examples.

The learning experience progresses from foundational concepts to advanced applications:

**Classical Bits → Qubits → Superposition → Interference → Entanglement → Quantum Algorithms**

The platform currently includes lessons covering:

* Quantum notation
* Superposition
* Measurement
* Interference
* Entanglement
* Quantum gates and circuits
* Quantum hardware
* Quantum error correction
* Grover's Algorithm
* Shor's Algorithm
* Quantum teleportation
* Quantum cryptography
* The future of quantum computing

No prior background in physics or quantum mechanics is required.

---

## Example Experiments

Use the simulator to build and explore:

* Superposition circuits
* Bell states
* GHZ states
* SWAP tests
* Quantum teleportation protocols
* Grover's Search Algorithm
* Quantum Fourier Transform circuits
* Custom multi-qubit experiments

The simulator provides contextual explanations and circuit insights throughout the process, helping users connect mathematical operations with physical intuition.

---

## Import and Export

### Image Export

Generate high-quality visual snapshots that include:

* Circuit diagrams
* State information
* Probability distributions
* Bloch sphere visualizations

### JSON Export

Save and share complete experiments, including:

* Circuit layouts
* Gate sequences
* Initial states
* Circuit depth
* Simulator configuration

### JSON Import

Reload previously exported experiments and continue where you left off.

---

## Productivity Features

### Session Persistence

Quantum Sandbox automatically saves:

* Circuit configurations
* Initial states
* Gate sequences
* Circuit depth
* Theme settings
* Mode preferences

### Undo and Redo

* Full history tracking
* Up to 200 actions stored
* Keyboard shortcut support

### Accessibility

* Keyboard navigation
* Focus indicators
* Tooltips
* Guided onboarding experiences
* Responsive interface design

---

## Technology Stack

* HTML5
* CSS3
* JavaScript (ES6+)
* p5.js
* Font Awesome

The project runs entirely in the browser and requires no frameworks, build tools, or package managers.

---

## Educational Goals

Quantum Sandbox aims to make quantum computing:

* Visual
* Interactive
* Accessible
* Experiment-driven

by allowing learners to observe quantum phenomena as they happen and explore concepts through direct experimentation.

The platform is designed for students, educators, STEM clubs, and anyone interested in understanding the principles behind quantum computing.

---

## License

Quantum Sandbox is an open-source educational project. Contributions, feedback, and suggestions are always welcome.

If you find the project useful, consider starring the repository and sharing it with others interested in quantum computing education.
