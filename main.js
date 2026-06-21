function C(re, im = 0) {
  return { re, im };
}

function toComplex(v) {
  if (typeof v === "number") return C(v, 0);
  return C(v.re, v.im);
}

const GATES = {
  X: {
    label: "X",
    name: "Pauli-X Gate",
    description: "Flips the qubit between |0⟩ and |1⟩.",
    explain: "Think of X as a classical NOT: it swaps how much of |0⟩ and |1⟩ you have, so the state flips across the Bloch sphere.",
    color: "#ff6b6b",
    matrix: [
      [C(0), C(1)],
      [C(1), C(0)]
    ]
  },
  Y: {
    label: "Y",
    name: "Pauli-Y Gate",
    description: "Bit and phase flip with imaginary phase.",
    explain: "Y flips the state like X, but also injects phase (imaginary sign), so both bit value and phase change together.",
    color: "#f08c00",
    matrix: [
      [C(0), C(0, -1)],
      [C(0, 1), C(0)]
    ]
  },
  Z: {
    label: "Z",
    name: "Pauli-Z Gate",
    description: "Applies phase flip to |1⟩.",
    explain: "Z does not change measurement probabilities directly. It flips only the phase of the |1⟩ part, which matters for later interference.",
    color: "#6f42c1",
    matrix: [
      [C(1), C(0)],
      [C(0), C(-1)]
    ]
  },
  H: {
    label: "H",
    name: "Hadamard Gate",
    description: "Creates and removes superposition.",
    explain: "H is the superposition gate: from |0⟩ it creates a 50/50 blend, and applying it again can bring the qubit back to a basis state.",
    color: "#339af0",
    matrix: [
      [C(1 / Math.sqrt(2)), C(1 / Math.sqrt(2))],
      [C(1 / Math.sqrt(2)), C(-1 / Math.sqrt(2))]
    ]
  },
  S: {
    label: "S",
    name: "Phase-S Gate",
    description: "Quarter-turn phase on |1⟩.",
    explain: "S is a quarter phase turn: it rotates only the |1⟩ component by +90°, useful for steering phase without changing raw probabilities.",
    color: "#20c997",
    matrix: [
      [C(1), C(0)],
      [C(0), C(0, 1)]
    ]
  },
  T: {
    label: "T",
    name: "Phase-T Gate",
    description: "Eighth-turn phase on |1⟩.",
    explain: "T is a finer phase turn (+45° on |1⟩): use it when you need subtle phase control in longer circuits.",
    color: "#fcc419",
    matrix: [
      [C(1), C(0)],
      [C(0), C(Math.SQRT1_2, Math.SQRT1_2)]
    ]
  },
  ID: {
    label: "ID",
    name: "Identity Gate",
    description: "No-op gate for timing/alignment.",
    explain: "ID intentionally does nothing to the qubit. It is useful as a timing placeholder to keep circuit steps aligned.",
    color: "#adb5bd",
    matrix: [
      [C(1), C(0)],
      [C(0), C(1)]
    ]
  }
};

const DEPTH_MIN = 1;
const DEPTH_MAX = 16;
let circuitSlots = 8;
let circuit = new Array(circuitSlots).fill(null);
let quantumState = {
  alpha: C(1),
  beta: C(0)
};

let gateSketch;
let blochSketch;
let currentTheme = "dark";
const animatedBloch = { x: 0, y: 0, z: 1 };
let blochSpin = 0;

const dragState = {
  active: false,
  started: false,
  type: null,
  fromCircuit: false,
  sourceSlot: null,
  pointerX: 0,
  pointerY: 0,
  downX: 0,
  downY: 0,
  snapSlot: null,
  snapEase: 0
};

const statsRow = document.getElementById("statsRow");
const alphaText = document.getElementById("alphaText");
const betaText = document.getElementById("betaText");
const alphaBar = document.getElementById("alphaBar");
const betaBar = document.getElementById("betaBar");
const blochText = document.getElementById("blochText");
const sequenceText = document.getElementById("sequenceText");
const gateExplain = document.getElementById("gateExplain");
const libraryWrap = document.getElementById("gateLibrary");
const themeBtn = document.getElementById("themeBtn");
const themeIcon = document.getElementById("themeIcon");
const gateTooltip = document.getElementById("gateTooltip");
const actionTooltip = document.getElementById("actionTooltip");
const exportBtn = document.getElementById("exportBtn");
const exportMenu = document.getElementById("exportMenu");
const exportImageBtn = document.getElementById("exportImageBtn");
const exportJsonBtn = document.getElementById("exportJsonBtn");
const exportOverlay = document.getElementById("exportOverlay");
const exportOverlayIcon = document.getElementById("exportOverlayIcon");
const exportOverlayTitle = document.getElementById("exportOverlayTitle");
const exportOverlayText = document.getElementById("exportOverlayText");
const exportCancelBtn = document.getElementById("exportCancelBtn");
const guideOverlay = document.getElementById("guideOverlay");
const guideCloseBtn = document.getElementById("guideCloseBtn");
const guidePrevBtn = document.getElementById("guidePrevBtn");
const guideNextBtn = document.getElementById("guideNextBtn");
const guideStepLabel = document.getElementById("guideStepLabel");
const guideTitle = document.getElementById("guideTitle");
const guideContent = document.getElementById("guideContent");
const guideCounter = document.getElementById("guideCounter");
const guideProgressBar = document.getElementById("guideProgressBar");
const guideConfetti = document.getElementById("guideConfetti");
const restoreBtn = document.getElementById("restoreBtn");
const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");
const presetSelect = document.getElementById("presetSelect");
const measureBtn = document.getElementById("measureBtn");
const resetStateBtn = document.getElementById("resetStateBtn");
const stateFormula = document.getElementById("stateFormula");
const qubitBadge = document.getElementById("qubitBadge");
const depthEditor = document.getElementById("depthEditor");
const depthInput = document.getElementById("depthInput");
const depthSaveBtn = document.getElementById("depthSaveBtn");
const depthCancelBtn = document.getElementById("depthCancelBtn");
const depthError = document.getElementById("depthError");
const downloadToast = document.getElementById("downloadToast");
let actionTooltipTimer = null;
let exportInProgress = false;
let exportMenuOpen = false;
let depthErrorTimer = null;
let downloadToastTimer = null;
let currentExportSession = null;
let suspendAutoPersist = false;
let guideIndex = 0;
let guideOpen = false;
let confettiTimer = null;
let selectedSlot = null;
let initialState = { alpha: C(1), beta: C(0) };
let initialStateLabel = "|0⟩";
const undoStack = [];
const redoStack = [];
const HISTORY_LIMIT = 200;
const SESSION_KEY = "quantum_sandbox_session_v1";
const GUIDE_SLIDES = [
  {
    section: "Quantum Computing Basics",
    title: "Quantum Computing Basics",
    content:
      "<div class='guide-title-slide'><div><h4>Quantum Computing Basics</h4><p>A quick primer before you experiment.</p></div></div>"
  },
  {
    section: "Quantum Computing Basics",
    title: "Qubits And Superposition",
    content:
      "<p>A qubit is represented as <strong>|ψ⟩ = α|0⟩ + β|1⟩</strong>. Unlike a classical bit, it can exist as a blend of |0⟩ and |1⟩ until measured.</p><div class='guide-grid'><div class='guide-note'><strong>What state means</strong>The state is a complete description of the qubit right now: possible outcomes, their probabilities, and phase information that affects later interference.</div><div class='guide-note'><strong>Amplitude (α, β)</strong>α and β are complex amplitudes. Their magnitudes set measurement probabilities: P(0)=|α|² and P(1)=|β|². Brief intuition: they act like weighted contributions to |0⟩ and |1⟩.</div></div><div class='guide-lesson-links'><a href='learn/lessons/quantum-notation.html' class='guide-lesson-link'><i class='fa-solid fa-graduation-cap'></i> Lesson: Quantum Notation</a><a href='learn/lessons/02-superposition.html' class='guide-lesson-link'><i class='fa-solid fa-graduation-cap'></i> Lesson: Superposition</a></div>"
  },
  {
    section: "Quantum Computing Basics",
    title: "Phase, Interference, Measurement",
    content:
      "<p>Phase is the hidden part of a qubit that controls interference. Two states can have identical probabilities but different future behavior due to phase.</p><p><strong>Measurement</strong> collapses the qubit to either |0⟩ or |1⟩ based on current probabilities.</p><div class='guide-lesson-links'><a href='learn/lessons/03-measurement.html' class='guide-lesson-link'><i class='fa-solid fa-graduation-cap'></i> Lesson: Measurement</a><a href='learn/lessons/04-interference.html' class='guide-lesson-link'><i class='fa-solid fa-graduation-cap'></i> Lesson: Interference</a></div>"
  },
  {
    section: "Using The Sandbox",
    title: "Using the Sandbox",
    content:
      "<div class='guide-title-slide'><div><h4>Using the Sandbox</h4><p>Build, observe, measure, and export your experiments.</p></div></div>"
  },
  {
    section: "Using The Sandbox",
    title: "Build A Circuit",
    content:
      "<div class='guide-flow'><div class='guide-step'><strong><span class='step-head'>1</span>Choose a starting state</strong><p>Pick a preset (for example |0⟩, |+⟩, or |i⟩) so you know the exact initial condition before applying gates.</p></div><div class='guide-arrow'>↓</div><div class='guide-step'><strong><span class='step-head'>2</span>Place gates on the wire</strong><p>Click a gate to place it in the next open slot, or drag it to a specific slot directly.</p></div><div class='guide-arrow'>↓</div><div class='guide-step'><strong><span class='step-head'>3</span>Refine the sequence</strong><p>Drag gates already in the circuit to move/swap them. To remove a gate, hover it and click its red remove badge in the top-right corner.</p></div><div class='guide-arrow'>↓</div><div class='guide-step'><strong><span class='step-head'>4</span>Adjust circuit depth</strong><p>Use the pencil icon next to <strong>Depth</strong> to increase or reduce available slots.</p></div></div>"
  },
  {
    section: "Using The Sandbox",
    title: "Interpret What You See",
    content:
      "<div class='guide-matrix'><article class='guide-matrix-card'><h5>State Vector Panel</h5><p>Read α and β as the current amplitudes. The horizontal bars visualize |α|² and |β|² as percentages.</p></article><article class='guide-matrix-card'><h5>Bloch Sphere</h5><p>Use direction, not just length: the arrow orientation shows how phase and probability combine geometrically.</p></article><article class='guide-matrix-card'><h5>Current Quantum State Row</h5><p>This is your compact math summary: equation form + gate history, updated after every circuit change.</p></article><article class='guide-matrix-card'><h5>Gate Explanation Box</h5><p>Context-sensitive meaning of the most recent gate, so you can connect operation → state change.</p></article></div>"
  },
  {
    section: "Using The Sandbox",
    title: "Presets, Measurement, Recovery",
    content:
      "<div class='guide-lane'><div class='guide-node'><span>Preset</span><p>Choose the initial qubit condition before circuit evolution starts.</p></div><div class='guide-link'>→</div><div class='guide-node'><span>Measure</span><p>Collapse to |0⟩ or |1⟩ using current probabilities, then inspect outcome.</p></div><div class='guide-link'>→</div><div class='guide-node'><span>Reset</span><p>Return to |0⟩ quickly for a clean restart.</p></div></div><div class='guide-matrix two'><article class='guide-matrix-card'><h5>Undo / Redo</h5><p>Step backward or forward through edits (also supports keyboard shortcuts).</p></article><article class='guide-matrix-card'><h5>Restore Circuit</h5><p>If a prior session exists, restore your saved depth, preset, and gates after reload.</p></article></div>"
  },
  {
    section: "Using The Sandbox",
    title: "Export And Share Artifacts",
    content:
      "<div class='guide-compare'><article class='guide-compare-card'><h5><i class='fa-solid fa-image'></i> Image Export</h5><p>Best for reports or presentations.</p><p class='guide-chipline'><span class='guide-chip'>Preset</span><span class='guide-chip'>Gate sequence</span><span class='guide-chip'>State bars</span><span class='guide-chip'>Bloch sphere</span></p></article><article class='guide-compare-card'><h5><i class='fa-solid fa-file-code'></i> JSON Export</h5><p>Best for reproducibility and reloading configurations.</p><p class='guide-chipline'><span class='guide-chip'>Depth</span><span class='guide-chip'>Gates</span><span class='guide-chip'>Initial state</span><span class='guide-chip'>Theme</span></p></article></div><div class='guide-note'><strong>Export behavior</strong>Both export modes show a loading overlay and can be cancelled before completion.</div>"
  },
  {
    section: "Learn",
    title: "Feeling Overwhelmed?",
    content:
      "<div class='guide-title-slide'><div><h4>Not sure where to start?</h4><p>The <strong>Learn</strong> section walks you through quantum computing from scratch. NO PHYSICS BACKGROUND NEEDED, just curiosity.</p><a href='learn/index.html' class='guide-learn-cta'><i class='fa-solid fa-graduation-cap'></i><div><strong>Go to Learning Modules</strong><span style='display:block;font-size:0.8rem;opacity:0.75;margin-top:2px'>15 lessons from zero to quantum algorithms</span></div><i class='fa-solid fa-arrow-right' style='margin-left:auto'></i></a></div></div>"
  },
  {
    section: "Ready",
    title: "You Are Good To Go!",
    content:
      "<div class='guide-title-slide'><div><h4>You are good to go!</h4><p>Try presets, build a sequence, and see how the state moves on the Bloch sphere.</p></div></div>"
  }
];

const GUIDE_SLIDES_ADVANCED = [
  {
    section: "Advanced Mode",
    title: "Welcome to Advanced Mode",
    content: "<div class='guide-title-slide'><div><div class='guide-mode-updated-badge'><i class='fa-solid fa-wand-magic-sparkles'></i> Guide updated for Advanced Mode</div><h4>Advanced Mode</h4><p>Multi-qubit circuits, entanglement, and joint quantum state visualization.</p><p style='margin-top:10px;font-size:0.85rem;opacity:0.75'>This guide has been refreshed with new explanations and step-by-step walkthroughs tailored specifically to multi-qubit features.</p></div></div>"
  },
  {
    section: "Advanced Mode",
    title: "Two-Qubit Gates",
    content: "<p>Advanced mode introduces gates that operate across two qubits simultaneously, enabling entanglement.</p><div class='guide-grid'><div class='guide-note'><strong>CNOT (Controlled-NOT)</strong>Flips the TARGET qubit only when the CONTROL qubit is |1⟩. This conditional operation is the primary source of entanglement in quantum circuits. It creates correlations that have no classical equivalent.</div><div class='guide-note'><strong>CZ (Controlled-Z)</strong>Applies a Z phase-flip to the |11⟩ component only. Functionally equivalent to CNOT in computational power but phase-focused, meaning the phase relationship it creates drives interference in algorithms like Grover's.</div><div class='guide-note'><strong>SWAP</strong>Completely exchanges the quantum states of two qubits. In physical quantum hardware, qubit connectivity is limited, so SWAP gates are used to route quantum information between non-adjacent qubits.</div></div><div class='guide-lesson-links'><a href='learn/lessons/07-gates-and-circuits.html' class='guide-lesson-link'><i class='fa-solid fa-graduation-cap'></i> Lesson: Gates and Circuits</a></div>"
  },
  {
    section: "Advanced Mode",
    title: "Control and Target Qubits",
    content: "<p>Two-qubit gates have a <strong>control qubit</strong> and a <strong>target qubit</strong>. The control's state determines whether the gate acts on the target.</p><div class='guide-matrix two'><article class='guide-matrix-card'><h5>Why this matters</h5><p>When the control is in superposition, the gate applies to both |0⟩ and |1⟩ simultaneously. This creates entanglement, where the qubits become correlated in a way that classical probability cannot describe.</p></article><article class='guide-matrix-card'><h5>Superposition + CNOT</h5><p>H on the control → CNOT creates a Bell state. The H puts the control into superposition; the CNOT then correlates the target with it. Neither qubit has an independent state anymore.</p></article></div>"
  },
  {
    section: "Advanced Mode",
    title: "Entanglement and Joint State",
    content: "<p>With 2 qubits there are 4 possible outcomes: |00⟩, |01⟩, |10⟩, |11⟩. The probability of each is shown in the state panel.</p><div class='guide-matrix two'><article class='guide-matrix-card'><h5>Entanglement</h5><p>When qubits are entangled, they no longer have independent states. Measuring one instantly determines the outcome of the other, regardless of distance. Einstein called this \"spooky action at a distance.\"</p></article><article class='guide-matrix-card'><h5>Marginal Bloch Spheres</h5><p>Each qubit gets its own Bloch sphere, but when entangled these are approximate marginal states. They can't fully capture the joint state, which is why we need the full statevector.</p></article></div><div class='guide-lesson-links'><a href='learn/lessons/05-entanglement.html' class='guide-lesson-link'><i class='fa-solid fa-graduation-cap'></i> Lesson: Entanglement</a></div>"
  },
  {
    section: "Advanced Mode",
    title: "Foundational Entangled States",
    content: "<div class='guide-compare'><article class='guide-compare-card'><h5>Bell State ( |Φ+⟩ )</h5><p>H then CNOT creates (|00⟩+|11⟩)/√2. This is the simplest maximally entangled state. Both outcomes are equally likely, and measuring one collapses both simultaneously. The foundation of quantum teleportation and cryptography.</p></article><article class='guide-compare-card'><h5>GHZ State</h5><p>Extends Bell to 3 qubits: (|000⟩+|111⟩)/√2. All three are maximally entangled. Violates Bell inequalities more strongly than any 2-qubit state. Used in quantum error correction and tests of quantum mechanics.</p></article><article class='guide-compare-card'><h5>SWAP Test</h5><p>Estimates the overlap between two quantum states using interference. If two states are identical the SWAP test always returns 0; if orthogonal, it returns 0 or 1 with equal probability. A core primitive in quantum machine learning.</p></article></div>"
  },
  {
    section: "Advanced Mode",
    title: "Create Your First Entangled Circuit",
    content: "<p>Follow these steps to produce a Bell state, the simplest maximally entangled state, right now in the sandbox.</p><div class='guide-flow'><div class='guide-step'><strong><span class='step-head'>1</span>Click <strong>H</strong> in the Gate Library</strong><p>Click the <strong>H</strong> gate, then click the <strong>top wire (Q0)</strong> in the circuit. This puts Q0 into superposition: 50% |0⟩ and 50% |1⟩.</p></div><div class='guide-arrow'>↓</div><div class='guide-step'><strong><span class='step-head'>2</span>Place a CNOT gate</strong><p>Click <strong>CNOT</strong>, click the <strong>top wire (Q0)</strong> as the control, then click the <strong>bottom wire (Q1)</strong> as the target. The vertical connector appears.</p></div><div class='guide-arrow'>↓</div><div class='guide-step'><strong><span class='step-head'>3</span>Read the result</strong><p>The <strong>Entanglement badge</strong> lights up in the right panel. The probability bars show only |00⟩ and |11⟩ at 50% each. The two qubits are now maximally correlated. Measuring either one instantly determines the other.</p></div></div>"
  },
  {
    section: "Advanced Mode",
    title: "You Are Ready!",
    content: "<div class='guide-title-slide'><div><h4>Ready to experiment!</h4><p>Build any entangled circuit, load a preset, or start from scratch. Every combination of gates reveals something new about the joint quantum state.</p></div></div>"
  }
];

const GUIDE_SLIDES_EXPERT = [
  {
    section: "Expert Mode",
    title: "Welcome to Expert Mode",
    content: "<div class='guide-title-slide'><div><div class='guide-mode-updated-badge expert'><i class='fa-solid fa-wand-magic-sparkles'></i> Guide updated for Expert Mode</div><h4>Expert Mode</h4><p>A universal gate set, up to 6 qubits, complex phase visualization, and real quantum algorithms.</p><p style='margin-top:10px;font-size:0.85rem;opacity:0.75'>This guide covers deeper quantum mechanics, multi-qubit operations, and walks you through building real algorithms from scratch. Note: \"universal\" means these gates are enough to build any quantum computation - it does not mean they are the only gates that exist. Any unitary matrix is a valid gate, so there are infinitely many possible gates in total.</p></div></div>"
  },
  {
    section: "Expert Mode",
    title: "Three-Qubit Gates",
    content: "<p>Expert mode adds Toffoli (CCX) and Fredkin (CSWAP): the three-qubit gates that complete the universal gate set for reversible classical computation.</p><div class='guide-grid'><div class='guide-note'><strong>Toffoli (CCX)</strong>Flips the TARGET qubit only if BOTH control qubits are |1⟩. Equivalent to a reversible classical AND gate. Combined with H and CNOT, this single gate makes the set computationally universal, meaning any classical function can be computed reversibly.</div><div class='guide-note'><strong>Fredkin (CSWAP)</strong>Swaps two target qubits if the control qubit is |1⟩. Implements reversible classical multiplexing and can sort quantum states conditionally. Used in quantum sorting networks and as a building block for arithmetic circuits.</div></div>"
  },
  {
    section: "Expert Mode",
    title: "Entanglement",
    content: "<p>Entanglement is a uniquely quantum correlation in which two or more qubits share a joint state that cannot be factored into independent parts. It is the primary resource that separates quantum computation from classical computation.</p><div class='guide-matrix two'><article class='guide-matrix-card'><h5>How entanglement forms</h5><p>Any two-qubit gate that applies a conditional operation, like CNOT with its control in superposition, can create entanglement. The qubits' fates become linked: there is no individual state for either qubit, only a joint state.</p></article><article class='guide-matrix-card'><h5>Measurement and collapse</h5><p>Measuring one entangled qubit instantly determines the outcome of all its partners. The correlation is pre-existing in the joint state, which means it is not a signal, but a consequence of shared quantum information.</p></article><article class='guide-matrix-card'><h5>Multi-qubit entanglement</h5><p>With 6 qubits you can create GHZ-like states where all six are maximally entangled. The individual Bloch spheres become purely approximate; only the full 64-dimensional statevector captures the real state.</p></article><article class='guide-matrix-card'><h5>Entanglement and algorithms</h5><p>Grover's search, QFT, and quantum teleportation all depend on engineered entanglement. It enables quantum parallelism, operating on all 2ⁿ basis states simultaneously, and drives the interference that amplifies correct answers.</p></article></div>"
  },
  {
    section: "Expert Mode",
    title: "Exponential State Space",
    content: "<p>Each additional qubit doubles the number of basis states that must be tracked simultaneously.</p><div class='guide-note' style='margin-top:12px'><strong>State space by qubit count</strong>2 qubits = 4 basis states · 3 = 8 · 4 = 16 · 5 = 32 · 6 = 64. A classical computer needs memory proportional to this count to simulate the full quantum state, while quantum hardware handles it natively through physical superposition.</div><div class='guide-matrix two' style='margin-top:14px'><article class='guide-matrix-card'><h5>Why this matters</h5><p>Quantum algorithms exploit this exponential space to perform computations that would be classically intractable. Shor's algorithm factors numbers in polynomial time by operating on all possible states simultaneously.</p></article><article class='guide-matrix-card'><h5>Entanglement across many qubits</h5><p>With 6 entangled qubits, no single qubit has an independent state. The full quantum state lives in a 64-dimensional complex vector space, far beyond anything a Bloch sphere can convey alone.</p></article></div>"
  },
  {
    section: "Expert Mode",
    title: "Phase and Quantum Interference",
    content: "<p>Every basis state with nonzero amplitude carries a complex phase angle. Phase is invisible to measurement, but it completely determines how amplitudes interfere.</p><div class='guide-matrix two'><article class='guide-matrix-card'><h5>Constructive interference</h5><p>When two amplitudes have the same phase, they are added together, making that outcome more probable. Quantum algorithms engineer circuits specifically to constructively interfere on correct answers.</p></article><article class='guide-matrix-card'><h5>Destructive interference</h5><p>When two amplitudes are opposite in phase (180° apart), they cancel, driving that outcome's probability toward zero. This is how quantum algorithms suppress wrong answers without ever checking them explicitly.</p></article></div>"
  },
  {
    section: "Expert Mode",
    title: "Real Quantum Algorithms",
    content: "<div class='guide-compare'><article class='guide-compare-card'><h5>Grover's Search</h5><p>Uses phase kickback and diffusion to amplify one target state's probability. Achieves a quadratic speedup over classical exhaustive search, searching N items in √N steps.</p></article><article class='guide-compare-card'><h5>QFT (Quantum Fourier Transform)</h5><p>The quantum analogue of the FFT. Transforms computational basis states into a frequency domain with exponential efficiency. The core subroutine of Shor's factoring algorithm.</p></article><article class='guide-compare-card'><h5>Quantum Teleportation</h5><p>Transmits an unknown qubit state using an entangled pair plus two classical bits. The quantum state is destroyed at the sender and perfectly reconstructed at the receiver. Hence, there is no cloning and no faster-than-light communication.</p></article><article class='guide-compare-card'><h5>Deutsch Algorithm</h5><p>The first algorithm proven to outperform any classical algorithm. Determines whether a function is constant or balanced in one quantum query, where classically two are required.</p></article></div>"
  },
  {
    section: "Expert Mode",
    title: "Build a GHZ State Step by Step",
    content: "<p>The GHZ state (|000⟩+|111⟩)/√2 is maximally entangled across <em>three</em> qubits. Here's how to build it from scratch.</p><div class='guide-flow'><div class='guide-step'><strong><span class='step-head'>1</span>Set qubit count to 3</strong><p>Use the <strong>+</strong> button in the left panel to add a third qubit. You now have wires Q0, Q1, and Q2.</p></div><div class='guide-arrow'>↓</div><div class='guide-step'><strong><span class='step-head'>2</span>H on Q0</strong><p>Click <strong>H</strong>, then click the top wire (Q0). Q0 enters superposition and the phase display updates to show complex amplitudes.</p></div><div class='guide-arrow'>↓</div><div class='guide-step'><strong><span class='step-head'>3</span>CNOT Q0 → Q1</strong><p>Click <strong>CNOT</strong>, pick Q0 as control, Q1 as target. The entanglement badge appears, which means Q0 and Q1 are now correlated.</p></div><div class='guide-arrow'>↓</div><div class='guide-step'><strong><span class='step-head'>4</span>CNOT Q0 → Q2</strong><p>Click <strong>CNOT</strong> again, pick Q0 as control, Q2 as target. All three qubits are now entangled: only |000⟩ and |111⟩ have nonzero probability.</p></div></div>"
  },
  {
    section: "Expert Mode",
    title: "You Are Ready!",
    content: "<div class='guide-title-slide'><div><h4>You are ready!</h4><p>Load any algorithm from the preset menu and observe how phase interference accumulates across each gate, steering probability toward the target outcome.</p></div></div>"
  }
];

let activeGuideSlides = GUIDE_SLIDES;

const dragGhost = document.createElement("div");
dragGhost.className = "drag-ghost";
document.body.appendChild(dragGhost);

function updateDragGhostStyle(gateType) {
  const color = GATES[gateType].color;
  const dark = document.body.classList.contains("dark");
  dragGhost.style.border = `2px solid ${color}`;
  dragGhost.style.background = dark ? "rgba(10, 18, 30, 0.92)" : "rgba(255, 255, 255, 0.95)";
  dragGhost.style.color = dark ? "#eef4ff" : "#111";
  dragGhost.style.boxShadow = `0 0 0 2px color-mix(in oklab, ${color}, transparent 65%), 0 8px 18px rgba(0, 0, 0, 0.18)`;
}

function showDragGhost(gateType, x, y) {
  dragGhost.textContent = GATES[gateType].label;
  updateDragGhostStyle(gateType);
  dragGhost.style.display = "flex";
  dragGhost.style.left = `${x}px`;
  dragGhost.style.top = `${y}px`;
}

function moveDragGhost(x, y) {
  dragGhost.style.left = `${x}px`;
  dragGhost.style.top = `${y}px`;
}

function hideDragGhost() {
  dragGhost.style.display = "none";
}

