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
   HELIX GEOMETRY (world units)
   ================================================================== */

const TAU = Math.PI * 2;
const RADIUS = 1.9;
const HEIGHT = 9; // height of the node area
const PAD = 6; // extra strand above and below the main helix (no extra nodes)
const FOV = 40;
const CAM_Z = 14;
const FOLD_ZOOM = 1.12; // extra zoom on foldable-sized screens (1 = none)

// Projects chain
const TAIL = 0.9; // how far the backbone runs past the first / last nucleotide
const NUC_REACH = 1.2; // distance from the backbone to the centre of a nucleotide's base

// Zoom transition (App.jsx waits for these same durations)
export const DIVE_MS = 560; // flying into the Projects node
export const ARRIVE_MS = 620; // pulling back out inside it
const STOP = 0.42; // how close the camera gets to the node (smaller = deeper zoom)
const easeInOut = (t) =>
    t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

// Change this number to get a different random arrangement of the nodes
const NODE_SEED = 7;

// Small seeded random generator: random-looking, but identical on every visit
const mulberry32 = (a) => () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/* Everything is derived from the number of nodes n, so adding a project
   automatically adjusts spacing, chain length and nucleotide size.
   double = main DNA helix (scattered nodes on two strands)
   single = Projects chain (evenly spaced nucleotides on a straight backbone,
            each one pointing in its own random direction) */
const makeGeom = (n, seed, single) => {
    const height = single ? Math.max(HEIGHT, n * 1.2) : HEIGHT;
    const full = height + PAD * 2;
    const turns = single ? 0 : Math.max(1.8, n * 0.34);
    const rand = mulberry32(seed + n * 101);
    const ts = [];
    const angles = [];
    let spin = single ? rand() * TAU : 0;
    for (let k = 0; k < n; k++) {
        if (single) {
            ts.push((k + 0.5) / n);
            spin += 1.5 + rand() * 1.6; // each nucleotide turns away from the previous one
            angles.push(spin);
        } else {
            const t = (k + 0.5) / n + (rand() - 0.5) * (0.7 / n);
            const flip = rand() < 0.5 ? 0 : Math.PI;
            ts.push(t);
            angles.push(t * turns * TAU + flip);
        }
    }
    return {
        n,
        height,
        full,
        turns,
        pairs: single ? 0 : Math.round((turns * 9 * full) / height),
        nucScale: Math.max(0.45, Math.min(1, height / n / 1.6)),
        nodeAngle: (k) => angles[k],
        nodeY: (k) => (0.5 - ts[k]) * height,
    };
};

const clamp01 = (v) => Math.max(0, Math.min(1, v));

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

/* ==================================================================
   THE HELIX (Three.js scene + DOM hit areas, clouds and previews)
   mode "double" = the main DNA helix
   mode "single" = the Projects view: connected 3D nucleotides on one backbone
   arriveId      = start zoomed in on that node, then pull back out
   ================================================================== */

