import React, {
    useState,
    useEffect,
    useRef,
    useCallback,
    forwardRef,
    useImperativeHandle,
} from "react";
import * as THREE from "three";
import { createPortal } from "react-dom";
import "./index.css";
import profileImg from "./assets/pfp1.jpg";
import work1Img from "./assets/work1.gif";
import work2Img from "./assets/work2.gif";
import work3Img from "./assets/work3.gif";
import work4Img from "./assets/work4.gif";
import work5Img from "./assets/work5.gif";
// import work6Img from "./assets/work6.gif";
// import work7Img from "./assets/work7.gif";

/* ==================================================================
   DATA
   ================================================================== */

const EMAIL = "chamboquilon1@gmail.com";

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
        type: "Games",
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
    // Add more works here and they appear on the helix automatically:
    // {
    //     short: "Project 6",
    //     image: null, // e.g. work6Img
    //     type: "Web",
    //     title: "Project Title #6",
    //     category: "Project #6",
    //     desc: "Short description.",
    //     tags: ["React"],
    //     links: [{ label: "GitHub", url: "#" }],
    // },
];

const SKILLS = [
    {
        group: "Programming Languages",
        items: [
            "Python",
            "JavaScript (ES6+)",
            "C++",
            "Java",
            "GDScript",
            "SQL",
        ],
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

const ROLES = [
    "modular React apps",
    "AI-powered systems",
    "robotic pipelines",
    "interactive 3D games",
];

// Everything that lives on the helix, from top to bottom
const ITEMS = [
    { id: "about", kind: "about", label: "About", kicker: "About me" },
    ...projectList.map((p, i) => ({
        id: `work-${i + 1}`,
        kind: "project",
        label: p.short,
        kicker: `${p.category} · ${p.type}`,
        project: p,
    })),
    {
        id: "skills",
        kind: "skills",
        label: "Skills",
        kicker: "Professional skills",
    },
    {
        id: "contact",
        kind: "contact",
        label: "Contact",
        kicker: "Get in touch",
    },
];

/* ==================================================================
   HELIX GEOMETRY (world units)
   ================================================================== */

const TAU = Math.PI * 2;
const RADIUS = 1.6;
const HEIGHT = 9;
const TURNS = 2.2;
const PAIRS = ITEMS.length * 3; // rungs; every 3rd one carries a node
const FOV = 40;
const CAM_Z = 14;

// Node k sits at parameter t along the helix, alternating strands
const nodeT = (k) => (k + 0.5) / ITEMS.length;
const nodeAngle = (k) => nodeT(k) * TURNS * TAU + (k % 2) * Math.PI;
const nodeY = (k) => (0.5 - nodeT(k)) * HEIGHT;

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
   THE HELIX (Three.js scene + DOM hit areas and cloud hints)
   ================================================================== */

const Helix = forwardRef(function Helix({ onOpen, activeId, paused }, ref) {
    const stageRef = useRef(null);
    const mountRef = useRef(null);
    const hitRefs = useRef({});
    const cloudRefs = useRef({});
    const hoverRef = useRef(null);
    const pausedRef = useRef(paused);
    const activeRef = useRef(activeId);
    const focusTarget = useRef(null);
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

    // Rotates the helix so a given node faces the viewer
    useImperativeHandle(ref, () => ({
        focusItem(id) {
            const k = ITEMS.findIndex((i) => i.id === id);
            if (k < 0) return;
            const want = nodeAngle(k) - Math.PI / 2;
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
        scene.fog = new THREE.Fog(0x05070d, 11.5, 18); // back strand fades into the background
        const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 60);
        camera.position.z = CAM_Z;

        const group = new THREE.Group();
        group.rotation.order = "ZXY"; // spin around the helix axis first, then tilt
        scene.add(group);

        /* ----- Materials (colours are set from CSS variables) ----- */
        const matA = new THREE.MeshBasicMaterial({ color: 0x4f8cff });
        const matB = new THREE.MeshBasicMaterial({ color: 0x8590a8 });
        const nodeMat = new THREE.MeshBasicMaterial({ color: 0x4f8cff });
        const rungMat = new THREE.LineBasicMaterial({
            color: 0x4f8cff,
            transparent: true,
            opacity: 0.28,
        });
        const glowTex = makeGlowTexture();
        const glowMat = new THREE.SpriteMaterial({
            map: glowTex,
            color: 0x4f8cff,
            transparent: true,
            opacity: 0.8,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });
        const dustMat = new THREE.PointsMaterial({
            color: 0x4f8cff,
            size: 0.04,
            transparent: true,
            opacity: 0.5,
            depthWrite: false,
        });

        /* ----- Strands: two thin tubes ----- */
        const strandGeo = (s) => {
            const pts = [];
            for (let i = 0; i <= 140; i++) {
                const t = i / 140;
                const th = t * TURNS * TAU + s * Math.PI;
                pts.push(
                    new THREE.Vector3(
                        Math.cos(th) * RADIUS,
                        (0.5 - t) * HEIGHT,
                        Math.sin(th) * RADIUS,
                    ),
                );
            }
            return new THREE.TubeGeometry(
                new THREE.CatmullRomCurve3(pts),
                140,
                0.03,
                6,
                false,
            );
        };
        const geoA = strandGeo(0);
        const geoB = strandGeo(1);
        group.add(new THREE.Mesh(geoA, matA), new THREE.Mesh(geoB, matB));

        /* ----- Base pairs: thin rungs + tiny spheres at each end ----- */
        const baseGeo = new THREE.SphereGeometry(0.05, 8, 8);
        const baseA = new THREE.InstancedMesh(baseGeo, matA, PAIRS);
        const baseB = new THREE.InstancedMesh(baseGeo, matB, PAIRS);
        const dummy = new THREE.Object3D();
        const rungPts = [];
        for (let j = 0; j < PAIRS; j++) {
            const t = (j + 0.5) / PAIRS;
            const th = t * TURNS * TAU;
            const y = (0.5 - t) * HEIGHT;
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

        /* ----- Content nodes: a sphere + soft glow for each portfolio part ----- */
        const nodeGeo = new THREE.SphereGeometry(0.13, 16, 16);
        const nodeLocal = [];
        const nodeMeshes = [];
        const nodeGlows = [];
        ITEMS.forEach((_, k) => {
            const th = nodeAngle(k);
            const pos = new THREE.Vector3(
                Math.cos(th) * RADIUS,
                nodeY(k),
                Math.sin(th) * RADIUS,
            );
            nodeLocal.push(pos);
            const mesh = new THREE.Mesh(nodeGeo, nodeMat);
            mesh.position.copy(pos);
            const glow = new THREE.Sprite(glowMat);
            glow.position.copy(pos);
            glow.scale.setScalar(0.7);
            group.add(mesh, glow);
            nodeMeshes.push(mesh);
            nodeGlows.push(glow);
        });

        /* ----- A little drifting dust (tiny, cheap) ----- */
        const dustCount = 70;
        const dustPos = new Float32Array(dustCount * 3);
        for (let i = 0; i < dustCount; i++) {
            dustPos[i * 3] = (Math.random() - 0.5) * 8;
            dustPos[i * 3 + 1] = (Math.random() - 0.5) * 10;
            dustPos[i * 3 + 2] = (Math.random() - 0.5) * 6;
        }
        const dustGeo = new THREE.BufferGeometry();
        dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
        const dust = new THREE.Points(dustGeo, dustMat);
        scene.add(dust);

        /* ----- Theme colours ----- */
        const applyTheme = () => {
            const cs = getComputedStyle(document.documentElement);
            const accent = cs.getPropertyValue("--accent").trim();
            const muted = cs.getPropertyValue("--text-muted").trim();
            const bg = cs.getPropertyValue("--bg-color").trim();
            matA.color.set(accent);
            nodeMat.color.set(accent);
            rungMat.color.set(accent);
            glowMat.color.set(accent);
            dustMat.color.set(accent);
            matB.color.set(muted);
            scene.fog.color.set(bg);
        };
        applyTheme();
        const themeObserver = new MutationObserver(applyTheme);
        themeObserver.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["data-theme"],
        });

        /* ----- Layout: fit the whole helix into the free area of the screen ----- */
        let W = 0;
        let H = 0;
        let fitScale = 1;
        const layout = () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            // Ignore small height jitters from mobile address bars
            if (w === W && Math.abs(h - H) < 120) return;
            W = w;
            H = h;
            renderer.setSize(w, h, false);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();

            const wpp = (2 * Math.tan((FOV * Math.PI) / 360) * CAM_Z) / h; // world per pixel
            const mobile = w < 700;
            const top = mobile ? 235 : 90; // phones reserve room for the intro text
            const bottom = mobile ? 70 : 60;
            const regionH = Math.max(240, h - top - bottom);
            const widthPx = mobile ? w * 0.5 : Math.min(w * 0.3, 420);
            fitScale = Math.min(
                (regionH * wpp) / HEIGHT,
                (widthPx * wpp) / (2 * RADIUS),
            );
            const cxPx = mobile ? w / 2 : w * 0.62;
            const cyPx = top + regionH / 2;

            group.scale.setScalar(fitScale);
            group.position.set((cxPx - w / 2) * wpp, (h / 2 - cyPx) * wpp, 0);
            dust.scale.setScalar(fitScale);
            dust.position.copy(group.position);
        };
        layout();
        window.addEventListener("resize", layout);

        /* ----- Extra input: mouse wheel and arrow keys spin the helix ----- */
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
        const hotAmt = ITEMS.map(() => 0);
        let idle = 0.22;
        let spinDust = 0;
        let last = performance.now();
        let raf;

        const tick = (now) => {
            raf = requestAnimationFrame(tick);
            const dt = Math.min((now - last) / 1000, 0.05);
            last = now;
            if (pausedRef.current) return; // freeze while a modal is open

            const s = st.current;

            // Auto-spin slows down while a node is hovered so it's easy to click
            const idleTarget = reduce ? 0 : hoverRef.current ? 0.03 : 0.22;
            idle += (idleTarget - idle) * Math.min(1, dt * 4);

            if (!s.active) {
                s.angle += s.vel;
                s.vel *= 0.95;
                if (Math.abs(s.vel) < 1e-4) s.vel = 0;
                s.tilt += (0 - s.tilt) * Math.min(1, dt * 2); // vertical drag eases back
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

            // Project every node to the screen for its hit area + cloud hint
            ITEMS.forEach((it, k) => {
                tmp.copy(nodeLocal[k]).applyMatrix4(group.matrixWorld);
                const front =
                    THREE.MathUtils.clamp(
                        (tmp.z - group.position.z) / (RADIUS * fitScale),
                        -1,
                        1,
                    ) *
                        0.5 +
                    0.5;
                proj.copy(tmp).project(camera);
                const sx = (proj.x * 0.5 + 0.5) * W;
                const sy = (-proj.y * 0.5 + 0.5) * H;

                const hot =
                    hoverRef.current === it.id || activeRef.current === it.id;
                hotAmt[k] += ((hot ? 1 : 0) - hotAmt[k]) * Math.min(1, dt * 10);
                nodeMeshes[k].scale.setScalar(1 + 0.7 * hotAmt[k]);
                nodeGlows[k].scale.setScalar(0.7 + 0.9 * hotAmt[k]);

                const hit = hitRefs.current[it.id];
                if (hit) {
                    hit.style.transform = `translate3d(${sx}px,${sy}px,0) translate(-50%,-50%)`;
                }
                const cloud = cloudRefs.current[it.id];
                if (cloud) {
                    // Clouds appear for nodes facing you, or any node you hover/focus
                    const vis = hot ? 1 : clamp01((front - 0.55) / 0.35);
                    const cx = Math.max(60, Math.min(W - 60, sx));
                    cloud.style.opacity = vis;
                    cloud.style.transform = `translate3d(${cx}px,${sy - 20 - hotAmt[k] * 4}px,0) translate(-50%,-100%)`;
                }
            });

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
            [matA, matB, nodeMat, rungMat, glowMat, dustMat].forEach((m) =>
                m.dispose(),
            );
            glowTex.dispose();
            renderer.dispose();
            renderer.forceContextLoss();
            if (renderer.domElement.parentNode === mount) {
                mount.removeChild(renderer.domElement);
            }
        };
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
                    {ITEMS.map((item) => (
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
                ITEMS.map((item) => (
                    <React.Fragment key={item.id}>
                        <div
                            className="cloud"
                            ref={(el) => (cloudRefs.current[item.id] = el)}
                            aria-hidden="true"
                        >
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
                                // Keyboard users: turn the helix so the node faces them
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

// Full-screen GIF viewer. Rendered in a portal so the modal can't clip it.
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

const AboutBody = ({ onNavigate }) => (
    <div className="about-grid">
        <img
            src={profileImg}
            alt="Rochambeau Boquilon"
            className="about-photo"
        />
        <div>
            <h2 className="panel-title">Hi, I'm Rochambeau.</h2>
            <p className="panel-text">
                Software developer building modular, scalable web applications
                with <b>React</b> and <b>AI integration</b>. Designing complex
                interactive systems across <b>Robotics</b>.
            </p>
            <div className="hero-cta">
                <button
                    className="btn btn-primary"
                    onClick={() => onNavigate("work-1")}
                >
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
   MODAL (zooms out of the clicked node, background blurred)
   ================================================================== */

const Modal = ({ id, origin, closing, onClose, onNavigate }) => {
    const index = ITEMS.findIndex((i) => i.id === id);
    const item = ITEMS[index];
    const closeRef = useRef(null);

    const go = useCallback(
        (dir) =>
            onNavigate(ITEMS[(index + dir + ITEMS.length) % ITEMS.length].id),
        [index, onNavigate],
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
    if (item.kind === "about") body = <AboutBody onNavigate={onNavigate} />;
    if (item.kind === "project") body = <ProjectBody project={item.project} />;
    if (item.kind === "skills") body = <SkillsBody />;
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
                                {index + 1} / {ITEMS.length}
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
            <button
                className="logo"
                onClick={onHome}
                aria-label="Turn helix to About"
            >
                RB<span className="logo-dot">.</span>
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
    const [theme, setTheme] = useState(() => {
        try {
            return localStorage.getItem("theme") === "midnight"
                ? "midnight"
                : "black";
        } catch (e) {
            return "black";
        }
    });
    const [openId, setOpenId] = useState(null);
    const [origin, setOrigin] = useState({ x: 0, y: 0 });
    const [closing, setClosing] = useState(false);

    const helixRef = useRef(null);
    const lastFocus = useRef(null);
    const openIdRef = useRef(null);
    const closingRef = useRef(false);
    const navigatedRef = useRef(false);
    openIdRef.current = openId;

    const typed = useTypewriter(ROLES);

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        try {
            localStorage.setItem("theme", theme);
        } catch (e) {
            /* storage unavailable */
        }
    }, [theme]);

    const openItem = useCallback((id, el) => {
        lastFocus.current = document.activeElement;
        navigatedRef.current = false;
        if (el) {
            const r = el.getBoundingClientRect();
            setOrigin({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
        }
        closingRef.current = false;
        setClosing(false);
        setOpenId(id);
    }, []);

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

    return (
        <div className={`app ${openId ? "modal-open" : ""}`}>
            <CursorGlow />
            <Header
                theme={theme}
                toggleTheme={() =>
                    setTheme((t) => (t === "black" ? "midnight" : "black"))
                }
                onHome={() => helixRef.current?.focusItem("about")}
            />

            <div className="intro">
                <span className="hero-eyebrow">
                    <span className="status-dot" /> Available for work
                </span>
                <h1>Hi, I'm Rochambeau.</h1>
                <p className="typed-line">
                    I build <span className="typed">{typed}</span>
                    <span className="caret" aria-hidden="true" />
                </p>
                <p className="subtitle">
                    Software developer across <b>Web</b>, <b>AI</b>, and{" "}
                    <b>Robotics</b> .
                </p>
            </div>

            <Helix
                ref={helixRef}
                onOpen={openItem}
                activeId={openId}
                paused={!!openId}
            />

            <p className="hint">Drag to spin · tap a node to explore</p>
            <footer className="site-foot">
                © {new Date().getFullYear()} — Built with React + Three.js
            </footer>

            {openId && (
                <Modal
                    id={openId}
                    origin={origin}
                    closing={closing}
                    onClose={closeModal}
                    onNavigate={navigate}
                />
            )}
        </div>
    );
}