function showGateTooltip(text, anchorRect, color) {
  gateTooltip.textContent = text;
  gateTooltip.style.transform = "translate(-50%, -140%)";
  gateTooltip.style.left = `${anchorRect.left + anchorRect.width / 2}px`;
  gateTooltip.style.top = `${anchorRect.top}px`;
  gateTooltip.style.borderColor = color;
  gateTooltip.classList.add("visible");
  gateTooltip.setAttribute("aria-hidden", "false");
}

function hideGateTooltip() {
  gateTooltip.classList.remove("visible");
  gateTooltip.setAttribute("aria-hidden", "true");
}

function showActionTooltip(anchorRect, html, color = "var(--border)", options = {}) {
  const placement = options.placement || "bottom";
  const boxed = Boolean(options.boxed);
  actionTooltip.innerHTML = html;
  actionTooltip.classList.toggle("boxed", boxed);
  actionTooltip.classList.add("visible");
  actionTooltip.setAttribute("aria-hidden", "false");
  actionTooltip.style.borderColor = color;

  // Position after paint so we can read actual tooltip width
  requestAnimationFrame(() => {
    const tw = actionTooltip.offsetWidth || 260;
    const th = actionTooltip.offsetHeight || 48;
    const margin = 8;
    let left, top;

    if (placement === "right") {
      left = anchorRect.right + 10;
      top  = anchorRect.top + anchorRect.height / 2 - th / 2;
      // If it would overflow right, flip to left
      if (left + tw > window.innerWidth - margin) {
        left = anchorRect.left - tw - 10;
      }
      actionTooltip.style.transform = "none";
    } else {
      left = anchorRect.left + anchorRect.width / 2 - tw / 2;
      top  = anchorRect.bottom + 8;
      actionTooltip.style.transform = "none";
    }

    // Clamp within viewport
    left = Math.max(margin, Math.min(window.innerWidth  - tw - margin, left));
    top  = Math.max(margin, Math.min(window.innerHeight - th - margin, top));

    actionTooltip.style.left = `${left}px`;
    actionTooltip.style.top  = `${top}px`;
  });
}

function hideActionTooltip() {
  if (actionTooltipTimer) {
    clearTimeout(actionTooltipTimer);
    actionTooltipTimer = null;
  }
  actionTooltip.classList.remove("boxed");
  actionTooltip.style.transform = "translate(-50%, 8px)";
  actionTooltip.classList.remove("visible");
  actionTooltip.setAttribute("aria-hidden", "true");
}

function showExportOverlay() {
  exportOverlay.classList.add("visible");
  exportOverlay.setAttribute("aria-hidden", "false");
}

function hideExportOverlay() {
  exportOverlay.classList.remove("visible");
  exportOverlay.setAttribute("aria-hidden", "true");
}

function renderGuideSlide() {
  const s = activeGuideSlides[guideIndex];
  guideStepLabel.textContent = s.section;
  guideTitle.textContent = s.title;
  guideContent.classList.remove("guide-content");
  void guideContent.offsetWidth;
  guideContent.classList.add("guide-content");
  guideContent.innerHTML = s.content;
  guideCounter.textContent = `${guideIndex + 1} / ${activeGuideSlides.length}`;
  guideProgressBar.style.width = `${((guideIndex + 1) / activeGuideSlides.length) * 100}%`;
  guidePrevBtn.disabled = guideIndex === 0;
  guideNextBtn.disabled = guideIndex === activeGuideSlides.length - 1;
  if (guideIndex === activeGuideSlides.length - 1) {
    triggerGuideConfetti();
  } else {
    clearGuideConfetti();
  }
}

function clearGuideConfetti() {
  if (confettiTimer) {
    clearTimeout(confettiTimer);
    confettiTimer = null;
  }
  guideConfetti.innerHTML = "";
}

function triggerGuideConfetti() {
  clearGuideConfetti();
  const colors = ["#ff6b6b", "#2fbf71", "#4cc9f0", "#f7b801", "#b078ff"];
  for (let i = 0; i < 70; i += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.top = `${-20 - Math.random() * 120}px`;
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDelay = `${Math.random() * 280}ms`;
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    guideConfetti.appendChild(piece);
  }
  confettiTimer = setTimeout(clearGuideConfetti, 3600);
}

function openGuide() {
  guideOpen = true;
  guideIndex = 0;
  activeGuideSlides = currentMode === "expert" ? GUIDE_SLIDES_EXPERT
                    : currentMode === "advanced" ? GUIDE_SLIDES_ADVANCED
                    : GUIDE_SLIDES;
  renderGuideSlide();
  guideOverlay.classList.add("visible");
  guideOverlay.setAttribute("aria-hidden", "false");
}

function closeGuide() {
  guideOpen = false;
  guideOverlay.classList.remove("visible");
  guideOverlay.setAttribute("aria-hidden", "true");
  clearGuideConfetti();
}

function showDownloadToast(message) {
  if (downloadToastTimer) clearTimeout(downloadToastTimer);
  downloadToast.textContent = message;
  downloadToast.classList.add("visible");
  downloadToast.setAttribute("aria-hidden", "false");
  downloadToastTimer = setTimeout(() => {
    downloadToast.classList.remove("visible");
    downloadToast.setAttribute("aria-hidden", "true");
    downloadToastTimer = null;
  }, 1600);
}

function waitWithCancellation(ms, session) {
  return new Promise((resolve) => {
    session.resolveWait = resolve;
    session.timer = setTimeout(() => resolve(true), ms);
  });
}

function cancelCurrentExport() {
  if (!currentExportSession || currentExportSession.cancelled) return;
  currentExportSession.cancelled = true;
  if (currentExportSession.timer) {
    clearTimeout(currentExportSession.timer);
    currentExportSession.timer = null;
  }
  if (currentExportSession.resolveWait) {
    currentExportSession.resolveWait(false);
    currentExportSession.resolveWait = null;
  }
  hideExportOverlay();
  exportInProgress = false;
  showDownloadToast("Download cancelled.");
}

function configureExportOverlay(mode) {
  if (mode === "json") {
    exportOverlayIcon.className = "fa-solid fa-file-code";
    exportOverlayTitle.textContent = "Your circuit is being exported as JSON";
    exportOverlayText.textContent = "Preparing configuration file...";
  } else {
    exportOverlayIcon.className = "fa-solid fa-image";
    exportOverlayTitle.textContent = "Your circuit is being exported to an image";
    exportOverlayText.textContent = "Rendering circuit snapshot...";
  }
}

function openExportMenu() {
  exportMenu.classList.add("visible");
  exportMenu.setAttribute("aria-hidden", "false");
  exportMenuOpen = true;
}

function closeExportMenu() {
  exportMenu.classList.remove("visible");
  exportMenu.setAttribute("aria-hidden", "true");
  exportMenuOpen = false;
}

function openDepthEditor() {
  depthInput.value = String(circuitSlots);
  depthEditor.classList.add("visible");
  depthEditor.setAttribute("aria-hidden", "false");
  document.getElementById("depthBackdrop").classList.add("visible");
  depthInput.focus();
  depthInput.select();
}

function closeDepthEditor() {
  depthEditor.classList.remove("visible");
  depthEditor.setAttribute("aria-hidden", "true");
  document.getElementById("depthBackdrop").classList.remove("visible");
}

function showDepthError(message) {
  if (depthErrorTimer) clearTimeout(depthErrorTimer);
  depthError.textContent = message;
  depthError.classList.add("visible");
  depthError.classList.remove("shake");
  void depthError.offsetWidth;
  depthError.classList.add("shake");
  depthError.setAttribute("aria-hidden", "false");
  depthErrorTimer = setTimeout(() => {
    depthError.classList.remove("visible", "shake");
    depthError.setAttribute("aria-hidden", "true");
    depthErrorTimer = null;
  }, 1700);
}

function setCircuitDepth(nextDepth, withHistory = false) {
  const val = Number(nextDepth);
  if (!Number.isInteger(val) || val < DEPTH_MIN || val > DEPTH_MAX) {
    showDepthError(`Please choose an integer depth between ${DEPTH_MIN} and ${DEPTH_MAX}.`);
    return false;
  }
  if (withHistory && val !== circuitSlots) pushHistory();

  if (val > circuitSlots) {
    circuit = circuit.concat(new Array(val - circuitSlots).fill(null));
  } else if (val < circuitSlots) {
    circuit = circuit.slice(0, val);
    if (selectedSlot !== null && selectedSlot >= val) selectedSlot = null;
  }
  circuitSlots = val;
  recomputeState();
  return true;
}

function colorWithAlpha(cssColor, alpha, p) {
  const c = p.color(cssColor);
  c.setAlpha(Math.max(0, Math.min(255, alpha * 255)));
  return c;
}

function drawArrow3D(p, from, to, startColor, endColor) {
  const dir = p5.Vector.sub(to, from);
  const len = dir.mag();
  if (len < 1e-6) return;

  const n = dir.copy().normalize();
  const headLen = Math.min(18, Math.max(10, len * 0.2));
  const shaftEnd = to.copy().sub(p5.Vector.mult(n, headLen * 0.8));
  const segments = 12;
  p.strokeWeight(2.6);
  for (let i = 0; i < segments; i += 1) {
    const t0 = i / segments;
    const t1 = (i + 1) / segments;
    const a = p5.Vector.lerp(from, shaftEnd, t0);
    const b = p5.Vector.lerp(from, shaftEnd, t1);
    p.stroke(p.lerpColor(startColor, endColor, t0));
    p.line(a.x, a.y, a.z, b.x, b.y, b.z);
  }

  p.push();
  p.noStroke();
  p.fill(endColor);
  p.translate(to.x, to.y, to.z);

  const up = p.createVector(0, 1, 0);
  const axis = up.cross(n);
  const axisMag = axis.mag();
  const dot = Math.max(-1, Math.min(1, up.dot(n)));
  const angle = Math.acos(dot);
  if (axisMag > 1e-6) {
    axis.normalize();
    p.rotate(angle, [axis.x, axis.y, axis.z]);
  } else if (dot < 0) {
    p.rotate(Math.PI, [1, 0, 0]);
  }

  p.cone(5.2, headLen, 10, 1);
  p.pop();
}

function cMul(a, b) {
  return C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
}

function cAdd(a, b) {
  return C(a.re + b.re, a.im + b.im);
}

function cScale(a, s) {
  const z = toComplex(s);
  return cMul(a, z);
}

function cAbs2(a) {
  return a.re * a.re + a.im * a.im;
}

function cConj(a) {
  return C(a.re, -a.im);
}

function cloneComplex(z) {
  return C(z.re, z.im);
}

function cloneState(state) {
  return { alpha: cloneComplex(state.alpha), beta: cloneComplex(state.beta) };
}

function snapshotCurrent() {
  return {
    circuitSlots,
    circuit: [...circuit],
    initialState: cloneState(initialState),
    initialStateLabel,
    explainHtml: gateExplain.innerHTML,
    explainEmpty: gateExplain.classList.contains("empty"),
    selectedSlot
  };
}

function sessionPayload() {
  return {
    saved_at: new Date().toISOString(),
    currentTheme,
    circuitSlots,
    circuit: [...circuit],
    initialStateLabel,
    initialState: cloneState(initialState)
  };
}

function persistSession() {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionPayload()));
  } catch {}
}

function loadSavedSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function hasMeaningfulSession(s) {
  if (!s) return false;
  const hasGates = Array.isArray(s.circuit) && s.circuit.some(Boolean);
  const nonDefaultPreset = s.initialStateLabel && s.initialStateLabel !== "|0⟩";
  const nonDefaultDepth = Number.isInteger(s.circuitSlots) && s.circuitSlots !== 8;
  return hasGates || nonDefaultPreset || nonDefaultDepth;
}

function restoreFromSession(s) {
  if (!s) return;
  if (s.currentTheme === "light" || s.currentTheme === "dark") {
    currentTheme = s.currentTheme;
    document.body.classList.toggle("dark", currentTheme === "dark");
    themeIcon.className = currentTheme === "dark" ? "fa-solid fa-sun" : "fa-solid fa-moon";
  }
  if (Number.isInteger(s.circuitSlots)) {
    setCircuitDepth(s.circuitSlots, false);
  }
  if (Array.isArray(s.circuit)) {
    const rebuilt = new Array(circuitSlots).fill(null);
    for (let i = 0; i < Math.min(circuitSlots, s.circuit.length); i += 1) {
      const g = s.circuit[i];
      rebuilt[i] = GATES[g] ? g : null;
    }
    circuit = rebuilt;
  }
  if (s.initialState && s.initialState.alpha && s.initialState.beta) {
    initialState = normalizeState({
      alpha: toComplex(s.initialState.alpha),
      beta: toComplex(s.initialState.beta)
    });
  } else {
    initialState = presetToState("ZERO");
  }
  initialStateLabel = typeof s.initialStateLabel === "string" ? s.initialStateLabel : "|0⟩";
  qubitBadge.textContent = initialStateLabel;
  const presetMap = {
    "|0⟩": "ZERO",
    "|1⟩": "ONE",
    "|+⟩": "PLUS",
    "|-⟩": "MINUS",
    "|i⟩": "PLUS_I",
    "|-i⟩": "MINUS_I"
  };
  presetSelect.value = presetMap[initialStateLabel] || "ZERO";
  selectedSlot = null;
  setExplain(null);
  recomputeState();
}

function applySnapshot(snapshot) {
  circuitSlots = snapshot.circuitSlots;
  circuit = [...snapshot.circuit];
  initialState = cloneState(snapshot.initialState);
  initialStateLabel = snapshot.initialStateLabel || "|0⟩";
  qubitBadge.textContent = initialStateLabel;
  gateExplain.innerHTML = snapshot.explainHtml;
  gateExplain.classList.toggle("empty", snapshot.explainEmpty);
  selectedSlot = snapshot.selectedSlot;
  recomputeState();
}

function pushHistory() {
  undoStack.push(snapshotCurrent());
  if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
  redoStack.length = 0;
  updateUndoRedoButtons();
}

function undo() {
  if (!undoStack.length) return;
  redoStack.push(snapshotCurrent());
  const prev = undoStack.pop();
  applySnapshot(prev);
  updateUndoRedoButtons();
}

function redo() {
  if (!redoStack.length) return;
  undoStack.push(snapshotCurrent());
  const next = redoStack.pop();
  applySnapshot(next);
  updateUndoRedoButtons();
}

function updateUndoRedoButtons() {
  undoBtn.disabled = undoStack.length === 0;
  redoBtn.disabled = redoStack.length === 0;
}

function presetToState(preset) {
  const i = C(0, 1);
  switch (preset) {
    case "ONE":
      return { alpha: C(0), beta: C(1) };
    case "PLUS":
      return { alpha: C(Math.SQRT1_2), beta: C(Math.SQRT1_2) };
    case "MINUS":
      return { alpha: C(Math.SQRT1_2), beta: C(-Math.SQRT1_2) };
    case "PLUS_I":
      return { alpha: C(Math.SQRT1_2), beta: cScale(i, Math.SQRT1_2) };
    case "MINUS_I":
      return { alpha: C(Math.SQRT1_2), beta: cScale(i, -Math.SQRT1_2) };
    case "ZERO":
    default:
      return { alpha: C(1), beta: C(0) };
  }
}

function presetToLabel(preset) {
  switch (preset) {
    case "ONE":
      return "|1⟩";
    case "PLUS":
      return "|+⟩";
    case "MINUS":
      return "|-⟩";
    case "PLUS_I":
      return "|i⟩";
    case "MINUS_I":
      return "|-i⟩";
    case "ZERO":
    default:
      return "|0⟩";
  }
}

function applyGate(state, gateType) {
  const m = GATES[gateType].matrix;
  const a = state.alpha;
  const b = state.beta;

  const nextAlpha = cAdd(cScale(a, m[0][0]), cScale(b, m[0][1]));
  const nextBeta = cAdd(cScale(a, m[1][0]), cScale(b, m[1][1]));
  return normalizeState({ alpha: nextAlpha, beta: nextBeta });
}

function normalizeState(state) {
  const n = Math.sqrt(cAbs2(state.alpha) + cAbs2(state.beta)) || 1;
  return {
    alpha: cScale(state.alpha, 1 / n),
    beta: cScale(state.beta, 1 / n)
  };
}

function recomputeState() {
  let state = cloneState(initialState);

  for (let i = 0; i < circuit.length; i += 1) {
    const g = circuit[i];
    if (g) state = applyGate(state, g);
  }

  quantumState = state;
  updateReadouts();
  if (!suspendAutoPersist) persistSession();
}

function fmtComplex(z) {
  const re = Math.abs(z.re) < 1e-10 ? 0 : z.re;
  const im = Math.abs(z.im) < 1e-10 ? 0 : z.im;
  const sign = im >= 0 ? "+" : "-";
  return `${re.toFixed(3)} ${sign} ${Math.abs(im).toFixed(3)}i`;
}

function getBlochVector() {
  const a = quantumState.alpha;
  const b = quantumState.beta;
  const ab = cMul(cConj(a), b);
  return {
    x: 2 * ab.re,
    y: 2 * ab.im,
    z: cAbs2(a) - cAbs2(b)
  };
}

function updateReadouts() {
  const p0 = cAbs2(quantumState.alpha);
  const p1 = cAbs2(quantumState.beta);

  alphaText.innerHTML = `<span class="amp-value">${fmtComplex(quantumState.alpha)}</span><span class="amp-prob">${(p0 * 100).toFixed(1)}%</span>`;
  betaText.innerHTML  = `<span class="amp-value">${fmtComplex(quantumState.beta)}</span><span class="amp-prob">${(p1 * 100).toFixed(1)}%</span>`;
  const p0Width = p0 < 1e-9 ? 0 : p0 * 100;
  const p1Width = p1 < 1e-9 ? 0 : p1 * 100;
  alphaBar.style.width = `${p0Width}%`;
  betaBar.style.width = `${p1Width}%`;

  const seq = circuit.filter(Boolean);
  sequenceText.textContent = seq.length ? seq.join(" -> ") : "No gates applied yet.";
  statsRow.innerHTML = [
    `<span class="stat-item">Qubits: <strong>1</strong></span>`,
    `<span class="stat-divider mono">|</span>`,
    `<span class="stat-item">Gates: <strong>${seq.length}</strong></span>`,
    `<span class="stat-divider mono">|</span>`,
    `<span class="stat-item">Depth: <strong>${circuit.length}</strong><button id="editDepthBtn" class="depth-edit-btn" aria-label="Edit depth" title="Edit depth"><i class="fa-solid fa-pen"></i></button></span>`
  ].join("");
  const editDepthBtn = document.getElementById("editDepthBtn");
  if (editDepthBtn) editDepthBtn.addEventListener("click", openDepthEditor);

  const v = getBlochVector();
  blochText.textContent = `x=${v.x.toFixed(3)}  y=${v.y.toFixed(3)}  z=${v.z.toFixed(3)}`;

  // Plain-English state description
  const isClassical0 = p0 > 0.995;
  const isClassical1 = p1 > 0.995;
  const isEqual = Math.abs(p0 - 0.5) < 0.01;
  let plainState;
  if (isClassical0) plainState = "Definitely <strong>|0⟩</strong>. Measure it and you'll always get 0.";
  else if (isClassical1) plainState = "Definitely <strong>|1⟩</strong>. Measure it and you'll always get 1.";
  else if (isEqual) plainState = "Perfect superposition — <strong>50% |0⟩, 50% |1⟩</strong>. The outcome is genuinely random until measured.";
  else plainState = `Superposition: <strong>${(p0*100).toFixed(0)}% chance of |0⟩</strong>, <strong>${(p1*100).toFixed(0)}% chance of |1⟩</strong>.`;

  stateFormula.innerHTML = [
    '<span class="readout-title">Current Quantum State</span>',
    `<span class="readout-plain">${plainState}</span>`,
    `<span class="readout-math mono">|ψ⟩ = ${fmtComplex(quantumState.alpha)}·|0⟩ + ${fmtComplex(quantumState.beta)}·|1⟩</span>`,
    `<span class="readout-history">Gates applied: ${seq.length ? seq.join(" → ") : "none yet"}</span>`
  ].join("");
  updateUndoRedoButtons();
}

function describeCircuitImpact(gateType) {
  const seq = circuit.filter(Boolean);
  const p0 = cAbs2(quantumState.alpha);
  const p1 = cAbs2(quantumState.beta);
  const pct0 = (p0 * 100).toFixed(0);
  const pct1 = (p1 * 100).toFixed(0);
  const inSuperposition = p0 > 0.05 && p1 > 0.05;
  const isClassical0 = p0 > 0.995;
  const isClassical1 = p1 > 0.995;
  const isEqual = Math.abs(p0 - 0.5) < 0.01;

  // State description
  let stateDesc;
  if (isClassical0) stateDesc = "your qubit is definitely <strong>|0⟩</strong>. No uncertainty";
  else if (isClassical1) stateDesc = "your qubit is definitely <strong>|1⟩</strong>. No uncertainty";
  else if (isEqual) stateDesc = "your qubit is in <strong>perfect superposition</strong>. 50% chance of either outcome";
  else stateDesc = `your qubit has a <strong>${pct0}% chance</strong> of measuring |0⟩ and a <strong>${pct1}% chance</strong> of measuring |1⟩`;

  // What the last gate specifically did
  let gateImpact;
  switch (gateType) {
    case "X":
      if (isClassical0) gateImpact = "The X gate just flipped your qubit from |1⟩ to |0⟩, like a classical NOT.";
      else if (isClassical1) gateImpact = "The X gate just flipped your qubit from |0⟩ to |1⟩, like a classical NOT.";
      else gateImpact = "The X gate flipped the probability weights between |0⟩ and |1⟩.";
      break;
    case "H":
      if (isEqual) gateImpact = "The H gate just split your qubit into a perfect 50/50 superposition. It's now in both states at once!";
      else if (isClassical0 || isClassical1) gateImpact = "The H gate collapsed the superposition back to a definite state.";
      else gateImpact = "The H gate mixed |0⟩ and |1⟩ into a superposition.";
      break;
    case "Z":
      gateImpact = inSuperposition
        ? "The Z gate flipped the phase of the |1⟩ part. Probabilities look the same, but the qubit now interferes differently with future gates."
        : "The Z gate applied a phase flip to |1⟩. Since you're in a basis state, there's no visible change yet. Phase only matters when combined with other gates.";
      break;
    case "Y":
      gateImpact = "The Y gate flipped the qubit AND added a phase shift. Like X, but with a twist, it changes how the qubit interferes in later steps.";
      break;
    case "S":
      gateImpact = inSuperposition
        ? "The S gate rotated the phase of |1⟩ by 90°. The probabilities are unchanged, but the qubit's phase shifted. This steers interference."
        : "The S gate applied a 90° phase rotation to |1⟩. In a basis state this is invisible, but it becomes significant in superposition.";
      break;
    case "T":
      gateImpact = inSuperposition
        ? "The T gate nudged the phase of |1⟩ by 45°. A subtle but precise rotation that matters in longer circuits."
        : "The T gate applied a 45° phase rotation to |1⟩. Like S but finer. It becomes prominent when combined with H gates.";
      break;
    case "ID":
      gateImpact = "The ID gate did nothing intentionally. It's a placeholder that keeps the circuit step count without changing the qubit.";
      break;
    default:
      gateImpact = "";
  }

  // Circuit-level summary
  let circuitSummary = "";
  if (seq.length === 1) {
    circuitSummary = `This is the only gate in your circuit so far.`;
  } else if (seq.length <= 4) {
    circuitSummary = `Your circuit is <strong>${seq.join(" → ")}</strong>. After all ${seq.length} gates, ${stateDesc}.`;
  } else {
    circuitSummary = `After ${seq.length} gates, ${stateDesc}.`;
  }

  return { gateImpact, circuitSummary };
}

function detectCircuitPattern() {
  const seq = circuit.filter(Boolean);
  const p0 = cAbs2(quantumState.alpha);
  const p1 = cAbs2(quantumState.beta);
  const isEqual = Math.abs(p0 - 0.5) < 0.01;
  const isClassical0 = p0 > 0.995;
  const isClassical1 = p1 > 0.995;

  // H on |0⟩ → first superposition
  if (seq.length === 1 && seq[0] === "H" && isEqual && initialStateLabel === "|0⟩") {
    return { emoji: "🎉", title: "You just created superposition!", body: "Your qubit is no longer 0 or 1, it's genuinely both at the same time. This is the core trick that makes quantum computers powerful. Until you measure it, the outcome is truly undecided." };
  }
  // H → H returns to start
  if (seq.length >= 2 && seq[seq.length - 1] === "H" && seq[seq.length - 2] === "H" && isClassical0 && initialStateLabel === "|0⟩") {
    return { emoji: "🔄", title: "H → H brings you back!", body: "Applying H twice cancels out perfectly. This is called self-inverse, as the Hadamard gate is its own opposite. No classical gate works like this." };
  }
  // X on |0⟩ → flipped to |1⟩
  if (seq.length === 1 && seq[0] === "X" && isClassical1) {
    return { emoji: "🔀", title: "You flipped the qubit!", body: "Just like a classical NOT gate, |0⟩ became |1⟩. X is the simplest quantum gate and behaves identically to a regular bit flip here." };
  }
  // X → X returns to start
  if (seq.length >= 2 && seq[seq.length - 1] === "X" && seq[seq.length - 2] === "X" && isClassical0) {
    return { emoji: "🔄", title: "X → X brings you back!", body: "Two flips cancel out. Whether quantum or classical, flipping a bit twice always returns it to where it started." };
  }
  // H → Z → H (phase kickback pattern)
  if (seq.join(",").includes("H,Z,H")) {
    return { emoji: "", title: "That's phase kickback!", body: "H → Z → H is equivalent to an X gate. You just discovered that phase manipulation can produce bit flips, which is a vital trick used in real quantum algorithms." };
  }
  // H → X → H
  if (seq.join(",").includes("H,X,H")) {
    return { emoji: "", title: "That's a phase flip in disguise!", body: "H → X → H is equivalent to a Z gate. By sandwiching X between two H gates you turned a bit flip into a phase flip. This is how quantum gates get repurposed." };
  }
  // Long circuit, still in perfect superposition
  if (seq.length >= 4 && isEqual) {
    return { emoji: "", title: "Still in superposition after all that!", body: "Despite several gates, your qubit is still perfectly balanced between |0⟩ and |1⟩. The gates cancelled each other's probability effects out, even if the phase shifted." };
  }
  // Long circuit returning to |0⟩
  if (seq.length >= 3 && isClassical0 && initialStateLabel === "|0⟩") {
    return { emoji: "🔁", title: "Back to where you started!", body: "After all those gates, your qubit returned to |0⟩. The sequence of transformations looped back on itself. This kind of reversibility is fundamental to quantum computing." };
  }

  return null;
}

function setExplain(gateType) {
  if (!gateType || !GATES[gateType]) {
    gateExplain.innerHTML = "";
    gateExplain.classList.add("empty");
    return;
  }
  gateExplain.classList.remove("empty");
  const { gateImpact, circuitSummary } = describeCircuitImpact(gateType);
  const pattern = detectCircuitPattern();
  const patternHTML = pattern ? `
    <div class="circuit-pattern">
      <span class="circuit-pattern-emoji">${pattern.emoji}</span>
      <div>
        <div class="circuit-pattern-title">${pattern.title}</div>
        <div class="circuit-pattern-body">${pattern.body}</div>
      </div>
    </div>` : "";

  gateExplain.innerHTML = `
    <h3>${GATES[gateType].name}</h3>
    <p>${GATES[gateType].explain}</p>
    ${patternHTML}
    <div class="circuit-impact">
      <div class="circuit-impact-label"><i class="fa-solid fa-bolt-lightning"></i> What this did to your circuit</div>
      <p class="circuit-impact-body">${gateImpact}</p>
      ${circuitSummary ? `<p class="circuit-impact-summary">${circuitSummary}</p>` : ""}
    </div>`;
}

function applyPreset(preset) {
  pushHistory();
  initialState = normalizeState(presetToState(preset));
  initialStateLabel = presetToLabel(preset);
  qubitBadge.textContent = initialStateLabel;
  circuit.fill(null);
  selectedSlot = null;
  setExplain(null);
  recomputeState();
}

