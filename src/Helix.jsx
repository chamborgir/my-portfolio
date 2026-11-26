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

// Morph between the main and Projects views on a shared helix (App.jsx waits for this)
export const MORPH_MS = 1100;

// Change this number to get a different random arrangement of the main-helix nodes
const NODE_SEED = 7;

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = (t) =>
    t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

// Stages of the morph, all driven by one eased value m (0 = main helix, 1 = Projects)
const phaseColor = (m) => easeInOut(clamp01((m - 0.25) / 0.5)); // blue -> red

// Small seeded random generator: random-looking, but identical on every visit
const mulberry32 = (a) => () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/* Both views use the same helix shape; each node list spaces its own nodes
   across the main view's helix. */
const makeGeom = (n, seed, totalNodes) => {
    const height = HEIGHT;
    const full = height + PAD * 2;
    const turns = Math.max(1.8, totalNodes * 0.34);
    const rand = mulberry32(seed + n * 101);
    const ts = [];
    const base = [];
    const flips = [];
    for (let k = 0; k < n; k++) {
        const t = (k + 0.5) / n + (rand() - 0.5) * (0.7 / n);
        ts.push(t);
        base.push(t * turns * TAU);
        flips.push(rand() < 0.5 ? 0 : Math.PI);
    }
    return {
        n,
        height,
        width: RADIUS * 2,
        full,
        turns,
        pairs: Math.round((turns * 9 * full) / height),
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

/* ==================================================================
   THE HELIX
   One Three.js scene holds the main and Projects nodes on the same double helix.
   `view` ("main" | "projects") is the target; nodes crossfade between views.
   DOM tap areas / clouds belong to the target view.
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
    const homeAnchorIndex = Math.max(
        0,
        mainItems.findIndex((item) => item.id === "projects"),
    );
    const GM = useMemo(
        () => makeGeom(mainItems.length, NODE_SEED, mainItems.length),
        [mainItems.length],
    );
    const projectNodeCount = projectItems.filter(
        (item) => item.kind !== "home",
    ).length;
    const GP = useMemo(
        () => makeGeom(projectNodeCount, NODE_SEED, mainItems.length),
        [projectNodeCount, mainItems.length],
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
        // Rotates the scene so a given node faces the viewer
        focusItem(id) {
            const proj = viewRef.current === "projects";
            const list = proj ? projRef.current : mainRef.current;
            const k = list.findIndex((i) => i.id === id);
            if (k < 0) return;
            const isHome = proj && list[k].kind === "home";
            const geometry = proj && !isHome ? GP : GM;
            const geometryIndex = isHome
                ? homeAnchorIndex
                : proj
                  ? list
                        .slice(0, k)
                        .filter((item) => item.kind !== "home").length
                  : k;
            focusTarget.current = faceAngle(
                st.current.angle,
                geometry.nodeAngle(geometryIndex),
            );
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
        const homeIndex = projL.findIndex((item) => item.kind === "home");
        const projectNodeIndices = projL.map((item, k) =>
            item.kind === "home"
                ? -1
                : homeIndex >= 0 && k > homeIndex
                  ? k - 1
                  : k,
        );

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
        const nodeMatBlue = new THREE.MeshBasicMaterial({ color: 0x5b9bff });
        const rungMat = new THREE.LineBasicMaterial({
            color: 0x5b9bff,
            transparent: true,
            opacity: 0.28,
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
        const glowMatBlue = new THREE.SpriteMaterial({
            ...glowOpts,
            color: 0x5b9bff,
        });
        const dustMat = new THREE.PointsMaterial({
            color: 0x5b9bff,
            size: 0.04,
            transparent: true,
            opacity: 0.5,
            depthWrite: false,
        });

        const geos = []; // everything to dispose on cleanup
        const dummy = new THREE.Object3D();

        /* ----- The shared double-helix strands and rungs ----- */
        const strandLen = GM.full;
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

        let capped = false; // upright phone: trim both views to their node area
        const updateStructure = (u, c, ext, fade) => {
            const tw = 1 - u; // 1 = fully twisted, 0 = untwisted
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

        /* ----- Project entries use the same spherical nodes as the main helix ----- */
        const nodeGeo = new THREE.SphereGeometry(0.15, 16, 16);
        geos.push(nodeGeo);

        /* ----- All entries are spherical nodes on the same double helix ----- */
        const nodePos = all.map(() => new THREE.Vector3());
        const nodeObjs = [];
        const nodeGlows = [];
        const yMain = mainL.map((_, k) => GM.nodeY(k));
        const homeAngle = GM.nodeAngle(homeAnchorIndex);
        const homePosition = new THREE.Vector3(
            Math.cos(homeAngle) * RADIUS,
            GM.nodeY(homeAnchorIndex),
            Math.sin(homeAngle) * RADIUS,
        );
        const yProjects = projectNodeIndices.map((k) =>
            k < 0 ? homePosition.y : GP.nodeY(k),
        );

        all.forEach((it) => {
            const obj = new THREE.Mesh(
                nodeGeo,
                it.tint === "red"
                    ? nodeMatRed
                    : it.tint === "blue"
                      ? nodeMatBlue
                      : nodeMat,
            );
            group.add(obj);
            nodeObjs.push(obj);

            const glow = new THREE.Sprite(
                it.tint === "red"
                    ? glowMatRed
                    : it.tint === "blue"
                      ? glowMatBlue
                      : glowMat,
            );
            glow.scale.setScalar(0.8);
            group.add(glow);
            nodeGlows.push(glow);
        });

        const spanOf = (ys) => Math.max(Math.max(...ys) - Math.min(...ys), 3);
        const midOf = (ys) => (Math.max(...ys) + Math.min(...ys)) / 2;
        const mainSpan = spanOf(yMain);
        const mainMid = midOf(yMain);
        const projectSpan = spanOf(yProjects);
        const projectMid = midOf(yProjects);

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
            const muted = cs.getPropertyValue("--text-muted").trim();
            matB.color.set(muted);
            nodeMatRed.color.copy(redC);
            nodeMatBlue.color.copy(blue);
            glowMatRed.color.copy(redC);
            glowMatBlue.color.copy(blue);
            scene.fog.color.set(cs.getPropertyValue("--bg-color").trim());
            // Additive glow disappears on a light background, so use normal blending there
            const additive =
                cs.getPropertyValue("--glow-additive").trim() !== "0";
            [glowMat, glowMatRed, glowMatBlue].forEach((m) => {
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
            const mobile = w < 700;
            renderer.setPixelRatio(
                Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.75),
            );
            renderer.setSize(w, h, false);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();

            const wpp = (2 * Math.tan((FOV * Math.PI) / 360) * CAM_Z) / h; // world per pixel
            const ratio = w / h;
            // Unfolded foldables have roughly square screens
            const foldable =
                w >= 500 && w <= 1100 && ratio >= 0.72 && ratio <= 1.4;
            const portraitPhone = mobile && h > w;

            if (capped !== mobile) {
                capped = mobile;
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
                          (introBottoms[v] ?? (isProj ? 158 : 206)) + 48,
                      )
                    : foldable
                      ? 88
                      : 100;
                const bottom = mobile ? 64 : foldable ? 64 : 80;
                const regionH = Math.max(mobile ? 120 : 240, h - top - bottom);

                let span;
                let mid = 0;
                let fitR = RADIUS;
                if (isProj) {
                    span = projectSpan;
                    mid = projectMid;
                    fitR = GP.width / 2;
                } else if (mobile) {
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
                    mid,
                    cyPx,
                    topLimit: mobile ? top - 8 : 76,
                };
            };

            L.main = frameFor("main");
            L.proj = nP > 0 ? frameFor("projects") : { ...L.main };
            const sharedFit = Math.min(L.main.fit, L.proj.fit);
            [L.main, L.proj].forEach((frame) => {
                frame.fit = sharedFit;
                frame.y = (h / 2 - frame.cyPx) * wpp - frame.mid * sharedFit;
            });
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

            if (dirty) {
                const extMain = capped
                    ? GM.height / 2 + 0.25
                    : strandLen / 2 + 1;
                updateStructure(0, 0, extMain, 1);
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

            const rotY = s.angle + TAU * m;
            group.rotation.set(s.tilt, rotY, 0.14);
            spinDust += dt * 0.02;
            dust.rotation.y = spinDust;
            group.updateMatrixWorld(true);

            /* --- Position the active view's project nodes on the same helix --- */
            for (let i = 0; i < NT; i++) {
                const it = all[i];
                const hot =
                    hoverRef.current === it.id || activeRef.current === it.id;
                hotAmt[i] += ((hot ? 1 : 0) - hotAmt[i]) * Math.min(1, dt * 10);
                const hA = hotAmt[i];
                let angle;
                let y;
                let w;
                if (i < nM) {
                    angle = GM.nodeAngle(i);
                    y = yMain[i];
                    w = 1 - m;
                } else {
                    w = m;
                    const k = projectNodeIndices[i - nM];
                    if (k < 0) {
                        nodePos[i].copy(homePosition);
                    } else {
                        angle = GP.nodeAngle(k);
                        y = GP.nodeY(k);
                    }
                }
                if (i < nM || projectNodeIndices[i - nM] >= 0) {
                    nodePos[i].set(
                        Math.cos(angle) * RADIUS,
                        y,
                        Math.sin(angle) * RADIUS,
                    );
                }
                nodeObjs[i].position.copy(nodePos[i]);
                nodeObjs[i].scale.setScalar(
                    Math.max(w, 0.0001) * (1 + 0.7 * hA),
                );
                nodeObjs[i].visible = w > 0.01;
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
                const front =
                    THREE.MathUtils.clamp(
                        (tmp.z - group.position.z) / (RADIUS * cur.s),
                        -1,
                        1,
                    ) *
                        0.5 +
                    0.5;
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
                nodeMatBlue,
                rungMat,
                glowMat,
                glowMatRed,
                glowMatBlue,
                dustMat,
            ].forEach((m) => m.dispose());
            [
                strandA,
                strandB,
                pairA,
                pairB,
            ].forEach((im) => im.dispose());
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
