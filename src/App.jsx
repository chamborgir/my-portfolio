import React, {
    useState,
    useEffect,
    useRef,
    useCallback,
    useMemo,
    forwardRef,
    useImperativeHandle,
} from "react";
import { createPortal } from "react-dom";
import * as THREE from "three";
import "./index.css";
import profileImg from "./assets/pfp1.jpg";
import work1Img from "./assets/work1.gif";
import work2Img from "./assets/work2.gif";
import work3Img from "./assets/work3.gif";
import work4Img from "./assets/work4.gif";
import work5Img from "./assets/work5.gif";

/* ------------------------------------------------------------------
   REVIEW SCREENSHOTS: step 1 of 2
   Put your screenshot files in  src/assets/reviews/  and import each
   one here. Uncomment the lines below once the files exist.
   ------------------------------------------------------------------ */
// import review1Img from "./assets/reviews/review1.png";
// import review2Img from "./assets/reviews/review2.png";
// import review3Img from "./assets/reviews/review3.png"; // <- new one? add a line like this

/* ==================================================================
   DATA
   ================================================================== */

const EMAIL = "chamboquilon1@gmail.com";

const ROLES = [
    "modern React apps",
    "AI-powered tools",
    "robotic VLA pipelines",
    "computer vision projects",
    "LLM-driven apps",
];

const SKILLS = [
    {
        group: "Programming Languages",
        items: ["Python", "JavaScript (ES6+)", "C++", "Java", "SQL"],
    },
    {
        group: "Web Development & Deployment",
        items: [
            "React",
            "Node.js",
            "Vite",
            "Three.js",
            "Git/GitHub",
            "Vercel",
            "Supabase (PostgreSQL)",
        ],
    },
    {
        group: "AI, Robotics & Computer Vision",
        items: [
            "PyTorch",
            "OpenCV",
            "Hugging Face",
            "Gemini API",
            "Webots",
            "ML Pipelines",
        ],
    },
];

/* ------------------------------------------------------------------
   REVIEW SCREENSHOTS: step 2 of 2
   One entry per person. To add a NEW review, copy a block below,
   paste it at the end of the list (before the closing ];), then fill
   in the name and the screenshot(s).

     name    -> the reviewee's name
     source  -> optional small label, e.g. "Messenger" or "Client project"
     images  -> one or more screenshots, e.g. [review1Img] or [review1Img, review2Img]
                (leave [] and a "Screenshot coming soon" box shows)
   ------------------------------------------------------------------ */
const REVIEWS = [
    // Review 1
    {
        name: "Reviewee name",
        source: "",
        images: [], // e.g. [review1Img]
    },
    // Review 2
    {
        name: "Reviewee name",
        source: "",
        images: [], // e.g. [review2Img]
    },
];

// Add more works here and they appear on the red helix automatically
const projectList = [
    {
        short: "VLA Robotics",
        image: work1Img,
        type: "AI & Robotics",
        title: "VLA Robotic Task Decomposition Pipeline",
        category: "Project #1",
        desc: "A modular, triple-system pipeline that inserts a rule-based Task Decomposition Module between a Qwen2-VL backbone and a flow-matching action expert (SmolVLA) for an SO-100 robotic arm in Webots. Achieved a 42.1% reduction in trajectory jerk.",
        tags: [
            "Python",
            "PyTorch",
            "SmolVLA",
            "Webots",
            "Hugging Face",
            "WandB",
        ],
        links: [
            {
                label: "GitHub",
                url: "https://github.com/chamborgir/Thesis-Repo",
            },
            {
                label: "Research Deep-Dive",
                url: "https://drive.google.com/file/d/1GMwjyfErjlWvVgXxfXujmwt-ReE_BUC1/view?usp=sharing",
            },
        ],
    },
    {
        short: "UFO Shooter",
        image: work2Img,
        type: "Web",
        title: "3D UFO Asteroid Shooter",
        category: "Project #2",
        desc: "An atmospheric 3D space arcade experience. Pilot a craft across 10 distinct celestial bodies, locating a randomly spawned weapon attachment to clear incoming asteroid hazards.",
        tags: ["Three.js", "WebGL", "Vite", "JavaScript"],
        links: [
            { label: "GitHub", url: "https://github.com/chamborgir/game" },
            { label: "Live Demo", url: "https://game-teal-psi.vercel.app/" },
        ],
    },
    {
        short: "Scheduler",
        image: work3Img,
        type: "Web",
        title: "Client Scheduler",
        category: "Project #3",
        desc: "A robust, web-based scheduling application designed for efficient appointment and task management that provides a clean, user-friendly interface for tracking schedules and maintaining personal or professional tasks.",
        tags: ["React", "Vite", "Supabase", "JavaScript", "CSS"],
        links: [
            {
                label: "GitHub",
                url: "https://github.com/chamborgir/client-scheduler",
            },
            {
                label: "Live Demo",
                url: "https://client-scheduler-orcin.vercel.app/",
            },
        ],
    },
    {
        short: "Quiz Generator",
        image: work4Img,
        type: "Web",
        title: "AI Quiz/Exam Generator",
        category: "Project #4",
        desc: "A full-stack quiz/exam platform where users upload a PDF and generate questions either with Gemini AI or directly from the document's own content. Quizzes can be shared with anyone through a link, and users get their own accounts to manage what they create.",
        tags: ["React", "Supabase", "Vercel", "Gemini AI", "JavaScript"],
        links: [
            { label: "GitHub", url: "#" },
            { label: "Live Demo", url: "#" },
        ],
    },
    {
        short: "QR Attendance",
        image: work5Img,
        type: "Web",
        title: "QR Event Attendance System",
        category: "Project #5",
        desc: "An attendance system with an admin dashboard for managing events. Participants register and wait for admin approval, then get a personal QR code that the admin scans at the event to log their attendance.",
        tags: ["React", "Supabase", "QR Code", "Admin Dashboard", "JavaScript"],
        links: [
            { label: "GitHub", url: "#" },
            { label: "Live Demo", url: "#" },
        ],
    },
];