function measureState() {
  pushHistory();
  const p0 = cAbs2(quantumState.alpha);
  const p1 = cAbs2(quantumState.beta);
  const pct0 = (p0 * 100).toFixed(0);
  const pct1 = (p1 * 100).toFixed(0);
  const wasInSuperposition = p0 > 0.05 && p1 > 0.05;
  const collapsed = Math.random() < p0 ? "ZERO" : "ONE";
  const result = collapsed === "ZERO" ? "|0⟩" : "|1⟩";
  const other  = collapsed === "ZERO" ? "|1⟩" : "|0⟩";
  const winPct = collapsed === "ZERO" ? pct0 : pct1;
  const losePct = collapsed === "ZERO" ? pct1 : pct0;

  initialState = presetToState(collapsed);
  initialStateLabel = presetToLabel(collapsed);
  qubitBadge.textContent = initialStateLabel;
  circuit.fill(null);
  selectedSlot = null;

  let collapseExplain;
  if (!wasInSuperposition) {
    collapseExplain = `Your qubit was already in a definite state, so the outcome was certain.`;
  } else if (winPct === "50") {
    collapseExplain = `Your qubit was in perfect 50/50 superposition, so this was a completely random outcome, almost like a quantum coin flip. It could just as easily have been ${other}.`;
  } else {
    collapseExplain = `Your qubit had a ${winPct}% chance of landing on ${result} and a ${losePct}% chance of landing on ${other}. It landed on the ${winPct === "100" ? "certain" : "more likely"} side this time, but run it again and the result may differ.`;
  }

  gateExplain.classList.remove("empty");
  gateExplain.innerHTML = `
    <h3>Measurement collapsed to: ${result}</h3>
    <p>In quantum mechanics, <strong>measuring forces the qubit to choose</strong>. Before measurement it existed as a blend of possibilities. The moment you observe it, all that uncertainty resolves to a single definite outcome and it can NEVER go back.</p>
    <div class="circuit-impact">
      <div class="circuit-impact-label"><i class="fa-solid fa-bolt-lightning"></i> What just happened</div>
      <p class="circuit-impact-body">${collapseExplain}</p>
      <p class="circuit-impact-summary">The circuit was cleared because post-measurement the qubit is now a known classical state; there's nothing left to evolve!</p>
    </div>`;
  recomputeState();
}

function resetState() {
  pushHistory();
  initialState = presetToState("ZERO");
  initialStateLabel = presetToLabel("ZERO");
  presetSelect.value = "ZERO";
  qubitBadge.textContent = initialStateLabel;
  circuit.fill(null);
  selectedSlot = null;
  setExplain(null);
  recomputeState();
}

function addGateToFirstEmpty(gateType) {
  const idx = circuit.findIndex((g) => g === null);
  if (idx === -1) return;
  pushHistory();
  circuit[idx] = gateType;
  selectedSlot = idx;
  recomputeState();
  setExplain(gateType); // call after recompute so impact reflects updated state
}

function clearCircuit() {
  if (circuit.some(Boolean) && !confirm("Clear the circuit? This removes all gates")) return;
  pushHistory();
  circuit.fill(null);
  selectedSlot = null;
  setExplain(null);
  recomputeState();
}

function createLibraryCards() {
  Object.keys(GATES).forEach((k) => {
    const item = document.createElement("article");
    item.className = "gate-card";
    item.textContent = GATES[k].label;
    item.dataset.gate = k;
    item.tabIndex = 0;
    item.style.setProperty("--gate-color", GATES[k].color);

    item.addEventListener("mousedown", (e) => {
      dragState.active = true;
      dragState.started = false;
      dragState.type = k;
      dragState.fromCircuit = false;
      dragState.sourceSlot = null;
      dragState.downX = e.clientX;
      dragState.downY = e.clientY;
      dragState.pointerX = e.clientX;
      dragState.pointerY = e.clientY;
      hideGateTooltip();
      showDragGhost(k, e.clientX, e.clientY);
      document.body.style.cursor = "grabbing";
    });

    item.addEventListener("mouseenter", () => {
      if (dragState.active) return;
      showGateTooltip(GATES[k].name, item.getBoundingClientRect(), GATES[k].color);
    });

    item.addEventListener("mouseleave", hideGateTooltip);

    item.addEventListener("click", () => {
      if (dragState.started) return;
      addGateToFirstEmpty(k);
    });

    item.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        addGateToFirstEmpty(k);
      }
    });

    libraryWrap.appendChild(item);
  });
}

document.addEventListener("mousemove", (e) => {
  if (!dragState.active) return;
  dragState.pointerX = e.clientX;
  dragState.pointerY = e.clientY;
  moveDragGhost(e.clientX, e.clientY);

  const moved = Math.hypot(e.clientX - dragState.downX, e.clientY - dragState.downY);
  if (moved > 4) dragState.started = true;
});

document.addEventListener("mouseup", () => {
  if (!dragState.active) return;

  const canPlace = dragState.started && dragState.snapSlot !== null;
  const placedType = dragState.type; // capture before reset

  if (canPlace) {
    if (dragState.fromCircuit && dragState.sourceSlot !== null) {
      if (dragState.snapSlot === dragState.sourceSlot) {
        circuit[dragState.sourceSlot] = dragState.type;
        selectedSlot = dragState.sourceSlot;
      } else {
        pushHistory();
        const targetGate = circuit[dragState.snapSlot];
        circuit[dragState.snapSlot] = dragState.type;
        if (targetGate !== null) {
          circuit[dragState.sourceSlot] = targetGate;
        }
        selectedSlot = dragState.snapSlot;
      }
    } else {
      pushHistory();
      circuit[dragState.snapSlot] = dragState.type;
      selectedSlot = dragState.snapSlot;
    }
  } else if (dragState.fromCircuit && dragState.sourceSlot !== null) {
    circuit[dragState.sourceSlot] = dragState.type;
    selectedSlot = dragState.sourceSlot;
  }

  dragState.active = false;
  dragState.started = false;
  dragState.type = null;
  dragState.fromCircuit = false;
  dragState.sourceSlot = null;
  dragState.snapSlot = null;
  dragState.snapEase = 0;
  hideDragGhost();
  hideGateTooltip();
  hideActionTooltip();
  document.body.style.cursor = "default";

  // recompute first so setExplain sees the updated state
  recomputeState();
  if (canPlace && placedType) setExplain(placedType);
});

function mountCircuitSketch() {
  const wrap = document.getElementById("circuitCanvasWrap");

  gateSketch = new p5((p) => {
    let hoverGateIndex = -1;

    function geometry() {
      const sidePad = 24;
      const startX = 70;
      const usable = Math.max(300, p.width - startX - sidePad);
      const slotGap = Math.max(8, Math.min(18, usable * 0.02));
      const slotW = (usable - (circuitSlots - 1) * slotGap) / circuitSlots;
      const slotH = Math.max(42, Math.min(56, slotW * 0.78));
      const lineY = p.height / 2;

      // Keep the badge HTML element aligned to the wire
      const badge = document.getElementById("qubitBadge");
      if (badge) {
        badge.style.top = `${lineY}px`;
        badge.style.transform = "translateY(-50%)";
      }

      return {
        lineY,
        startX,
        slotGap,
        slotW,
        slotH
      };
    }

    function getSlotRect(i) {
      const g = geometry();
      const x = g.startX + i * (g.slotW + g.slotGap);
      return { x, y: g.lineY - g.slotH / 2, w: g.slotW, h: g.slotH };
    }

    function pointerInCanvas() {
      const r = p.canvas.getBoundingClientRect();
      return {
        inside:
          dragState.pointerX >= r.left &&
          dragState.pointerX <= r.right &&
          dragState.pointerY >= r.top &&
          dragState.pointerY <= r.bottom,
        x: dragState.pointerX - r.left,
        y: dragState.pointerY - r.top
      };
    }

    function findSnapSlot(px, py) {
      let best = null;
      let bestDist = Infinity;
      for (let i = 0; i < circuitSlots; i += 1) {
        const s = getSlotRect(i);
        const cx = s.x + s.w / 2;
        const cy = s.y + s.h / 2;
        const d = Math.hypot(px - cx, py - cy);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      }
      return bestDist < 95 ? best : null;
    }

    p.setup = () => {
      p.createCanvas(wrap.clientWidth - 2, Math.max(160, wrap.clientHeight - 2)).parent(wrap);
    };

    p.windowResized = () => {
      p.resizeCanvas(wrap.clientWidth - 2, Math.max(160, wrap.clientHeight - 2));
    };

    p.mouseMoved = () => {
      hoverGateIndex = -1;
      for (let i = 0; i < circuit.length; i += 1) {
        if (!circuit[i]) continue;
        const s = getSlotRect(i);
        const closeX = p.mouseX >= s.x + s.w - 16 && p.mouseX <= s.x + s.w - 4;
        const closeY = p.mouseY >= s.y + 4 && p.mouseY <= s.y + 16;
        if (closeX && closeY) {
          hoverGateIndex = i;
          break;
        }
      }
    };

    p.mousePressed = () => {
      if (hoverGateIndex !== -1) {
        pushHistory();
        circuit[hoverGateIndex] = null;
        selectedSlot = null;
        setExplain(null);
        recomputeState();
        return;
      }

      for (let i = 0; i < circuit.length; i += 1) {
        if (!circuit[i]) continue;
        const s = getSlotRect(i);
        const inside = p.mouseX >= s.x && p.mouseX <= s.x + s.w && p.mouseY >= s.y && p.mouseY <= s.y + s.h;
        if (!inside) continue;
        selectedSlot = i;

        const rect = p.canvas.getBoundingClientRect();
        const gateType = circuit[i];
        dragState.active = true;
        dragState.started = true;
        dragState.type = gateType;
        dragState.fromCircuit = true;
        dragState.sourceSlot = i;
        dragState.pointerX = rect.left + p.mouseX;
        dragState.pointerY = rect.top + p.mouseY;
        dragState.downX = dragState.pointerX;
        dragState.downY = dragState.pointerY;
        circuit[i] = null;
        showDragGhost(gateType, dragState.pointerX, dragState.pointerY);
        document.body.style.cursor = "grabbing";
        recomputeState();
        break;
      }
    };

    p.draw = () => {
      const cs = getComputedStyle(document.body);
      const text = cs.getPropertyValue("--text").trim();
      const muted = cs.getPropertyValue("--muted").trim();
      const border = cs.getPropertyValue("--border").trim();
      const accent = cs.getPropertyValue("--accent").trim();
      const panelAlt = cs.getPropertyValue("--panel-alt").trim();
      const dark = document.body.classList.contains("dark");

      p.background(panelAlt);
      p.stroke(border);
      p.strokeWeight(2);

      const g = geometry();
      p.line(28, g.lineY, p.width - 24, g.lineY);

      p.noStroke();
      p.fill(text);
      p.textAlign(p.LEFT, p.BASELINE);
      p.textSize(14);

      for (let i = 0; i < circuitSlots; i += 1) {
        const s = getSlotRect(i);
        const gate = circuit[i];

        p.stroke(border);
        p.strokeWeight(1.5);

        if (!gate) {
          p.noFill();
          p.drawingContext.setLineDash([5, 5]);
          p.rect(s.x, s.y, s.w, s.h, 10);
          p.drawingContext.setLineDash([]);
          p.noStroke();
          p.fill(muted);
          p.textAlign(p.CENTER, p.CENTER);
          p.textSize(Math.min(18, s.h * 0.45));
          p.text("+", s.x + s.w / 2, s.y + s.h / 2 + 1);
        } else {
          const gateColor = GATES[gate].color;
          p.fill(dark ? "#121c2b" : "#ffffff");
          p.stroke(gateColor);
          p.strokeWeight(2);
          p.rect(s.x, s.y, s.w, s.h, 10);

          p.noStroke();
          p.fill(text);
          p.textAlign(p.CENTER, p.CENTER);
          p.textSize(Math.min(16, s.h * 0.4));
          p.text(GATES[gate].label, s.x + s.w / 2, s.y + s.h / 2 + 1);

          if (p.mouseX >= s.x && p.mouseX <= s.x + s.w && p.mouseY >= s.y && p.mouseY <= s.y + s.h) {
            p.fill("#e34d4d");
            p.circle(s.x + s.w - 10, s.y + 10, 12);
            p.fill("#fff");
            p.textSize(10);
            p.text("x", s.x + s.w - 10, s.y + 10);
          }
        }
      }

      if (dragState.active && dragState.started && dragState.type) {
        const ptr = pointerInCanvas();
        dragState.snapSlot = ptr.inside ? findSnapSlot(ptr.x, ptr.y) : null;

        if (dragState.snapSlot !== null) {
          dragState.snapEase = Math.min(1, dragState.snapEase + 0.14);
          const s = getSlotRect(dragState.snapSlot);
          const inflate = 12 * dragState.snapEase;
          p.noFill();
          p.stroke(accent);
          p.strokeWeight(2);
          p.rect(s.x - inflate / 2, s.y - inflate / 2, s.w + inflate, s.h + inflate, 12);
        } else {
          dragState.snapEase = Math.max(0, dragState.snapEase - 0.14);
        }
      }
    };
  });
}

function mountBlochSketch() {
  const wrap = document.getElementById("blochCanvasWrap");

  blochSketch = new p5((p) => {
    p.setup = () => {
      p.createCanvas(wrap.clientWidth - 2, 210, p.WEBGL).parent(wrap);
    };

    p.windowResized = () => {
      p.resizeCanvas(wrap.clientWidth - 2, 210);
    };

    p.draw = () => {
      const cs = getComputedStyle(document.body);
      const text = cs.getPropertyValue("--text").trim();
      const border = cs.getPropertyValue("--border").trim();
      const panelAlt = cs.getPropertyValue("--panel-alt").trim();
      const accent = cs.getPropertyValue("--accent").trim();
      const accent2 = cs.getPropertyValue("--accent-2").trim();
      const dark = document.body.classList.contains("dark");

      const target = getBlochVector();
      animatedBloch.x += (target.x - animatedBloch.x) * 0.12;
      animatedBloch.y += (target.y - animatedBloch.y) * 0.12;
      animatedBloch.z += (target.z - animatedBloch.z) * 0.12;
      blochSpin += 0.0018;

      const r = Math.min(p.width, p.height) * 0.35;

      p.background(panelAlt);
      p.push();
      p.rotateX(-0.38);
      p.rotateY(blochSpin);

      const baseBorder = p.color(border);
      const themeTarget = dark ? p.color("#ffffff") : p.color("#000000");
      const wireColor = p.lerpColor(baseBorder, themeTarget, dark ? 0.12 : 0.08);
      const axisColor = p.lerpColor(baseBorder, themeTarget, dark ? 0.18 : 0.12);

      p.noFill();
      p.stroke(colorWithAlpha(wireColor.toString(), 0.52, p));
      p.strokeWeight(0.9);
      for (let i = -4; i <= 4; i += 1) {
        const a = (i / 8) * Math.PI;
        p.push();
        p.rotateX(a);
        p.circle(0, 0, r * 2);
        p.pop();
      }
      for (let i = 0; i < 10; i += 1) {
        p.push();
        p.rotateY((i / 10) * Math.PI);
        p.circle(0, 0, r * 2);
        p.pop();
      }

      p.stroke(colorWithAlpha(axisColor.toString(), 0.62, p));
      p.strokeWeight(1.2);
      p.line(-r * 1.05, 0, 0, r * 1.05, 0, 0);
      p.line(0, -r * 1.05, 0, 0, r * 1.05, 0);
      p.line(0, 0, -r * 1.05, 0, 0, r * 1.05);

      const arrowRadius = r * 0.86;
      const vx = animatedBloch.x * arrowRadius;
      const vy = -animatedBloch.z * arrowRadius;
      const vz = animatedBloch.y * arrowRadius;

      drawArrow3D(
        p,
        p.createVector(0, 0, 0),
        p.createVector(vx, vy, vz),
        p.color(accent),
        p.color(accent2)
      );

      p.pop();

      p.push();
      p.resetMatrix();
      p.fill(text);
      p.noStroke();
      p.textAlign(p.CENTER, p.CENTER);
      p.textSize(11);
      p.text("North Pole", p.width / 2, 14);
      p.text("South Pole", p.width / 2, p.height - 23);
      p.text("|0⟩", p.width / 2, 30);
      p.text("|1⟩", p.width / 2, p.height - 10);
      p.text("|x>", 36, p.height / 2);
      p.text("|y>", p.width - 36, p.height / 2);
      p.pop();
    };
  });
}

async function exportImage() {
  if (circuit.filter(Boolean).length === 0) { showDownloadToast("Nothing on the canvas to export."); return; }
  if (!gateSketch || !blochSketch || exportInProgress) return;
  exportInProgress = true;
  currentExportSession = { cancelled: false, timer: null, resolveWait: null };
  configureExportOverlay("image");
  showExportOverlay();
  try {
    const proceed = await waitWithCancellation(5500, currentExportSession);
    if (!proceed || currentExportSession.cancelled) return;

    const c1 = gateSketch.canvas;
    const c2 = blochSketch.canvas;
    const seq = circuit.filter(Boolean);
    const p0 = cAbs2(quantumState.alpha);
    const p1 = cAbs2(quantumState.beta);
    const scale = 2;
    const margin = 22;
    const gap = 16;
    const sideW = 340;
    const mainW = Math.max(760, c1.width);
    const totalW = margin * 2 + mainW + gap + sideW;
    const topH = 56;
    const mainCardH = 398;
    const sequenceCardH = 120;
    const sideStateH = 176;
    const sideBlochH = 304;
    const sideSeqH = 120;
    const totalH = topH + margin + mainCardH + gap + sequenceCardH + margin;

    const out = document.createElement("canvas");
    out.width = totalW * scale;
    out.height = totalH * scale;
    const ctx = out.getContext("2d");
    ctx.scale(scale, scale);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const cs = getComputedStyle(document.body);
    const bg = cs.getPropertyValue("--bg").trim();
    const text = cs.getPropertyValue("--text").trim();
    const muted = cs.getPropertyValue("--muted").trim();
    const border = cs.getPropertyValue("--border").trim();
    const panel = cs.getPropertyValue("--panel").trim();
    const accent = cs.getPropertyValue("--accent").trim();
    const accent2 = cs.getPropertyValue("--accent-2").trim();

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, totalW, totalH);

    function roundRect(x, y, w, h, r = 12) {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
    }

    function drawCard(x, y, w, h) {
      ctx.fillStyle = panel;
      ctx.strokeStyle = border;
      ctx.lineWidth = 1;
      roundRect(x, y, w, h, 12);
      ctx.fill();
      ctx.stroke();
    }

    function wrapText(textValue, x, y, maxWidth, lineHeight, maxLines) {
      const words = textValue.split(" ");
      let line = "";
      let lines = 0;
      for (let i = 0; i < words.length; i += 1) {
        const test = line ? `${line} ${words[i]}` : words[i];
        if (ctx.measureText(test).width > maxWidth && line) {
          ctx.fillText(line, x, y + lineHeight * lines);
          lines += 1;
          line = words[i];
          if (maxLines && lines >= maxLines) return;
        } else {
          line = test;
        }
      }
      if (!maxLines || lines < maxLines) ctx.fillText(line, x, y + lineHeight * lines);
    }

    function drawBar(x, y, w, h, pct) {
      ctx.fillStyle = "rgba(0,0,0,0.12)";
      roundRect(x, y, w, h, h / 2);
      ctx.fill();
      const fillW = Math.max(0, Math.min(w, w * pct));
      if (fillW > 0) {
        const grad = ctx.createLinearGradient(x, y, x + w, y);
        grad.addColorStop(0, accent);
        grad.addColorStop(1, accent2);
        ctx.fillStyle = grad;
        roundRect(x, y, fillW, h, h / 2);
        ctx.fill();
      }
    }

    ctx.fillStyle = text;
    ctx.font = "700 20px Space Grotesk";
    ctx.fillText("Quantum Sandbox Export Snapshot", margin, 32);
    ctx.fillStyle = muted;
    ctx.font = "500 12px Space Grotesk";
    ctx.fillText(new Date().toLocaleString(), margin, 48);

    const leftX = margin;
    const rightX = margin + mainW + gap;
    const topY = topH;

    drawCard(leftX, topY, mainW, mainCardH);
    ctx.fillStyle = text;
    ctx.font = "600 14px Space Grotesk";
    ctx.fillText(`Circuit (Initial preset: ${initialStateLabel})`, leftX + 12, topY + 24);
    const circuitW = mainW - 24;
    const circuitScale = Math.min(circuitW / c1.width, (mainCardH - 42) / c1.height);
    const drawCW = c1.width * circuitScale;
    const drawCH = c1.height * circuitScale;
    ctx.drawImage(c1, leftX + 12 + (circuitW - drawCW) / 2, topY + 32 + (mainCardH - 42 - drawCH) / 2, drawCW, drawCH);

    const seqY = topY + mainCardH + gap;
    drawCard(leftX, seqY, mainW, sequenceCardH);
    ctx.fillStyle = text;
    ctx.font = "600 14px Space Grotesk";
    ctx.fillText("Final Gate Sequence", leftX + 12, seqY + 24);
    ctx.fillStyle = muted;
    ctx.font = "500 12px 'IBM Plex Mono'";
    wrapText(seq.length ? seq.join(" → ") : "No gates applied", leftX + 12, seqY + 46, mainW - 24, 18, 3);

    drawCard(rightX, topY, sideW, sideStateH);
    ctx.fillStyle = text;
    ctx.font = "600 14px Space Grotesk";
    ctx.fillText("State Vector", rightX + 12, topY + 24);

    ctx.fillStyle = muted;
    ctx.font = "500 12px Space Grotesk";
    ctx.fillText(`α = ${fmtComplex(quantumState.alpha)}`, rightX + 12, topY + 50);
    drawBar(rightX + 12, topY + 58, sideW - 24, 10, p0);
    ctx.fillText(`|α|² ${(p0 * 100).toFixed(2)}%`, rightX + 12, topY + 82);

    ctx.fillText(`β = ${fmtComplex(quantumState.beta)}`, rightX + 12, topY + 108);
    drawBar(rightX + 12, topY + 116, sideW - 24, 10, p1);
    ctx.fillText(`|β|² ${(p1 * 100).toFixed(2)}%`, rightX + 12, topY + 140);

    const blochY = topY + sideStateH + gap;
    drawCard(rightX, blochY, sideW, sideBlochH);
    ctx.fillStyle = text;
    ctx.font = "600 14px Space Grotesk";
    ctx.fillText("Bloch Sphere", rightX + 12, blochY + 24);
    const blochW = sideW - 24;
    const blochScale = Math.min(blochW / c2.width, (sideBlochH - 36) / c2.height);
    const drawBW = c2.width * blochScale;
    const drawBH = c2.height * blochScale;
    ctx.drawImage(c2, rightX + 12 + (blochW - drawBW) / 2, blochY + 30 + (sideBlochH - 36 - drawBH) / 2, drawBW, drawBH);

    const metaY = blochY + sideBlochH + gap;
    drawCard(rightX, metaY, sideW, sideSeqH);
    ctx.fillStyle = text;
    ctx.font = "600 13px Space Grotesk";
    ctx.fillText("Snapshot Metadata", rightX + 12, metaY + 24);
    ctx.fillStyle = muted;
    ctx.font = "500 12px 'IBM Plex Mono'";
    ctx.fillText(`Initial state: ${initialStateLabel}`, rightX + 12, metaY + 48);
    ctx.fillText(`Depth: ${circuitSlots}`, rightX + 12, metaY + 68);
    ctx.fillText(`Gates: ${seq.length}  ·  Theme: ${currentTheme}`, rightX + 12, metaY + 88);

    const link = document.createElement("a");
    link.download = `quantum-sandbox-${Date.now()}.png`;
    link.href = out.toDataURL("image/png");
    link.click();
  } finally {
    hideExportOverlay();
    exportInProgress = false;
    currentExportSession = null;
  }
}