const Helix = forwardRef(function Helix(
    {
        items,
        mode = "double",
        onOpen,
        onFrontChange,
        activeId,
        paused,
        arriveId,
    },
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
    const focusTarget = useRef(null);
    const holdUntil = useRef(0); // pause the idle spin after navigating to a node
    const itemsRef = useRef(items);
    const animRef = useRef(null); // running zoom animation, if any
    const geom = useMemo(
        () => makeGeom(items.length, NODE_SEED, mode === "single"),
        [items.length, mode],
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
    itemsRef.current = items;

    const animSeconds = (ms) =>
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? 0.01
            : ms / 1000;

    // Angle that turns node k toward the viewer
    const faceAngle = (k) => {
        const want = geom.nodeAngle(k) - Math.PI / 2;
        const cur = st.current.angle;
        const diff = ((((want - cur + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
        return cur + diff;
    };

    useImperativeHandle(ref, () => ({
        // Rotates the helix so a given node faces the viewer
        focusItem(id) {
            const k = itemsRef.current.findIndex((i) => i.id === id);
            if (k < 0) return;
            focusTarget.current = faceAngle(k);
            st.current.vel = 0;
            holdUntil.current = performance.now() + 3000;
        },
        // The tap target of a node (used as the zoom origin of its modal)
        nodeEl(id) {
            return hitRefs.current[id] || null;
        },
        // Flies the camera into a node until its surface fills the screen
        diveInto(id) {
            const k = itemsRef.current.findIndex((i) => i.id === id);
            if (k < 0) return;
            focusTarget.current = faceAngle(k);
            st.current.vel = 0;
            hoverRef.current = id;
            stageRef.current?.classList.add("diving");
            animRef.current = {
                type: "dive",
                k,
                t: 0,
                dur: animSeconds(DIVE_MS),
            };
        },
        // Pulls the camera far back so everything shrinks away into the distance
        retreat() {
            st.current.vel = 0;
            stageRef.current?.classList.add("diving");
            animRef.current = {
                type: "retreat",
                k: 0,
                t: 0,
                dur: animSeconds(DIVE_MS),
            };
        },
    }));

    useEffect(() => {
        const mount = mountRef.current;
        const stage = stageRef.current;
        const reduce = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        ).matches;
        const G = geom;
        const list = items;
        const N = list.length;
        const single = mode === "single";

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

        /* ----- Materials (colours come from CSS variables) ----- */
        const matA = new THREE.MeshBasicMaterial({ color: 0x5b9bff });
        const matB = new THREE.MeshBasicMaterial({ color: 0x8a99b8 });
        const nodeMat = new THREE.MeshBasicMaterial({ color: 0x5b9bff });
        const nodeMatRed = new THREE.MeshBasicMaterial({ color: 0xff5a6e });
        const rungMat = new THREE.LineBasicMaterial({
            color: 0x5b9bff,
            transparent: true,
            opacity: 0.28,
        });
        const sugarMat = new THREE.MeshBasicMaterial({ color: 0x5b9bff });
        const bondMat = new THREE.MeshBasicMaterial({ color: 0x8a99b8 });
        const edgeMat = new THREE.LineBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.4,
        });
        const baseMats = [0, 1, 2, 3].map(
            () => new THREE.MeshBasicMaterial({ color: 0x5b9bff }),
        );
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

        /* ----- End caps: on a phone held upright, trim the main helix back to the
                 node area so nothing runs up into the intro text ----- */
        renderer.localClippingEnabled = true;
        const clipTop = new THREE.Plane(
            new THREE.Vector3(0, -1, 0),
            G.height / 2,
        ); // keeps y <= top
        const clipBottom = new THREE.Plane(
            new THREE.Vector3(0, 1, 0),
            G.height / 2,
        ); // keeps y >= bottom
        const clipWorld = [new THREE.Plane(), new THREE.Plane()];
        let capped = false;
        const setCapped = (next) => {
            if (next === capped) return;
            capped = next;
            [matA, matB, rungMat].forEach((m) => {
                m.clippingPlanes = next ? clipWorld : null;
                m.needsUpdate = true;
            });
        };

        const geos = []; // everything to dispose on cleanup

        /* ----- MAIN HELIX: two strands + base pairs ----- */
        if (!single) {
            const strandGeo = (s, tubeR) => {
                const segs = Math.max(
                    Math.round((160 * G.full) / G.height),
                    Math.round(G.turns * (G.full / G.height) * 40),
                );
                const pts = [];
                for (let i = 0; i <= segs; i++) {
                    const y = (0.5 - i / segs) * G.full;
                    const th =
                        (0.5 - y / G.height) * G.turns * TAU + s * Math.PI;
                    pts.push(
                        new THREE.Vector3(
                            Math.cos(th) * RADIUS,
                            y,
                            Math.sin(th) * RADIUS,
                        ),
                    );
                }
                return new THREE.TubeGeometry(
                    new THREE.CatmullRomCurve3(pts),
                    segs,
                    tubeR,
                    6,
                    false,
                );
            };
            const geoA = strandGeo(0, 0.036);
            const geoB = strandGeo(1, 0.036);
            geos.push(geoA, geoB);
            group.add(new THREE.Mesh(geoA, matA), new THREE.Mesh(geoB, matB));

            const beadGeo = new THREE.SphereGeometry(0.055, 8, 8);
            geos.push(beadGeo);
            const baseA = new THREE.InstancedMesh(beadGeo, matA, G.pairs);
            const baseB = new THREE.InstancedMesh(beadGeo, matB, G.pairs);
            group.add(baseA, baseB);

            const dummy = new THREE.Object3D();
            const rungPts = [];
            for (let j = 0; j < G.pairs; j++) {
                const y = (0.5 - (j + 0.5) / G.pairs) * G.full;
                const th = (0.5 - y / G.height) * G.turns * TAU;
                const ax = Math.cos(th) * RADIUS;
                const az = Math.sin(th) * RADIUS;
                dummy.position.set(ax, y, az);
                dummy.updateMatrix();
                baseA.setMatrixAt(j, dummy.matrix);
                dummy.position.set(-ax, y, -az);
                dummy.updateMatrix();
                baseB.setMatrixAt(j, dummy.matrix);
                rungPts.push(
                    new THREE.Vector3(ax, y, az),
                    new THREE.Vector3(-ax, y, -az),
                );
            }
            const rungGeo = new THREE.BufferGeometry().setFromPoints(rungPts);
            geos.push(rungGeo);
            group.add(new THREE.LineSegments(rungGeo, rungMat));
        }

        /* ----- 3D nucleotide: phosphate + sugar + base (hexagon, or two fused for
                 a purine), joined by thin bonds. Local +X points away from the backbone. ----- */
        const nodeGeo = new THREE.SphereGeometry(0.15, 16, 16);
        const sugarGeo = new THREE.IcosahedronGeometry(0.11, 0);
        const hexGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.08, 6);
        const hexSmallGeo = new THREE.CylinderGeometry(0.21, 0.21, 0.08, 6);
        const sugarEdges = new THREE.EdgesGeometry(sugarGeo);
        const hexEdges = new THREE.EdgesGeometry(hexGeo);
        const hexSmallEdges = new THREE.EdgesGeometry(hexSmallGeo);
        const bondGeo = new THREE.CylinderGeometry(0.02, 0.02, 1, 6);
        geos.push(
            nodeGeo,
            sugarGeo,
            hexGeo,
            hexSmallGeo,
            sugarEdges,
            hexEdges,
            hexSmallEdges,
            bondGeo,
        );

        const yAxis = new THREE.Vector3(0, 1, 0);
        const addBond = (parent, a, b) => {
            const dir = new THREE.Vector3().subVectors(b, a);
            const m = new THREE.Mesh(bondGeo, bondMat);
            m.position.copy(a).add(b).multiplyScalar(0.5);
            m.quaternion.setFromUnitVectors(yAxis, dir.clone().normalize());
            m.scale.y = dir.length();
            parent.add(m);
        };

        const buildNucleotide = (k) => {
            const g = new THREE.Group();
            g.add(new THREE.Mesh(nodeGeo, nodeMat)); // phosphate: the joint on the backbone

            const pSugar = new THREE.Vector3(0.55, 0.12, 0);
            const sugar = new THREE.Mesh(sugarGeo, sugarMat);
            sugar.position.copy(pSugar);
            sugar.add(new THREE.LineSegments(sugarEdges, edgeMat));
            g.add(sugar);

            const bMat = baseMats[k % 4];
            const pBase = new THREE.Vector3(NUC_REACH, 0, 0);
            const base = new THREE.Mesh(hexGeo, bMat);
            base.position.copy(pBase);
            base.add(new THREE.LineSegments(hexEdges, edgeMat));
            g.add(base);
            if (k % 2 === 0) {
                const ring = new THREE.Mesh(hexSmallGeo, bMat);
                ring.position.set(pBase.x + 0.45, 0, 0);
                ring.add(new THREE.LineSegments(hexSmallEdges, edgeMat));
                g.add(ring);
            }

            addBond(g, new THREE.Vector3(0, 0, 0), pSugar);
            addBond(g, pSugar, new THREE.Vector3(0.9, 0.02, 0));
            return g;
        };

        /* ----- Content nodes ----- */
        // Where a node is tapped / previewed: on the helix strand, or at the base of a nucleotide
        const nodeR = single ? NUC_REACH * G.nucScale : RADIUS;
        const nodeLocal = [];
        const nodeObjs = []; // what gets scaled on hover
        const nodeBase = [];
        const nodeGain = [];
        const nodeGlows = [];
        const nodeYs = [];
        list.forEach((it, k) => {
            const th = G.nodeAngle(k);
            const y = G.nodeY(k);
            nodeYs.push(y);
            const pos = new THREE.Vector3(
                Math.cos(th) * nodeR,
                y,
                Math.sin(th) * nodeR,
            );
            nodeLocal.push(pos);

            if (single) {
                // sits ON the straight backbone and points off in its own direction
                const nuc = buildNucleotide(k);
                nuc.position.set(0, y, 0);
                nuc.rotation.y = -th; // local +X now points along (cos th, 0, sin th)
                nuc.scale.setScalar(G.nucScale);
                group.add(nuc);
                nodeObjs.push(nuc);
                nodeBase.push(G.nucScale);
                nodeGain.push(0.3);
            } else {
                const red = it.tint === "red";
                const mesh = new THREE.Mesh(
                    nodeGeo,
                    red ? nodeMatRed : nodeMat,
                );
                mesh.position.copy(pos);
                group.add(mesh);
                nodeObjs.push(mesh);
                nodeBase.push(1);
                nodeGain.push(0.7);
            }

            const red = it.tint === "red";
            const glow = new THREE.Sprite(red ? glowMatRed : glowMat);
            glow.position.copy(pos);
            glow.scale.setScalar(0.8);
            group.add(glow);
            nodeGlows.push(glow);
        });
        const minNodeY = Math.min(...nodeYs);
        const maxNodeY = Math.max(...nodeYs);
        const nodeSpan = Math.max(maxNodeY - minNodeY, 3);
        const nodeMid = (minNodeY + maxNodeY) / 2;

        /* ----- PROJECTS: the backbone that links the nucleotides one after another ----- */
        if (single) {
            const backGeo = new THREE.CylinderGeometry(0.05, 0.05, 1, 8);
            const capGeo = new THREE.SphereGeometry(0.085, 10, 10);
            geos.push(backGeo, capGeo);
            const yTop = nodeYs[0] + TAIL;
            const yBottom = nodeYs[N - 1] - TAIL;
            const chainYs = [yTop, ...nodeYs, yBottom];
            for (let i = 0; i < chainYs.length - 1; i++) {
                const seg = new THREE.Mesh(backGeo, matA);
                seg.position.set(0, (chainYs[i] + chainYs[i + 1]) / 2, 0);
                seg.scale.y = chainYs[i] - chainYs[i + 1];
                group.add(seg);
            }
            [yTop, yBottom].forEach((y) => {
                const cap = new THREE.Mesh(capGeo, matA);
                cap.position.set(0, y, 0);
                group.add(cap);
            });
        }

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

        /* ----- Theme colours (read from the stage, so the red Projects view turns red) ----- */
        const baseHue = [0, 0.06, -0.05, 0.11];
        const baseLight = [0, 0.08, -0.04, 0.04];
        const applyTheme = () => {
            const cs = getComputedStyle(stage);
            const accent = cs.getPropertyValue("--accent").trim();
            const muted = cs.getPropertyValue("--text-muted").trim();
            const main = cs.getPropertyValue("--text-main").trim();
            const bg = cs.getPropertyValue("--bg-color").trim();
            const red = cs.getPropertyValue("--red").trim();
            const additive =
                cs.getPropertyValue("--glow-additive").trim() !== "0";
            matA.color.set(accent);
            nodeMat.color.set(accent);
            rungMat.color.set(accent);
            glowMat.color.set(accent);
            dustMat.color.set(accent);
            matB.color.set(muted);
            bondMat.color.set(muted);
            edgeMat.color.set(main);
            sugarMat.color.set(accent).offsetHSL(0, 0, 0.14);
            baseMats.forEach((m, i) =>
                m.color.set(accent).offsetHSL(baseHue[i], 0.05, baseLight[i]),
            );
            nodeMatRed.color.set(red);
            glowMatRed.color.set(red);
            scene.fog.color.set(bg);
            // Additive glow disappears on a light background, so use normal blending there
            [glowMat, glowMatRed].forEach((m) => {
                m.blending = additive
                    ? THREE.AdditiveBlending
                    : THREE.NormalBlending;
                m.needsUpdate = true;
            });
        };
        applyTheme();
        const themeObserver = new MutationObserver(applyTheme);
        themeObserver.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["data-theme"],
        });

        /* ----- Layout ----- */
        let W = 0;
        let H = 0;
        let fitScale = 1;
        let topLimit = 76; // preview cards flip below their node if they'd go above this
        const layout = () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            if (w === W && Math.abs(h - H) < 120) return;
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

            // Phone held upright: trim the main helix (the Projects chain is already finite)
            setCapped(portraitPhone && !single);

            // Measure the real intro text so the helix never runs into it
            const introEl = document.querySelector(".intro");
            const introBottom = introEl
                ? introEl.getBoundingClientRect().bottom
                : 0;
            const top = mobile
                ? Math.max(foldable ? 150 : 170, introBottom + 36)
                : foldable
                  ? 88
                  : 100;
            const bottom = mobile ? 64 : foldable ? 64 : 80;
            topLimit = mobile ? top - 8 : 76;

            const regionH = Math.max(240, h - top - bottom);
            const widthPx = mobile
                ? w * 0.62
                : Math.min(w * (foldable ? 0.42 : 0.38), 600);

            // The Projects chain is finite: fit all of it, tails included.
            // Main helix on an upright phone: fit the trimmed helix.
            // Otherwise: fit the nodes and let the strand ends run off-screen.
            let span;
            let mid;
            if (single) {
                span = nodeSpan + 2 * TAIL + 0.6;
                mid = nodeMid;
            } else if (portraitPhone) {
                span = G.height;
                mid = 0;
            } else {
                span = nodeSpan;
                mid = nodeMid;
            }
            const fitR = single ? 1.8 : RADIUS;
            fitScale =
                Math.min(
                    1.6,
                    (regionH * wpp) / span,
                    (widthPx * wpp) / (2 * fitR),
                ) * (foldable && !portraitPhone ? FOLD_ZOOM : 1);

            const cxPx = mobile ? w / 2 : w * 0.6;
            const cyPx = top + regionH / 2;

            group.scale.setScalar(fitScale);
            group.position.set(
                (cxPx - w / 2) * wpp,
                (h / 2 - cyPx) * wpp - mid * fitScale,
                0,
            );
            dust.scale.setScalar(fitScale);
            dust.position.copy(group.position);
        };
        layout();
        window.addEventListener("resize", layout);

        /* ----- Wheel and arrow keys spin the helix ----- */
        const onWheel = (e) => {
            if (pausedRef.current || animRef.current) return;
            const s = st.current;
            s.vel = Math.max(
                -0.2,
                Math.min(0.2, s.vel + (e.deltaY + e.deltaX) * 0.0004),
            );
        };
        const onKey = (e) => {
            if (pausedRef.current || animRef.current) return;
            if (e.key === "ArrowLeft") st.current.vel -= 0.04;
            if (e.key === "ArrowRight") st.current.vel += 0.04;
        };
        stage.addEventListener("wheel", onWheel, { passive: true });
        window.addEventListener("keydown", onKey);

        /* ----- Per-node render state ----- */
        const tmp = new THREE.Vector3();
        const proj = new THREE.Vector3();
        const hotAmt = list.map(() => 0);
        const frontVals = list.map(() => 0);
        const screenX = list.map(() => 0);
        const screenY = list.map(() => 0);
        const expandedState = list.map(() => false);
        const belowState = list.map(() => false);
        let lastFront = -1;

        // Arriving: start right at a node's surface, then pull back out
        if (arriveId) {
            const k0 = list.findIndex((i) => i.id === arriveId);
            if (k0 >= 0) {
                st.current.angle = G.nodeAngle(k0) - Math.PI / 2;
                animRef.current = {
                    type: "arrive",
                    k: k0,
                    t: 0,
                    dur: reduce ? 0.01 : ARRIVE_MS / 1000,
                };
                stage.classList.add("diving");
                hotAmt[k0] = 1;
            }
        }

        /* ----- Render loop ----- */
        let idle = 0.22;
        let spinDust = 0;
        let last = performance.now();
        let raf;

        const tick = (now) => {
            raf = requestAnimationFrame(tick);
            const dt = Math.min((now - last) / 1000, 0.05);
            last = now;
            if (pausedRef.current) return;

            const s = st.current;
            const a = animRef.current;

            // Auto-spin slows while a node is hovered so it's easy to click, stops
            // during the zoom animations and briefly after jumping to a node
            const idleTarget =
                reduce || a || now < holdUntil.current
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

            group.rotation.set(s.tilt, s.angle, 0.14);
            spinDust += dt * 0.02;
            dust.rotation.y = spinDust;
            group.updateMatrixWorld(true);

            if (capped) {
                // the cut planes follow the helix as it spins and leans
                clipWorld[0].copy(clipTop).applyMatrix4(group.matrixWorld);
                clipWorld[1].copy(clipBottom).applyMatrix4(group.matrixWorld);
            }

            /* ----- Camera flight (dive in / arrive / retreat) ----- */
            /* ----- Camera flight (dive in / arrive / retreat) ----- */
            let glowK = 1; // node glow fades out near the node, so nothing blows out to white
            if (a) {
                a.t += dt / a.dur;
                const t = Math.min(a.t, 1);
                if (a.type === "retreat") {
                    camera.position.set(
                        0,
                        0,
                        CAM_Z * Math.pow(60 / CAM_Z, easeInOut(t)),
                    );
                } else {
                    // follow the node's world position so it ends up dead centre
                    tmp.copy(nodeLocal[a.k]).applyMatrix4(group.matrixWorld);
                    const nz = tmp.z;
                    const dist0 = Math.max(CAM_Z - nz, STOP + 1);
                    // p = 1 when the camera is at the node, 0 when it is at home
                    const p =
                        a.type === "dive" ? easeInOut(t) : Math.pow(1 - t, 3);
                    const dist = dist0 * Math.pow(STOP / dist0, p);
                    const u = (dist0 - dist) / (dist0 - STOP);
                    camera.position.set(tmp.x * u, tmp.y * u, nz + dist);
                    glowK = 1 - 0.95 * p;
                }
                if (a.type === "arrive" && a.t >= 1) {
                    camera.position.set(0, 0, CAM_Z);
                    animRef.current = null;
                    stage.classList.remove("diving");
                }
            }
            glowMat.opacity = 0.8 * glowK;
            glowMatRed.opacity = 0.8 * glowK;

            // Project nodes to the screen; find the one facing you most
            let frontIdx = -1;
            let frontMax = 0.85;
            for (let k = 0; k < N; k++) {
                tmp.copy(nodeLocal[k]).applyMatrix4(group.matrixWorld);
                const front =
                    THREE.MathUtils.clamp(
                        (tmp.z - group.position.z) / (nodeR * fitScale),
                        -1,
                        1,
                    ) *
                        0.5 +
                    0.5;
                frontVals[k] = front;
                if (front > frontMax) {
                    frontMax = front;
                    frontIdx = k;
                }
                proj.copy(tmp).project(camera);
                screenX[k] = (proj.x * 0.5 + 0.5) * W;
                screenY[k] = (-proj.y * 0.5 + 0.5) * H;
            }

            // Tell the quick-navigation list which node is in front
            if (frontIdx >= 0 && frontIdx !== lastFront) {
                lastFront = frontIdx;
                frontCbRef.current?.(list[frontIdx].id);
            }

            for (let k = 0; k < N; k++) {
                const it = list[k];
                const sx = screenX[k];
                const sy = screenY[k];

                const hot =
                    hoverRef.current === it.id || activeRef.current === it.id;
                hotAmt[k] += ((hot ? 1 : 0) - hotAmt[k]) * Math.min(1, dt * 10);
                nodeObjs[k].scale.setScalar(
                    nodeBase[k] * (1 + nodeGain[k] * hotAmt[k]),
                );
                nodeGlows[k].scale.setScalar(0.8 + 0.9 * hotAmt[k]);

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
                        (hot || (k === frontIdx && !hoverRef.current));
                    if (expandedState[k] !== expanded) {
                        expandedState[k] = expanded;
                        cloud.classList.toggle("expanded", expanded);
                        cloud.style.zIndex = expanded ? 3 : 1;
                    }
                    // A preview that would poke into the intro text opens below its node
                    const below = expanded && sy - 24 - 104 < topLimit;
                    if (belowState[k] !== below) {
                        belowState[k] = below;
                        cloud.classList.toggle("below", below);
                    }
                    const vis =
                        hot || expanded
                            ? 1
                            : clamp01((frontVals[k] - 0.55) / 0.35);
                    const half = expanded ? 72 : 60;
                    const cx = Math.max(half, Math.min(W - half, sx));
                    cloud.style.opacity = vis;
                    cloud.style.transform = below
                        ? `translate3d(${cx}px,${sy + 26}px,0) translate(-50%,0)`
                        : `translate3d(${cx}px,${Math.max(sy - 24 - hotAmt[k] * 4, 98)}px,0) translate(-50%,-100%)`;
                }
            }

            renderer.render(scene, camera);
        };
        raf = requestAnimationFrame(tick);

        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener("resize", layout);
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
                sugarMat,
                bondMat,
                edgeMat,
                ...baseMats,
                glowMat,
                glowMatRed,
                dustMat,
            ].forEach((m) => m.dispose());
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
