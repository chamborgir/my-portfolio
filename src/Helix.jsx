import React, {
    useState,
    useEffect,
    useRef,
    useMemo,
    forwardRef,
    useImperativeHandle,
} from "react";
import * as THREE from "three";

/* ==================================================================
   CONSTANTS (world units)
   ================================================================== */

const TAU = Math.PI * 2;
const RADIUS = 1.9;
const HEIGHT = 9; // height of the main helix node area
const PAD = 6; // extra strand above and below the main helix (no extra nodes)
const FOV = 40;
const CAM_Z = 14;
const FOLD_ZOOM = 1.12; // extra zoom on foldable-sized screens (1 = none)

/* ---------- Projects ladder: every project is one real base pair ---------- */
const B = 0.26; // length of one chemical bond. Scales the whole molecule.
const PAIR_STEP = 1.7; // vertical spacing per pair (keeps neighbouring pairs from touching)
const PAIR_TWIST = 0.9; // radians between neighbouring pairs (0 = flat, but edge-on twice a turn)
const SUG_CX = 4.5; // sugar centre, in bond lengths from the middle of the pair
const SUG_CY = -1.3; // sugar centre height, in bond lengths
const SUG_R = 0.7; // sugar ring radius, in bond lengths
const SUG_X = SUG_CX * B;
const SUG_Y = SUG_CY * B;
const PYR_CX = -2.8605; // ring centres, in bond lengths (so both sugars sit symmetrically)
const PUR_CX = 1.1395;
const BASE_COLORS = { A: 0xf0a090, T: 0xf3d77c, G: 0x8fb4ea, C: 0xa9d29b }; // ring tints, as in the textbook diagram
// Pairs cycle through this pattern; purSide says which backbone holds the purine
const PAIR_PATTERN = [
    { pur: "A", pyr: "T", purSide: 1 },
    { pur: "G", pyr: "C", purSide: -1 },
    { pur: "G", pyr: "C", purSide: 1 },
    { pur: "A", pyr: "T", purSide: -1 },
];

// Atom colours (the usual chemistry colours) and sizes
const ATOM_COL = {
    C: new THREE.Color(0x8e97aa),
    N: new THREE.Color(0x5b86ff),
    O: new THREE.Color(0xff5c5c),
    H: new THREE.Color(0xc4cde2),
};
const ATOM_R = { C: 0.036, N: 0.062, O: 0.062, H: 0.04 };

/* Skeletal structures from the diagram. Coordinates are in bond lengths, relative
   to the centre of the six-membered ring, with the Watson-Crick edge facing +X.
   Each atom is [element, x, y]; each bond is [atom, atom, order]. */
const S3 = Math.sqrt(3) / 2;
const PYR_RING = {
    C4: ["C", 0.5, S3],
    N3: ["N", 1, 0],
    C2: ["C", 0.5, -S3],
    N1: ["N", -0.5, -S3],
    C6: ["C", -1, 0],
    C5: ["C", -0.5, S3],
};
const PUR_RING = {
    C6: ["C", -0.5, S3],
    N1: ["N", -1, 0],
    C2: ["C", -0.5, -S3],
    N3: ["N", 0.5, -S3],
    C4: ["C", 1, 0],
    C5: ["C", 0.5, S3],
    N7: ["N", 1.169, 1.609],
    C8: ["C", 2.083, 1.202],
    N9: ["N", 1.978, 0.208],
};
const MODELS = {
    // Cytosine
    C: {
        link: "N1",
        ring: [["C4", "N3", "C2", "N1", "C6", "C5"]],
        atoms: {
            ...PYR_RING,
            N4: ["N", 1, 2 * S3],
            H4a: ["H", 2, 2 * S3],
            H4b: ["H", 0.5, 3 * S3],
            O2: ["O", 1, -2 * S3],
        },
        bonds: [
            ["C4", "N3", 2],
            ["N3", "C2", 1],
            ["C2", "N1", 1],
            ["N1", "C6", 1],
            ["C6", "C5", 2],
            ["C5", "C4", 1],
            ["C4", "N4", 1],
            ["N4", "H4a", 1],
            ["N4", "H4b", 1],
            ["C2", "O2", 2],
        ],
    },
    // Thymine
    T: {
        link: "N1",
        ring: [["C4", "N3", "C2", "N1", "C6", "C5"]],
        atoms: {
            ...PYR_RING,
            O4: ["O", 1, 2 * S3],
            O2: ["O", 1, -2 * S3],
            H3: ["H", 2, 0],
            CH3: ["C", -1, 2 * S3],
        },
        bonds: [
            ["C4", "N3", 1],
            ["N3", "C2", 1],
            ["C2", "N1", 1],
            ["N1", "C6", 1],
            ["C6", "C5", 2],
            ["C5", "C4", 1],
            ["C4", "O4", 2],
            ["C2", "O2", 2],
            ["N3", "H3", 1],
            ["C5", "CH3", 1],
        ],
    },
    // Adenine
    A: {
        link: "N9",
        ring: [
            ["C6", "N1", "C2", "N3", "C4", "C5"],
            ["C5", "N7", "C8", "N9", "C4"],
        ],
        atoms: {
            ...PUR_RING,
            N6: ["N", -1, 2 * S3],
            H6a: ["H", -2, 2 * S3],
            H6b: ["H", -0.5, 3 * S3],
        },
        bonds: [
            ["C6", "N1", 2],
            ["N1", "C2", 1],
            ["C2", "N3", 2],
            ["N3", "C4", 1],
            ["C4", "C5", 2],
            ["C5", "C6", 1],
            ["C5", "N7", 1],
            ["N7", "C8", 2],
            ["C8", "N9", 1],
            ["N9", "C4", 1],
            ["C6", "N6", 1],
            ["N6", "H6a", 1],
            ["N6", "H6b", 1],
        ],
    },
    // Guanine
    G: {
        link: "N9",
        ring: [
            ["C6", "N1", "C2", "N3", "C4", "C5"],
            ["C5", "N7", "C8", "N9", "C4"],
        ],
        atoms: {
            ...PUR_RING,
            O6: ["O", -1, 2 * S3],
            H1: ["H", -2, 0],
            N2: ["N", -1, -2 * S3],
            H2a: ["H", -2, -2 * S3],
            H2b: ["H", -0.5, -3 * S3],
        },
        bonds: [
            ["C6", "N1", 1],
            ["N1", "C2", 1],
            ["C2", "N3", 2],
            ["N3", "C4", 1],
            ["C4", "C5", 2],
            ["C5", "C6", 1],
            ["C5", "N7", 1],
            ["N7", "C8", 2],
            ["C8", "N9", 1],
            ["N9", "C4", 1],
            ["C6", "O6", 2],
            ["N1", "H1", 1],
            ["C2", "N2", 1],
            ["N2", "H2a", 1],
            ["N2", "H2b", 1],
        ],
    },
};
// Watson-Crick hydrogen bonds: 2 for A-T, 3 for G-C  [base, atom, base, atom]
const HBONDS = {
    AT: [
        ["pur", "N1", "pyr", "H3"],
        ["pur", "H6a", "pyr", "O4"],
    ],
    GC: [
        ["pur", "H1", "pyr", "N3"],
        ["pur", "H2a", "pyr", "O2"],
        ["pur", "O6", "pyr", "H4a"],
    ],
};