async function exportImageAdvanced() {
  if (advGateCount() === 0) { showDownloadToast("Nothing on the canvas to export."); return; }
  if (!advSketch || exportInProgress) return;
  exportInProgress = true;
  currentExportSession = { cancelled: false, timer: null, resolveWait: null };
  configureExportOverlay("image");
  showExportOverlay();
  try {
    const proceed = await waitWithCancellation(5500, currentExportSession);
    if (!proceed || currentExportSession.cancelled) return;

    const circuitCanvas = advSketch.canvas;
    const n = advNumQubits;
    const probsArr = SV.probs(advSV);
    const entangled = SV.isEntangled(advSV, n);
    const scale = 2;
    const margin = 22;
    const gap = 14;

    const cs = getComputedStyle(document.body);
    const bg      = cs.getPropertyValue("--bg").trim();
    const text    = cs.getPropertyValue("--text").trim();
    const muted   = cs.getPropertyValue("--muted").trim();
    const border  = cs.getPropertyValue("--border").trim();
    const panel   = cs.getPropertyValue("--panel").trim();
    const accent  = cs.getPropertyValue("--accent").trim();
    const accent2 = cs.getPropertyValue("--accent-2").trim();

    // Layout dimensions
    const mainW   = Math.max(600, circuitCanvas.width);
    const sideW   = 320;
    const topH    = 56;
    const circuitCardH = Math.max(200, circuitCanvas.height + 48);
    const seqCardH     = 100;
    const probCardH    = 28 + (1 << n) * 28 + 16;
    const blochCardH   = advBlochSketches.length > 0 ? 180 + 36 : 0;
    const phaseCardH   = advMode === "expert" ? 28 + advSV.filter(z => cAbs2(z) >= 0.001).length * 28 + 16 : 0;
    const initialStates = advQubitInitStates.slice(0, n).map((state, qubit) => `Q${qubit} ${state}`);
    const initCardLines = Math.max(1, Math.ceil(initialStates.length / 2));
    const initCardH     = 28 + initCardLines * 20 + 18;
    const metaCardH     = 116;

    const leftH  = topH + circuitCardH + gap + seqCardH + margin;
    const rightH = topH + initCardH + gap + probCardH + gap + (blochCardH > 0 ? blochCardH + gap : 0) + (phaseCardH > 0 ? phaseCardH + gap : 0) + metaCardH + margin;
    const totalH = Math.max(leftH, rightH);
    const totalW = margin * 2 + mainW + gap + sideW;

    const out = document.createElement("canvas");
    out.width  = totalW * scale;
    out.height = totalH * scale;
    const ctx  = out.getContext("2d");
    ctx.scale(scale, scale);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    function roundRect(x, y, w, h, r = 12) {
      ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
    }
    function drawCard(x, y, w, h) {
      ctx.fillStyle = panel; ctx.strokeStyle = border; ctx.lineWidth = 1;
      roundRect(x, y, w, h, 12); ctx.fill(); ctx.stroke();
    }
    function drawBar(x, y, w, h, pct) {
      ctx.fillStyle = "rgba(0,0,0,0.10)";
      roundRect(x, y, w, h, h / 2); ctx.fill();
      const fw = Math.max(0, Math.min(w, w * pct));
      if (fw > 0) {
        const grad = ctx.createLinearGradient(x, y, x + w, y);
        grad.addColorStop(0, accent); grad.addColorStop(1, accent2);
        ctx.fillStyle = grad;
        roundRect(x, y, fw, h, h / 2); ctx.fill();
      }
    }

    ctx.fillStyle = bg; ctx.fillRect(0, 0, totalW, totalH);

    // Header
    ctx.fillStyle = text; ctx.font = "700 20px Space Grotesk";
    ctx.fillText(`Quantum Sandbox: ${advMode === "expert" ? "Expert" : "Advanced"} Mode Export`, margin, 32);
    ctx.fillStyle = muted; ctx.font = "500 12px Space Grotesk";
    ctx.fillText(new Date().toLocaleString(), margin, 48);

    const leftX  = margin;
    const rightX = margin + mainW + gap;
    let rightY   = topH;

    // Circuit card
    drawCard(leftX, topH, mainW, circuitCardH);
    ctx.fillStyle = text; ctx.font = "600 14px Space Grotesk";
    ctx.fillText(`Circuit  ·  ${n} qubit${n>1?"s":""}  ·  ${advCircuit.length} gate${advCircuit.length!==1?"s":""}`, leftX + 12, topH + 22);
    const cScale = Math.min((mainW - 24) / circuitCanvas.width, (circuitCardH - 40) / circuitCanvas.height);
    const cW = circuitCanvas.width * cScale;
    const cH = circuitCanvas.height * cScale;
    ctx.drawImage(circuitCanvas, leftX + 12 + ((mainW - 24) - cW) / 2, topH + 32 + (circuitCardH - 40 - cH) / 2, cW, cH);

    // Gate sequence card
    const seqY = topH + circuitCardH + gap;
    drawCard(leftX, seqY, mainW, seqCardH);
    ctx.fillStyle = text; ctx.font = "600 13px Space Grotesk";
    ctx.fillText("Gate Sequence", leftX + 12, seqY + 22);
    ctx.fillStyle = muted; ctx.font = "500 11px 'IBM Plex Mono'";
    const filledSteps = advFlattenCircuit();
    const seqStr = filledSteps.length
      ? filledSteps.map(s => s.qubit2 !== undefined ? `${s.gate}(Q${s.qubit}→Q${s.qubit2})` : `${s.gate}(Q${s.qubit})`).join(" → ")
      : "No gates applied";
    const words = seqStr.split(" ");
    let line = ""; let ly = seqY + 42;
    for (const w of words) {
      const test = line ? line + " " + w : w;
      if (ctx.measureText(test).width > mainW - 24 && line) {
        ctx.fillText(line, leftX + 12, ly); ly += 16; line = w;
        if (ly > seqY + seqCardH - 8) { line += "…"; break; }
      } else { line = test; }
    }
    if (line) ctx.fillText(line, leftX + 12, ly);

    drawCard(rightX, rightY, sideW, initCardH);
    ctx.fillStyle = text;
    ctx.font = "600 13px Space Grotesk";
    ctx.fillText("Initial Qubit States", rightX + 12, rightY + 22);
    ctx.fillStyle = muted;
    ctx.font = "500 11px 'IBM Plex Mono'";
    for (let i = 0; i < initialStates.length; i += 2) {
      const rowY = rightY + 42 + Math.floor(i / 2) * 20;
      const leftState = initialStates[i];
      const rightState = initialStates[i + 1];
      ctx.fillText(leftState, rightX + 12, rowY);
      if (rightState) ctx.fillText(rightState, rightX + sideW / 2, rowY);
    }
    rightY += initCardH + gap;

    // Basis state probabilities card
    drawCard(rightX, rightY, sideW, probCardH);
    ctx.fillStyle = text; ctx.font = "600 13px Space Grotesk";
    ctx.fillText("Basis State Probabilities", rightX + 12, rightY + 22);
    probsArr.forEach((p, i) => {
      const rowY = rightY + 28 + i * 28;
      ctx.fillStyle = muted; ctx.font = "500 11px 'IBM Plex Mono'";
      ctx.fillText(basisLabel(i, n), rightX + 12, rowY + 14);
      drawBar(rightX + 72, rowY + 4, sideW - 116, 14, p);
      ctx.fillStyle = muted; ctx.font = "500 10px Space Grotesk";
      ctx.fillText(`${(p * 100).toFixed(1)}%`, rightX + sideW - 40, rowY + 14);
    });
    rightY += probCardH + gap;

    // Bloch spheres card (if canvases available)
    if (advBlochSketches.length > 0) {
      drawCard(rightX, rightY, sideW, blochCardH);
      ctx.fillStyle = text; ctx.font = "600 13px Space Grotesk";
      ctx.fillText(`Bloch Spheres${entangled ? " (approx)" : ""}`, rightX + 12, rightY + 22);
      const bSz = Math.min(120, Math.floor((sideW - 24) / advBlochSketches.length) - 8);
      advBlochSketches.forEach((sk, k) => {
        const bx = rightX + 12 + k * (bSz + 8);
        const by = rightY + 32;
        if (sk.canvas) {
          ctx.drawImage(sk.canvas, bx, by, bSz, bSz);
          ctx.fillStyle = muted; ctx.font = "500 10px Space Grotesk";
          ctx.textAlign = "center";
          ctx.fillText(`Q${k}`, bx + bSz / 2, by + bSz + 14);
          ctx.textAlign = "left";
        }
      });
      rightY += blochCardH + gap;
    }

    // Phase angles card (expert only)
    if (advMode === "expert" && phaseCardH > 0) {
      drawCard(rightX, rightY, sideW, phaseCardH);
      ctx.fillStyle = text; ctx.font = "600 13px Space Grotesk";
      ctx.fillText("Phase Angles", rightX + 12, rightY + 22);
      let phRow = rightY + 28;
      advSV.forEach((z, i) => {
        if (cAbs2(z) < 0.001) return;
        const angle = Math.atan2(z.im, z.re) * 180 / Math.PI;
        const mag   = Math.sqrt(cAbs2(z));
        ctx.fillStyle = muted; ctx.font = "500 11px 'IBM Plex Mono'";
        ctx.fillText(`${basisLabel(i, n)}  ${angle.toFixed(0)}°  |a|=${mag.toFixed(2)}`, rightX + 12, phRow + 14);
        phRow += 28;
      });
      rightY += phaseCardH + gap;
    }

    // Metadata card
    drawCard(rightX, rightY, sideW, metaCardH);
    ctx.fillStyle = text; ctx.font = "600 13px Space Grotesk";
    ctx.fillText("Metadata", rightX + 12, rightY + 22);
    ctx.fillStyle = muted; ctx.font = "500 11px 'IBM Plex Mono'";
    ctx.fillText(`Mode: ${advMode}`, rightX + 12, rightY + 46);
    ctx.fillText(`Qubits: ${n}  ·  Gates: ${advGateCount()}`, rightX + 12, rightY + 64);
    ctx.fillText(`Depth: ${advCircuitSlots}  ·  Theme: ${currentTheme}`, rightX + 12, rightY + 82);
    ctx.fillText(`Entangled: ${entangled ? "yes" : "no"}`, rightX + 12, rightY + 100);

    const link = document.createElement("a");
    link.download = `quantum-sandbox-${advMode}-${Date.now()}.png`;
    link.href = out.toDataURL("image/png");
    link.click();
  } finally {
    hideExportOverlay();
    exportInProgress = false;
    currentExportSession = null;
  }
}