// Nodes on the main (blue) helix
const MAIN_ITEMS = [
    { id: "about", kind: "about", label: "About", kicker: "About me" },
    {
        id: "skills",
        kind: "skills",
        label: "Skills",
        kicker: "Professional skills",
    },
    {
        id: "works",
        kind: "works",
        label: "Works",
        kicker: "Selected works",
        tint: "red",
    },
    { id: "reviews", kind: "reviews", label: "Reviews", kicker: "Reviews" },
    {
        id: "contact",
        kind: "contact",
        label: "Contact",
        kicker: "Get in touch",
    },
];

// Nodes on the Works (red) helix
const WORK_ITEMS = projectList.map((p, i) => ({
    id: `work-${i + 1}`,
    kind: "project",
    label: p.short,
    kicker: `${p.category} · ${p.type}`,
    image: p.image,
    project: p,
}));

const ALL_ITEMS = [...MAIN_ITEMS, ...WORK_ITEMS];

const lsGet = (key) => {
    try {
        return localStorage.getItem(key);
    } catch (e) {
        return null;
    }
};
const lsSet = (key, value) => {
    try {
        localStorage.setItem(key, value);
    } catch (e) {
        /* storage unavailable */
    }
};

/* ==================================================================
   HELIX GEOMETRY (world units)
   ================================================================== */

const TAU = Math.PI * 2;
const RADIUS = 1.9;
const HEIGHT = 9;
const PAD = 6;
const FULL = HEIGHT + PAD * 2;
const FOLD_ZOOM = 1.12; // extra zoom on foldable-sized screens (1 = none)
const FOV = 40;
const CAM_Z = 14;

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

// Every helix is sized from its number of nodes. Nodes get a jittered height
// along the helix and a random strand, so they look scattered.
const makeGeom = (n, seed) => {
    const turns = Math.max(1.8, n * 0.34);
    const rand = mulberry32(seed + n * 101);
    const ts = [];
    const angles = [];
    for (let k = 0; k < n; k++) {
        const t = (k + 0.5) / n + (rand() - 0.5) * (0.7 / n);
        ts.push(t);
        angles.push(t * turns * TAU + (rand() < 0.5 ? 0 : Math.PI));
    }
    return {
        n,
        turns,
        pairs: Math.round((turns * 9 * FULL) / HEIGHT),
        nodeAngle: (k) => angles[k],
        nodeY: (k) => (0.5 - ts[k]) * HEIGHT,
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
   HOOKS & AMBIENT
   ================================================================== */

const useTypewriter = (words, speed = 70, pause = 1600) => {
    const [text, setText] = useState("");
    const [index, setIndex] = useState(0);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        const word = words[index % words.length];
        let timer;
        if (!deleting && text === word) {
            timer = setTimeout(() => setDeleting(true), pause);
        } else if (deleting && text === "") {
            setDeleting(false);
            setIndex((i) => i + 1);
        } else {
            timer = setTimeout(
                () => setText(word.slice(0, text.length + (deleting ? -1 : 1))),
                deleting ? speed / 2 : speed,
            );
        }
        return () => clearTimeout(timer);
    }, [text, deleting, index, words, speed, pause]);

    return text;
};