// Morph between the main helix and the ladder (App.jsx waits for this)
export const MORPH_MS = 1100;

// Change this number to get a different random arrangement of the main-helix nodes
const NODE_SEED = 7;

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = (t) =>
    t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

// Stages of the morph, all driven by one eased value m (0 = main helix, 1 = ladder)
const phaseUnwind = (m) => easeInOut(clamp01(m / 0.55)); // strands untwist into a ladder
const phaseCollapse = (m) => easeInOut(clamp01((m - 0.3) / 0.4)); // ladder pulls into the centre line
const phaseTrim = (m) => easeInOut(clamp01((m - 0.45) / 0.45)); // strand trims to the ladder length
const phaseSprout = (m) => clamp01((m - 0.55) / 0.45); // base pairs unfold
const phaseColor = (m) => easeInOut(clamp01((m - 0.25) / 0.5)); // blue -> red

// Small seeded random generator: random-looking, but identical on every visit
const mulberry32 = (a) => () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/* Everything is derived from the number of nodes n, so adding a project
   automatically adds a base pair and adjusts the length of the ladder.
   double = main DNA helix (scattered nodes on two strands)
   single = Projects ladder (one base pair per project, evenly spaced) */
const makeGeom = (n, seed, single) => {
    const height = single ? Math.max(HEIGHT, n * PAIR_STEP) : HEIGHT;
    const full = height + PAD * 2;
    const turns = single ? 0 : Math.max(1.8, n * 0.34);
    const rand = mulberry32(seed + n * 101);
    const ts = [];
    const base = [];
    const flips = [];
    for (let k = 0; k < n; k++) {
        if (single) {
            ts.push((k + 0.5) / n);
            base.push(0.4 + k * PAIR_TWIST); // depends only on k, so existing pairs stay put
            flips.push(0);
        } else {
            const t = (k + 0.5) / n + (rand() - 0.5) * (0.7 / n);
            ts.push(t);
            base.push(t * turns * TAU);
            flips.push(rand() < 0.5 ? 0 : Math.PI);
        }
    }
    return {
        n,
        height,
        full,
        turns,
        pairs: single ? 0 : Math.round((turns * 9 * full) / height),
        nodeBase: (k) => base[k], // angle without the strand flip
        nodeFlip: (k) => flips[k], // 0 = strand A, PI = strand B
        nodeAngle: (k) => base[k] + flips[k],
        nodeY: (k) => (0.5 - ts[k]) * height,
    };
};

const makeGlowTexture = () => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d");
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(255,255,255,1)");
    gr.addColorStop(0.35, "rgba(255,255,255,0.35)");
    gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
};