async function exportJson() {
  if (circuit.filter(Boolean).length === 0) { showDownloadToast("Nothing on the canvas to export."); return; }
  if (exportInProgress) return;
  exportInProgress = true;
  currentExportSession = { cancelled: false, timer: null, resolveWait: null };
  configureExportOverlay("json");
  showExportOverlay();
  try {
    const proceed = await waitWithCancellation(3200, currentExportSession);
    if (!proceed || currentExportSession.cancelled) return;
    const payload = {
      version: 1,
      exported_at: new Date().toISOString(),
      depth: circuitSlots,
      circuit: [...circuit],
      initial_state_label: initialStateLabel,
      initial_state: {
        alpha: cloneComplex(initialState.alpha),
        beta: cloneComplex(initialState.beta)
      },
      theme: currentTheme
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.download = `quantum-sandbox-${Date.now()}.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  } finally {
    hideExportOverlay();
    exportInProgress = false;
    currentExportSession = null;
  }
}

async function exportJsonAdvanced() {
  if (advGateCount() === 0) { showDownloadToast("Nothing on the canvas to export."); return; }
  if (exportInProgress) return;
  exportInProgress = true;
  currentExportSession = { cancelled: false, timer: null, resolveWait: null };
  configureExportOverlay("json");
  showExportOverlay();
  try {
    const proceed = await waitWithCancellation(3200, currentExportSession);
    if (!proceed || currentExportSession.cancelled) return;

    const n = advNumQubits;
    const probsArr = SV.probs(advSV);
    const entangled = SV.isEntangled(advSV, n);

    const payload = {
      version: 1,
      exported_at: new Date().toISOString(),
      mode: advMode,
      num_qubits: n,
      depth: advCircuitSlots,
      qubitInitStates: advQubitInitStates.slice(0, n),
      circuit_columns: advCloneCircuit(),
      circuit: advFlattenCircuit().map(s => ({ ...s })),
      statevector: advSV.map((z, i) => ({
        basis: basisLabel(i, n),
        index: i,
        re: z.re,
        im: z.im,
        probability: probsArr[i],
        phase_deg: Math.atan2(z.im, z.re) * 180 / Math.PI
      })),
      entangled,
      bloch_vectors: Array.from({ length: n }, (_, k) => {
        const bv = SV.blochForQubit(advSV, n, k);
        return { qubit: k, x: bv.x, y: bv.y, z: bv.z };
      }),
      theme: currentTheme
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.download = `quantum-sandbox-${advMode}-${Date.now()}.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  } finally {
    hideExportOverlay();
    exportInProgress = false;
    currentExportSession = null;
  }
}

async function exportJsonExpert() {
  if (advGateCount() === 0) { showDownloadToast("Nothing on the canvas to export."); return; }
  if (exportInProgress) return;
  exportInProgress = true;
  currentExportSession = { cancelled: false, timer: null, resolveWait: null };
  configureExportOverlay("json");
  showExportOverlay();
  try {
    const proceed = await waitWithCancellation(3200, currentExportSession);
    if (!proceed || currentExportSession.cancelled) return;

    const n = advNumQubits;
    const probsArr = SV.probs(advSV);
    const entangled = SV.isEntangled(advSV, n);

    const statevector = advSV.map((z, i) => {
      const amp = Math.sqrt(z.re * z.re + z.im * z.im);
      const phase_rad = Math.atan2(z.im, z.re);
      return {
        basis: basisLabel(i, n),
        index: i,
        re: z.re,
        im: z.im,
        amplitude: amp,
        probability: probsArr[i],
        phase_deg: phase_rad * 180 / Math.PI,
        phase_rad
      };
    });

    const qubit_phases = Array.from({ length: n }, (_, k) => {
      const bv = SV.blochForQubit(advSV, n, k);
      return {
        qubit: k,
        bloch: { x: bv.x, y: bv.y, z: bv.z },
        azimuthal_phase_deg: Math.atan2(bv.y, bv.x) * 180 / Math.PI
      };
    });

    const payload = {
      version: 1,
      exported_at: new Date().toISOString(),
      mode: "expert",
      num_qubits: n,
      depth: advCircuitSlots,
      qubitInitStates: advQubitInitStates.slice(0, n),
      circuit_columns: advCloneCircuit(),
      circuit: advFlattenCircuit().map(s => ({ ...s })),
      statevector,
      entangled,
      qubit_phases,
      interference_summary: {
        constructive_states: statevector.filter(s => s.probability > 0.01).length,
        destructive_states: statevector.filter(s => s.probability < 0.001 && s.amplitude > 1e-9).length
      },
      theme: currentTheme
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.download = `quantum-sandbox-expert-${Date.now()}.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  } finally {
    hideExportOverlay();
    exportInProgress = false;
    currentExportSession = null;
  }
}

function activeElementIsInputLike() {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

function findNearestFilledSlot(fromIndex, direction) {
  let i = fromIndex + direction;
  while (i >= 0 && i < circuit.length) {
    if (circuit[i]) return i;
    i += direction;
  }
  return fromIndex;
}

document.getElementById("clearBtn").addEventListener("click", clearCircuit);
document.getElementById("guideBtn").addEventListener("click", openGuide);
guideCloseBtn.addEventListener("click", closeGuide);
guidePrevBtn.addEventListener("click", () => {
  if (guideIndex > 0) {
    guideIndex -= 1;
    renderGuideSlide();
  }
});
guideNextBtn.addEventListener("click", () => {
  if (guideIndex < activeGuideSlides.length - 1) {
    guideIndex += 1;
    renderGuideSlide();
  }
});
guideOverlay.addEventListener("click", (e) => {
  if (e.target === guideOverlay) closeGuide();
});
exportBtn.addEventListener("mouseenter", () => {
  hideActionTooltip();
});
exportCancelBtn.addEventListener("click", cancelCurrentExport);
exportBtn.addEventListener("mouseleave", hideActionTooltip);
exportBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  if (exportMenuOpen) closeExportMenu();
  else openExportMenu();
});
exportImageBtn.addEventListener("click", async (e) => {
  e.stopPropagation();
  closeExportMenu();
  if (currentMode === "basic") await exportImage();
  else await exportImageAdvanced();
});
exportJsonBtn.addEventListener("click", async (e) => {
  e.stopPropagation();
  closeExportMenu();
  if (currentMode === "basic") await exportJson();
  else if (advMode === "advanced") await exportJsonAdvanced();
  else await exportJsonExpert();
});
// JSON Import
document.getElementById("importJsonBtn")?.addEventListener("click", () => {
  document.getElementById("importJsonFile")?.click();
});
document.getElementById("importJsonBtn")?.addEventListener("mouseenter", function() {
  const rect = this.getBoundingClientRect();
  showActionTooltip(rect, `
    <div style="font-size:0.8rem;line-height:1.55;max-width:260px">
      <div style="font-weight:700;margin-bottom:4px">Import Circuit</div>
      <div style="margin-bottom:6px">Upload a <code>.json</code> file previously exported from Quantum Sandbox.</div>
    </div>`, "var(--accent)", { boxed: true, placement: "bottom" });
});
document.getElementById("importJsonBtn")?.addEventListener("mouseleave", () => {
  hideActionTooltip();
});
document.getElementById("importJsonFile")?.addEventListener("change", function() {
  const file = this.files?.[0];
  if (!file) return;
  this.value = "";
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      importCircuitFromJson(data);
    } catch {
      showDownloadToast("Could not parse JSON. Make sure it is a valid Quantum Sandbox export.");
    }
  };
  reader.readAsText(file);
});

function importCircuitFromJson(data) {
  if (!data || typeof data !== "object") { showDownloadToast("Invalid JSON structure."); return; }

  // Detect mode from exported payload
  const mode = data.mode || "basic";

  if (mode === "basic" || !data.num_qubits) {
    // Basic mode import
    if (!Array.isArray(data.circuit)) { showDownloadToast("JSON missing circuit data."); return; }
    if (currentMode !== "basic") switchMode("basic");

    const depth = Number.isInteger(data.depth) && data.depth >= 1 && data.depth <= 16 ? data.depth : 8;
    setCircuitDepth(depth, false);
    const rebuilt = new Array(circuitSlots).fill(null);
    data.circuit.forEach((g, i) => {
      if (i < circuitSlots && g && typeof g === "string" && GATES[g]) rebuilt[i] = g;
      else if (i < circuitSlots && g && g.gate && GATES[g.gate]) rebuilt[i] = g.gate;
    });
    circuit = rebuilt;

    const presetMap = { "|0⟩":"ZERO","|1⟩":"ONE","|+⟩":"PLUS","|-⟩":"MINUS","|i⟩":"PLUS_I","|-i⟩":"MINUS_I" };
    const preset = typeof data.initial_state_label === "string" ? presetMap[data.initial_state_label] : null;
    if (data.initial_state && data.initial_state.alpha && data.initial_state.beta) {
      initialState = normalizeState({
        alpha: toComplex(data.initial_state.alpha),
        beta: toComplex(data.initial_state.beta)
      });
      initialStateLabel = typeof data.initial_state_label === "string" ? data.initial_state_label : (preset ? presetToLabel(preset) : "|ψ⟩");
    } else if (preset) {
      initialState = normalizeState(presetToState(preset));
      initialStateLabel = presetToLabel(preset);
    }
    presetSelect.value = preset || "ZERO";
    qubitBadge.textContent = initialStateLabel;
    selectedSlot = null;
    setExplain(null);
    recomputeState();
    showDownloadToast("Circuit imported successfully.");
    return;
  }

  // Advanced / expert import
  const targetMode = (mode === "expert") ? "expert" : "advanced";
  const maxQ = targetMode === "expert" ? 6 : 3;
  const n = Number.isInteger(data.num_qubits) && data.num_qubits >= 2 && data.num_qubits <= maxQ
    ? data.num_qubits : 2;

  if (!Array.isArray(data.circuit)) { showDownloadToast("JSON missing circuit steps."); return; }

  if (currentMode !== targetMode) switchMode(targetMode);

  // Wait for mode switch to settle then load circuit
  setTimeout(() => {
    const importedColumns = Array.isArray(data.circuit_columns)
      ? data.circuit_columns.map(column => {
          const steps = Array.isArray(column) ? column : (column ? [column] : []);
          const normalized = steps
            .filter(step => step && step.gate && MQ_GATES[step.gate])
            .map(step => ({ ...step }));
          return normalized.length ? normalized : null;
        })
      : null;
    const fallbackColumns = data.circuit
      .filter(s => s && s.gate && MQ_GATES[s.gate])
      .map(s => [{ ...s }]);
    const importedDepth = Number.isInteger(data.depth) && data.depth >= 1 && data.depth <= 32
      ? data.depth
      : (importedColumns?.length || data.circuit.length || ADV_DEFAULT_DEPTH);

    advNumQubits = n;
    advCircuitSlots = Math.max(1, importedDepth);
    advCircuit = importedColumns ? importedColumns.slice(0, advCircuitSlots) : fallbackColumns.slice(0, advCircuitSlots);
    if (advCircuit.length < advCircuitSlots) {
      advCircuit = advCircuit.concat(new Array(advCircuitSlots - advCircuit.length).fill(null));
    }
    advQubitInitStates = (Array.isArray(data.qubitInitStates) && data.qubitInitStates.length === n)
      ? data.qubitInitStates.map(k => QUBIT_INIT_PRESETS[k] ? k : "|0⟩")
      : Array(n).fill("|0⟩");
    advPending = null;
    advHidePendingPrompt();
    advSV = SV.initZero(n);

    document.querySelectorAll(".qubit-count-btn").forEach(b => b.classList.toggle("active", Number(b.dataset.n) === n));
    if (targetMode === "expert") updateQubitControlButtons();

    const wrapId = targetMode === "expert" ? "expCircuitWrap" : "advCircuitWrap";
    advMountCircuit(wrapId);
    advBuildQubitPresetDropdowns(wrapId);
    advRecompute();
    showDownloadToast("Circuit imported successfully.");
  }, 120);
}

presetSelect.addEventListener("mouseenter", hideActionTooltip);
presetSelect.addEventListener("change", (e) => applyPreset(e.target.value));
measureBtn.addEventListener("mouseenter", () => {
  showActionTooltip(
    measureBtn.getBoundingClientRect(),
    '<i class="fa-solid fa-circle-info"></i><span>Measure collapses |ψ⟩ to |0⟩ or |1⟩ using current probabilities.</span>',
    "var(--accent)",
    { placement: "bottom", boxed: true }
  );
});
measureBtn.addEventListener("mouseleave", hideActionTooltip);
measureBtn.addEventListener("click", measureState);
resetStateBtn.addEventListener("click", resetState);
undoBtn.addEventListener("click", () => { if (currentMode === "basic") undo(); else advUndo(); });
redoBtn.addEventListener("click", () => { if (currentMode === "basic") redo(); else advRedo(); });
document.getElementById("advUndoBtn")?.addEventListener("click", advUndo);
document.getElementById("advRedoBtn")?.addEventListener("click", advRedo);
document.getElementById("expUndoBtn")?.addEventListener("click", advUndo);
document.getElementById("expRedoBtn")?.addEventListener("click", advRedo);
depthCancelBtn.addEventListener("click", closeDepthEditor);
depthSaveBtn.addEventListener("click", () => {
  if (setCircuitDepth(depthInput.value.trim(), true)) closeDepthEditor();
});
depthInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    if (setCircuitDepth(depthInput.value.trim(), true)) closeDepthEditor();
  } else if (e.key === "Escape") {
    closeDepthEditor();
  }
});

document.addEventListener("keydown", (e) => {
  if (guideOpen) {
    if (e.key === "Escape") {
      closeGuide();
      return;
    }
    if (e.key === "ArrowRight" && guideIndex < activeGuideSlides.length - 1) {
      guideIndex += 1;
      renderGuideSlide();
      return;
    }
    if (e.key === "ArrowLeft" && guideIndex > 0) {
      guideIndex -= 1;
      renderGuideSlide();
      return;
    }
  }
  if (e.key === "Escape" && exportMenuOpen) {
    closeExportMenu();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "z") {
    e.preventDefault();
    if (currentMode === "basic") undo(); else advUndo();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z"))) {
    e.preventDefault();
    if (currentMode === "basic") redo(); else advRedo();
    return;
  }
  if (activeElementIsInputLike()) return;
  if (selectedSlot === null) return;
  if (!circuit[selectedSlot]) return;

  if (e.key === "Delete" || e.key === "Backspace") {
    e.preventDefault();
    pushHistory();
    circuit[selectedSlot] = null;
    setExplain(null);
    selectedSlot = findNearestFilledSlot(selectedSlot, -1);
    if (!circuit[selectedSlot]) selectedSlot = findNearestFilledSlot(selectedSlot, 1);
    if (!circuit[selectedSlot]) selectedSlot = null;
    recomputeState();
    return;
  }
  if (e.key === "ArrowLeft") {
    e.preventDefault();
    selectedSlot = Math.max(0, selectedSlot - 1);
    return;
  }
  if (e.key === "ArrowRight") {
    e.preventDefault();
    selectedSlot = Math.min(circuit.length - 1, selectedSlot + 1);
  }
});

document.addEventListener("click", (e) => {
  if (!exportMenuOpen) return;
  if (exportMenu.contains(e.target) || exportBtn.contains(e.target)) return;
  closeExportMenu();
});
themeBtn.addEventListener("click", () => {
  currentTheme = currentTheme === "light" ? "dark" : "light";
  document.body.classList.toggle("dark", currentTheme === "dark");
  themeIcon.className = currentTheme === "dark" ? "fa-solid fa-sun" : "fa-solid fa-moon";
  if (dragState.type) updateDragGhostStyle(dragState.type);
  persistSession();
});

restoreBtn.addEventListener("click", () => {
  if (currentMode === "basic") {
    const saved = loadSavedSession();
    if (!saved) return;
    pushHistory();
    restoreFromSession(saved);
    restoreBtn.hidden = true;
  } else {
    const saved = advLoadSavedSession(currentMode);
    if (!saved) return;
    advPushHistory();
    advRestoreFromSession(saved);
  }
});

const savedSession = loadSavedSession();
if (hasMeaningfulSession(savedSession)) restoreBtn.hidden = false;

themeIcon.className = currentTheme === "dark" ? "fa-solid fa-sun" : "fa-solid fa-moon";

// ── URL embed / lesson preset parameters ─────────────────────
let isEmbedMode = false;
(function initEmbedParams() {
  const params = new URLSearchParams(window.location.search);
  isEmbedMode = params.get("embed") === "1";

  if (isEmbedMode) {
    document.body.classList.add("embed");
    // Prevent this iframe from reading or writing the main sandbox session
    suspendAutoPersist = true;
  }

  // preset: set initial qubit state before first render
  const presetParam = params.get("preset");
  if (presetParam && ["ZERO","ONE","PLUS","MINUS","PLUS_I","MINUS_I"].includes(presetParam)) {
    initialState = normalizeState(presetToState(presetParam));
    initialStateLabel = presetToLabel(presetParam);
    qubitBadge.textContent = initialStateLabel;
    presetSelect.value = presetParam;
  }

  // depth: resize circuit array (1–16) before sketch mounts
  const depthParam = parseInt(params.get("depth"), 10);
  if (!Number.isNaN(depthParam) && depthParam >= 1 && depthParam <= 16 && depthParam !== circuitSlots) {
    if (depthParam > circuitSlots) {
      circuit = circuit.concat(new Array(depthParam - circuitSlots).fill(null));
    } else {
      circuit = circuit.slice(0, depthParam);
    }
    circuitSlots = depthParam;
  }

  // gates: preload comma-separated gate keys into circuit slots
  const gatesParam = params.get("gates");
  if (gatesParam) {
    gatesParam.split(",").forEach(function(key, i) {
      const k = key.trim();
      if (i < circuitSlots && GATES[k]) circuit[i] = k;
    });
  }

  // mode: switch simulator mode after full script initialisation
  const modeParam = params.get("mode");
  if (modeParam && modeParam !== "basic" && ["advanced","expert"].includes(modeParam)) {
    setTimeout(function() { switchMode(modeParam); }, 0);
  }

  // Build compact gate bar for embed mode (shown inside the center panel)
  if (isEmbedMode) {
    function buildEmbedBar(panel) {
      if (!panel) return;
      const bar = document.createElement("div");
      bar.className = "embed-gate-bar";
      const isAdv = currentMode === "advanced" || currentMode === "expert";

      if (isAdv) {
        // Advanced / Expert: show MQ_GATES appropriate to the mode
        const keys = currentMode === "expert" ? EXPERT_GATE_KEYS : ADVANCED_GATE_KEYS;
        const chips = keys.map(function(k) {
          const g = MQ_GATES[k];
          return '<button class="embed-gate-chip" data-gate="' + k + '" data-kind="' + g.kind + '" style="--gate-color:' + g.color + '" title="' + g.name + ' — ' + (g.kind === "single" ? "click or drag" : "click to place") + '">' + g.label + '</button>';
        }).join("");
        const presetOpts = currentMode === "expert"
          ? '<option value="none">— preset —</option><option value="bell">Bell State</option><option value="ghz">GHZ State</option><option value="qft2">QFT (2-qubit)</option><option value="teleport">Teleportation</option><option value="grover2">Grover (2-qubit)</option><option value="deutsch">Deutsch Algorithm</option>'
          : '<option value="none">— preset —</option><option value="bell">Bell State</option><option value="ghz">GHZ State</option><option value="swap_test">SWAP Test</option>';
        bar.innerHTML =
          '<div class="embed-bar-gates">' + chips + '</div>' +
          '<div class="embed-bar-controls">' +
            '<select class="preset-select embed-alg-preset" id="embedAlgPreset" style="font-size:0.78rem;height:30px">' + presetOpts + '</select>' +
            '<button class="btn btn-primary embed-measure-btn" id="embedMeasureBtn" style="font-size:0.78rem;padding:4px 10px;height:30px">Measure all</button>' +
            '<button class="btn btn-soft embed-clear-btn" id="embedClearBtn" style="font-size:0.78rem;padding:4px 10px;height:30px">Clear</button>' +
          '</div>';

        bar.querySelectorAll(".embed-gate-chip").forEach(function(btn) {
          const k = btn.dataset.gate;
          const gDef = MQ_GATES[k];

          btn.addEventListener("click", function() {
            if (advDragState.started) return;
            if (gDef.kind === "single") {
              advPending = { gateKey: k, step: 0 };
              advShowPendingPrompt("Click a wire in the circuit to place the " + gDef.name + " gate.");
            } else {
              advPending = { gateKey: k, step: 0 };
              var msg = gDef.kind === "two"
                ? "Click the CONTROL wire, then the TARGET wire to place " + gDef.name + "."
                : "Click CONTROL 1, CONTROL 2, then TARGET wire for " + gDef.name + ".";
              advShowPendingPrompt(msg);
            }
          });

          // Drag support for single-qubit gates in advanced/expert
          if (gDef.kind === "single") {
            btn.addEventListener("mousedown", function(e) {
              if (e.button !== 0) return;
              advDragState.active = true;
              advDragState.started = false;
              advDragState.type = k;
              advDragState.fromCircuit = false;
              advDragState.sourceIndex = null;
              advDragState.downX = e.clientX;
              advDragState.downY = e.clientY;
              advDragState.pointerX = e.clientX;
              advDragState.pointerY = e.clientY;
              advShowDragGhost(k, e.clientX, e.clientY);
              document.body.style.cursor = "grabbing";
            });
          }

          btn.addEventListener("mouseenter", function() {
            if (advDragState.active) return;
            showGateTooltip(gDef.name, btn.getBoundingClientRect(), gDef.color);
          });
          btn.addEventListener("mouseleave", hideGateTooltip);
        });

        const ecb = bar.querySelector("#embedClearBtn");
        if (ecb) ecb.addEventListener("click", function() {
          if (advGateCount() > 0) {
            advPushHistory();
            advCircuit = new Array(advCircuitSlots || ADV_DEFAULT_DEPTH).fill(null);
            advPending = null;
            advHidePendingPrompt();
            advSetExplain(null);
            advRecompute();
          }
        });
        const emb = bar.querySelector("#embedMeasureBtn");
        if (emb) emb.addEventListener("click", advMeasureAll);
        const eap = bar.querySelector("#embedAlgPreset");
        if (eap) eap.addEventListener("change", function() { advLoadPreset(eap.value); });

      } else {
        // Basic mode: show single-qubit GATES with click + drag
        const chips = Object.keys(GATES).map(function(k) {
          return '<button class="embed-gate-chip" data-gate="' + k + '" style="--gate-color:' + GATES[k].color + '" title="' + GATES[k].name + '">' + GATES[k].label + '</button>';
        }).join("");
        bar.innerHTML =
          '<div class="embed-bar-gates">' + chips + '</div>' +
          '<div class="embed-bar-controls">' +
            '<select class="preset-select embed-preset" id="embedPreset" title="Initial state">' +
              '<option value="ZERO">|0⟩</option><option value="ONE">|1⟩</option>' +
              '<option value="PLUS">|+⟩</option><option value="MINUS">|-⟩</option>' +
              '<option value="PLUS_I">|i⟩</option><option value="MINUS_I">|-i⟩</option>' +
            '</select>' +
            '<button class="btn btn-primary embed-measure-btn" id="embedMeasureBtn" style="font-size:0.78rem;padding:4px 10px;height:30px">Measure</button>' +
            '<button class="btn btn-soft embed-clear-btn" id="embedClearBtn" style="font-size:0.78rem;padding:4px 10px;height:30px">Clear</button>' +
          '</div>';

        bar.querySelectorAll(".embed-gate-chip").forEach(function(btn) {
          const k = btn.dataset.gate;

          btn.addEventListener("click", function() {
            if (dragState.started) return;
            addGateToFirstEmpty(k);
          });

          // Drag from the embed library chips into the canvas
          btn.addEventListener("mousedown", function(e) {
            if (e.button !== 0) return;
            dragState.active = true;
            dragState.started = false;
            dragState.type = k;
            dragState.fromCircuit = false;
            dragState.sourceSlot = null;
            dragState.downX = e.clientX;
            dragState.downY = e.clientY;
            dragState.pointerX = e.clientX;
            dragState.pointerY = e.clientY;
            hideGateTooltip();
            showDragGhost(k, e.clientX, e.clientY);
            document.body.style.cursor = "grabbing";
          });

          btn.addEventListener("mouseenter", function() {
            if (dragState.active) return;
            showGateTooltip(GATES[k].name, btn.getBoundingClientRect(), GATES[k].color);
          });
          btn.addEventListener("mouseleave", hideGateTooltip);
        });

        const ep = bar.querySelector("#embedPreset");
        if (ep) {
          ep.value = presetParam || "ZERO";
          ep.addEventListener("change", function() { applyPreset(ep.value); });
        }
        const ecb = bar.querySelector("#embedClearBtn");
        if (ecb) ecb.addEventListener("click", function() {
          if (circuit.some(Boolean)) {
            circuit.fill(null); selectedSlot = null; setExplain(null); recomputeState();
          }
        });
        const emb = bar.querySelector("#embedMeasureBtn");
        if (emb) emb.addEventListener("click", measureState);
      }

      panel.insertBefore(bar, panel.firstChild);
    }

    // Defer until after mode switch settles (mode switch also uses setTimeout 0)
    setTimeout(function() {
      const panel = document.querySelector("#appRoot .layout:not([hidden]) .center-panel");
      buildEmbedBar(panel || document.querySelector("#appRoot .center-panel"));
    }, 0);
  }
})();

createLibraryCards();
mountCircuitSketch();
mountBlochSketch();
if (!isEmbedMode) suspendAutoPersist = true;
recomputeState();
if (!isEmbedMode) {
  suspendAutoPersist = false;
  if (!hasMeaningfulSession(savedSession)) persistSession();
}

// Multi-qubit statevector engine: 2^n complex amplitudes, index i = basis |i_{n-1}...i_0⟩
const SV = (() => {
  function zeros(n) {
    const sv = [];
    for (let i = 0; i < (1 << n); i++) sv.push(C(0));
    return sv;
  }

  function initZero(n) {
    const sv = zeros(n);
    sv[0] = C(1);
    return sv;
  }

  function clone(sv) { return sv.map(z => C(z.re, z.im)); }

  // Apply a 2x2 gate matrix to qubit k within an n-qubit system
  function applySingle(sv, n, k, mat) {
    const out = zeros(n);
    const size = 1 << n;
    for (let i = 0; i < size; i++) {
      const bit = (i >> k) & 1;
      if (bit === 0) {
        const j = i | (1 << k);          // same as i but with bit k = 1
        // out[i] += mat[0][0]*sv[i] + mat[0][1]*sv[j]
        // out[j] += mat[1][0]*sv[i] + mat[1][1]*sv[j]
        out[i] = cAdd(out[i], cAdd(cMul(mat[0][0], sv[i]), cMul(mat[0][1], sv[j])));
        out[j] = cAdd(out[j], cAdd(cMul(mat[1][0], sv[i]), cMul(mat[1][1], sv[j])));
      }
    }
    return out;
  }

  // CNOT: control=c, target=t
  function applyCNOT(sv, n, c, t) {
    const out = clone(sv);
    const size = 1 << n;
    for (let i = 0; i < size; i++) {
      if (((i >> c) & 1) === 1) {          // control is |1⟩
        const j = i ^ (1 << t);            // flip target bit
        if (i < j) {                        // swap once per pair
          const tmp = out[i];
          out[i] = out[j];
          out[j] = tmp;
        }
      }
    }
    return out;
  }

  // CZ: control=c, target=t; phase-flip |11⟩
  function applyCZ(sv, n, c, t) {
    const out = clone(sv);
    const size = 1 << n;
    for (let i = 0; i < size; i++) {
      if (((i >> c) & 1) === 1 && ((i >> t) & 1) === 1) {
        out[i] = C(-out[i].re, -out[i].im);
      }
    }
    return out;
  }

  // SWAP: swap qubits a and b
  function applySWAP(sv, n, a, b) {
    const out = clone(sv);
    const size = 1 << n;
    for (let i = 0; i < size; i++) {
      const ba = (i >> a) & 1;
      const bb = (i >> b) & 1;
      if (ba !== bb) {
        const j = i ^ (1 << a) ^ (1 << b);
        if (i < j) {
          const tmp = out[i];
          out[i] = out[j];
          out[j] = tmp;
        }
      }
    }
    return out;
  }

  // Toffoli (CCNOT): c0, c1 = controls, t = target
  function applyToffoli(sv, n, c0, c1, t) {
    const out = clone(sv);
    const size = 1 << n;
    for (let i = 0; i < size; i++) {
      if (((i >> c0) & 1) === 1 && ((i >> c1) & 1) === 1) {
        const j = i ^ (1 << t);
        if (i < j) {
          const tmp = out[i]; out[i] = out[j]; out[j] = tmp;
        }
      }
    }
    return out;
  }

  // Fredkin (CSWAP): c = control, a,b = targets to swap
  function applyFredkin(sv, n, c, a, b) {
    const out = clone(sv);
    const size = 1 << n;
    for (let i = 0; i < size; i++) {
      if (((i >> c) & 1) === 1) {
        const ba = (i >> a) & 1;
        const bb = (i >> b) & 1;
        if (ba !== bb) {
          const j = i ^ (1 << a) ^ (1 << b);
          if (i < j) {
            const tmp = out[i]; out[i] = out[j]; out[j] = tmp;
          }
        }
      }
    }
    return out;
  }

  // Probabilities: returns array of |amplitude|² for each basis state
  function probs(sv) { return sv.map(z => cAbs2(z)); }

  // Measure qubit k: collapses state, returns 0 or 1
  function measureQubit(sv, n, k) {
    const p = probs(sv);
    let p1 = 0;
    for (let i = 0; i < p.length; i++) if ((i >> k) & 1) p1 += p[i];
    const result = Math.random() < p1 ? 1 : 0;
    const out = zeros(n);
    let norm = 0;
    for (let i = 0; i < sv.length; i++) {
      if (((i >> k) & 1) === result) { out[i] = sv[i]; norm += cAbs2(sv[i]); }
    }
    const s = Math.sqrt(norm) || 1;
    return { sv: out.map(z => C(z.re / s, z.im / s)), result };
  }

  // Measure all qubits: returns collapsed state + result string e.g. "01"
  function measureAll(sv, n) {
    const p = probs(sv);
    let r = Math.random(), cum = 0, outcome = 0;
    for (let i = 0; i < p.length; i++) { cum += p[i]; if (r < cum) { outcome = i; break; } }
    const out = zeros(n);
    out[outcome] = C(1);
    const bits = outcome.toString(2).padStart(n, "0");
    return { sv: out, bits };
  }

  // Reduced density matrix → Bloch vector for qubit k (approx for entangled states)
  function blochForQubit(sv, n, k) {
    let rx = 0, ry = 0, rz = 0;
    const size = 1 << n;
    for (let i = 0; i < size; i++) {
      const j = i ^ (1 << k);
      const bi = (i >> k) & 1;
      if (bi === 0 && j > i) {
        // rho_01 contribution
        const rho01 = cMul(sv[i], C(sv[j].re, -sv[j].im));
        rx += 2 * rho01.re;
        ry -= 2 * rho01.im;
      }
      if (bi === 0) rz += cAbs2(sv[i]);
      else          rz -= cAbs2(sv[i]);
    }
    return { x: rx, y: ry, z: rz };
  }

  // Schmidt rank > 1: entangled (bipartition: qubit 0 vs rest)
  function isEntangled(sv, n) {
    if (n < 2) return false;
    const dimA = 2, dimB = 1 << (n - 1);
    // Build reduced density matrix ρ_A via partial trace
    let rho00 = 0, rho11 = 0;
    for (let i = 0; i < sv.length; i++) {
      if ((i & 1) === 0) rho00 += cAbs2(sv[i]);
      else               rho11 += cAbs2(sv[i]);
    }
    // off-diagonal of ρ_A
    let rho01re = 0, rho01im = 0;
    for (let b = 0; b < dimB; b++) {
      const i0 = b << 1, i1 = i0 | 1;
      const prod = cMul(sv[i0], C(sv[i1].re, -sv[i1].im));
      rho01re += prod.re; rho01im += prod.im;
    }
    const purity = rho00 * rho00 + rho11 * rho11 + 2 * (rho01re * rho01re + rho01im * rho01im);
    return purity < 0.99; // purity < 1 ⟹ entangled
  }

  function initFromStates(stateVecs) {
    const n = stateVecs.length;
    const size = 1 << n;
    const sv = [];
    for (let i = 0; i < size; i++) {
      let amp = C(1);
      for (let k = 0; k < n; k++) amp = cMul(amp, stateVecs[k][(i >> k) & 1]);
      sv.push(amp);
    }
    return sv;
  }

  return { initZero, initFromStates, clone, applySingle, applyCNOT, applyCZ, applySWAP, applyToffoli, applyFredkin, probs, measureQubit, measureAll, blochForQubit, isEntangled };
})();

// MULTI-QUBIT GATE DEFINITIONS
const MQ_GATES = {
  // Single-qubit (applied to a chosen wire)
  H:    { label:"H",    name:"Hadamard",     color:"#339af0", kind:"single", qubitCount:1, explain:"Creates superposition on the chosen qubit: puts it in an equal blend of |0⟩ and |1⟩.", matrix: GATES.H.matrix },
  X:    { label:"X",    name:"Pauli-X",      color:"#ff6b6b", kind:"single", qubitCount:1, explain:"Flips the chosen qubit: quantum NOT gate.", matrix: GATES.X.matrix },
  Y:    { label:"Y",    name:"Pauli-Y",      color:"#f08c00", kind:"single", qubitCount:1, explain:"Bit + phase flip with imaginary phase on the chosen qubit.", matrix: GATES.Y.matrix },
  Z:    { label:"Z",    name:"Pauli-Z",      color:"#6f42c1", kind:"single", qubitCount:1, explain:"Phase-flips the |1⟩ component of the chosen qubit.", matrix: GATES.Z.matrix },
  S:    { label:"S",    name:"Phase-S",      color:"#20c997", kind:"single", qubitCount:1, explain:"90° phase rotation on |1⟩ of the chosen qubit.", matrix: GATES.S.matrix },
  T:    { label:"T",    name:"Phase-T",      color:"#fcc419", kind:"single", qubitCount:1, explain:"45° phase rotation on |1⟩ of the chosen qubit.", matrix: GATES.T.matrix },
  // Two-qubit
  CNOT: { label:"CNOT", name:"CNOT",         color:"#ff4da6", kind:"two",    qubitCount:2, explain:"Flips the TARGET qubit only if the CONTROL qubit is |1⟩. The primary entanglement gate." },
  CZ:   { label:"CZ",   name:"Controlled-Z", color:"#c084fc", kind:"two",    qubitCount:2, explain:"Applies a Z phase-flip to the TARGET if CONTROL is |1⟩. Used heavily in phase kickback." },
  SWAP: { label:"SWAP", name:"SWAP",         color:"#38bdf8", kind:"two",    qubitCount:2, explain:"Completely exchanges the states of two qubits. Useful for routing in physical circuits." },
  // Three-qubit (Expert only)
  CCNOT:{ label:"CCX",  name:"Toffoli",      color:"#f97316", kind:"three",  qubitCount:3, explain:"Flips the TARGET qubit only if BOTH control qubits are |1⟩. Equivalent to a reversible AND gate, something universal for classical computation." },
  CSWAP:{ label:"CSWAP",name:"Fredkin",      color:"#a78bfa", kind:"three",  qubitCount:3, explain:"Swaps two target qubits only if the control qubit is |1⟩. Reversible classical logic → can help implement sorting networks." },
};

const ADVANCED_GATE_KEYS = ["H","X","Y","Z","S","T","CNOT","CZ","SWAP"];
const EXPERT_GATE_KEYS   = ["H","X","Y","Z","S","T","CNOT","CZ","SWAP","CCNOT","CSWAP"];
const ADV_DEFAULT_DEPTH  = 8;

const QUBIT_INIT_PRESETS = {
  "|0⟩": [C(1), C(0)],
  "|1⟩": [C(0), C(1)],
  "|+⟩": [C(Math.SQRT1_2), C(Math.SQRT1_2)],
  "|-⟩": [C(Math.SQRT1_2), C(-Math.SQRT1_2)]
};

// ADVANCED / EXPERT SIMULATOR STATE
let advMode = "advanced"; // "advanced" | "expert"
let advNumQubits = 2;
let advQubitInitStates = ["|0⟩", "|0⟩"];
let advCircuit  = [];   // array of columns; each column is null or an array of gate steps
let advCircuitSlots = 8;
let advSV       = SV.initZero(2);
let advSketch   = null;
let advBlochSketches = [];

// Per-mode circuit snapshots. Keeps Advanced and Expert state (incl. depth) independent
// of one another across mode switches within the same session.
let advModeStates = { advanced: null, expert: null };

function advNormalizeCircuitColumn(column) {
  if (!column) return null;
  const steps = (Array.isArray(column) ? column : [column])
    .filter(step => step && step.gate && MQ_GATES[step.gate])
    .map(step => ({ ...step }));
  return steps.length ? steps : null;
}

function advCloneCircuit(circuit = advCircuit) {
  return circuit.map(column => {
    const normalized = advNormalizeCircuitColumn(column);
    return normalized ? normalized.map(step => ({ ...step })) : null;
  });
}

function advColumnSteps(column) {
  return advNormalizeCircuitColumn(column) || [];
}

function advFlattenCircuit(circuit = advCircuit) {
  return circuit.flatMap(column => advColumnSteps(column));
}

function advGateQubits(step) {
  return [step.qubit, step.qubit2, step.qubit3].filter(Number.isInteger);
}

function advColumnOccupiesQubit(column, qubit) {
  return advColumnSteps(column).some(step => advGateQubits(step).includes(qubit));
}

function advCanPlaceStepInColumn(index, step, circuit = advCircuit) {
  if (index < 0 || index >= advCircuitSlots) return false;
  const targetQubits = advGateQubits(step);
  if (targetQubits.length === 0 || targetQubits.some(q => q < 0 || q >= advNumQubits)) return false;
  return advColumnSteps(circuit[index]).every(existing =>
    advGateQubits(existing).every(q => !targetQubits.includes(q))
  );
}

function advFindSingleStepIndex(index, qubit, circuit = advCircuit) {
  return advColumnSteps(circuit[index]).findIndex(step => step.qubit === qubit && MQ_GATES[step.gate]?.kind === "single");
}

function advFindPlacementColumn(step, startIndex = 0, circuit = advCircuit) {
  for (let i = Math.max(0, startIndex); i < advCircuitSlots; i++) {
    if (advCanPlaceStepInColumn(i, step, circuit)) return i;
  }
  return -1;
}

function advInsertStepAtColumn(index, step) {
  const steps = advColumnSteps(advCircuit[index]).map(existing => ({ ...existing }));
  steps.push({ ...step });
  advCircuit[index] = steps;
}

function advRemoveStepAtColumn(index, stepIndex) {
  const steps = advColumnSteps(advCircuit[index]).map(step => ({ ...step }));
  if (stepIndex < 0 || stepIndex >= steps.length) return null;
  const [removed] = steps.splice(stepIndex, 1);
  advCircuit[index] = steps.length ? steps : null;
  return removed;
}

function advGateCount(circuit = advCircuit) {
  return advFlattenCircuit(circuit).length;
}

function advCaptureModeState() {
  return {
    numQubits: advNumQubits,
    qubitInitStates: advQubitInitStates.slice(),
    circuit: advCloneCircuit(),
    circuitSlots: advCircuitSlots,
    sv: SV.clone(advSV)
  };
}

function advRestoreModeState(state) {
  advNumQubits = state.numQubits;
  advQubitInitStates = state.qubitInitStates.slice();
  advCircuit = advCloneCircuit(state.circuit || []);
  advCircuitSlots = state.circuitSlots;
  advSV = SV.clone(state.sv);
}
let advDragState = { 
  active: false, 
  started: false, 
  type: null, 
  fromCircuit: false, 
  sourceIndex: null,
  sourceStepIndex: null,
  gateData: null,
  pointerX: 0, 
  pointerY: 0, 
  downX: 0, 
  downY: 0, 
  snapIndex: null, 
  snapQubits: null,
  snapEase: 0 
};

function advResetDragState() {
  advDragState.active = false;
  advDragState.started = false;
  advDragState.type = null;
  advDragState.fromCircuit = false;
  advDragState.sourceIndex = null;
  advDragState.sourceStepIndex = null;
  advDragState.gateData = null;
  advDragState.snapIndex = null;
  advDragState.snapQubits = null;
  advDragState.snapEase = 0;
  advHideDragGhost();
  document.body.style.cursor = "default";
}

// Pending gate placement (for multi-qubit: pick control then target)
let advPending = null; // { gateKey, step:0 }

// Phase display unit toggle ("deg" or "rad")
let phaseUnit = "deg";

function advShowPendingPrompt(msg) {
  const prefix = advMode === "expert" ? "exp" : "adv";
  const el = document.getElementById(`${prefix}PendingPrompt`);
  if (el) { el.textContent = msg; el.classList.add("visible"); }
  // Highlight the pending gate card
  const libId = prefix === "expert" ? "expGateLibrary" : "advGateLibrary";
  const lib = document.getElementById(libId);
  if (lib && advPending) {
    lib.querySelectorAll(".gate-card").forEach(c => c.classList.toggle("gate-pending-active", c.dataset.gate === advPending.gateKey));
  }
}

function advHidePendingPrompt() {
  ["adv", "exp"].forEach(p => {
    const el = document.getElementById(`${p}PendingPrompt`);
    if (el) { el.textContent = ""; el.classList.remove("visible"); }
  });
  document.querySelectorAll(".gate-card").forEach(c => c.classList.remove("gate-pending-active"));
}

// ADVANCED / EXPERT UNDO-REDO
const advUndoStack = [];
const advRedoStack = [];

function advSnapshotCurrent() {
  return {
    numQubits: advNumQubits,
    circuit: advCloneCircuit(),
    circuitSlots: advCircuitSlots,
    sv: SV.clone(advSV),
    qubitInitStates: advQubitInitStates.slice()
  };
}

function advPushHistory() {
  advUndoStack.push(advSnapshotCurrent());
  if (advUndoStack.length > HISTORY_LIMIT) advUndoStack.shift();
  advRedoStack.length = 0;
  advSyncUndoRedoBtns();
}

function advApplySnapshot(snap) {
  advNumQubits = snap.numQubits;
  advCircuit = advCloneCircuit(snap.circuit || []);
  advCircuitSlots = Number.isInteger(snap.circuitSlots) ? snap.circuitSlots : Math.max(ADV_DEFAULT_DEPTH, advCircuit.length);
  advSV = SV.clone(snap.sv);
  advQubitInitStates = Array.isArray(snap.qubitInitStates)
    ? snap.qubitInitStates.slice()
    : Array(snap.numQubits).fill("|0⟩");
  advPending = null;
  advHidePendingPrompt();

  const prefix = advMode === "expert" ? "exp" : "adv";
  const blochRow = document.getElementById(`${prefix}BlochRow`);
  if (blochRow) {
    blochRow.innerHTML = "";
    advBlochSketches.forEach(s => s.remove());
    advBlochSketches = [];
  }

  const wrapId = advMode === "expert" ? "expCircuitWrap" : "advCircuitWrap";
  advMountCircuit(wrapId);
  advBuildQubitPresetDropdowns(wrapId, advNumQubits);
  if (advMode === "expert") updateQubitControlButtons();
  advUpdateReadouts();
  advSyncUndoRedoBtns();
}

function advUndo() {
  if (!advUndoStack.length) return;
  advRedoStack.push(advSnapshotCurrent());
  advApplySnapshot(advUndoStack.pop());
}

function advRedo() {
  if (!advRedoStack.length) return;
  advUndoStack.push(advSnapshotCurrent());
  advApplySnapshot(advRedoStack.pop());
}

function advSyncUndoRedoBtns() {
  const noUndo = advUndoStack.length === 0;
  const noRedo = advRedoStack.length === 0;
  undoBtn.disabled = noUndo;
  redoBtn.disabled = noRedo;
  const advU = document.getElementById("advUndoBtn");
  const advR = document.getElementById("advRedoBtn");
  const expU = document.getElementById("expUndoBtn");
  const expR = document.getElementById("expRedoBtn");
  if (advU) advU.disabled = noUndo;
  if (advR) advR.disabled = noRedo;
  if (expU) expU.disabled = noUndo;
  if (expR) expR.disabled = noRedo;
}

function advClearHistory() {
  advUndoStack.length = 0;
  advRedoStack.length = 0;
  advSyncUndoRedoBtns();
}

// ADVANCED / EXPERT SESSION PERSISTENCE
const ADV_SESSION_KEY = "quantum_sandbox_adv_v1";
const EXP_SESSION_KEY = "quantum_sandbox_exp_v1";

function advSessionPayload() {
  return {
    saved_at: new Date().toISOString(),
    mode: advMode,
    numQubits: advNumQubits,
    depth: advCircuitSlots,
    circuit: advFlattenCircuit().map(s => ({ ...s })),
    qubitInitStates: advQubitInitStates.slice()
  };
}

function advPersistSession() {
  try {
    const key = advMode === "expert" ? EXP_SESSION_KEY : ADV_SESSION_KEY;
    localStorage.setItem(key, JSON.stringify(advSessionPayload()));
  } catch {}
}

function advLoadSavedSession(mode) {
  try {
    const key = mode === "expert" ? EXP_SESSION_KEY : ADV_SESSION_KEY;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function advHasMeaningfulSession(s) {
  return s && Array.isArray(s.circuit) && s.circuit.length > 0;
}

function advRestoreFromSession(s) {
  if (!s) return;
  const maxQ = advMode === "expert" ? MAX_QUBITS_EXPERT : 3;
  const n = (Number.isInteger(s.numQubits) && s.numQubits >= 2 && s.numQubits <= maxQ)
    ? s.numQubits : 2;

  advNumQubits = n;
  advCircuit = Array.isArray(s.circuit)
    ? s.circuit.filter(st => st && st.gate && MQ_GATES[st.gate]).map(st => [{ ...st }])
    : [];
  advCircuitSlots = Number.isInteger(s.depth) && s.depth >= 1 && s.depth <= 32 ? s.depth : Math.max(ADV_DEFAULT_DEPTH, advCircuit.length);
  if (advCircuit.length < advCircuitSlots) {
    advCircuit = advCircuit.concat(new Array(advCircuitSlots - advCircuit.length).fill(null));
  } else if (advCircuit.length > advCircuitSlots) {
    advCircuit = advCircuit.slice(0, advCircuitSlots);
  }
  advQubitInitStates = (Array.isArray(s.qubitInitStates) && s.qubitInitStates.length === n)
    ? s.qubitInitStates.map(k => QUBIT_INIT_PRESETS[k] ? k : "|0⟩")
    : Array(n).fill("|0⟩");
  advPending = null;
  advHidePendingPrompt();
  advSV = SV.initZero(n);

  const prefix = advMode === "expert" ? "exp" : "adv";
  const blochRow = document.getElementById(`${prefix}BlochRow`);
  if (blochRow) {
    blochRow.innerHTML = "";
    advBlochSketches.forEach(sk => sk.remove());
    advBlochSketches = [];
  }

  const wrapId = advMode === "expert" ? "expCircuitWrap" : "advCircuitWrap";
  advMountCircuit(wrapId);
  advBuildQubitPresetDropdowns(wrapId, n);
  if (advMode === "expert") updateQubitControlButtons();
  advRecompute();
  restoreBtn.hidden = true;
}

// Drag ghost for advanced/expert mode dragging
const advDragGhost = document.createElement("div");
advDragGhost.className = "adv-drag-ghost";
document.body.appendChild(advDragGhost);

function advShowDragGhost(gateKey, x, y, qubits) {
  const gDef = MQ_GATES[gateKey];
  if (!gDef) return;
  
  const dark = document.body.classList.contains("dark");
  advDragGhost.style.border = `2px solid ${gDef.color}`;
  advDragGhost.style.background = dark ? "rgba(10, 18, 30, 0.92)" : "rgba(255, 255, 255, 0.95)";
  advDragGhost.style.color = dark ? "#eef4ff" : "#111";
  advDragGhost.style.boxShadow = `0 0 0 2px color-mix(in oklab, ${gDef.color}, transparent 65%), 0 8px 18px rgba(0, 0, 0, 0.18)`;
  
  let label = gDef.label;
  if (qubits && qubits.length > 1) {
    label += ` [Q${qubits.join(",")}]`;
  }
  advDragGhost.textContent = label;
  advDragGhost.style.display = "flex";
  advDragGhost.style.left = `${x}px`;
  advDragGhost.style.top = `${y}px`;
}

function advMoveDragGhost(x, y) {
  advDragGhost.style.left = `${x}px`;
  advDragGhost.style.top = `${y}px`;
}

function advHideDragGhost() {
  advDragGhost.style.display = "none";
}

let advDepthErrorTimer = null;

// ALGORITHM PRESETS
const ALG_PRESETS = {
  bell:     { n:2, steps:[{gate:"H",qubit:0},{gate:"CNOT",qubit:0,qubit2:1}] },
  ghz:      { n:3, steps:[{gate:"H",qubit:0},{gate:"CNOT",qubit:0,qubit2:1},{gate:"CNOT",qubit:0,qubit2:2}] },
  swap_test:{ n:2, steps:[{gate:"H",qubit:0},{gate:"SWAP",qubit:0,qubit2:1},{gate:"H",qubit:0}] },
  qft2:     { n:2, steps:[{gate:"H",qubit:0},{gate:"S",qubit:1},{gate:"CNOT",qubit:1,qubit2:0},{gate:"H",qubit:1},{gate:"SWAP",qubit:0,qubit2:1}] },
  teleport: { n:3, steps:[{gate:"H",qubit:1},{gate:"CNOT",qubit:1,qubit2:2},{gate:"CNOT",qubit:0,qubit2:1},{gate:"H",qubit:0}] },
  grover2:  { n:2, steps:[{gate:"H",qubit:0},{gate:"H",qubit:1},{gate:"CZ",qubit:0,qubit2:1},{gate:"H",qubit:0},{gate:"H",qubit:1},{gate:"X",qubit:0},{gate:"X",qubit:1},{gate:"CZ",qubit:0,qubit2:1},{gate:"X",qubit:0},{gate:"X",qubit:1},{gate:"H",qubit:0},{gate:"H",qubit:1}] },
  deutsch:  { n:2, steps:[{gate:"X",qubit:1},{gate:"H",qubit:0},{gate:"H",qubit:1},{gate:"CNOT",qubit:0,qubit2:1},{gate:"H",qubit:0}] },
};

// STATEVECTOR COMPUTATION
function advRecompute() {
  const initVecs = Array.from({ length: advNumQubits }, (_, k) =>
    QUBIT_INIT_PRESETS[advQubitInitStates[k]] || QUBIT_INIT_PRESETS["|0⟩"]
  );
  let sv = SV.initFromStates(initVecs);
  for (const column of advCircuit) {
    for (const step of advColumnSteps(column)) {
      const g = step.gate;
      if (!MQ_GATES[g]) continue;
      const kind = MQ_GATES[g].kind;
      if (kind === "single") {
        sv = SV.applySingle(sv, advNumQubits, step.qubit, MQ_GATES[g].matrix);
      } else if (kind === "two") {
        if (g === "CNOT") sv = SV.applyCNOT(sv, advNumQubits, step.qubit, step.qubit2);
        else if (g === "CZ") sv = SV.applyCZ(sv, advNumQubits, step.qubit, step.qubit2);
        else if (g === "SWAP") sv = SV.applySWAP(sv, advNumQubits, step.qubit, step.qubit2);
      } else if (kind === "three") {
        if (g === "CCNOT") sv = SV.applyToffoli(sv, advNumQubits, step.qubit, step.qubit2, step.qubit3);
        else if (g === "CSWAP") sv = SV.applyFredkin(sv, advNumQubits, step.qubit, step.qubit2, step.qubit3);
      }
    }
  }
  advSV = sv;
  advUpdateReadouts();
  if (currentMode !== "basic") advPersistSession();
}

// READOUT UPDATE
function basisLabel(i, n) {
  return "|" + i.toString(2).padStart(n,"0") + "⟩";
}

function advUpdateReadouts() {
  const prefix = advMode === "expert" ? "exp" : "adv";
  const n = advNumQubits;
  const probsArr = SV.probs(advSV);
  const entangled = SV.isEntangled(advSV, n);
  const useExpandable = n >= 4;

  // Basis state probability bars
  const probBars = document.getElementById(`${prefix}ProbBars`);
  if (probBars) {
    if (useExpandable) {
      probBars.innerHTML = `
        <button class="expand-btn" onclick="advOpenProbPopup()">
          <i class="fa-solid fa-chart-bar"></i>
          View All Probabilities
        </button>`;
    } else {
      probBars.innerHTML = probsArr.map((p, i) => `
        <div class="adv-prob-row">
          <span class="adv-prob-label">${basisLabel(i,n)}</span>
          <div class="adv-prob-track"><div class="adv-prob-fill" style="width:${(p*100).toFixed(1)}%"></div></div>
          <span class="adv-prob-pct">${(p*100).toFixed(1)}%</span>
        </div>`).join("");
    }
  }

  // Entanglement badge
  const entCard = document.getElementById(`${prefix}EntanglementCard`);
  const entBadge = document.getElementById(`${prefix}EntanglementBadge`);
  if (entCard && entBadge) {
    if (entangled) {
      entCard.style.display = "";
      entBadge.innerHTML = `<span style="font-size:1.2rem;flex-shrink:0">🔗</span><div><strong style="display:block;margin-bottom:3px">Qubits are entangled!</strong>The qubits no longer have independent states. Measuring one instantly determines the others, no matter how far apart they are. Einstein called this "spooky action at a distance."</div>`;
    } else {
      entCard.style.display = "none";
    }
  }

  // Bloch spheres per qubit
  const blochRow = document.getElementById(`${prefix}BlochRow`);
  if (blochRow) {
    if (useExpandable) {
      blochRow.innerHTML = `
        <button class="expand-btn" onclick="advOpenBlochPopup()">
          <i class="fa-solid fa-globe"></i>
          View All Bloch Spheres
        </button>`;
    } else {
      if (advBlochSketches.length === 0) advBuildBlochRow(blochRow, n, entangled);
      blochRow.querySelectorAll(".adv-bloch-canvas-wrap").forEach((wrap, k) => {
        wrap.classList.toggle("entangled", entangled);
        const lbl = wrap.previousElementSibling;
        if (lbl) lbl.textContent = entangled ? `Q${k} (approx)` : `Q${k}`;
      });
    }
  }

  // Gate sequence
  const seqEl = document.getElementById(`${prefix}SequenceText`);
  if (seqEl) {
    const filled = advFlattenCircuit();
    seqEl.textContent = filled.length
      ? filled.map(s => s.qubit2 !== undefined ? `${s.gate}(Q${s.qubit}→Q${s.qubit2})` : `${s.gate}(Q${s.qubit})`).join(" → ")
      : "No gates applied yet.";
  }

  // Stats row
  const statsEl = document.getElementById(`${prefix}StatsRow`);
  if (statsEl) {
    statsEl.innerHTML = `
      <span class="stat-item">Qubits: <strong>${n}</strong></span>
      <span class="stat-divider mono">|</span>
      <span class="stat-item">Depth: <strong>${advCircuitSlots}</strong><button id="${prefix}EditDepthBtn" class="depth-edit-btn" aria-label="Edit depth" title="Edit depth"><i class="fa-solid fa-pen"></i></button></span>
      <span class="stat-divider mono">|</span>
      <span class="stat-item">Entangled: <strong>${entangled ? "Yes 🔗" : "No"}</strong></span>`;
    // Re-attach depth editor listener every time stats are re-rendered
    const editDepthBtn = document.getElementById(`${prefix}EditDepthBtn`);
    if (editDepthBtn) editDepthBtn.addEventListener("click", advOpenDepthEditor);
  }

  const formulaEl = document.getElementById(`${prefix}StateFormula`);
  if (formulaEl) {
    const maxProb = Math.max(...probsArr);
    const topIdx  = probsArr.indexOf(maxProb);
    let plainState;
    if (maxProb > 0.995) plainState = `Definitely <strong>${basisLabel(topIdx,n)}</strong>. All qubits in known states.`;
    else if (entangled)  plainState = `Entangled superposition: <strong>no single qubit has a definite state.</strong>`;
    else                 plainState = `Superposition across ${probsArr.filter(p=>p>0.001).length} basis states.`;
    formulaEl.innerHTML = `<span class="readout-title">Current Quantum State</span><span class="readout-plain">${plainState}</span>`;
  }

  // Expert-only phase display
  if (advMode === "expert") {
    const phaseEl = document.getElementById("expPhaseDisplay");
    if (phaseEl) {
      const visiblePhaseCount = advSV.filter(z => cAbs2(z) >= 0.001).length;
      if (visiblePhaseCount > 5) {
        phaseEl.innerHTML = `
          <button class="expand-btn" onclick="advOpenPhasePopup()">
            <i class="fa-solid fa-circle-half-stroke"></i>
            View All Phase Angles
          </button>`;
      } else {
        phaseEl.innerHTML = advSV.map((z, i) => {
          if (cAbs2(z) < 0.001) return "";
          const angle_deg = Math.atan2(z.im, z.re) * 180 / Math.PI;
          const angle_rad = Math.atan2(z.im, z.re);
          const mag = Math.sqrt(cAbs2(z));
          const dialX = 14 + 10 * mag * Math.cos((angle_deg - 90) * Math.PI / 180);
          const dialY = 14 + 10 * mag * Math.sin((angle_deg - 90) * Math.PI / 180);
          const phaseLabel = phaseUnit === "rad"
            ? `${angle_rad.toFixed(3)} rad · |a|=${mag.toFixed(2)}`
            : `${angle_deg.toFixed(0)}° · |a|=${mag.toFixed(2)}`;
          return `<div class="exp-phase-row">
            <span class="exp-phase-label">${basisLabel(i,n)}</span>
            <svg class="exp-phase-dial" viewBox="0 0 28 28">
              <circle cx="14" cy="14" r="11" fill="none" stroke="var(--border)" stroke-width="1.5"/>
              <line x1="14" y1="14" x2="${dialX}" y2="${dialY}" stroke="var(--accent-2)" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <span class="exp-phase-val">${phaseLabel}</span>
          </div>`;
        }).join("");
      }
    }
  }

  // Redraw bloch sketches
  advBlochSketches.forEach((sk, k) => {
    const bv = SV.blochForQubit(advSV, n, k);
    sk._bloch = bv;
  });
}

// BUILD PER-QUBIT BLOCH SPHERES
function advBuildBlochRow(container, n, entangled) {
  container.innerHTML = "";
  advBlochSketches.forEach(sk => sk.remove());
  advBlochSketches = [];

  for (let k = 0; k < n; k++) {
    const cell = document.createElement("div");
    cell.className = "adv-bloch-cell";
    const lbl = document.createElement("div");
    lbl.className = "adv-bloch-label";
    lbl.textContent = `Q${k}`;
    const wrap = document.createElement("div");
    wrap.className = "adv-bloch-canvas-wrap";
    if (entangled) wrap.classList.add("entangled");
    cell.appendChild(lbl);
    cell.appendChild(wrap);
    container.appendChild(cell);

    const qk = k;
    const sk = new p5((p) => {
      p._bloch = { x:0, y:0, z:1 };
      p._anim  = { x:0, y:0, z:1 };
      p.setup = () => { p.createCanvas(wrap.clientWidth||100, 160, p.WEBGL).parent(wrap); };
      p.windowResized = () => { p.resizeCanvas(wrap.clientWidth||100, 160); };
      p.draw = () => {
        const target = p._bloch;
        p._anim.x += (target.x - p._anim.x) * 0.12;
        p._anim.y += (target.y - p._anim.y) * 0.12;
        p._anim.z += (target.z - p._anim.z) * 0.12;
        const cs = getComputedStyle(document.body);
        const text = cs.getPropertyValue("--text").trim();
        const border = cs.getPropertyValue("--border").trim();
        const panelAlt = cs.getPropertyValue("--panel-alt").trim();
        const accent = cs.getPropertyValue("--accent").trim();
        const accent2= cs.getPropertyValue("--accent-2").trim();
        const dark = document.body.classList.contains("dark");
        
        p.background(panelAlt);
        p.push();
        p.rotateX(-0.38);
        p.rotateY(blochSpin);

        const r = Math.min(p.width, p.height) * 0.28;
        
        const baseBorder = p.color(border);
        const themeTarget = dark ? p.color("#ffffff") : p.color("#000000");
        const wireColor = p.lerpColor(baseBorder, themeTarget, dark ? 0.12 : 0.08);
        const axisColor = p.lerpColor(baseBorder, themeTarget, dark ? 0.18 : 0.12);

        p.noFill();
        p.stroke(colorWithAlpha(wireColor.toString(), 0.52, p));
        p.strokeWeight(0.9);
        for (let i = -4; i <= 4; i += 1) {
          const a = (i / 8) * Math.PI;
          p.push();
          p.rotateX(a);
          p.circle(0, 0, r * 2);
          p.pop();
        }
        for (let i = 0; i < 10; i += 1) {
          p.push();
          p.rotateY((i / 10) * Math.PI);
          p.circle(0, 0, r * 2);
          p.pop();
        }

        p.stroke(colorWithAlpha(axisColor.toString(), 0.62, p));
        p.strokeWeight(1.2);
        p.line(-r * 1.05, 0, 0, r * 1.05, 0, 0);
        p.line(0, -r * 1.05, 0, 0, r * 1.05, 0);
        p.line(0, 0, -r * 1.05, 0, 0, r * 1.05);

        const arrowRadius = r * 0.86;
        const vx = p._anim.x * arrowRadius;
        const vy = -p._anim.z * arrowRadius;
        const vz = p._anim.y * arrowRadius;

        drawArrow3D(
          p,
          p.createVector(0, 0, 0),
          p.createVector(vx, vy, vz),
          p.color(accent),
          p.color(accent2)
        );

        p.pop();

        p.push();
        p.resetMatrix();
        p.fill(text);
        p.noStroke();
        p.textAlign(p.CENTER, p.CENTER);
        p.textSize(9);
        p.text("North Pole", p.width / 2, 10);
        p.text("South Pole", p.width / 2, p.height - 16);
        p.text("|0⟩", p.width / 2, 22);
        p.text("|1⟩", p.width / 2, p.height - 6);
        p.text("|x>", 26, p.height / 2);
        p.text("|y>", p.width - 26, p.height / 2);
        p.pop();
      };
    });
    advBlochSketches.push(sk);
  }
}

// MULTI-QUBIT CIRCUIT CANVAS (p5.js)
function advMountCircuit(wrapId) {
  if (advSketch) { advSketch.remove(); advSketch = null; }
  const wrap = document.getElementById(wrapId);
  if (!wrap) return;

  advSketch = new p5((p) => {
    const WIRE_H = 80;   // px between wire centres
    const LEFT_PAD = 70;
    const RIGHT_PAD = 24;
    let hoverStep = -1;

    function wireY(q) { return 30 + q * WIRE_H; }
    function canvasHeight() { return 60 + (advNumQubits - 1) * WIRE_H; }

    function geometry() {
      const usable = p.width - LEFT_PAD - RIGHT_PAD;
      const slotGap = Math.max(8, Math.min(18, usable * 0.02));
      const slotW = advCircuitSlots > 1 ? (usable - (advCircuitSlots - 1) * slotGap) / advCircuitSlots : usable;
      return { slotGap, slotW };
    }

    function stepX(i, g) { return LEFT_PAD + i * (g.slotW + g.slotGap); }

    function canvasWidth() {
      const avail = (wrap.clientWidth || 400) - 2;
      return avail;
    }

    p.setup = () => {
      p.createCanvas(canvasWidth(), canvasHeight()).parent(wrap);
    };

    p.windowResized = () => {
      p.resizeCanvas(canvasWidth(), canvasHeight());
    };

    p.draw = () => {
      p.resizeCanvas(canvasWidth(), canvasHeight());

      const cs = getComputedStyle(document.body);
      const text    = cs.getPropertyValue("--text").trim();
      const muted   = cs.getPropertyValue("--muted").trim();
      const border  = cs.getPropertyValue("--border").trim();
      const accent  = cs.getPropertyValue("--accent").trim();
      const panelAlt= cs.getPropertyValue("--panel-alt").trim();
      const dark    = document.body.classList.contains("dark");

      p.background(panelAlt);

      // Sticky scroll offset. Keeps qubit labels at the visible left edge
      const sx = wrap.scrollLeft;

      // Draw wires
      for (let q = 0; q < advNumQubits; q++) {
        const y = wireY(q);
        p.stroke(border); p.strokeWeight(2);
        p.line(LEFT_PAD, y, p.width - RIGHT_PAD, y);
        // Mask the label area so scrolled gates are hidden behind the sticky dropdown
        p.noStroke(); p.fill(panelAlt);
        p.rect(sx, y - 26, LEFT_PAD + 4, 52);
      }

      const g = geometry();

      // Draw gates. Fill available canvas width with placeholder slots
      const DEPTH = advCircuitSlots || 1;
      // Empty slot placeholders
      for (let i = 0; i < DEPTH; i++) {
        for (let q = 0; q < advNumQubits; q++) {
          if (advColumnOccupiesQubit(advCircuit[i], q)) continue;
          const x = stepX(i, g);
          const y = wireY(q);
          p.noFill(); p.stroke(border); p.strokeWeight(1);
          p.drawingContext.setLineDash([4,4]);
          p.rect(x, y - 20, g.slotW, 40, 8);
          p.drawingContext.setLineDash([]);
          p.noStroke(); p.fill(muted); p.textAlign(p.CENTER, p.CENTER); p.textSize(14);
          p.text("+", x + g.slotW/2, y);
        }
      }

      // Filled steps
      for (let i = 0; i < advCircuit.length; i++) {
        for (const step of advColumnSteps(advCircuit[i])) {
          const gDef = MQ_GATES[step.gate];
          if (!gDef) continue;
          const x = stepX(i, g);

          if (gDef.kind === "single") {
            const y = wireY(step.qubit);
            p.fill(dark ? "#121c2b" : "#fff"); p.stroke(gDef.color); p.strokeWeight(2);
            p.rect(x, y-20, g.slotW, 40, 8);
            p.noStroke(); p.fill(text); p.textAlign(p.CENTER, p.CENTER); p.textSize(13); p.textStyle(p.BOLD);
            p.text(gDef.label, x + g.slotW/2, y);
            p.textStyle(p.NORMAL);
            if (p.mouseX >= x && p.mouseX <= x + g.slotW && p.mouseY >= wireY(step.qubit)-20 && p.mouseY <= wireY(step.qubit)+20) {
              p.fill("#e34d4d"); p.circle(x + g.slotW - 8, wireY(step.qubit)-14, 14);
              p.fill("#fff"); p.textSize(9); p.text("×", x + g.slotW - 8, wireY(step.qubit)-14);
            }
          } else if (gDef.kind === "two") {
            const yc = wireY(step.qubit);
            const yt = wireY(step.qubit2);
            const xm = x + g.slotW / 2;
            p.stroke(gDef.color); p.strokeWeight(2.5);
            p.line(xm, Math.min(yc,yt), xm, Math.max(yc,yt));

            if (step.gate === "CNOT") {
              p.fill(gDef.color); p.noStroke(); p.circle(xm, yc, 14);
              p.noFill(); p.stroke(gDef.color); p.strokeWeight(2);
              p.circle(xm, yt, 28);
              p.line(xm-14, yt, xm+14, yt);
              p.line(xm, yt-14, xm, yt+14);
            } else if (step.gate === "CZ") {
              p.fill(gDef.color); p.noStroke();
              p.circle(xm, yc, 14); p.circle(xm, yt, 14);
              p.fill(text); p.textAlign(p.CENTER, p.CENTER); p.textSize(8);
              p.text("Z", xm, yt + 16);
            } else if (step.gate === "SWAP") {
              p.stroke(gDef.color); p.strokeWeight(2.5);
              const d = 8;
              p.line(xm-d,yc-d,xm+d,yc+d); p.line(xm+d,yc-d,xm-d,yc+d);
              p.line(xm-d,yt-d,xm+d,yt+d); p.line(xm+d,yt-d,xm-d,yt+d);
            }
            const minY2 = Math.min(wireY(step.qubit), wireY(step.qubit2));
            const maxY2 = Math.max(wireY(step.qubit), wireY(step.qubit2));
            if (p.mouseX >= x - 8 && p.mouseX <= x + g.slotW + 8 && p.mouseY >= minY2 - 35 && p.mouseY <= maxY2 + 35) {
              p.fill("#e34d4d"); p.noStroke(); p.circle(x + g.slotW - 2, minY2 - 20, 16);
              p.fill("#fff"); p.textSize(10); p.textAlign(p.CENTER, p.CENTER); p.text("×", x + g.slotW - 2, minY2 - 20);
            }
          } else if (gDef.kind === "three" && step.qubit2 !== undefined && step.qubit3 !== undefined) {
            const y0 = wireY(step.qubit);
            const y1 = wireY(step.qubit2);
            const y2 = wireY(step.qubit3);
            const xm = x + g.slotW/2;
            p.stroke(gDef.color); p.strokeWeight(2);
            p.line(xm, Math.min(y0,y1,y2), xm, Math.max(y0,y1,y2));
            if (step.gate === "CCNOT") {
              p.fill(gDef.color); p.noStroke();
              p.circle(xm, y0, 14); p.circle(xm, y1, 14);
              p.noFill(); p.stroke(gDef.color); p.strokeWeight(2);
              p.circle(xm, y2, 28);
              p.line(xm-14,y2,xm+14,y2); p.line(xm,y2-14,xm,y2+14);
            } else if (step.gate === "CSWAP") {
              p.fill(gDef.color); p.noStroke(); p.circle(xm, y0, 14);
              const d = 8;
              p.stroke(gDef.color); p.strokeWeight(2.5);
              p.line(xm-d,y1-d,xm+d,y1+d); p.line(xm+d,y1-d,xm-d,y1+d);
              p.line(xm-d,y2-d,xm+d,y2+d); p.line(xm+d,y2-d,xm-d,y2+d);
            }
            const minY3 = Math.min(wireY(step.qubit), wireY(step.qubit2), wireY(step.qubit3));
            const maxY3 = Math.max(wireY(step.qubit), wireY(step.qubit2), wireY(step.qubit3));
            if (p.mouseX >= x - 8 && p.mouseX <= x + g.slotW + 8 && p.mouseY >= minY3 - 35 && p.mouseY <= maxY3 + 35) {
              p.fill("#e34d4d"); p.noStroke(); p.circle(x + g.slotW - 2, minY3 - 20, 16);
              p.fill("#fff"); p.textSize(10); p.textAlign(p.CENTER, p.CENTER); p.text("×", x + g.slotW - 2, minY3 - 20);
            }
          }
        }
      }

      // Pending placement indicator
      if (advPending) {
        const pendingCol = advCircuit.findIndex((column, index) =>
          index < advCircuitSlots && advColumnSteps(column).length < advNumQubits
        );
        const pendingX = stepX(pendingCol === -1 ? Math.max(0, advCircuitSlots - 1) : pendingCol, g);
        p.noFill(); p.stroke(accent); p.strokeWeight(2);
        p.drawingContext.setLineDash([5,3]);
        for (let q = 0; q < advNumQubits; q++) {
          p.rect(pendingX, wireY(q)-20, g.slotW, 40, 8);
        }
        p.drawingContext.setLineDash([]);
        p.fill(accent); p.noStroke(); p.textAlign(p.CENTER, p.TOP); p.textSize(10);
        p.text(`${advPending.step === 0 ? "Pick control" : advPending.step === 1 ? "Pick target" : "Pick target 2"} →`,
               pendingX + g.slotW/2, 4);
      }

      // Drag snap visualization
      if (advDragState.active && advDragState.started && advDragState.snapIndex !== null && advDragState.snapQubits) {
        advDragState.snapEase = Math.min(1, advDragState.snapEase + 0.16);

        for (const q of advDragState.snapQubits) {
          const x = stepX(advDragState.snapIndex, g);
          const y = wireY(q);
          const inflate = 14 * advDragState.snapEase;
          p.noFill();
          p.stroke(accent);
          p.strokeWeight(2);
          p.rect(x - inflate/2, y - 20 - inflate/2, g.slotW + inflate, 40 + inflate, 12);
        }
      } else if (advDragState.snapEase > 0) {
        advDragState.snapEase = Math.max(0, advDragState.snapEase - 0.14);
      }
    };

    p.mousePressed = () => {
      const g = geometry();
      // Handle gateway drag initiation from circuit
      for (let i = 0; i < advCircuit.length; i++) {
        const columnSteps = advColumnSteps(advCircuit[i]);
        for (let stepIndex = columnSteps.length - 1; stepIndex >= 0; stepIndex--) {
          const step = columnSteps[stepIndex];
          const gDef = MQ_GATES[step.gate];
          if (!gDef) continue;

          let hitBox = null;
          if (gDef.kind === "single") {
            const x = stepX(i, g);
            const y = wireY(step.qubit);
            hitBox = { x: x - 4, y: y - 24, w: g.slotW + 8, h: 48 };
          } else if (gDef.kind === "two") {
            const yc = wireY(step.qubit);
            const yt = wireY(step.qubit2);
            const x = stepX(i, g);
            const minY = Math.min(yc, yt);
            const maxY = Math.max(yc, yt);
            hitBox = { x: x - 8, y: minY - 35, w: g.slotW + 16, h: maxY - minY + 70 };
          } else if (gDef.kind === "three") {
            const y0 = wireY(step.qubit);
            const y1 = wireY(step.qubit2);
            const y2 = wireY(step.qubit3);
            const x = stepX(i, g);
            const minY = Math.min(y0, y1, y2);
            const maxY = Math.max(y0, y1, y2);
            hitBox = { x: x - 8, y: minY - 35, w: g.slotW + 16, h: maxY - minY + 70 };
          }

          if (!hitBox) continue;
          const inBox = p.mouseX >= hitBox.x && p.mouseX <= hitBox.x + hitBox.w &&
                        p.mouseY >= hitBox.y && p.mouseY <= hitBox.y + hitBox.h;
          if (!inBox) continue;

          if (gDef.kind === "single") {
            const x = stepX(i, g);
            const y = wireY(step.qubit);
            const inRemove = p.mouseX >= x + g.slotW - 15 && p.mouseX <= x + g.slotW - 1 &&
                             p.mouseY >= y - 21 && p.mouseY <= y - 7;
            if (inRemove) {
              advPushHistory();
              advRemoveStepAtColumn(i, stepIndex);
              advRecompute();
              advResetPresetDropdown();
              return;
            }
          }
          if (gDef.kind === "two") {
            const minYr = Math.min(wireY(step.qubit), wireY(step.qubit2));
            const inRem2 = p.mouseX >= stepX(i, g) + g.slotW - 10 && p.mouseX <= stepX(i, g) + g.slotW + 6 &&
                           p.mouseY >= minYr - 28 && p.mouseY <= minYr - 12;
            if (inRem2) { advPushHistory(); advRemoveStepAtColumn(i, stepIndex); advRecompute(); advResetPresetDropdown(); return; }
          }
          if (gDef.kind === "three") {
            const minYr3 = Math.min(wireY(step.qubit), wireY(step.qubit2), wireY(step.qubit3));
            const inRem3 = p.mouseX >= stepX(i, g) + g.slotW - 10 && p.mouseX <= stepX(i, g) + g.slotW + 6 &&
                           p.mouseY >= minYr3 - 28 && p.mouseY <= minYr3 - 12;
            if (inRem3) { advPushHistory(); advRemoveStepAtColumn(i, stepIndex); advRecompute(); advResetPresetDropdown(); return; }
          }

          if (gDef.kind !== "single") {
            advShowDepthError("Multi-qubit gates can't be dragged. Click a gate in the library and follow the on-canvas instructions to place it.");
            return;
          }

          advDragState.active = true;
          advDragState.started = false;
          advDragState.type = step.gate;
          advDragState.fromCircuit = true;
          advDragState.sourceIndex = i;
          advDragState.sourceStepIndex = stepIndex;
          advDragState.gateData = { ...step };
          advDragState.downX = p.mouseX;
          advDragState.downY = p.mouseY;
          advDragState.pointerX = p.canvas.getBoundingClientRect().left + p.mouseX;
          advDragState.pointerY = p.canvas.getBoundingClientRect().top + p.mouseY;

          const qubits = [step.qubit];
          advShowDragGhost(step.gate, advDragState.pointerX, advDragState.pointerY, qubits);
          advRemoveStepAtColumn(i, stepIndex);
          return;
        }
      }

      // Qubit wire click for pending gate
      if (advPending) {
        for (let q = 0; q < advNumQubits; q++) {
          const y = wireY(q);
          if (Math.abs(p.mouseY - y) < 30) {
            advHandlePendingClick(q);
            return;
          }
        }
      }
    };
  });
}

// PENDING MULTI-QUBIT GATE PLACEMENT
function advHandlePendingClick(qubit) {
  if (!advPending) return;
  const gDef = MQ_GATES[advPending.gateKey];

  const placePendingStep = (step, gateKey) => {
    const targetColumn = advFindPlacementColumn(step);
    if (targetColumn === -1) {
      advShowDepthError("No compatible slot is available at the current depth.");
      return false;
    }
    advPushHistory();
    advInsertStepAtColumn(targetColumn, step);
    advPending = null;
    advHidePendingPrompt();
    advResetPresetDropdown();
    advRecompute();
    advSetExplain(gateKey);
    return true;
  };

  if (gDef.kind === "single") {
    placePendingStep({ gate: advPending.gateKey, qubit }, advPending.gateKey);
  } else if (gDef.kind === "two") {
    if (advPending.step === 0) {
      advPending.ctrl = qubit;
      advPending.step = 1;
    } else {
      if (qubit !== advPending.ctrl) {
        placePendingStep({ gate: advPending.gateKey, qubit: advPending.ctrl, qubit2: qubit }, advPending.gateKey);
      }
    }
  } else if (gDef.kind === "three") {
    if (advPending.step === 0) {
      advPending.ctrl  = qubit; advPending.step = 1;
    } else if (advPending.step === 1) {
      if (qubit !== advPending.ctrl) { advPending.ctrl2 = qubit; advPending.step = 2; }
    } else {
      if (qubit !== advPending.ctrl && qubit !== advPending.ctrl2) {
        placePendingStep({ gate: advPending.gateKey, qubit: advPending.ctrl, qubit2: advPending.ctrl2, qubit3: qubit }, advPending.gateKey);
      }
    }
  }
}

// GATE LIBRARY CREATION (ADVANCED / EXPERT)
function advCreateLibrary(containerId, keys) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";
  keys.forEach(k => {
    const gDef = MQ_GATES[k];
    const item = document.createElement("article");
    item.className = "gate-card";
    item.textContent = gDef.label;
    item.dataset.gate = k;
    item.tabIndex = 0;
    item.style.setProperty("--gate-color", gDef.color);
    item.title = gDef.name;

    // Drag support from library
    item.addEventListener("mousedown", (e) => {
      if (gDef.kind !== "single") {
        advDragState.active = true;
        advDragState.started = false;
        advDragState.type = k;
        advDragState.fromCircuit = false;
        advDragState.sourceIndex = null;
        advDragState.downX = e.clientX;
        advDragState.downY = e.clientY;
        advDragState.pointerX = e.clientX;
        advDragState.pointerY = e.clientY;
        advShowDragGhost(k, e.clientX, e.clientY);
        document.body.style.cursor = "grabbing";
        return;
      }
      advDragState.active = true;
      advDragState.started = false;
      advDragState.type = k;
      advDragState.fromCircuit = false;
      advDragState.sourceIndex = null;
      advDragState.downX = e.clientX;
      advDragState.downY = e.clientY;
      advDragState.pointerX = e.clientX;
      advDragState.pointerY = e.clientY;
      advShowDragGhost(k, e.clientX, e.clientY);
      document.body.style.cursor = "grabbing";
    });

    item.addEventListener("click", () => {
      if (advDragState.started) return;
      if (gDef.kind === "single") {
        if (advNumQubits === 1) {
          const targetColumn = advFindPlacementColumn({ gate: k, qubit: 0 });
          if (targetColumn === -1) {
            advShowDepthError("No compatible slot is available at the current depth.");
            return;
          }
          advPushHistory();
          advInsertStepAtColumn(targetColumn, { gate: k, qubit: 0 });
          advRecompute();
          advSetExplain(k);
        } else {
          advPending = { gateKey: k, step: 0 };
          advShowPendingPrompt(`Click a wire in the circuit to place the ${gDef.name} gate.`);
        }
      } else {
        advPending = { gateKey: k, step: 0 };
        const msg = gDef.kind === "two"
          ? `Click the CONTROL wire, then the TARGET wire to place ${gDef.name}.`
          : `Click CONTROL 1, CONTROL 2, then TARGET wire for ${gDef.name}.`;
        advShowPendingPrompt(msg);
      }
    });

    item.addEventListener("mouseenter", () => {
      if (advDragState.active) return;
      showGateTooltip(gDef.name, item.getBoundingClientRect(), gDef.color);
    });
    item.addEventListener("mouseleave", hideGateTooltip);
    item.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); item.click(); }
    });
    container.appendChild(item);
  });
}

// EXPLAIN BOX (ADVANCED / EXPERT)
function advSetExplain(gateKey) {
  const prefix = advMode === "expert" ? "exp" : "adv";
  const el = document.getElementById(`${prefix}GateExplain`);
  if (!el) return;
  if (!gateKey || !MQ_GATES[gateKey]) {
    el.innerHTML = ""; el.classList.add("empty"); return;
  }
  const gDef = MQ_GATES[gateKey];
  el.classList.remove("empty");
  const entangled = SV.isEntangled(advSV, advNumQubits);
  const pattern = advDetectPattern();
  const patternHTML = pattern ? `<div class="circuit-pattern"><span class="circuit-pattern-emoji">${pattern.emoji}</span><div><div class="circuit-pattern-title">${pattern.title}</div><div class="circuit-pattern-body">${pattern.body}</div></div></div>` : "";
  el.innerHTML = `
    <h3>${gDef.name}</h3>
    <p>${gDef.explain}</p>
    ${patternHTML}
    <div class="circuit-impact">
      <div class="circuit-impact-label"><i class="fa-solid fa-bolt-lightning"></i> What this did to your circuit</div>
      <p class="circuit-impact-body">${advDescribeImpact(gateKey)}</p>
    </div>`;
}

function advDescribeImpact(gateKey) {
  const n = advNumQubits;
  const entangled = SV.isEntangled(advSV, n);
  const probs = SV.probs(advSV);
  const maxP = Math.max(...probs);
  switch (gateKey) {
    case "X": {
      const last = advFlattenCircuit().slice().reverse().find(s => s.gate === "X");
      return `Flipped qubit Q${last?.qubit ?? "?"}, essentially a quantum NOT. If it was |0⟩ it is now |1⟩, and vice versa.`;
    }
    case "Y": {
      const last = advFlattenCircuit().slice().reverse().find(s => s.gate === "Y");
      return `Applied Pauli-Y to Q${last?.qubit ?? "?"}, which executed both a bit flip and a phase flip. This introduces an imaginary phase factor that affects future interference.`;
    }
    case "Z": {
      const last = advFlattenCircuit().slice().reverse().find(s => s.gate === "Z");
      return `Phase-flipped |1⟩ of Q${last?.qubit ?? "?"}. If the qubit was in superposition, the relative phase between |0⟩ and |1⟩ just flipped by 180°.`;
    }
    case "S": {
      const last = advFlattenCircuit().slice().reverse().find(s => s.gate === "S");
      return `Applied 90° phase rotation (S gate) to |1⟩ of Q${last?.qubit ?? "?"}. Incrementally rotates phase. Two S gates are equivalent to one Z gate.`;
    }
    case "T": {
      const last = advFlattenCircuit().slice().reverse().find(s => s.gate === "T");
      return `Applied 45° phase rotation (T gate) to |1⟩ of Q${last?.qubit ?? "?"}. The finest phase increment in the standard gate set: critical for fault-tolerant algorithms.`;
    }
    case "H": {
      const last = advFlattenCircuit().slice().reverse().find(s => s.gate === "H");
      return `Put Q${last?.qubit ?? "?"} into superposition.${entangled ? " Combined with entanglement, this qubit is now part of a complex joint state." : " The qubit now has equal probability of measuring |0⟩ or |1⟩."}`;
    }
    case "CNOT": return entangled
      ? "The CNOT gate just entangled your qubits. They now share a joint state, where measuring one instantly collapses the other."
      : "The CNOT flipped the target qubit, but no entanglement was created (control was in a basis state).";
    case "CZ": return entangled
      ? "The CZ gate introduced a phase relationship between the qubits: a subtle yet powerful form of entanglement."
      : "The CZ gate applied a phase flip only to |11⟩. No measurement-level change yet, but the phase will affect future interference.";
    case "SWAP": return "The SWAP gate exchanged the complete states of the two qubits. Everything about them switched.";
    case "CCNOT": return "The Toffoli gate flipped the target only if both controls were |1⟩. You just implemented a reversible AND gate.";
    case "CSWAP": return "The Fredkin gate conditionally swapped two qubits. This is reversible classical computation: an important building block for quantum logic.";
    default: return `Applied ${MQ_GATES[gateKey]?.name || gateKey} to the circuit.`;
  }
}

function advDetectPattern() {
  const seq = advFlattenCircuit().map(s => s.gate).join(",");
  const entangled = SV.isEntangled(advSV, advNumQubits);
  const probs = SV.probs(advSV);
  const n = advNumQubits;

  // Bell state: H on q0 then CNOT q0→q1
  if (seq === "H,CNOT" && n === 2 && entangled && Math.abs(probs[0]-0.5)<0.01 && Math.abs(probs[3]-0.5)<0.01)
    return { emoji:"🔔", title:"You created a Bell State!", body:"This is the most fundamental entangled state in quantum computing: |Φ+⟩ = (|00⟩+|11⟩)/√2. Both qubits are in perfect superposition AND correlated. Measure either one and the other is instantly determined." };

  // GHZ state
  if (n === 3 && entangled && Math.abs(probs[0]-0.5)<0.01 && Math.abs(probs[7]-0.5)<0.01)
    return { emoji:"🌌", title:"GHZ State achieved!", body:"The Greenberger–Horne–Zeilinger state: (|000⟩+|111⟩)/√2. All three qubits are maximally entangled. Used in quantum error correction and tests of quantum mechanics itself." };

  // First entanglement
  if (entangled && advCircuit.length <= 4)
    return { emoji:"🔗", title:"Entanglement created!", body:"Your qubits no longer have independent states. This is a resource with no classical equivalent. It's what makes quantum computers fundamentally different and unique!" };

  // Phase kickback via H→CZ→H
  if (seq.includes("H,CZ") || seq.includes("CZ,H"))
    return { emoji:"", title:"Phase kickback in action!", body:"The combination of CZ and Hadamard gates creates <strong>phase kickback</strong>, where phase information from the target propagates back to the control qubit. This is the mechanism behind Grover's and Shor's algorithms." };

  return null;
}

function advOpenDepthEditor() {
  const prefix = advMode === "expert" ? "exp" : "adv";
  const depthInput = document.getElementById(`${prefix}DepthInput`);
  if (!depthInput) return;
  depthInput.value = String(advCircuitSlots || 1);
  const depthEditor = document.getElementById(`${prefix}DepthEditor`);
  if (depthEditor) {
    depthEditor.classList.add("visible");
    depthEditor.setAttribute("aria-hidden", "false");
    document.getElementById("depthBackdrop").classList.add("visible");
    depthInput.focus();
    depthInput.select();
  }
}

function advCloseDepthEditor() {
  const prefix = advMode === "expert" ? "exp" : "adv";
  const depthEditor = document.getElementById(`${prefix}DepthEditor`);
  if (depthEditor) {
    depthEditor.classList.remove("visible");
    depthEditor.setAttribute("aria-hidden", "true");
  }
  document.getElementById("depthBackdrop").classList.remove("visible");
}

function advShowDepthError(message) {
  const prefix = advMode === "expert" ? "exp" : "adv";
  const depthError = document.getElementById(`${prefix}DepthError`);
  if (!depthError) return;
  
  if (advDepthErrorTimer) clearTimeout(advDepthErrorTimer);
  depthError.textContent = message;
  depthError.classList.add("visible");
  depthError.classList.remove("shake");
  void depthError.offsetWidth;
  depthError.classList.add("shake");
  depthError.setAttribute("aria-hidden", "false");
  advDepthErrorTimer = setTimeout(() => {
    depthError.classList.remove("visible", "shake");
    depthError.setAttribute("aria-hidden", "true");
    advDepthErrorTimer = null;
  }, 1700);
}

function advSetCircuitDepth(nextDepth, wrapId = null) {
  const val = Number(nextDepth);
  if (!Number.isInteger(val) || val < 1 || val > 32) {
    advShowDepthError(`Please choose an integer depth between 1 and 32.`);
    return false;
  }
  advPushHistory();
  const currentDepth = advCircuitSlots || ADV_DEFAULT_DEPTH;

  if (val > currentDepth) {
    while (advCircuit.length < val) {
      advCircuit.push(null);
    }
  } else if (val < currentDepth) {
    advCircuit = advCircuit.slice(0, val);
    if (advGateCount() === 0) advSetExplain(null);
  }

  advCircuitSlots = val;
  advRecompute();
  return true;
}

// QUBIT COUNT & PRESET CONTROLS
function advBuildQubitPresetDropdowns(wrapId) {
  const wrap = document.getElementById(wrapId);
  if (!wrap) return;

  wrap.querySelectorAll(".qubit-preset-dropdown").forEach(d => d.remove());
  if (wrap._dropdownScrollHandler) {
    wrap.removeEventListener("scroll", wrap._dropdownScrollHandler);
    wrap._dropdownScrollHandler = null;
  }

  const WIRE_H = 80;
  const WIRE_TOP = 30;

  for (let q = 0; q < advNumQubits; q++) {
    const sel = document.createElement("select");
    sel.className = "qubit-preset-dropdown";
    sel.dataset.qubit = String(q);

    Object.keys(QUBIT_INIT_PRESETS).forEach(key => {
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = key;
      if (key === (advQubitInitStates[q] || "|0⟩")) opt.selected = true;
      sel.appendChild(opt);
    });

    const wireCenter = WIRE_TOP + q * WIRE_H;
    sel.style.top  = `${wireCenter - 14}px`;
    sel.style.left = `${(wrap.scrollLeft || 0) + 6}px`;

    sel.addEventListener("change", () => {
      advQubitInitStates[Number(sel.dataset.qubit)] = sel.value;
      advRecompute();
    });

    wrap.appendChild(sel);
  }

  function syncLeft() {
    const sx = wrap.scrollLeft;
    wrap.querySelectorAll(".qubit-preset-dropdown").forEach(d => {
      d.style.left = `${sx + 6}px`;
    });
  }
  wrap._dropdownScrollHandler = syncLeft;
  wrap.addEventListener("scroll", syncLeft, { passive: true });
}

function advSetQubits(n) {
  advPushHistory();
  advNumQubits = n;
  advCircuitSlots = ADV_DEFAULT_DEPTH;
  advCircuit = new Array(advCircuitSlots).fill(null);
  advQubitInitStates = Array(n).fill("|0⟩");
  advPending = null;
  advHidePendingPrompt();
  advSV = SV.initZero(n);

  // Sync qubit count UI for both modes
  document.querySelectorAll(".qubit-count-btn").forEach(b => b.classList.toggle("active", Number(b.dataset.n) === n));
  if (advMode === "expert") updateQubitControlButtons();

  // Clear explain box, circuit is being wiped
  advSetExplain(null);

  // Rebuild bloch row
  const prefix = advMode === "expert" ? "exp" : "adv";
  const blochRow = document.getElementById(`${prefix}BlochRow`);
  if (blochRow) { blochRow.innerHTML = ""; advBlochSketches.forEach(s=>s.remove()); advBlochSketches=[]; }

  const wrapId = advMode === "expert" ? "expCircuitWrap" : "advCircuitWrap";
  advMountCircuit(wrapId);
  advBuildQubitPresetDropdowns(wrapId, n);
  advUpdateReadouts();
}

function advLoadPreset(key) {
  if (key === "none" || !ALG_PRESETS[key]) {
    advCircuit = new Array(advCircuitSlots || ADV_DEFAULT_DEPTH).fill(null);
    advSV = SV.initZero(advNumQubits);
    advUpdateReadouts();
    return;
  }
  const preset = ALG_PRESETS[key];
  advSetQubits(preset.n);
  advCircuit = preset.steps.map(s => [{...s}]);
  advCircuitSlots = advCircuit.length;
  advRecompute();
  const lastGate = advFlattenCircuit().slice(-1)[0]?.gate;
  if (lastGate) advSetExplain(lastGate);
}

function advResetPresetDropdown() {
  const prefix = advMode === "expert" ? "exp" : "adv";
  const sel = document.getElementById(`${prefix}PresetSelect`);
  if (sel && sel.value !== "none") sel.value = "none";
}

// MEASURE ALL
function advMeasureAll() {
  advPushHistory();
  const { sv, bits } = SV.measureAll(advSV, advNumQubits);
  advSV = sv;
  advCircuit = new Array(advCircuitSlots || ADV_DEFAULT_DEPTH).fill(null);
  advPending = null;
  advHidePendingPrompt();
  const prefix = advMode === "expert" ? "exp" : "adv";
  const el = document.getElementById(`${prefix}GateExplain`);
  if (el) {
    el.classList.remove("empty");
    el.innerHTML = `
      <h3>Measurement collapsed to: |${bits}⟩</h3>
      <p>All qubits collapsed simultaneously to definite values. The full quantum state was destroyed, only a single classical outcome remains.</p>
      <div class="circuit-impact">
        <div class="circuit-impact-label"><i class="fa-solid fa-bolt-lightning"></i> What just happened</div>
        <p class="circuit-impact-body">Before measurement, the system existed across multiple basis states. The instant you measured, quantum mechanics forced a single outcome according to the Born rule: P(outcome) = |amplitude|². You got |${bits}⟩.</p>
      </div>`;
  }
  advUpdateReadouts();
}

function advOpenProbPopup() {
  const prefix = advMode === "expert" ? "exp" : "adv";
  const n = advNumQubits;
  const probsArr = SV.probs(advSV);
  const entangled = SV.isEntangled(advSV, n);
  let showAll = false;

  const allProbs = probsArr.map((p, i) => ({ p, i }));
  const buildRows = () => allProbs.map(({ p, i }) => {
    if (!showAll && p < 0.001) return "";
    return `<div class="adv-prob-row">
      <span class="adv-prob-label">${basisLabel(i, n)}</span>
      <div class="adv-prob-track"><div class="adv-prob-fill" style="width:${(p * 100).toFixed(1)}%"></div></div>
      <span class="adv-prob-pct">${(p * 100).toFixed(1)}%</span>
    </div>`;
  }).join("");

  const popup = document.createElement("div");
  popup.className = "adv-popup-overlay";
  popup.innerHTML = `
    <div class="adv-popup">
      <div class="adv-popup-header">
        <h3>Basis State Probabilities</h3>
        <div style="display:flex;gap:8px;align-items:center">
          <button id="probFilterToggle" class="btn btn-soft" style="font-size:0.78rem;padding:4px 10px;">Show all states</button>
          <button class="adv-popup-close" onclick="this.closest('.adv-popup-overlay').remove()">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>
      <div class="adv-popup-content" id="probPopupContent">
        ${buildRows()}
      </div>
    </div>
  `;
  document.body.appendChild(popup);

  document.getElementById("probFilterToggle")?.addEventListener("click", function () {
    showAll = !showAll;
    this.textContent = showAll ? "Show non-zero only" : "Show all states";
    const content = document.getElementById("probPopupContent");
    if (content) content.innerHTML = buildRows();
  });
}

function advOpenPhasePopup() {
  const n = advNumQubits;
  const snapSV = SV.clone(advSV);
  const popup = document.createElement("div");
  popup.className = "adv-popup-overlay";
  popup.innerHTML = `
    <div class="adv-popup">
      <div class="adv-popup-header">
        <h3>Phase Angles</h3>
        <button class="adv-popup-close" onclick="this.closest('.adv-popup-overlay').remove()">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div class="adv-popup-content">
        ${snapSV.map((z, i) => {
          if (cAbs2(z) < 0.001) return "";
          const angle_deg = Math.atan2(z.im, z.re) * 180 / Math.PI;
          const angle_rad = Math.atan2(z.im, z.re);
          const mag = Math.sqrt(cAbs2(z));
          const dx = (14 + 10 * mag * Math.cos((angle_deg - 90) * Math.PI / 180)).toFixed(3);
          const dy = (14 + 10 * mag * Math.sin((angle_deg - 90) * Math.PI / 180)).toFixed(3);
          const phaseLabel = phaseUnit === "rad"
            ? `${angle_rad.toFixed(3)} rad · |a|=${mag.toFixed(2)}`
            : `${angle_deg.toFixed(0)}° · |a|=${mag.toFixed(2)}`;
          return `<div class="exp-phase-row">
            <span class="exp-phase-label">${basisLabel(i, n)}</span>
            <svg class="exp-phase-dial" viewBox="0 0 28 28">
              <circle cx="14" cy="14" r="11" fill="none" stroke="var(--border)" stroke-width="1.5"/>
              <line x1="14" y1="14" x2="${dx}" y2="${dy}" stroke="var(--accent-2)" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <span class="exp-phase-val">${phaseLabel}</span>
          </div>`;
        }).join("")}
      </div>
    </div>
  `;
  document.body.appendChild(popup);
  popup.addEventListener("click", (e) => { if (e.target === popup) popup.remove(); });
}

function advOpenBlochPopup() {
  const n = advNumQubits;
  const entangled = SV.isEntangled(advSV, n);
  const snapSV = SV.clone(advSV);
  const uid = `blp-${Date.now()}`; // unique per popup; prevents ID collisions on re-open

  const popup = document.createElement("div");
  popup.className = "adv-popup-overlay";

  // Build n sphere slots explicitly to avoid any template off-by-one
  const sphereSlots = [];
  for (let i = 0; i < n; i++) {
    sphereSlots.push(`
      <div class="adv-popup-bloch-item">
        <div class="adv-popup-bloch-label">${entangled ? `Q${i} (approx)` : `Q${i}`}</div>
        <div class="adv-popup-bloch-canvas" id="${uid}-${i}" style="width:180px;height:180px;flex-shrink:0"></div>
      </div>`);
  }

  popup.innerHTML = `
    <div class="adv-popup">
      <div class="adv-popup-header">
        <h3>Qubit Bloch Spheres${entangled ? ' <span style="font-size:0.78rem;color:var(--muted);font-weight:400"> — approximate (entangled)</span>' : ''}</h3>
        <button class="adv-popup-close" id="${uid}-close">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div class="adv-popup-content adv-bloch-popup-content">
        ${sphereSlots.join("")}
      </div>
    </div>
  `;
  document.body.appendChild(popup);

  const popupSketches = [];

  function closeBlochPopup() {
    popupSketches.forEach(s => { try { s.remove(); } catch {} });
    popup.remove();
  }

  document.getElementById(`${uid}-close`)?.addEventListener("click", closeBlochPopup);
  popup.addEventListener("click", (e) => { if (e.target === popup) closeBlochPopup(); });

  // Delay sketch creation so the DOM is fully laid out first
  setTimeout(() => {
    for (let k = 0; k < n; k++) {
      const wrap = document.getElementById(`${uid}-${k}`);
      if (!wrap) continue;
      const bv = SV.blochForQubit(snapSV, n, k);
      const sk = new p5((p) => {
        p._bloch = { x: bv.x, y: bv.y, z: bv.z };
        p._anim  = { x: 0, y: 0, z: 1 };
        p.setup = () => { p.createCanvas(180, 180, p.WEBGL).parent(wrap); };
        p.draw = () => {
          p._anim.x += (p._bloch.x - p._anim.x) * 0.12;
          p._anim.y += (p._bloch.y - p._anim.y) * 0.12;
          p._anim.z += (p._bloch.z - p._anim.z) * 0.12;
          const cs = getComputedStyle(document.body);
          const textCol  = cs.getPropertyValue("--text").trim();
          const border   = cs.getPropertyValue("--border").trim();
          const panelAlt = cs.getPropertyValue("--panel-alt").trim();
          const accent   = cs.getPropertyValue("--accent").trim();
          const accent2  = cs.getPropertyValue("--accent-2").trim();
          const dark     = document.body.classList.contains("dark");
          p.background(panelAlt);
          p.push();
          p.rotateX(-0.38);
          p.rotateY(blochSpin);
          const r = Math.min(p.width, p.height) * 0.32;
          const baseBorder  = p.color(border);
          const themeTarget = dark ? p.color("#ffffff") : p.color("#000000");
          const wireColor   = p.lerpColor(baseBorder, themeTarget, dark ? 0.12 : 0.08);
          const axisColor   = p.lerpColor(baseBorder, themeTarget, dark ? 0.18 : 0.12);
          p.noFill();
          p.stroke(colorWithAlpha(wireColor.toString(), 0.52, p));
          p.strokeWeight(0.9);
          for (let i = -4; i <= 4; i++) { const a=(i/8)*Math.PI; p.push(); p.rotateX(a); p.circle(0,0,r*2); p.pop(); }
          for (let i = 0; i < 10; i++) { p.push(); p.rotateY((i/10)*Math.PI); p.circle(0,0,r*2); p.pop(); }
          p.stroke(colorWithAlpha(axisColor.toString(), 0.62, p));
          p.strokeWeight(1.2);
          p.line(-r*1.05,0,0,r*1.05,0,0);
          p.line(0,-r*1.05,0,0,r*1.05,0);
          p.line(0,0,-r*1.05,0,0,r*1.05);
          const ar = r * 0.86;
          drawArrow3D(p, p.createVector(0,0,0),
            p.createVector(p._anim.x*ar, -p._anim.z*ar, p._anim.y*ar),
            p.color(accent), p.color(accent2));
          p.pop();
          p.push();
          p.resetMatrix();
          p.fill(textCol); p.noStroke();
          p.textAlign(p.CENTER, p.CENTER); p.textSize(9);
          p.text("|0⟩", p.width/2, 10);
          p.text("|1⟩", p.width/2, p.height-8);
          p.pop();
        };
      });
      popupSketches.push(sk);
    }
  }, 80);
}

// MODE SWITCHING
let currentMode = "basic";

function switchMode(mode) {
  if (mode === currentMode) return;

  // Snapshot the outgoing Advanced/Expert circuit so each mode keeps its own
  // independent depth, qubit count, gates and statevector across switches.
  if (currentMode === "advanced" || currentMode === "expert") {
    advModeStates[currentMode] = advCaptureModeState();
  }

  currentMode = mode;
  advMode = mode; // "advanced" or "expert" (ignored for basic)

  // Show/hide layouts
  const layoutBasic    = document.querySelector(".layout:not(.layout-advanced)");
  const layoutAdvanced = document.getElementById("layoutAdvanced");
  const layoutExpert   = document.getElementById("layoutExpert");

  layoutBasic.hidden    = mode !== "basic";
  layoutAdvanced.hidden = mode !== "advanced";
  layoutExpert.hidden   = mode !== "expert";

  // Update mode buttons
  document.querySelectorAll(".mode-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.mode === mode);
  });

  // Sync undo/redo button state for the active mode
  if (mode === "basic") {
    updateUndoRedoButtons();
    const savedBasic = loadSavedSession();
    restoreBtn.hidden = !hasMeaningfulSession(savedBasic);
  } else {
    advSyncUndoRedoBtns();
  }

  // Initialise advanced/expert on first switch
  if (mode === "advanced" || mode === "expert") {
    const wrapId = mode === "expert" ? "expCircuitWrap" : "advCircuitWrap";
    const libId  = mode === "expert" ? "expGateLibrary"  : "advGateLibrary";
    const keys   = mode === "expert" ? EXPERT_GATE_KEYS : ADVANCED_GATE_KEYS;

    // Re-enter this mode with its own remembered circuit (depth included);
    // start fresh only the first time this mode is visited in the session.
    if (advModeStates[mode]) {
      advRestoreModeState(advModeStates[mode]);
    } else {
      advNumQubits = 2;
      advCircuit   = new Array(ADV_DEFAULT_DEPTH).fill(null);
      advCircuitSlots = ADV_DEFAULT_DEPTH;
      advQubitInitStates = ["|0⟩", "|0⟩"];
      advSV        = SV.initZero(2);
    }
    advPending   = null;
    advHidePendingPrompt();
    advBlochSketches.forEach(s=>s.remove());
    advBlochSketches = [];
    advClearHistory();

    // Show restore button if a prior session exists for this mode
    const savedAdv = advLoadSavedSession(mode);
    restoreBtn.hidden = !advHasMeaningfulSession(savedAdv);

    advCreateLibrary(libId, keys);
    setTimeout(() => {
      advMountCircuit(wrapId);
      advBuildQubitPresetDropdowns(wrapId, advNumQubits);
      advUpdateReadouts();
      if (mode === "expert") updateQubitControlButtons();
    }, 60);

    // Add depth editor event listeners
    setTimeout(() => {
      const prefix = mode === "expert" ? "exp" : "adv";
      const editDepthBtn = document.getElementById(`${prefix}EditDepthBtn`);
      const depthCancelBtn = document.getElementById(`${prefix}DepthCancelBtn`);
      const depthSaveBtn = document.getElementById(`${prefix}DepthSaveBtn`);
      
      if (editDepthBtn) editDepthBtn.addEventListener("click", advOpenDepthEditor);
      if (depthCancelBtn) depthCancelBtn.addEventListener("click", advCloseDepthEditor);
      if (depthSaveBtn) {
        depthSaveBtn.addEventListener("click", () => {
          const depthInput = document.getElementById(`${prefix}DepthInput`);
          const wrapId = `${prefix}CircuitCanvasWrap`;
          if (depthInput && advSetCircuitDepth(depthInput.value, wrapId)) {
            advCloseDepthEditor();
          }
        });
      }
    }, 100);
  }

  // Per-mode tour
  const tourKey = `quantum_sandbox_tour_${mode}_v1`;
  if (!localStorage.getItem(tourKey)) {
    setTimeout(() => launchModeTour(mode), 700);
  }
}

// ADVANCED/EXPERT DRAG-AND-DROP HANDLERS
document.addEventListener("mousemove", (e) => {
  if (!advDragState.active || currentMode === "basic") return;
  
  advDragState.pointerX = e.clientX;
  advDragState.pointerY = e.clientY;
  advMoveDragGhost(e.clientX, e.clientY);
  
  const moved = Math.hypot(e.clientX - advDragState.downX, e.clientY - advDragState.downY);
  if (moved > 6) advDragState.started = true;

  if (advDragState.started && !advDragState.fromCircuit && advDragState.type) {
    const gDef = MQ_GATES[advDragState.type];
    if (gDef?.kind !== "single") {
      advShowDepthError("Multi-qubit gates can't be dragged. Click a gate in the library and follow the on-canvas instructions to place it.");
      advResetDragState();
      return;
    }
  }
  
  // Find snap target when over the circuit canvas
  if (advDragState.started && advDragState.type) {
    advDragState.snapIndex = null;
    advDragState.snapQubits = null;
    
    const wrapId = advMode === "expert" ? "expCircuitWrap" : "advCircuitWrap";
    const wrap = document.getElementById(wrapId);
    if (!wrap) return;
    
    const rect = wrap.getBoundingClientRect();
    const inCanvas = e.clientX >= rect.left && e.clientX <= rect.right && 
                     e.clientY >= rect.top && e.clientY <= rect.bottom;
    if (!inCanvas) return;
    
    // Get canvas-relative coordinates
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    const DEPTH = advCircuitSlots || 1;
    const LEFT_PAD = 70;
    const SLOT_W = 56;
    const SLOT_GAP = 10;
    const WIRE_H = 80;
    const TOP_OFFSET = 30;
    
    const gDef = MQ_GATES[advDragState.type];
    if (!gDef) return;
    
    // Find closest step (column) position
    let bestStepDist = Infinity;
    let bestStepIndex = null;
    for (let i = 0; i <= DEPTH; i++) {
      const stepX = LEFT_PAD + i * (SLOT_W + SLOT_GAP);
      const slotCenterX = stepX + SLOT_W / 2;
      const distX = Math.abs(canvasX - slotCenterX);
      if (distX < bestStepDist && distX <= SLOT_W / 2 + 12) {
        bestStepDist = distX;
        bestStepIndex = i;
      }
    }
    
    if (bestStepIndex === null) return;
    
    // Determine qubits based on gate type and position
    if (gDef.kind === "single") {
      // Find closest qubit wire
      let closestQ = 0;
      let closestQDist = Infinity;
      for (let q = 0; q < advNumQubits; q++) {
        const wireY = TOP_OFFSET + q * WIRE_H;
        const distY = Math.abs(canvasY - wireY);
        if (distY < closestQDist) {
          closestQDist = distY;
          closestQ = q;
        }
      }
      
      const replacementIndex = advFindSingleStepIndex(bestStepIndex, closestQ);
      if (closestQDist < 50 && (
        advCanPlaceStepInColumn(bestStepIndex, { gate: advDragState.type, qubit: closestQ }) ||
        replacementIndex !== -1
      )) {
        advDragState.snapIndex = bestStepIndex;
        advDragState.snapQubits = [closestQ];
      }
    } else if (gDef.kind === "two" && advDragState.gateData) {
      // For two-qubit, check if both qubits are accessible
      const q1 = advDragState.gateData.qubit;
      const q2 = advDragState.gateData.qubit2;
      if (q1 !== undefined && q2 !== undefined && q1 < advNumQubits && q2 < advNumQubits) {
        advDragState.snapIndex = bestStepIndex;
        advDragState.snapQubits = [q1, q2];
      }
    } else if (gDef.kind === "three" && advDragState.gateData) {
      // For three-qubit, check all qubits are accessible
      const q1 = advDragState.gateData.qubit;
      const q2 = advDragState.gateData.qubit2;
      const q3 = advDragState.gateData.qubit3;
      if (q1 !== undefined && q2 !== undefined && q3 !== undefined && 
          q1 < advNumQubits && q2 < advNumQubits && q3 < advNumQubits) {
        advDragState.snapIndex = bestStepIndex;
        advDragState.snapQubits = [q1, q2, q3];
      }
    }
  }
});

document.addEventListener("mouseup", () => {
  if (!advDragState.active || currentMode === "basic") return;
  
  const canPlace = advDragState.started && advDragState.snapIndex !== null && advDragState.snapQubits !== null;
  const placedType = advDragState.type;
  const originalData = advDragState.gateData;
  
  if (canPlace) {
    const gDef = MQ_GATES[placedType];
    if (gDef.kind === "single") {
      const targetQubit = advDragState.snapQubits[0];
      const targetIndex = advDragState.snapIndex;
      const replacementIndex = advFindSingleStepIndex(targetIndex, targetQubit);
      const droppingBackToOrigin = advDragState.fromCircuit &&
        originalData &&
        advDragState.sourceIndex === targetIndex &&
        originalData.qubit === targetQubit &&
        replacementIndex === -1;

      if (droppingBackToOrigin) {
        advInsertStepAtColumn(targetIndex, { ...originalData });
      } else {
        advPushHistory();
        let displaced = null;
        if (replacementIndex !== -1) {
          displaced = advRemoveStepAtColumn(targetIndex, replacementIndex);
        }

        const placedStep = advDragState.fromCircuit && originalData
          ? { ...originalData, qubit: targetQubit }
          : { gate: placedType, qubit: targetQubit };
        advInsertStepAtColumn(targetIndex, placedStep);

        if (advDragState.fromCircuit && displaced && originalData && advDragState.sourceIndex !== null) {
          advInsertStepAtColumn(advDragState.sourceIndex, {
            ...displaced,
            qubit: originalData.qubit
          });
        }
      }
    } else {
      advPushHistory();
      advInsertStepAtColumn(advDragState.snapIndex, originalData);
    }

    advRecompute();
    advResetPresetDropdown();
    advSetExplain(placedType);
  } else if (advDragState.fromCircuit && originalData) {
    // Drag was incomplete - restore the gate to circuit
    if (advDragState.sourceIndex !== null) {
      advInsertStepAtColumn(advDragState.sourceIndex, originalData);
    } else {
      const restoreColumn = advFindPlacementColumn(originalData);
      if (restoreColumn !== -1) advInsertStepAtColumn(restoreColumn, originalData);
    }
    advRecompute();
  }
  
  advResetDragState();
});

/* Bind qubit count buttons (Advanced mode) */
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".qubit-count-btn");
  if (!btn) return;
  const n = Number(btn.dataset.n);
  const mode = btn.dataset.mode || "advanced";
  if (mode !== currentMode && !(mode === "advanced" && currentMode === "advanced")) return;
  btn.closest(".qubit-count-row").querySelectorAll(".qubit-count-btn").forEach(b => b.classList.toggle("active", b === btn));
  advSetQubits(n);
});

/* Expert mode add/remove qubit buttons */
const MAX_QUBITS_EXPERT = 6;
function updateQubitControlButtons() {
  if (advMode !== "expert") return;
  const addBtn = document.getElementById("expQubitAddBtn");
  const removeBtn = document.getElementById("expQubitRemoveBtn");
  const countSpan = document.getElementById("expQubitCount");
  const errorEl = document.getElementById("expQubitError");
  
  if (addBtn) addBtn.disabled = advNumQubits >= MAX_QUBITS_EXPERT;
  if (removeBtn) removeBtn.disabled = advNumQubits <= 2;
  if (countSpan) countSpan.textContent = String(advNumQubits);
  if (errorEl) {
    errorEl.classList.remove("show");
    errorEl.textContent = "";
  }
}

function showQubitError(msg) {
  if (advMode !== "expert") return;
  const errorEl = document.getElementById("expQubitError");
  if (errorEl) {
    errorEl.textContent = msg;
    errorEl.classList.add("show");
    setTimeout(() => errorEl.classList.remove("show"), 2800);
  }
}

document.getElementById("expQubitAddBtn")?.addEventListener("click", () => {
  if (advNumQubits >= MAX_QUBITS_EXPERT) {
    showQubitError(`Maximum ${MAX_QUBITS_EXPERT} qubits allowed.`);
    return;
  }
  advSetQubits(advNumQubits + 1);
  updateQubitControlButtons();
});

document.getElementById("expQubitRemoveBtn")?.addEventListener("click", () => {
  if (advNumQubits <= 2) {
    showQubitError("Minimum 2 qubits required.");
    return;
  }
  advSetQubits(advNumQubits - 1);
  updateQubitControlButtons();
});

/* Bind preset selects */
document.getElementById("advPresetSelect")?.addEventListener("change", (e) => advLoadPreset(e.target.value));
document.getElementById("expPresetSelect")?.addEventListener("change", (e) => advLoadPreset(e.target.value));

/* Bind measure / reset / clear */
document.getElementById("advMeasureBtn")?.addEventListener("click", advMeasureAll);
document.getElementById("expMeasureBtn")?.addEventListener("click", advMeasureAll);
document.getElementById("advResetBtn")?.addEventListener("click", () => { advSetQubits(advNumQubits); advSetExplain(null); advUpdateReadouts(); });
document.getElementById("expResetBtn")?.addEventListener("click",  () => { advSetQubits(advNumQubits); advSetExplain(null); advUpdateReadouts(); });
document.getElementById("advClearBtn")?.addEventListener("click",  () => {
  if (advGateCount() > 0 && !confirm("Clear the circuit? This removes all gates. (You can undo with Ctrl+Z.)")) return;
  advPushHistory(); advCircuit = new Array(advCircuitSlots || ADV_DEFAULT_DEPTH).fill(null); advPending=null; advHidePendingPrompt(); advSetExplain(null); advRecompute();
});
document.getElementById("expClearBtn")?.addEventListener("click",  () => {
  if (advGateCount() > 0 && !confirm("Clear the circuit? This removes all gates. (You can undo with Ctrl+Z.)")) return;
  advPushHistory(); advCircuit = new Array(advCircuitSlots || ADV_DEFAULT_DEPTH).fill(null); advPending=null; advHidePendingPrompt(); advSetExplain(null); advRecompute();
});

/* Bind mode switcher */
document.querySelectorAll(".mode-btn").forEach(btn => {
  btn.addEventListener("click", () => switchMode(btn.dataset.mode));
});

/* Phase unit toggle (deg/rad) */
document.getElementById("expPhaseUnitToggle")?.addEventListener("click", function() {
  phaseUnit = phaseUnit === "deg" ? "rad" : "deg";
  this.textContent = phaseUnit;
  advUpdateReadouts();
});

// PER-MODE ONBOARDING TOURS
const MODE_TOURS = {
  advanced: [
    { target:"#advGateLibrary",   title:"Welcome to Advanced Mode!",    body:"You now have multi-qubit gates. Single-qubit gates (H, X, Z...) apply to one wire. Two-qubit gates (CNOT, CZ, SWAP) connect two wires." },
    { target:".qubit-count-row",  title:"Choose your qubit count",       body:"Start with 2 qubits. Add a third when you're ready for more complex states." },
    { target:"#advCircuitWrap",   title:"Multi-wire circuit",            body:"Each horizontal line is a qubit wire. Gates sit on wires; two-qubit gates show a vertical connector between the wires they link." },
    { target:"#advProbBars",      title:"Basis state probabilities",     body:"With 2 qubits there are 4 possible outcomes: |00⟩, |01⟩, |10⟩, |11⟩. These bars show the probability of each." },
    { target:"#advBlochRow",      title:"Per-qubit Bloch spheres",       body:"Each qubit gets its own sphere, labelled Q0, Q1, Q2… from left to right. Q0 is always the first qubit (top wire). When qubits are entangled the spheres become approximate." },
    { target:"#advPresetSelect",  title:"Try a preset algorithm",        body:"Load a Bell State or GHZ State to instantly see entanglement in action. These are the foundational circuits of quantum information." },
  ],
  expert: [
    { target:"#expGateLibrary",   title:"Expert Mode: full gate set unlocked!",   body:"You now have Toffoli (CCX) and Fredkin (CSWAP): three-qubit gates that implement reversible classical logic. Combined with H and CNOT, this set is universal." },
    { target:"#expQubitControl",  title:"Add or remove qubits",          body:"Use the + and - buttons to build systems from 2 to 6 qubits. More qubits = more basis states and more computational power." },
    { target:"#expCircuitWrap",   title:"Deep circuit construction",     body:"Three-qubit gates show two control dots connected to a target. Build gate sequences that implement real algorithms from the preset menu." },
    { target:"#expBlochRow",      title:"Per-qubit Bloch spheres",       body:"Spheres are indexed Q0, Q1, Q2… left to right. Q0 corresponds to the top wire of the circuit. With entanglement, each sphere shows only an approximation of its qubit's state." },
    { target:"#expPhaseDisplay",  title:"Phase angle display",           body:"Each basis state has a complex amplitude with a phase angle. The dial shows direction (phase) and length (magnitude). Phase is what drives quantum interference." },
    { target:"#expProbBars",      title:"Full statevector",              body:"With 3 qubits, there are 8 basis states. With 4: 16. Observe how multi-qubit gates redistribute probability across the entire space." },
    { target:"#expPresetSelect",  title:"Run a real algorithm",         body:"Choose from Grover's Search, QFT, Quantum Teleportation, Deutsch, and more. These are actual circuits used in quantum computing research!" },
  ],
};

function launchModeTour(mode) {
  const steps = MODE_TOURS[mode];
  if (!steps) return;
  const TOUR_KEY = `quantum_sandbox_tour_${mode}_v1`;

  let current = 0;

  const spotlight = document.createElement("div");
  spotlight.className = "tour-spotlight";
  spotlight.style.opacity = "0";

  const card = document.createElement("div");
  card.className = "tour-card";
  card.style.position = "absolute";
  card.style.opacity = "0";
  card.innerHTML = `
    <div class="tour-step-pill" id="mtPill"></div>
    <h4 id="mtTitle"></h4>
    <p id="mtBody"></p>
    <div class="tour-footer">
      <div class="tour-dots" id="mtDots"></div>
      <div class="tour-actions">
        <button class="tour-skip" id="mtSkip">Skip</button>
        <button class="btn btn-primary" id="mtNext" style="padding:7px 14px;font-size:0.85rem;"></button>
      </div>
    </div>`;

  document.body.appendChild(spotlight);
  document.body.appendChild(card);

  const pill  = document.getElementById("mtPill");
  const title = document.getElementById("mtTitle");
  const body  = document.getElementById("mtBody");
  const dots  = document.getElementById("mtDots");
  const skip  = document.getElementById("mtSkip");
  const next  = document.getElementById("mtNext");

  steps.forEach(() => { const d=document.createElement("div"); d.className="tour-dot"; dots.appendChild(d); });

  const PAD=10, MARGIN=16, CARD_W=320, CARD_H=210;

  function placeAll(el) {
    const r=el.getBoundingClientRect(), sy=window.scrollY, vw=window.innerWidth;
    spotlight.style.left=`${r.left-PAD}px`; spotlight.style.top=`${r.top-PAD}px`;
    spotlight.style.width=`${r.width+PAD*2}px`; spotlight.style.height=`${r.height+PAD*2}px`;
    const cw=Math.min(CARD_W,vw-32);
    const below=window.innerHeight-r.bottom-MARGIN;
    let top = below>=CARD_H ? r.bottom+sy+MARGIN : r.top+sy-CARD_H-MARGIN;
    top=Math.max(sy+8,top);
    let left=r.left+r.width/2-cw/2;
    left=Math.max(16,Math.min(vw-cw-16,left));
    card.style.width=`${cw}px`; card.style.top=`${top}px`; card.style.left=`${left}px`;
  }

  function render() {
    const step=steps[current];
    const el=document.querySelector(step.target);
    if (!el) { endTour(); return; }
    pill.textContent=`Step ${current+1} of ${steps.length}`;
    title.innerHTML=step.title; body.innerHTML=step.body;
    next.textContent=current<steps.length-1?"Next →":"Let's go!";
    dots.querySelectorAll(".tour-dot").forEach((d,i)=>d.classList.toggle("active",i===current));
    card.style.opacity="0"; spotlight.style.opacity="0";
    const r=el.getBoundingClientRect(), sy=window.scrollY, vh=window.innerHeight;
    const needsTop=r.top+sy-PAD-24, needsBot=r.bottom+sy+PAD+CARD_H+MARGIN+24;
    const blockH=needsBot-needsTop;
    let ts=blockH<=vh ? needsTop-(vh-blockH)/2 : needsTop-24;
    ts=Math.max(0,Math.min(document.body.scrollHeight-vh,ts));
    const already=Math.abs(window.scrollY-ts)<4;
    function afterScroll() {
      placeAll(el);
      requestAnimationFrame(()=>{
        card.style.transition="opacity 200ms ease";
        spotlight.style.transition="opacity 200ms ease,left 300ms ease,top 300ms ease,width 300ms ease,height 300ms ease";
        card.style.opacity="1"; spotlight.style.opacity="1";
      });
    }
    if (already) { afterScroll(); }
    else {
      window.scrollTo({top:ts,behavior:"smooth"});
      let t=setTimeout(afterScroll,420);
      const onS=()=>{ if(Math.abs(window.scrollY-ts)<6){clearTimeout(t);window.removeEventListener("scroll",onS);setTimeout(afterScroll,60);} };
      window.addEventListener("scroll",onS,{passive:true});
    }
  }

  function endTour() {
    spotlight.remove(); card.remove();
    localStorage.setItem(TOUR_KEY,"1");
  }

  next.addEventListener("click",()=>{ if(current<steps.length-1){current++;render();}else endTour(); });
  skip.addEventListener("click",endTour);
  document.addEventListener("keydown",(e)=>{
    if(!document.body.contains(card)) return;
    if(e.key==="Escape") endTour();
    if(e.key==="ArrowRight"&&current<steps.length-1){current++;render();}
  });

  render();
}

// CONTACT MODAL
(function () {
  const fab = document.getElementById("contactFab");
  const modal = document.getElementById("contactModal");
  const closeBtn = document.getElementById("contactCloseBtn");

  function openContact() {
    modal.classList.add("visible");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeContact() {
    modal.classList.remove("visible");
    modal.setAttribute("aria-hidden", "true");
  }

  fab.addEventListener("click", openContact);
  closeBtn.addEventListener("click", closeContact);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeContact();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("visible")) closeContact();
  });
})();

// INFO BUTTON TOOLTIPS
(function () {
  const tooltip = document.getElementById("infoTooltip");
  let hideTimer = null;

  function show(btn) {
    const tip = btn.dataset.tip;
    if (!tip) return;
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    tooltip.textContent = tip;
    // Park off-screen and make visible so browser lays it out before we measure
    tooltip.style.transform = "none";
    tooltip.style.left = "-9999px";
    tooltip.style.top  = "-9999px";
    tooltip.classList.add("visible");
    tooltip.setAttribute("aria-hidden", "false");
    // Double rAF: first frame commits the paint, second frame has real dimensions
    requestAnimationFrame(() => requestAnimationFrame(() => positionTooltip(btn)));
  }

  function hide() {
    hideTimer = setTimeout(() => {
      tooltip.classList.remove("visible");
      tooltip.setAttribute("aria-hidden", "true");
    }, 120);
  }

  function positionTooltip(btn) {
    const r = btn.getBoundingClientRect();
    const MARGIN = 8;
    const tw = tooltip.offsetWidth  || 240;
    const th = tooltip.offsetHeight || 60;

    // Prefer above the button; flip below if not enough room
    let top = (r.top - th - MARGIN > 0)
      ? r.top - th - MARGIN
      : r.bottom + MARGIN;

    // Horizontally centre on the button, fully clamped within viewport
    let left = r.left + r.width / 2 - tw / 2;
    left = Math.max(MARGIN, Math.min(window.innerWidth  - tw - MARGIN, left));
    top  = Math.max(MARGIN, Math.min(window.innerHeight - th - MARGIN, top));

    tooltip.style.transform   = "none";
    tooltip.style.left        = `${left}px`;
    tooltip.style.top         = `${top}px`;
    tooltip.style.borderColor = "var(--accent-2)";
  }

  document.addEventListener("mouseover", (e) => {
    const btn = e.target.closest(".info-btn");
    if (btn) show(btn);
  });
  document.addEventListener("mouseout", (e) => {
    if (e.target.closest(".info-btn")) hide();
  });
  document.addEventListener("focusin", (e) => {
    const btn = e.target.closest(".info-btn");
    if (btn) show(btn);
  });
  document.addEventListener("focusout", (e) => {
    if (e.target.closest(".info-btn")) hide();
  });
})();

// ONBOARDING TOUR  (shown once per browser, stored in localStorage)
(function () {
  const TOUR_KEY = "quantum_sandbox_tour_v1";
  if (localStorage.getItem(TOUR_KEY)) return;

  const STEPS = [
    { target: "#gateLibrary",      title: "Welcome to Quantum Sandbox!", body: "This is your Gate Library. Click any gate to add it to your circuit, or drag it to a specific slot." },
    { target: ".circuit-wrap",     title: "Your Circuit",                 body: "Gates appear here on the qubit wire, left to right. Drag to reorder, or hover a gate and click the red badge to remove it." },
    { target: ".state-vector-card",title: "State Vector",                 body: "Watch α and β update in real time. The bars show the probability of measuring |0⟩ or |1⟩. They always add up to 100%." },
    { target: ".bloch-wrap",       title: "Bloch Sphere",                 body: "This 3D sphere maps your qubit's state. North pole = |0⟩, south pole = |1⟩, equator = superposition." },
    { target: "#measureBtn",       title: "Measure",                      body: "Hit Measure to collapse the qubit to a definite |0⟩ or |1⟩ based on current probabilities, just like a real quantum computer." },
    { target: "#learnBtn",         title: "Feeling overwhelmed?",          body: "No worries! The Learn section walks you through quantum computing from scratch, one bite-sized lesson at a time. No physics background needed." },
    { target: "#guideBtn",         title: "Get Started!",          body: "Open the Guide anytime for a full walkthrough of quantum concepts and every feature in the Sandbox." },
  ];

  let current = 0;

  const spotlight = document.createElement("div");
  spotlight.className = "tour-spotlight";
  spotlight.id = "tourSpotlight";
  spotlight.style.opacity = "0";

  const card = document.createElement("div");
  card.className = "tour-card";
  card.id = "tourCard";
  card.style.position = "absolute";
  card.style.opacity = "0";
  card.innerHTML = `
    <div class="tour-step-pill" id="tourPill"></div>
    <h4 id="tourTitle"></h4>
    <p id="tourBody"></p>
    <div class="tour-footer">
      <div class="tour-dots" id="tourDots"></div>
      <div class="tour-actions">
        <button class="tour-skip" id="tourSkip">Skip tour</button>
        <button class="btn btn-primary" id="tourNext" style="padding:7px 14px;font-size:0.85rem;"></button>
      </div>
    </div>`;

  document.body.appendChild(spotlight);
  document.body.appendChild(card);

  const pill  = document.getElementById("tourPill");
  const title = document.getElementById("tourTitle");
  const body  = document.getElementById("tourBody");
  const dots  = document.getElementById("tourDots");
  const skip  = document.getElementById("tourSkip");
  const next  = document.getElementById("tourNext");

  STEPS.forEach(() => {
    const d = document.createElement("div");
    d.className = "tour-dot";
    dots.appendChild(d);
  });

  const PAD    = 10;
  const MARGIN = 16;
  const CARD_W = 320;
  const CARD_H = 210; // safe upper estimate

  function placeElements(el) {
    const r = el.getBoundingClientRect();
    const scrollY = window.scrollY;
    const vw = window.innerWidth;

    // Spotlight is fixed
    spotlight.style.left   = `${r.left   - PAD}px`;
    spotlight.style.top    = `${r.top    - PAD}px`;
    spotlight.style.width  = `${r.width  + PAD * 2}px`;
    spotlight.style.height = `${r.height + PAD * 2}px`;

    // Card is absolute (scrolls with page)
    const cw = Math.min(CARD_W, vw - 32);
    const spaceBelow = window.innerHeight - r.bottom - MARGIN;
    const spaceAbove = r.top - MARGIN;
    let cardTop;
    if (spaceBelow >= CARD_H || spaceBelow >= spaceAbove) {
      cardTop = r.bottom + scrollY + MARGIN;
    } else {
      cardTop = r.top + scrollY - CARD_H - MARGIN;
    }
    cardTop = Math.max(scrollY + 8, cardTop);

    let cardLeft = r.left + r.width / 2 - cw / 2;
    cardLeft = Math.max(16, Math.min(vw - cw - 16, cardLeft));

    card.style.width = `${cw}px`;
    card.style.top   = `${cardTop}px`;
    card.style.left  = `${cardLeft}px`;
  }

  function render() {
    const step = STEPS[current];
    const el = document.querySelector(step.target);
    if (!el) { endTour(); return; }

    pill.textContent = `Step ${current + 1} of ${STEPS.length}`;
    title.innerHTML  = step.title;
    body.innerHTML   = step.body;
    next.textContent  = current < STEPS.length - 1 ? "Next →" : "Get started!";
    document.querySelectorAll(".tour-dot").forEach((d, i) => d.classList.toggle("active", i === current));

    // Fade out, scroll, reposition, fade in
    card.style.transition = "opacity 160ms ease";
    spotlight.style.transition = "opacity 160ms ease";
    card.style.opacity = "0";
    spotlight.style.opacity = "0";

    const r = el.getBoundingClientRect();
    const scrollY = window.scrollY;
    const vh = window.innerHeight;

    // We want to show: target + card (below or above) + some breathing room
    const needsTop    = r.top    + scrollY - PAD - 24;
    const needsBottom = r.bottom + scrollY + PAD + CARD_H + MARGIN + 24;
    const blockH = needsBottom - needsTop;
    let targetScroll;
    if (blockH <= vh) {
      targetScroll = needsTop - (vh - blockH) / 2;
    } else {
      targetScroll = needsTop - 24;
    }
    targetScroll = Math.max(0, Math.min(document.body.scrollHeight - vh, targetScroll));

    const already = Math.abs(window.scrollY - targetScroll) < 4;

    function afterScroll() {
      placeElements(el);
      requestAnimationFrame(() => {
        card.style.transition = "opacity 200ms ease";
        spotlight.style.transition = "opacity 200ms ease, left 300ms cubic-bezier(.4,0,.2,1), top 300ms cubic-bezier(.4,0,.2,1), width 300ms cubic-bezier(.4,0,.2,1), height 300ms cubic-bezier(.4,0,.2,1)";
        card.style.opacity = "1";
        spotlight.style.opacity = "1";
      });
    }

    if (already) {
      afterScroll();
    } else {
      window.scrollTo({ top: targetScroll, behavior: "smooth" });
      let t = setTimeout(afterScroll, 420);
      const onScroll = () => {
        if (Math.abs(window.scrollY - targetScroll) < 6) {
          clearTimeout(t);
          window.removeEventListener("scroll", onScroll);
          setTimeout(afterScroll, 60);
        }
      };
      window.addEventListener("scroll", onScroll, { passive: true });
    }
  }

  function endTour() {
    spotlight.remove();
    card.remove();
    localStorage.setItem(TOUR_KEY, "1");
  }

  next.addEventListener("click", () => {
    if (current < STEPS.length - 1) { current++; render(); } else endTour();
  });
  skip.addEventListener("click", endTour);
  document.addEventListener("keydown", (e) => {
    if (!document.getElementById("tourCard")) return;
    if (e.key === "Escape") endTour();
    if (e.key === "ArrowRight" && current < STEPS.length - 1) { current++; render(); }
  });

  setTimeout(render, 800);
})();