const CursorGlow = () => {
    useEffect(() => {
        let frame;
        const onMove = (e) => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
                const root = document.documentElement;
                root.style.setProperty("--mx", `${e.clientX}px`);
                root.style.setProperty("--my", `${e.clientY}px`);
            });
        };
        window.addEventListener("mousemove", onMove);
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener("mousemove", onMove);
        };
    }, []);
    return <div className="cursor-glow" aria-hidden="true" />;
};

/* ==================================================================
   THE HELIX (Three.js scene + DOM hit areas, clouds and previews)
   ================================================================== */

const Helix = forwardRef(function Helix(
    { items, onOpen, activeId, paused },
    ref,
) {
    const stageRef = useRef(null);
    const mountRef = useRef(null);
    const hitRefs = useRef({});
    const cloudRefs = useRef({});
    const hoverRef = useRef(null);
    const pausedRef = useRef(paused);
    const activeRef = useRef(activeId);
    const focusTarget = useRef(null);
    const itemsRef = useRef(items);
    const geom = useMemo(
        () => makeGeom(items.length, NODE_SEED),
        [items.length],
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
    itemsRef.current = items;

    // Rotates the helix so a given node faces the viewer
    useImperativeHandle(ref, () => ({
        focusItem(id) {
            const k = itemsRef.current.findIndex((i) => i.id === id);
            if (k < 0) return;
            const want = geom.nodeAngle(k) - Math.PI / 2;
            const cur = st.current.angle;
            const diff =
                ((((want - cur + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
            focusTarget.current = cur + diff;
            st.current.vel = 0;
        },
    }));

    useEffect(() => {
        const mount = mountRef.current;
        const stage = stageRef.current;
        const reduce = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        ).matches;
        const isTouch = window.matchMedia("(hover: none)").matches;
        const G = geom;
        const list = items;
        const N = list.length;

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
        scene.fog = new THREE.Fog(0x05070d, 11.5, 19);
        const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 60);
        camera.position.z = CAM_Z;

        const group = new THREE.Group();
        group.rotation.order = "ZXY";
        scene.add(group);

        /* ----- Materials (colours come from CSS variables) ----- */
        const matA = new THREE.MeshBasicMaterial({ color: 0x4f8cff });
        const matB = new THREE.MeshBasicMaterial({ color: 0x8590a8 });
        const nodeMat = new THREE.MeshBasicMaterial({ color: 0x4f8cff });
        const nodeMatRed = new THREE.MeshBasicMaterial({ color: 0xff4d5e });
        const rungMat = new THREE.LineBasicMaterial({
            color: 0x4f8cff,
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
            color: 0x4f8cff,
        });
        const glowMatRed = new THREE.SpriteMaterial({
            ...glowOpts,
            color: 0xff4d5e,
        });
        const dustMat = new THREE.PointsMaterial({
            color: 0x4f8cff,
            size: 0.04,
            transparent: true,
            opacity: 0.5,
            depthWrite: false,
        });

        /* ----- End caps: on a phone held upright, trim the strands back to the original helix length ----- */
        renderer.localClippingEnabled = true;
        const clipTop = new THREE.Plane(
            new THREE.Vector3(0, -1, 0),
            HEIGHT / 2,
        ); // keeps y <= top
        const clipBottom = new THREE.Plane(
            new THREE.Vector3(0, 1, 0),
            HEIGHT / 2,
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

        /* ----- Strands: two thin tubes ----- */
        /* ----- Strands: two thin tubes (longer than the node area) ----- */
        const strandGeo = (s) => {
            const segs = Math.round((160 * FULL) / HEIGHT);
            const pts = [];
            for (let i = 0; i <= segs; i++) {
                const y = (0.5 - i / segs) * FULL;
                const th = (0.5 - y / HEIGHT) * G.turns * TAU + s * Math.PI;
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
                0.036,
                6,
                false,
            );
        };
        const geoA = strandGeo(0);
        const geoB = strandGeo(1);
        group.add(new THREE.Mesh(geoA, matA), new THREE.Mesh(geoB, matB));

        /* ----- Base pairs ----- */
        const baseGeo = new THREE.SphereGeometry(0.055, 8, 8);
        const baseA = new THREE.InstancedMesh(baseGeo, matA, G.pairs);
        const baseB = new THREE.InstancedMesh(baseGeo, matB, G.pairs);
        const dummy = new THREE.Object3D();
        const rungPts = [];
        for (let j = 0; j < G.pairs; j++) {
            const y = (0.5 - (j + 0.5) / G.pairs) * FULL;
            const th = (0.5 - y / HEIGHT) * G.turns * TAU;
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
        group.add(baseA, baseB, new THREE.LineSegments(rungGeo, rungMat));

        /* ----- Content nodes (scattered along the helix) ----- */
        const nodeGeo = new THREE.SphereGeometry(0.15, 16, 16);
        const nodeLocal = [];
        const nodeMeshes = [];
        const nodeGlows = [];
        const nodeYs = [];
        list.forEach((it, k) => {
            const th = G.nodeAngle(k);
            const y = G.nodeY(k);
            nodeYs.push(y);
            const pos = new THREE.Vector3(
                Math.cos(th) * RADIUS,
                y,
                Math.sin(th) * RADIUS,
            );
            nodeLocal.push(pos);
            const red = it.tint === "red";
            const mesh = new THREE.Mesh(nodeGeo, red ? nodeMatRed : nodeMat);
            mesh.position.copy(pos);
            const glow = new THREE.Sprite(red ? glowMatRed : glowMat);
            glow.position.copy(pos);
            glow.scale.setScalar(0.8);
            group.add(mesh, glow);
            nodeMeshes.push(mesh);
            nodeGlows.push(glow);
        });
        const minNodeY = Math.min(...nodeYs);
        const maxNodeY = Math.max(...nodeYs);
        const nodeSpan = Math.max(maxNodeY - minNodeY, 3);
        const nodeMid = (minNodeY + maxNodeY) / 2;

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
        const dust = new THREE.Points(dustGeo, dustMat);
        scene.add(dust);

        /* ----- Theme colours (read from the stage, so the red view turns red) ----- */
        const applyTheme = () => {
            const cs = getComputedStyle(stage);
            const accent = cs.getPropertyValue("--accent").trim();
            const muted = cs.getPropertyValue("--text-muted").trim();
            const bg = cs.getPropertyValue("--bg-color").trim();
            const red = cs.getPropertyValue("--red").trim();
            matA.color.set(accent);
            nodeMat.color.set(accent);
            rungMat.color.set(accent);
            glowMat.color.set(accent);
            dustMat.color.set(accent);
            matB.color.set(muted);
            nodeMatRed.color.set(red);
            glowMatRed.color.set(red);
            scene.fog.color.set(bg);
        };
        applyTheme();
        const themeObserver = new MutationObserver(applyTheme);
        themeObserver.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["data-theme"],
        });

        /* ----- Layout: zoomed in. The helix is sized so the NODES fill the screen;
                 the ends of the helix may run past the edges. ----- */
        let W = 0;
        let H = 0;
        let fitScale = 1;
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

            // Phone held upright: no extra strands, so nothing runs up into the intro text
            setCapped(mobile && h > w);

            const top = mobile ? (foldable ? 215 : 235) : foldable ? 88 : 100;
            const bottom = foldable ? 64 : 80;
            const regionH = Math.max(240, h - top - bottom);
            const widthPx = mobile
                ? w * 0.62
                : Math.min(w * (foldable ? 0.46 : 0.4), 600);
            fitScale =
                Math.min(
                    1.6,
                    (regionH * wpp) / nodeSpan,
                    (widthPx * wpp) / (2 * RADIUS),
                ) * (foldable ? FOLD_ZOOM : 1);
            const cxPx = mobile ? w / 2 : w * 0.62;
            const cyPx = top + regionH / 2;

            group.scale.setScalar(fitScale);
            group.position.set(
                (cxPx - w / 2) * wpp,
                (h / 2 - cyPx) * wpp - nodeMid * fitScale,
                0,
            );
            dust.scale.setScalar(fitScale);
            dust.position.copy(group.position);
        };
        layout();
        window.addEventListener("resize", layout);

        /* ----- Wheel and arrow keys spin the helix ----- */
        const onWheel = (e) => {
            if (pausedRef.current) return;
            const s = st.current;
            s.vel = Math.max(
                -0.2,
                Math.min(0.2, s.vel + (e.deltaY + e.deltaX) * 0.0004),
            );
        };
        const onKey = (e) => {
            if (pausedRef.current) return;
            if (e.key === "ArrowLeft") st.current.vel -= 0.04;
            if (e.key === "ArrowRight") st.current.vel += 0.04;
        };
        stage.addEventListener("wheel", onWheel, { passive: true });
        window.addEventListener("keydown", onKey);

        /* ----- Render loop ----- */
        const tmp = new THREE.Vector3();
        const proj = new THREE.Vector3();
        const hotAmt = list.map(() => 0);
        const frontVals = list.map(() => 0);
        const screenX = list.map(() => 0);
        const screenY = list.map(() => 0);
        const expandedState = list.map(() => false);
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

            // Auto-spin slows while a node is hovered so it's easy to click
            const idleTarget = reduce ? 0 : hoverRef.current ? 0.03 : 0.22;
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
                s.angle += diff * Math.min(1, dt * 5);
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

            // Project nodes to the screen; find the one facing you most
            let frontIdx = -1;
            let frontMax = 0.85;
            for (let k = 0; k < N; k++) {
                tmp.copy(nodeLocal[k]).applyMatrix4(group.matrixWorld);
                const front =
                    THREE.MathUtils.clamp(
                        (tmp.z - group.position.z) / (RADIUS * fitScale),
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

            for (let k = 0; k < N; k++) {
                const it = list[k];
                const sx = screenX[k];
                const sy = screenY[k];

                const hot =
                    hoverRef.current === it.id || activeRef.current === it.id;
                hotAmt[k] += ((hot ? 1 : 0) - hotAmt[k]) * Math.min(1, dt * 10);
                nodeMeshes[k].scale.setScalar(1 + 0.7 * hotAmt[k]);
                nodeGlows[k].scale.setScalar(0.8 + 0.9 * hotAmt[k]);

                const hit = hitRefs.current[it.id];
                if (hit) {
                    hit.style.transform = `translate3d(${sx}px,${sy}px,0) translate(-50%,-50%)`;
                }

                const cloud = cloudRefs.current[it.id];
                if (cloud) {
                    // Hover (or keyboard focus) shows the project preview.
                    // On touch screens the node facing you previews by itself.
                    const expanded =
                        !!it.image && (hot || (isTouch && k === frontIdx));
                    if (expandedState[k] !== expanded) {
                        expandedState[k] = expanded;
                        cloud.classList.toggle("expanded", expanded);
                        cloud.style.zIndex = expanded ? 3 : 1;
                    }
                    const vis =
                        hot || expanded
                            ? 1
                            : clamp01((frontVals[k] - 0.55) / 0.35);
                    const half = expanded ? 92 : 60;
                    const cx = Math.max(half, Math.min(W - half, sx));
                    const minY = (expanded ? 132 : 34) + 64;
                    const cy = Math.max(sy - 24 - hotAmt[k] * 4, minY);
                    cloud.style.opacity = vis;
                    cloud.style.transform = `translate3d(${cx}px,${cy}px,0) translate(-50%,-100%)`;
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
            [geoA, geoB, baseGeo, rungGeo, nodeGeo, dustGeo].forEach((g) =>
                g.dispose(),
            );
            [
                matA,
                matB,
                nodeMat,
                nodeMatRed,
                rungMat,
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

/* ==================================================================
   SMALL UI PIECES
   ================================================================== */

// Full-screen image viewer. Rendered in a portal so the modal can't clip it.
const Lightbox = ({ src, alt, onClose }) => {
    useEffect(() => {
        // Capture phase: Esc and arrows only affect the lightbox, not the modal under it
        const onKey = (e) => {
            if (["Escape", "ArrowLeft", "ArrowRight"].includes(e.key)) {
                e.stopImmediatePropagation();
                if (e.key === "Escape") onClose();
            }
        };
        window.addEventListener("keydown", onKey, true);
        return () => window.removeEventListener("keydown", onKey, true);
    }, [onClose]);

    return createPortal(
        <div
            className="lightbox"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label={alt}
        >
            <button
                type="button"
                className="icon-btn lightbox-close"
                onClick={onClose}
                aria-label="Close full-size preview"
            >
                ×
            </button>
            <img src={src} alt={alt} className="lightbox-img" />
            <p className="lightbox-hint">Tap anywhere to close</p>
        </div>,
        document.body,
    );
};

/* ==================================================================
   MODAL CONTENT
   ================================================================== */

const LinkList = ({ links }) => (
    <div className="project-links-wrapper">
        {links.map((link) => {
            // Grayed out when flagged, empty, or still a "#" placeholder
            const unavailable = link.disabled || !link.url || link.url === "#";
            return unavailable ? (
                <span
                    key={link.label}
                    className="project-link disabled"
                    aria-disabled="true"
                    title={link.note || "Not available"}
                >
                    {link.label}
                </span>
            ) : (
                <a
                    key={link.label}
                    href={link.url}
                    className="project-link"
                    target="_blank"
                    rel="noreferrer"
                >
                    {link.label} <span className="arrow">↗</span>
                </a>
            );
        })}
    </div>
);

const ProjectBody = ({ project }) => {
    const [zoomed, setZoomed] = useState(false);
    const closeZoom = useCallback(() => setZoomed(false), []);

    return (
        <div>
            {project.image ? (
                <button
                    type="button"
                    className="preview-btn"
                    onClick={() => setZoomed(true)}
                    aria-label={`Expand ${project.title} preview`}
                >
                    <img
                        src={project.image}
                        alt={`${project.title} preview`}
                        className="preview-media"
                    />
                    <span className="expand-badge">
                        <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                        >
                            <polyline points="15 3 21 3 21 9" />
                            <polyline points="9 21 3 21 3 15" />
                            <line x1="21" y1="3" x2="14" y2="10" />
                            <line x1="3" y1="21" x2="10" y2="14" />
                        </svg>
                        Expand
                    </span>
                </button>
            ) : (
                <div className="preview-media placeholder">
                    <span>Preview coming soon</span>
                </div>
            )}

            <h2 className="panel-title">{project.title}</h2>
            <p className="panel-text">{project.desc}</p>
            <div className="tag-container">
                {project.tags.map((tag) => (
                    <span key={tag} className="tag">
                        {tag}
                    </span>
                ))}
            </div>
            <LinkList links={project.links} />

            {zoomed && (
                <Lightbox
                    src={project.image}
                    alt={`${project.title} full-size preview`}
                    onClose={closeZoom}
                />
            )}
        </div>
    );
};

const AboutBody = ({ onSeeWorks, onNavigate }) => (
    <div className="about-grid">
        <img
            src={profileImg}
            alt="Rochambeau Boquilon"
            className="about-photo"
        />
        <div>
            <h2 className="panel-title">Hi, I'm Rochambeau.</h2>
            <p className="panel-text">
                Web developer building with <b>React</b>, and a hobbyist who
                ships projects for the fun of it. I'm especially interested in
                AI models: <b>robotics</b>, vision-language-action (<b>VLA</b>)
                models, <b>computer vision</b> and <b>LLMs</b>.
            </p>
            <div className="hero-cta">
                <button className="btn btn-primary" onClick={onSeeWorks}>
                    See my work
                </button>
                <button
                    className="btn btn-ghost"
                    onClick={() => onNavigate("contact")}
                >
                    Get in touch
                </button>
            </div>
        </div>
    </div>
);

const SkillsBody = () => (
    <div className="skills-body">
        {SKILLS.map((s) => (
            <div key={s.group} className="skill-group">
                <h3>{s.group}</h3>
                <div className="tag-container">
                    {s.items.map((item) => (
                        <span key={item} className="tag">
                            {item}
                        </span>
                    ))}
                </div>
            </div>
        ))}
    </div>
);

// Review screenshots, one card per person (edit the REVIEWS list near the top)
const ReviewsBody = () => {
    const [zoom, setZoom] = useState(null);
    const closeZoom = useCallback(() => setZoom(null), []);

    return (
        <div>
            <h2 className="panel-title">Reviews</h2>
            <p className="panel-text">
                Kind words from people I've worked with. Tap a screenshot to
                view it full size.
            </p>

            {REVIEWS.length === 0 && (
                <p className="panel-text">Reviews coming soon.</p>
            )}

            <ul className="review-list">
                {REVIEWS.map((r, i) => (
                    <li key={i} className="review-card">
                        <div className="review-top">
                            <span className="review-name">{r.name}</span>
                            {r.source && (
                                <span className="review-source">
                                    {r.source}
                                </span>
                            )}
                        </div>

                        {r.images && r.images.length > 0 ? (
                            <div
                                className={`shot-grid ${r.images.length === 1 ? "single" : ""}`}
                            >
                                {r.images.map((src, j) => (
                                    <button
                                        key={j}
                                        type="button"
                                        className="shot-btn"
                                        onClick={() =>
                                            setZoom({
                                                src,
                                                alt: `Review from ${r.name}`,
                                            })
                                        }
                                        aria-label={`View full-size review from ${r.name}`}
                                    >
                                        <img
                                            src={src}
                                            alt={`Review from ${r.name}`}
                                            loading="lazy"
                                        />
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="shot-placeholder">
                                Screenshot coming soon
                            </div>
                        )}
                    </li>
                ))}
            </ul>

            {zoom && (
                <Lightbox src={zoom.src} alt={zoom.alt} onClose={closeZoom} />
            )}
        </div>
    );
};

const ContactBody = () => {
    const [copied, setCopied] = useState(false);
    const copyEmail = async () => {
        try {
            await navigator.clipboard.writeText(EMAIL);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch (e) {
            window.location.href = `mailto:${EMAIL}`;
        }
    };
    return (
        <div>
            <h2 className="panel-title">Let's build something great.</h2>
            <p className="panel-text">
                Open for freelance opportunities, full-time positions, or just
                chat about tech.
            </p>
            <button className="email-copy" onClick={copyEmail}>
                {copied ? "Copied to clipboard ✓" : EMAIL}
            </button>
            <div className="contact-links">
                <a href={`mailto:${EMAIL}`}>Email</a>
                <a
                    href="https://github.com/chamborgir"
                    target="_blank"
                    rel="noreferrer"
                >
                    GitHub
                </a>
                <a
                    href="https://www.linkedin.com/in/chamboquilon/"
                    target="_blank"
                    rel="noreferrer"
                >
                    LinkedIn
                </a>
                <a
                    href="https://drive.google.com/file/d/1fAk-PsTWeffaEKtN6sycKCcADZ5j3UNF/view?usp=sharing"
                    target="_blank"
                    rel="noreferrer"
                >
                    CV
                </a>
            </div>
        </div>
    );
};

/* ==================================================================
   MODAL (zooms out of the tapped node, background blurred)
   ================================================================== */

const Modal = ({
    id,
    items,
    origin,
    closing,
    onClose,
    onNavigate,
    onSeeWorks,
}) => {
    // The "Works" node opens the red helix instead of a modal, so skip it here
    const navItems = items.filter((i) => i.kind !== "works");
    const index = Math.max(
        0,
        navItems.findIndex((i) => i.id === id),
    );
    const item = navItems[index];
    const closeRef = useRef(null);

    const go = useCallback(
        (dir) =>
            onNavigate(
                navItems[(index + dir + navItems.length) % navItems.length].id,
            ),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [index, navItems.length, onNavigate],
    );

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowRight") go(1);
            if (e.key === "ArrowLeft") go(-1);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [go, onClose]);

    useEffect(() => {
        closeRef.current?.focus({ preventScroll: true });
    }, []);

    let body = null;
    if (item.kind === "about")
        body = <AboutBody onSeeWorks={onSeeWorks} onNavigate={onNavigate} />;
    if (item.kind === "project") body = <ProjectBody project={item.project} />;
    if (item.kind === "skills") body = <SkillsBody />;
    if (item.kind === "reviews") body = <ReviewsBody />;
    if (item.kind === "contact") body = <ContactBody />;

    return (
        <div
            className={`modal-root ${closing ? "closing" : ""}`}
            style={{ "--ox": `${origin.x}px`, "--oy": `${origin.y}px` }}
        >
            <div className="modal-backdrop" onClick={onClose} />
            <div className="modal-zoom">
                <div
                    className="modal-panel"
                    role="dialog"
                    aria-modal="true"
                    aria-label={item.label}
                >
                    <div className="modal-bar">
                        <span className="modal-kicker">{item.kicker}</span>
                        <div className="modal-controls">
                            <button
                                className="icon-btn"
                                onClick={() => go(-1)}
                                aria-label="Previous"
                            >
                                ‹
                            </button>
                            <span className="modal-counter">
                                {index + 1} / {navItems.length}
                            </span>
                            <button
                                className="icon-btn"
                                onClick={() => go(1)}
                                aria-label="Next"
                            >
                                ›
                            </button>
                            <button
                                ref={closeRef}
                                className="icon-btn"
                                onClick={onClose}
                                aria-label="Close"
                            >
                                ×
                            </button>
                        </div>
                    </div>
                    <div className="modal-body" key={item.id}>
                        {body}
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ==================================================================
   HEADER
   ================================================================== */

const Header = ({ theme, toggleTheme, onHome }) => (
    <header className="header">
        <div className="header-inner">
            <button className="logo" onClick={onHome} aria-label="Home">
                RB<span className="logo-dot">.dev</span>
            </button>
            <button
                className="theme-toggle"
                onClick={toggleTheme}
                title={`Switch to ${theme === "black" ? "midnight" : "black"} theme`}
                aria-label="Switch theme"
            >
                <span className={`theme-dot ${theme}`} />
            </button>
        </div>
    </header>
);

/* ==================================================================
   APP
   ================================================================== */

export default function App() {
    const [theme, setTheme] = useState(() =>
        lsGet("theme") === "midnight" ? "midnight" : "black",
    );
    const [view, setView] = useState("main"); // "main" (blue) | "works" (red)
    const [phase, setPhase] = useState("idle"); // idle | out | in
    const [openId, setOpenId] = useState(null);
    const [origin, setOrigin] = useState({ x: 0, y: 0 });
    const [closing, setClosing] = useState(false);

    const helixRef = useRef(null);
    const lastFocus = useRef(null);
    const openIdRef = useRef(null);
    const closingRef = useRef(false);
    const navigatedRef = useRef(false);
    const busyRef = useRef(false);
    openIdRef.current = openId;

    const typed = useTypewriter(ROLES);
    const items = view === "works" ? WORK_ITEMS : MAIN_ITEMS;

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        lsSet("theme", theme);
    }, [theme]);

    // Dive into / out of the red helix
    const switchView = useCallback((next, el) => {
        if (busyRef.current) return;
        busyRef.current = true;
        const r = el?.getBoundingClientRect();
        setOrigin(
            r
                ? { x: r.left + r.width / 2, y: r.top + r.height / 2 }
                : { x: window.innerWidth / 2, y: window.innerHeight / 2 },
        );
        setPhase("out");
        setTimeout(() => {
            setView(next);
            setPhase("in");
            setTimeout(() => {
                setPhase("idle");
                busyRef.current = false;
            }, 650);
        }, 450);
    }, []);

    const openItem = useCallback(
        (id, el) => {
            const it = ALL_ITEMS.find((i) => i.id === id);
            if (!it) return;
            if (it.kind === "works") {
                switchView("works", el);
                return;
            }
            lastFocus.current = document.activeElement;
            navigatedRef.current = false;
            if (el) {
                const r = el.getBoundingClientRect();
                setOrigin({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
            }
            closingRef.current = false;
            setClosing(false);
            setOpenId(id);
        },
        [switchView],
    );

    const navigate = useCallback((id) => {
        navigatedRef.current = true;
        setOpenId(id);
    }, []);

    const closeModal = useCallback(() => {
        if (closingRef.current) return;
        closingRef.current = true;
        setClosing(true);
        setTimeout(() => {
            const id = openIdRef.current;
            setOpenId(null);
            setClosing(false);
            closingRef.current = false;
            requestAnimationFrame(() => {
                // If you browsed with the arrows, turn the helix to where you ended up
                if (navigatedRef.current) helixRef.current?.focusItem(id);
                lastFocus.current?.focus?.({ preventScroll: true });
            });
        }, 280);
    }, []);

    const seeWorks = useCallback(() => {
        closeModal();
        setTimeout(() => switchView("works", null), 340);
    }, [closeModal, switchView]);

    const goHome = () => {
        if (view === "works") switchView("main", null);
        else helixRef.current?.focusItem("about");
    };

    // Esc on the red helix goes back to the main one
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "Escape" && !openIdRef.current && view === "works") {
                switchView("main", null);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [view, switchView]);

    return (
        <div
            className={`app view-${view} phase-${phase} ${openId ? "modal-open" : ""}`}
            style={{ "--ox": `${origin.x}px`, "--oy": `${origin.y}px` }}
        >
            <CursorGlow />
            <Header
                theme={theme}
                toggleTheme={() =>
                    setTheme((t) => (t === "black" ? "midnight" : "black"))
                }
                onHome={goHome}
            />

            {view === "works" ? (
                <div className="intro" key="works">
                    <span className="hero-eyebrow">
                        <span className="status-dot" /> Selected works
                    </span>
                    <div className="intro-row">
                        <h1>Things I've built.</h1>
                        <button
                            className="back-btn"
                            onClick={() => switchView("main", null)}
                            aria-label="Back to main helix"
                        >
                            Return
                        </button>
                    </div>
                    <p className="subtitle">
                        Hover a node to peek at the project, tap it to open the
                        full preview.
                    </p>
                </div>
            ) : (
                <div className="intro" key="main">
                    <span className="hero-eyebrow">
                        <span className="status-dot" /> Available for work
                    </span>
                    <h1>Hi, I'm Rochambeau.</h1>
                    <p className="typed-line">
                        I build <span className="typed">{typed}</span>
                        <span className="caret" aria-hidden="true" />
                    </p>
                    <p className="subtitle">
                        Web developer working with <b>React</b>, with a deep
                        interest in AI models, especially <b>robotics</b>,{" "}
                        <b>VLAs</b>, <b>computer vision</b> and <b>LLMs</b>. I
                        build projects as a hobby.
                    </p>
                </div>
            )}

            <div className="view-wrap">
                <Helix
                    key={view}
                    ref={helixRef}
                    items={items}
                    onOpen={openItem}
                    activeId={openId}
                    paused={!!openId}
                />
            </div>

            <p className="hint">
                {view === "works"
                    ? "Drag to spin · tap a node to open · Esc to go back"
                    : "Drag to spin · tap a node to explore"}
            </p>
            <footer className="site-foot">
                © {new Date().getFullYear()} — Built with React
            </footer>

            {openId && (
                <Modal
                    id={openId}
                    items={items}
                    origin={origin}
                    closing={closing}
                    onClose={closeModal}
                    onNavigate={navigate}
                    onSeeWorks={seeWorks}
                />
            )}
        </div>
    );
}