// Angle that turns a main-helix node at `angle` toward the viewer
const faceAngle = (cur, angle) => {
    const want = angle - Math.PI / 2;
    const diff = ((((want - cur + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
    return cur + diff;
};

// Angle that turns a ladder pair face-on to the viewer (either side works)
const facePair = (cur, theta) => {
    const d = theta - cur;
    return cur + (d - Math.round(d / Math.PI) * Math.PI);
};

/* ==================================================================
   THE HELIX
   One Three.js scene holds BOTH the main double helix and the Projects
   ladder. `view` ("main" | "projects") is the target; the scene morphs
   between the two. DOM tap areas / clouds belong to the target view.
   ================================================================== */

const Helix = forwardRef(function Helix(
    { mainItems, projectItems, view, onOpen, onFrontChange, activeId, paused },
    ref,
) {
    const stageRef = useRef(null);
    const mountRef = useRef(null);
    const hitRefs = useRef({});
    const cloudRefs = useRef({});
    const hoverRef = useRef(null);
    const pausedRef = useRef(paused);
    const activeRef = useRef(activeId);
    const frontCbRef = useRef(onFrontChange);
    const viewRef = useRef(view);
    const relayoutRef = useRef(null);
    const focusTarget = useRef(null);
    const holdUntil = useRef(0); // pause the idle spin after navigating to a node
    const mainRef = useRef(mainItems);
    const projRef = useRef(projectItems);
    const morph = useRef({
        v: view === "projects" ? 1 : 0,
        target: view === "projects" ? 1 : 0,
    });
    const GM = useMemo(
        () => makeGeom(mainItems.length, NODE_SEED, false),
        [mainItems.length],
    );
    const GP = useMemo(
        () => makeGeom(projectItems.length, NODE_SEED, true),
        [projectItems.length],
    );
    const st = useRef({
        angle: 0.6,
        vel: 0,
        tilt: 0,
        down: false,
        active: false,
        moved: false,
        x: 0,
        y: 0,
        sx: 0,
        sy: 0,
        justDragged: false,
    });
    const [noGL, setNoGL] = useState(false);

    pausedRef.current = paused;
    activeRef.current = activeId;
    frontCbRef.current = onFrontChange;
    viewRef.current = view;
    mainRef.current = mainItems;
    projRef.current = projectItems;

    // DOM (tap areas, labels, previews) belongs to the view we are heading to
    const items = view === "projects" ? projectItems : mainItems;

    // Start / reverse the morph whenever the target view changes
    useEffect(() => {
        morph.current.target = view === "projects" ? 1 : 0;
    }, [view]);

    useImperativeHandle(ref, () => ({
        // Rotates the helix so a given node (or ladder pair) faces the viewer
        focusItem(id) {
            const proj = viewRef.current === "projects";
            const list = proj ? projRef.current : mainRef.current;
            const G = proj ? GP : GM;
            const k = list.findIndex((i) => i.id === id);
            if (k < 0) return;
            focusTarget.current = proj
                ? facePair(st.current.angle, G.nodeAngle(k))
                : faceAngle(st.current.angle, G.nodeAngle(k));
            st.current.vel = 0;
            holdUntil.current = performance.now() + 3000;
        },
        // The tap target of a node (used as the zoom origin of its modal)
        nodeEl(id) {
            return hitRefs.current[id] || null;
        },
        // Re-measure the layout (App calls this after the intro text changes)
        relayout() {
            relayoutRef.current?.(true);
        },
    }));

    useEffect(() => {
        const mount = mountRef.current;
        const stage = stageRef.current;
        const reduce = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        ).matches;

        const mainL = mainItems;
        const projL = projectItems;
        const nM = mainL.length;
        const nP = projL.length;
        const NT = nM + nP;
        const all = [...mainL, ...projL];

        let renderer;
        try {
            renderer = new THREE.WebGLRenderer({
                antialias: true,
                alpha: true,
                powerPreference: "low-power",
            });
        } catch (e) {
            setNoGL(true);
            return;
        }
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
        renderer.setClearColor(0x000000, 0);
        mount.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        scene.fog = new THREE.Fog(0x0c1424, 11.5, 19);
        const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 80);
        camera.position.z = CAM_Z;

        const group = new THREE.Group();
        group.rotation.order = "ZXY";
        scene.add(group);

        /* ----- Materials (theme colours come from CSS variables) ----- */
        const matA = new THREE.MeshBasicMaterial({ color: 0x5b9bff });
        const matB = new THREE.MeshBasicMaterial({ color: 0x8a99b8 });
        const nodeMat = new THREE.MeshBasicMaterial({ color: 0x5b9bff });
        const nodeMatRed = new THREE.MeshBasicMaterial({ color: 0xff5a6e });
        const rungMat = new THREE.LineBasicMaterial({
            color: 0x5b9bff,
            transparent: true,
            opacity: 0.28,
        });
        const atomMat = new THREE.MeshBasicMaterial({ color: 0xffffff }); // tinted per atom
        const molBondMat = new THREE.MeshBasicMaterial({ color: 0xe4eaf7 });
        const hbMat = new THREE.LineDashedMaterial({
            color: 0xffffff,
            dashSize: 0.045,
            gapSize: 0.04,
            transparent: true,
            opacity: 0.9,
        });
        const fillMat = new THREE.MeshBasicMaterial({
            vertexColors: true,
            transparent: true,
            opacity: 0.45,
            side: THREE.DoubleSide,
            depthWrite: false,
        });
        const glowTex = makeGlowTexture();
        const glowOpts = {
            map: glowTex,
            transparent: true,
            opacity: 0.8,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        };
        const glowMat = new THREE.SpriteMaterial({
            ...glowOpts,
            color: 0x5b9bff,
        });
        const glowMatRed = new THREE.SpriteMaterial({
            ...glowOpts,
            color: 0xff5a6e,
        });
        const dustMat = new THREE.PointsMaterial({
            color: 0x5b9bff,
            size: 0.04,
            transparent: true,
            opacity: 0.5,
            depthWrite: false,
        });

        const geos = []; // everything to dispose on cleanup
        const ims = []; // instanced meshes to dispose on cleanup
        const dummy = new THREE.Object3D();
        const dummy2 = new THREE.Object3D();
        const yAxis = new THREE.Vector3(0, 1, 0);
        const dirV = new THREE.Vector3();

        /* ----- Main helix strands and base pairs. They are rebuilt from maths on
                 every frame of the morph, so they can untwist, collapse and trim. ----- */
        const chainExtent = nP > 0 ? GP.height / 2 + 0.2 : 0;
        const strandLen = Math.max(GM.full, chainExtent * 2 + 4);
        const twistRate = (GM.turns * TAU) / GM.height;
        const arcLen =
            strandLen * Math.sqrt(1 + Math.pow(RADIUS * twistRate, 2));
        const BEADS = Math.ceil(arcLen / 0.052); // dense enough to read as a smooth tube

        const strandBeadGeo = new THREE.SphereGeometry(0.038, 6, 4);
        const pairBeadGeo = new THREE.SphereGeometry(0.055, 8, 6);
        geos.push(strandBeadGeo, pairBeadGeo);

        const strandA = new THREE.InstancedMesh(strandBeadGeo, matA, BEADS);
        const strandB = new THREE.InstancedMesh(strandBeadGeo, matB, BEADS);
        const pairsN = GM.pairs;
        const pairA = new THREE.InstancedMesh(pairBeadGeo, matA, pairsN);
        const pairB = new THREE.InstancedMesh(pairBeadGeo, matB, pairsN);
        const rungArr = new Float32Array(pairsN * 6);
        const rungAttr = new THREE.BufferAttribute(rungArr, 3);
        const rungGeo = new THREE.BufferGeometry();
        rungGeo.setAttribute("position", rungAttr);
        geos.push(rungGeo);
        const rungs = new THREE.LineSegments(rungGeo, rungMat);
        [strandA, strandB, pairA, pairB].forEach((im) => {
            im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
            im.frustumCulled = false;
            ims.push(im);
        });
        rungAttr.setUsage(THREE.DynamicDrawUsage);
        rungs.frustumCulled = false;
        group.add(strandA, strandB, pairA, pairB, rungs);

        const setBead = (mesh, i, x, y, z, s) => {
            dummy.position.set(x, y, z);
            dummy.scale.setScalar(Math.max(s, 0.0001));
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
        };

        let capped = false; // upright phone: trim the main helix to the node area
        const updateStructure = (u, c, ext, fade) => {
            const tw = 1 - u; // 1 = fully twisted, 0 = flat ladder
            const rEff = RADIUS * (1 - c); // 0 = collapsed onto the axis
            const twist = GM.turns * TAU;

            for (let i = 0; i < BEADS; i++) {
                const y = (0.5 - (i + 0.5) / BEADS) * strandLen;
                const th = (0.5 - y / GM.height) * twist * tw;
                const edge = clamp01((ext - Math.abs(y)) / 0.5) * fade; // tapered ends
                setBead(
                    strandA,
                    i,
                    Math.cos(th) * rEff,
                    y,
                    Math.sin(th) * rEff,
                    edge,
                );
                setBead(
                    strandB,
                    i,
                    Math.cos(th + Math.PI) * rEff,
                    y,
                    Math.sin(th + Math.PI) * rEff,
                    edge * (1 - c),
                );
            }
            strandA.instanceMatrix.needsUpdate = true;
            strandB.instanceMatrix.needsUpdate = true;

            for (let j = 0; j < pairsN; j++) {
                const y = (0.5 - (j + 0.5) / pairsN) * GM.full;
                const th = (0.5 - y / GM.height) * twist * tw;
                const edge = clamp01((ext - Math.abs(y)) / 0.5) * fade;
                const ax = Math.cos(th) * rEff * edge;
                const az = Math.sin(th) * rEff * edge;
                const s = (1 - c) * edge;
                setBead(pairA, j, ax, y, az, s);
                setBead(pairB, j, -ax, y, -az, s);
                rungArr[j * 6] = ax;
                rungArr[j * 6 + 1] = y;
                rungArr[j * 6 + 2] = az;
                rungArr[j * 6 + 3] = -ax;
                rungArr[j * 6 + 4] = y;
                rungArr[j * 6 + 5] = -az;
            }
            pairA.instanceMatrix.needsUpdate = true;
            pairB.instanceMatrix.needsUpdate = true;
            rungAttr.needsUpdate = true;
            rungMat.opacity = 0.28 * (1 - c) * fade;
        };

        /* ----- One base pair, drawn as real skeletal structures (see MODELS) ----- */
        const nodeGeo = new THREE.SphereGeometry(0.15, 16, 16);
        const atomGeo = new THREE.SphereGeometry(1, 10, 8); // unit sphere, scaled per atom
        const molBondGeo = new THREE.CylinderGeometry(0.012, 0.012, 1, 6);
        const backGeo = new THREE.CylinderGeometry(0.035, 0.035, 1, 6);
        const phosGeo = new THREE.SphereGeometry(0.095, 10, 8);
        geos.push(nodeGeo, atomGeo, molBondGeo, backGeo, phosGeo);

        const fillColor = new THREE.Color();

        const buildPair = (k) => {
            const g = new THREE.Group();
            const pat = PAIR_PATTERN[k % PAIR_PATTERN.length];
            const sd = pat.purSide; // mirrors the whole pair when the purine is on the other side
            const pyrM = MODELS[pat.pyr];
            const purM = MODELS[pat.pur];
            const atoms = [];
            const segs = []; // bond segments [x1, y1, x2, y2]
            const pos = { pyr: {}, pur: {} };

            // single bonds are one line, double bonds two parallel lines
            const bondSeg = (p, q, order) => {
                if (order === 2) {
                    const dx = q.x - p.x;
                    const dy = q.y - p.y;
                    const len = Math.hypot(dx, dy) || 1;
                    const ox = (-dy / len) * 0.017;
                    const oy = (dx / len) * 0.017;
                    segs.push([p.x + ox, p.y + oy, q.x + ox, q.y + oy]);
                    segs.push([p.x - ox, p.y - oy, q.x - ox, q.y - oy]);
                } else {
                    segs.push([p.x, p.y, q.x, q.y]);
                }
            };

            const place = (model, cx, key) => {
                Object.entries(model.atoms).forEach(([id, [el, x, y]]) => {
                    const P = { x: (cx + x) * sd * B, y: y * B, el };
                    pos[key][id] = P;
                    atoms.push(P);
                });
                model.bonds.forEach(([a, b, o]) =>
                    bondSeg(pos[key][a], pos[key][b], o),
                );
            };
            place(pyrM, PYR_CX, "pyr");
            place(purM, PUR_CX, "pur");

            // deoxyribose rings on both backbones, bonded to the base's nitrogen
            [
                ["pyr", -sd],
                ["pur", sd],
            ].forEach(([key, side]) => {
                const cxs = side * SUG_X;
                const verts = [];
                for (let i = 0; i < 5; i++) {
                    const a = Math.PI / 2 + (i * TAU) / 5;
                    const P = {
                        x: cxs + Math.cos(a) * SUG_R * B,
                        y: SUG_Y + Math.sin(a) * SUG_R * B,
                        el: i === 0 ? "O" : "C", // the ring oxygen sits on top
                    };
                    verts.push(P);
                    atoms.push(P);
                }
                for (let i = 0; i < 5; i++)
                    bondSeg(verts[i], verts[(i + 1) % 5], 1);
                const N = pos[key][(key === "pyr" ? pyrM : purM).link];
                let best = verts[1];
                let bd = Infinity;
                for (let i = 1; i < 5; i++) {
                    const d = Math.hypot(verts[i].x - N.x, verts[i].y - N.y);
                    if (d < bd) {
                        bd = d;
                        best = verts[i];
                    }
                }
                bondSeg(N, best, 1);
            });

            // translucent ring tints (thymine yellow, adenine pink, guanine blue, cytosine green)
            const fp = [];
            const fc = [];
            const addFill = (key, ids, hex) => {
                const pts = ids.map((id) => pos[key][id]);
                const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
                const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
                fillColor.set(hex);
                for (let i = 0; i < pts.length; i++) {
                    const p = pts[i];
                    const q = pts[(i + 1) % pts.length];
                    fp.push(cx, cy, -0.012, p.x, p.y, -0.012, q.x, q.y, -0.012);
                    for (let t = 0; t < 3; t++)
                        fc.push(fillColor.r, fillColor.g, fillColor.b);
                }
            };
            addFill("pyr", pyrM.ring[0], BASE_COLORS[pat.pyr]);
            purM.ring.forEach((r) => addFill("pur", r, BASE_COLORS[pat.pur]));
            const fillGeo = new THREE.BufferGeometry();
            fillGeo.setAttribute(
                "position",
                new THREE.Float32BufferAttribute(fp, 3),
            );
            fillGeo.setAttribute(
                "color",
                new THREE.Float32BufferAttribute(fc, 3),
            );
            geos.push(fillGeo);
            const fill = new THREE.Mesh(fillGeo, fillMat);
            fill.renderOrder = -1;
            g.add(fill);

            // atoms (instanced, one draw call)
            const atomIM = new THREE.InstancedMesh(
                atomGeo,
                atomMat,
                atoms.length,
            );
            atoms.forEach((a, i) => {
                dummy.position.set(a.x, a.y, 0);
                dummy.scale.setScalar(ATOM_R[a.el]);
                dummy.updateMatrix();
                atomIM.setMatrixAt(i, dummy.matrix);
                atomIM.setColorAt(i, ATOM_COL[a.el]);
            });
            atomIM.instanceMatrix.needsUpdate = true;
            if (atomIM.instanceColor) atomIM.instanceColor.needsUpdate = true;
            atomIM.frustumCulled = false;
            ims.push(atomIM);
            g.add(atomIM);

            // bonds (instanced, one draw call)
            const bondIM = new THREE.InstancedMesh(
                molBondGeo,
                molBondMat,
                segs.length,
            );
            segs.forEach(([x1, y1, x2, y2], i) => {
                dirV.set(x2 - x1, y2 - y1, 0);
                const len = dirV.length() || 1e-4;
                dummy2.position.set((x1 + x2) / 2, (y1 + y2) / 2, 0);
                dummy2.quaternion.setFromUnitVectors(
                    yAxis,
                    dirV.multiplyScalar(1 / len),
                );
                dummy2.scale.set(1, len, 1);
                dummy2.updateMatrix();
                bondIM.setMatrixAt(i, dummy2.matrix);
            });
            bondIM.instanceMatrix.needsUpdate = true;
            bondIM.frustumCulled = false;
            ims.push(bondIM);
            g.add(bondIM);

            // dotted hydrogen bonds between the real donor and acceptor atoms
            const hp = [];
            HBONDS[pat.pur + pat.pyr].forEach(([k1, a1, k2, a2]) => {
                const p = pos[k1][a1];
                const q = pos[k2][a2];
                hp.push(p.x, p.y, 0, q.x, q.y, 0);
            });
            const hg = new THREE.BufferGeometry();
            hg.setAttribute(
                "position",
                new THREE.Float32BufferAttribute(hp, 3),
            );
            geos.push(hg);
            const hb = new THREE.LineSegments(hg, hbMat);
            hb.computeLineDistances();
            g.add(hb);
            return g;
        };

        /* ----- Content nodes: main ones first, then the project base pairs ----- */
        const nodePos = all.map(() => new THREE.Vector3());
        const nodeObjs = []; // main: sphere, projects: the base-pair group
        const nodeGlows = [];
        const yMain = mainL.map((_, k) => GM.nodeY(k));
        const yProj = projL.map((_, k) => GP.nodeY(k));
        const pairGroups = [];

        all.forEach((it, i) => {
            let obj;
            if (i >= nM) {
                const k = i - nM;
                obj = buildPair(k);
                obj.visible = false;
                pairGroups.push(obj);
                nodePos[i].set(0, yProj[k], 0); // the tap target sits at the centre of the pair
            } else {
                obj = new THREE.Mesh(
                    nodeGeo,
                    it.tint === "red" ? nodeMatRed : nodeMat,
                );
            }
            group.add(obj);
            nodeObjs.push(obj);

            const glow = new THREE.Sprite(
                it.tint === "red" ? glowMatRed : glowMat,
            );
            glow.scale.setScalar(0.8);
            group.add(glow);
            nodeGlows.push(glow);
        });

        const spanOf = (ys) => Math.max(Math.max(...ys) - Math.min(...ys), 3);
        const midOf = (ys) => (Math.max(...ys) + Math.min(...ys)) / 2;
        const mainSpan = spanOf(yMain);
        const mainMid = midOf(yMain);

        /* ----- The ladder's two sugar-phosphate backbones: phosphates and bonds that
                 follow the sugars, so they zigzag sugar - phosphate - sugar ----- */
        const sproutArr = projL.map(() => 0);
        const phosA = new THREE.InstancedMesh(phosGeo, matA, nP + 1);
        const phosB = new THREE.InstancedMesh(phosGeo, matB, nP + 1);
        const bondsA = new THREE.InstancedMesh(
            backGeo,
            matA,
            Math.max(1, 2 * nP),
        );
        const bondsB = new THREE.InstancedMesh(
            backGeo,
            matB,
            Math.max(1, 2 * nP),
        );
        [phosA, phosB, bondsA, bondsB].forEach((im) => {
            im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
            im.frustumCulled = false;
            im.visible = false;
            ims.push(im);
            group.add(im);
        });
        const chainN = 2 * nP + 1; // nodes along a backbone: phosphate, sugar, phosphate, ...
        const poolA = Array.from({ length: chainN }, () => new THREE.Vector3());
        const poolB = Array.from({ length: chainN }, () => new THREE.Vector3());
        const spAt = new Array(chainN).fill(0);
        const yTop0 = nP > 0 ? GP.nodeY(0) : 0;
        const ySt = nP > 0 ? GP.height / nP : 1;
        const th0 = nP > 0 ? GP.nodeAngle(0) : 0;
        const SUG_TRIM = SUG_R * B; // bonds stop at the edge of a sugar ring, not its centre

        const chainPoint = (sign, u, out) => {
            const uc = u < 0 ? 0 : u > nP - 1 ? nP - 1 : u;
            const i0 = Math.floor(uc);
            const i1 = i0 + 1 < nP ? i0 + 1 : i0;
            const sp = lerp(sproutArr[i0], sproutArr[i1], uc - i0);
            const th = th0 + u * PAIR_TWIST + (1 - sp) * 0.9;
            const r = sign * SUG_X * sp;
            out.set(
                r * Math.cos(th),
                yTop0 - u * ySt + SUG_Y * clamp01(sp * 3),
                r * Math.sin(th),
            );
            return sp;
        };

        const setBond = (mesh, idx, a, b, thick, trimA, trimB) => {
            dirV.subVectors(b, a);
            const len = dirV.length();
            if (len > 1e-6) dirV.multiplyScalar(1 / len);
            const t0 = Math.min(trimA, len * 0.45);
            const t1 = Math.min(trimB, len * 0.45);
            const l2 = Math.max(len - t0 - t1, 1e-4);
            const mid = t0 + l2 / 2;
            dummy2.position.set(
                a.x + dirV.x * mid,
                a.y + dirV.y * mid,
                a.z + dirV.z * mid,
            );
            if (len > 1e-6) dummy2.quaternion.setFromUnitVectors(yAxis, dirV);
            dummy2.scale.set(Math.max(thick, 1e-4), l2, Math.max(thick, 1e-4));
            dummy2.updateMatrix();
            mesh.setMatrixAt(idx, dummy2.matrix);
        };

        const strandUpdate = (sign, pool, phos, bonds) => {
            for (let t = 0; t < chainN; t++) {
                spAt[t] = chainPoint(sign, -0.5 + 0.5 * t, pool[t]);
                if (t % 2 === 0) {
                    setBead(
                        phos,
                        t / 2,
                        pool[t].x,
                        pool[t].y,
                        pool[t].z,
                        clamp01(spAt[t] * 3),
                    );
                }
            }
            for (let j = 0; j < chainN - 1; j++) {
                const ga = clamp01(spAt[j] * 3);
                const gb = clamp01(spAt[j + 1] * 3);
                setBond(
                    bonds,
                    j,
                    pool[j],
                    pool[j + 1],
                    Math.min(ga, gb),
                    j % 2 === 1 ? SUG_TRIM * ga : 0, // odd nodes are sugars
                    (j + 1) % 2 === 1 ? SUG_TRIM * gb : 0,
                );
            }
        };

        // Unfold the pairs one after another and keep the backbones attached
        const updateLadder = (sbv) => {
            if (nP === 0) return;
            for (let k = 0; k < nP; k++) {
                sproutArr[k] = easeOut(
                    clamp01(sbv * 1.7 - 0.7 * (nP > 1 ? k / (nP - 1) : 0)),
                );
            }
            for (let k = 0; k < nP; k++) {
                const sp = sproutArr[k];
                const gk = Math.max(clamp01(sp * 3), 1e-4);
                const pg = pairGroups[k];
                pg.visible = sp > 0.001;
                pg.position.set(0, yProj[k], 0);
                pg.rotation.y = -(GP.nodeAngle(k) + (1 - sp) * 0.9);
                pg.scale.set(Math.max(sp, 1e-4), gk, gk);
            }
            strandUpdate(1, poolA, phosA, bondsA);
            strandUpdate(-1, poolB, phosB, bondsB);
            const vis = sbv > 0.001;
            [phosA, phosB, bondsA, bondsB].forEach((im) => {
                im.visible = vis;
                im.instanceMatrix.needsUpdate = true;
            });
        };

        /* ----- A little drifting dust ----- */
        const dustCount = 70;
        const dustPos = new Float32Array(dustCount * 3);
        for (let i = 0; i < dustCount; i++) {
            dustPos[i * 3] = (Math.random() - 0.5) * 9;
            dustPos[i * 3 + 1] = (Math.random() - 0.5) * 11;
            dustPos[i * 3 + 2] = (Math.random() - 0.5) * 7;
        }
        const dustGeo = new THREE.BufferGeometry();
        dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
        geos.push(dustGeo);
        const dust = new THREE.Points(dustGeo, dustMat);
        scene.add(dust);

        /* ----- Colours: blue (theme accent) blends to red as the morph runs ----- */
        const blue = new THREE.Color();
        const redC = new THREE.Color();
        const mixC = new THREE.Color();
        let mixNow = view === "projects" ? 1 : 0;
        let mixApplied = -1;

        const setMix = (mix) => {
            mixApplied = mix;
            mixC.copy(blue).lerp(redC, mix);
            matA.color.copy(mixC);
            nodeMat.color.copy(mixC);
            rungMat.color.copy(mixC);
            glowMat.color.copy(mixC);
            dustMat.color.copy(mixC);
        };

        const applyTheme = () => {
            const cs = getComputedStyle(document.documentElement);
            blue.set(cs.getPropertyValue("--accent").trim());
            redC.set(cs.getPropertyValue("--red").trim());
            const main = cs.getPropertyValue("--text-main").trim();
            matB.color.set(cs.getPropertyValue("--text-muted").trim());
            molBondMat.color.set(main);
            hbMat.color.set(main);
            nodeMatRed.color.copy(redC);
            glowMatRed.color.copy(redC);
            scene.fog.color.set(cs.getPropertyValue("--bg-color").trim());
            // Additive glow disappears on a light background, so use normal blending there
            const additive =
                cs.getPropertyValue("--glow-additive").trim() !== "0";
            [glowMat, glowMatRed].forEach((m) => {
                m.blending = additive
                    ? THREE.AdditiveBlending
                    : THREE.NormalBlending;
                m.needsUpdate = true;
            });
            setMix(mixNow);
        };
        applyTheme();
        const themeObserver = new MutationObserver(applyTheme);
        themeObserver.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["data-theme"],
        });

        /* ----- Layout: a framing for each view, blended during the morph ----- */
        let W = 0;
        let H = 0;
        let dirty = true; // strand maths need re-running
        const introBottoms = {};
        const L = {
            main: { fit: 1, y: 0, topLimit: 76 },
            proj: { fit: 1, y: 0, topLimit: 76 },
            x: 0,
        };
        const cur = { s: 1, y: 0, init: false };

        const layout = (force) => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            if (!force && w === W && Math.abs(h - H) < 120) return;
            W = w;
            H = h;
            renderer.setSize(w, h, false);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();

            const wpp = (2 * Math.tan((FOV * Math.PI) / 360) * CAM_Z) / h; // world per pixel
            const mobile = w < 700;
            const ratio = w / h;
            // Unfolded foldables have roughly square screens
            const foldable =
                w >= 500 && w <= 1100 && ratio >= 0.72 && ratio <= 1.4;
            const portraitPhone = mobile && h > w;

            if (capped !== portraitPhone) {
                capped = portraitPhone; // trim the main helix on an upright phone
                dirty = true;
            }

            // Measure the real intro text (per view) so the helix never runs into it
            const introEl = document.querySelector(".intro");
            if (introEl) {
                introBottoms[introEl.dataset.view || "main"] =
                    introEl.getBoundingClientRect().bottom;
            }

            const widthPx = mobile
                ? w * 0.62
                : Math.min(w * (foldable ? 0.42 : 0.38), 600);
            const frameFor = (v) => {
                const isProj = v === "projects";
                const top = mobile
                    ? Math.max(
                          foldable ? 150 : 170,
                          (introBottoms[v] ?? (isProj ? 158 : 206)) + 36,
                      )
                    : foldable
                      ? 88
                      : 100;
                const bottom = mobile ? 64 : foldable ? 64 : 80;
                const regionH = Math.max(240, h - top - bottom);

                let span;
                let mid = 0;
                let fitR = RADIUS;
                if (isProj) {
                    // the ladder is finite: fit all of it
                    span = GP.height + 0.6;
                    fitR = SUG_X + SUG_R * B + 0.1;
                } else if (portraitPhone) {
                    span = GM.height; // trimmed main helix
                } else {
                    span = mainSpan; // nodes fill the screen, strand ends run off
                    mid = mainMid;
                }
                const fit =
                    Math.min(
                        1.6,
                        (regionH * wpp) / span,
                        (widthPx * wpp) / (2 * fitR),
                    ) * (foldable && !portraitPhone ? FOLD_ZOOM : 1);
                const cyPx = top + regionH / 2;
                return {
                    fit,
                    y: (h / 2 - cyPx) * wpp - mid * fit,
                    topLimit: mobile ? top - 8 : 76,
                };
            };

            L.main = frameFor("main");
            L.proj = nP > 0 ? frameFor("projects") : L.main;
            L.x = ((mobile ? w / 2 : w * 0.6) - w / 2) * wpp;
        };
        layout(true);
        relayoutRef.current = layout;
        const onResize = () => layout(false);
        window.addEventListener("resize", onResize);

        /* ----- Wheel and arrow keys spin the helix ----- */
        const isSettled = () =>
            Math.abs(morph.current.v - morph.current.target) < 0.0005;
        const onWheel = (e) => {
            if (pausedRef.current || !isSettled()) return;
            const s = st.current;
            s.vel = Math.max(
                -0.2,
                Math.min(0.2, s.vel + (e.deltaY + e.deltaX) * 0.0004),
            );
        };
        const onKey = (e) => {
            if (pausedRef.current || !isSettled()) return;
            if (e.key === "ArrowLeft") st.current.vel -= 0.04;
            if (e.key === "ArrowRight") st.current.vel += 0.04;
        };
        stage.addEventListener("wheel", onWheel, { passive: true });
        window.addEventListener("keydown", onKey);

        /* ----- Render loop ----- */
        const tmp = new THREE.Vector3();
        const proj = new THREE.Vector3();
        const hotAmt = all.map(() => 0);
        const frontVals = all.map(() => 0);
        const screenX = all.map(() => 0);
        const screenY = all.map(() => 0);
        const expandedState = all.map(() => false);
        const belowState = all.map(() => false);
        let lastFrontId = null;
        let settledState = true;
        let lastM = -1;
        let idle = 0.22;
        let spinDust = 0;
        let last = performance.now();
        let raf;

        const tick = (now) => {
            raf = requestAnimationFrame(tick);
            const dt = Math.min((now - last) / 1000, 0.05);
            last = now;
            if (pausedRef.current) return;

            /* --- morph progress --- */
            const mo = morph.current;
            const step = dt / (reduce ? 0.01 : MORPH_MS / 1000);
            if (mo.v < mo.target) mo.v = Math.min(mo.target, mo.v + step);
            else if (mo.v > mo.target) mo.v = Math.max(mo.target, mo.v - step);
            const settled = isSettled();
            if (settled !== settledState) {
                settledState = settled;
                stage.classList.toggle("diving", !settled); // hides labels + taps while morphing
                if (!settled) lastFrontId = null;
            }
            const m = easeInOut(mo.v);

            const u = phaseUnwind(m);
            const c = phaseCollapse(m);
            const sb = phaseSprout(m);

            if (m !== lastM || dirty) {
                const extMain = capped
                    ? GM.height / 2 + 0.25
                    : strandLen / 2 + 1;
                const extProj = nP > 0 ? chainExtent : extMain;
                // the main helix's collapsed strand fades away as the ladder unfolds
                updateStructure(
                    u,
                    c,
                    lerp(extMain, extProj, phaseTrim(m)),
                    1 - clamp01(sb * 2.5),
                );
                updateLadder(sb);
                lastM = m;
                dirty = false;
            }

            mixNow = phaseColor(m);
            if (Math.abs(mixNow - mixApplied) > 0.002) setMix(mixNow);

            /* --- spin --- */
            const s = st.current;
            const idleTarget =
                reduce || !settled || now < holdUntil.current
                    ? 0
                    : hoverRef.current
                      ? 0.03
                      : 0.22;
            idle += (idleTarget - idle) * Math.min(1, dt * 4);

            if (!s.active) {
                s.angle += s.vel;
                s.vel *= 0.95;
                if (Math.abs(s.vel) < 1e-4) s.vel = 0;
                s.tilt += (0 - s.tilt) * Math.min(1, dt * 2);
            }
            s.angle += idle * dt;

            if (focusTarget.current !== null) {
                const diff = focusTarget.current - s.angle;
                s.angle += diff * Math.min(1, dt * 6);
                if (Math.abs(diff) < 0.01) focusTarget.current = null;
            }

            /* --- framing: blend between the two layouts, then glide --- */
            const tS = lerp(L.main.fit, L.proj.fit, m);
            const tY = lerp(L.main.y, L.proj.y, m);
            if (!cur.init) {
                cur.s = tS;
                cur.y = tY;
                cur.init = true;
            } else {
                const k = Math.min(1, dt * 14);
                cur.s += (tS - cur.s) * k;
                cur.y += (tY - cur.y) * k;
            }
            group.scale.setScalar(cur.s);
            group.position.set(L.x, cur.y, 0);
            dust.scale.setScalar(cur.s);
            dust.position.copy(group.position);

            // a little extra twist while the structure reshapes
            const rotY = s.angle + Math.sin(Math.PI * m) * 0.7;
            group.rotation.set(s.tilt, rotY, 0.14);
            spinDust += dt * 0.02;
            dust.rotation.y = spinDust;
            group.updateMatrixWorld(true);

            /* --- node glows, and where the main nodes are --- */
            const wMain = 1 - clamp01(c / 0.85); // main nodes melt into the centre line
            for (let i = 0; i < NT; i++) {
                const it = all[i];
                const hot =
                    hoverRef.current === it.id || activeRef.current === it.id;
                hotAmt[i] += ((hot ? 1 : 0) - hotAmt[i]) * Math.min(1, dt * 10);
                const hA = hotAmt[i];
                let w;

                if (i < nM) {
                    const ang = GM.nodeBase(i) * (1 - u) + GM.nodeFlip(i);
                    const r = RADIUS * (1 - c);
                    nodePos[i].set(
                        Math.cos(ang) * r,
                        yMain[i],
                        Math.sin(ang) * r,
                    );
                    nodeObjs[i].position.copy(nodePos[i]);
                    w = wMain;
                    nodeObjs[i].scale.setScalar(
                        Math.max(w, 0.0001) * (1 + 0.7 * hA),
                    );
                    nodeObjs[i].visible = w > 0.01;
                } else {
                    w = clamp01(sproutArr[i - nM] * 3); // pair groups are positioned in updateLadder
                }
                nodeGlows[i].visible = w > 0.01;
                nodeGlows[i].position.copy(nodePos[i]);
                nodeGlows[i].scale.setScalar(
                    Math.max(w, 0.0001) * (0.8 + 0.9 * hA),
                );
            }

            /* --- DOM: tap areas, labels and previews of the active view --- */
            const toProjects = mo.target === 1;
            const from = toProjects ? nM : 0;
            const to = toProjects ? NT : nM;
            const topLimit = (toProjects ? L.proj : L.main).topLimit;

            let frontIdx = -1;
            let frontMax = 0.85;
            for (let i = from; i < to; i++) {
                tmp.copy(nodePos[i]).applyMatrix4(group.matrixWorld);
                let front;
                if (i < nM) {
                    front =
                        THREE.MathUtils.clamp(
                            (tmp.z - group.position.z) / (RADIUS * cur.s),
                            -1,
                            1,
                        ) *
                            0.5 +
                        0.5;
                } else {
                    // a ladder pair is "in front" when it faces the screen head-on
                    const k = i - nM;
                    front = Math.abs(
                        Math.cos(
                            rotY - (GP.nodeAngle(k) + (1 - sproutArr[k]) * 0.9),
                        ),
                    );
                }
                frontVals[i] = front;
                if (front > frontMax) {
                    frontMax = front;
                    frontIdx = i;
                }
                proj.copy(tmp).project(camera);
                screenX[i] = (proj.x * 0.5 + 0.5) * W;
                screenY[i] = (-proj.y * 0.5 + 0.5) * H;
            }

            // Tell the quick-navigation list which node is in front
            if (settled && frontIdx >= 0 && all[frontIdx].id !== lastFrontId) {
                lastFrontId = all[frontIdx].id;
                frontCbRef.current?.(lastFrontId);
            }

            for (let i = from; i < to; i++) {
                const it = all[i];
                const sx = screenX[i];
                const sy = screenY[i];
                const hot =
                    hoverRef.current === it.id || activeRef.current === it.id;

                const hit = hitRefs.current[it.id];
                if (hit) {
                    hit.style.transform = `translate3d(${sx}px,${sy}px,0) translate(-50%,-50%)`;
                }

                const cloud = cloudRefs.current[it.id];
                if (cloud) {
                    // The project in front of the screen shows a small floating preview;
                    // hovering (or keyboard-focusing) any project shows its preview too.
                    const expanded =
                        !!it.image &&
                        (hot || (i === frontIdx && !hoverRef.current));
                    if (expandedState[i] !== expanded) {
                        expandedState[i] = expanded;
                        cloud.classList.toggle("expanded", expanded);
                        cloud.style.zIndex = expanded ? 3 : 1;
                    }
                    // A preview that would poke into the intro text opens below its node
                    const below = expanded && sy - 24 - 104 < topLimit;
                    if (belowState[i] !== below) {
                        belowState[i] = below;
                        cloud.classList.toggle("below", below);
                    }
                    const vis =
                        hot || expanded
                            ? 1
                            : clamp01((frontVals[i] - 0.55) / 0.35);
                    const half = expanded ? 72 : 60;
                    const cx = Math.max(half, Math.min(W - half, sx));
                    cloud.style.opacity = vis;
                    cloud.style.transform = below
                        ? `translate3d(${cx}px,${sy + 26}px,0) translate(-50%,0)`
                        : `translate3d(${cx}px,${Math.max(sy - 24 - hotAmt[i] * 4, 98)}px,0) translate(-50%,-100%)`;
                }
            }

            renderer.render(scene, camera);
        };
        raf = requestAnimationFrame(tick);

        return () => {
            cancelAnimationFrame(raf);
            relayoutRef.current = null;
            window.removeEventListener("resize", onResize);
            window.removeEventListener("keydown", onKey);
            stage.removeEventListener("wheel", onWheel);
            themeObserver.disconnect();
            geos.forEach((g) => g.dispose());
            [
                matA,
                matB,
                nodeMat,
                nodeMatRed,
                rungMat,
                atomMat,
                molBondMat,
                hbMat,
                fillMat,
                glowMat,
                glowMatRed,
                dustMat,
            ].forEach((m) => m.dispose());
            ims.forEach((im) => im.dispose());
            glowTex.dispose();
            renderer.dispose();
            renderer.forceContextLoss();
            if (renderer.domElement.parentNode === mount) {
                mount.removeChild(renderer.domElement);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* ----- Drag to spin (horizontal) and lean (vertical). Taps still reach the nodes. ----- */
    const onPointerDown = (e) => {
        const s = st.current;
        s.down = true;
        s.active = false;
        s.moved = false;
        s.x = s.sx = e.clientX;
        s.y = s.sy = e.clientY;
        s.vel = 0;
        focusTarget.current = null;
    };
    const onPointerMove = (e) => {
        const s = st.current;
        if (!s.down) return;
        if (!s.moved) {
            if (Math.hypot(e.clientX - s.sx, e.clientY - s.sy) < 6) return;
            s.moved = true;
            s.active = true;
            e.currentTarget.setPointerCapture?.(e.pointerId);
            s.x = e.clientX;
            s.y = e.clientY;
            return;
        }
        const dx = e.clientX - s.x;
        const dy = e.clientY - s.y;
        s.x = e.clientX;
        s.y = e.clientY;
        s.angle += dx * 0.011;
        s.vel = dx * 0.011;
        s.tilt = Math.max(-0.6, Math.min(0.6, s.tilt + dy * 0.004));
    };
    const endDrag = () => {
        const s = st.current;
        if (s.moved) {
            s.justDragged = true;
            setTimeout(() => (s.justDragged = false), 0);
        }
        s.down = false;
        s.active = false;
    };
    // A drag must never count as a click on a node
    const onClickCapture = (e) => {
        if (st.current.justDragged) {
            e.stopPropagation();
            e.preventDefault();
        }
    };

    return (
        <div
            ref={stageRef}
            className="stage"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onClickCapture={onClickCapture}
        >
            <div ref={mountRef} className="three-mount" aria-hidden="true" />

            {noGL ? (
                <div className="fallback">
                    {items.map((item) => (
                        <button
                            key={item.id}
                            className="btn btn-ghost"
                            onClick={(e) => onOpen(item.id, e.currentTarget)}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            ) : (
                items.map((item) => (
                    <React.Fragment key={item.id}>
                        <div
                            className={`cloud ${item.tint ? `tint-${item.tint}` : ""}`}
                            ref={(el) => (cloudRefs.current[item.id] = el)}
                            aria-hidden="true"
                        >
                            {item.image && (
                                <img
                                    className="cloud-preview"
                                    src={item.image}
                                    alt=""
                                    draggable="false"
                                />
                            )}
                            <span className="cloud-text">{item.label}</span>
                        </div>
                        <button
                            type="button"
                            className="node-hit"
                            aria-label={`Open ${item.label}`}
                            ref={(el) => (hitRefs.current[item.id] = el)}
                            onClick={(e) => onOpen(item.id, e.currentTarget)}
                            onMouseEnter={() => (hoverRef.current = item.id)}
                            onMouseLeave={() => {
                                if (hoverRef.current === item.id)
                                    hoverRef.current = null;
                            }}
                            onFocus={(e) => {
                                hoverRef.current = item.id;
                                if (e.currentTarget.matches(":focus-visible")) {
                                    ref?.current?.focusItem(item.id);
                                }
                            }}
                            onBlur={() => {
                                if (hoverRef.current === item.id)
                                    hoverRef.current = null;
                            }}
                        />
                    </React.Fragment>
                ))
            )}
        </div>
    );
});

export default Helix;
