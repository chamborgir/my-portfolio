import React, { useState, useEffect, useRef, useCallback } from "react";
import "./index.css";
import Helix, { MORPH_MS } from "./Helix";
import Modal from "./Modal";
import { QuickNav, NavMenu } from "./QuickNav";
import { MAIN_ITEMS } from "./Pages";
import { PROJECT_ITEMS } from "./Projects";

const ALL_ITEMS = [...MAIN_ITEMS, ...PROJECT_ITEMS];

const ROLES = [
    "modern React apps",
    "AI-powered tools",
    "robotic VLA pipelines",
    "computer vision projects",
    "LLM-driven apps",
];

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

/* ------------------------------------------------------------------
   Small helpers
   ------------------------------------------------------------------ */

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

const Header = ({ theme, toggleTheme, onHome, nav }) => (
    <header className="header">
        <div className="header-inner">
            <button className="logo" onClick={onHome} aria-label="Home">
                RB<span className="logo-dot">.dev</span>
            </button>
            <div className="header-actions">
                {/* Phone-portrait only: the quick-navigation list as a button */}
                <NavMenu {...nav} />
                <button
                    className="theme-toggle"
                    onClick={toggleTheme}
                    title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
                    aria-label="Switch theme"
                >
                    <span className={`theme-dot ${theme}`} />
                </button>
            </div>
        </div>
    </header>
);
// React's atom mark, slowly spinning like the original
const ReactMark = () => (
    <svg
        className="tech-mark react-spin"
        viewBox="-11.5 -10.2 23 20.4"
        width="16"
        height="16"
        aria-hidden="true"
    >
        <circle r="2.05" fill="currentColor" />
        <g stroke="currentColor" strokeWidth="1" fill="none">
            <ellipse rx="11" ry="4.2" />
            <ellipse rx="11" ry="4.2" transform="rotate(60)" />
            <ellipse rx="11" ry="4.2" transform="rotate(120)" />
        </g>
    </svg>
);

// Three.js-style mark: a tilted triangle built from smaller triangles.
// Change TILT to rotate it more or less.
const TILT = -15;
const ThreeMark = () => (
    <svg
        className="tech-mark"
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        aria-hidden="true"
    >
        <g transform={`rotate(${TILT} 12 13)`}>
            <path d="M12 3 L21.5 20 L2.5 20 Z" />
            <path d="M16.75 11.5 L7.25 11.5 L12 20 Z" />
        </g>
    </svg>
);

/* ------------------------------------------------------------------
   App
   ------------------------------------------------------------------ */

export default function App() {
    const [theme, setTheme] = useState(() =>
        lsGet("theme") === "light" ? "light" : "dark",
    );
    // `view` is where the helix is morphing TO; `uiView` is what the text, colours
    // and lists show. The UI switches halfway through the morph.
    const [view, setView] = useState("main"); // "main" | "projects"
    const [uiView, setUiView] = useState("main");
    const [phase, setPhase] = useState("idle"); // idle | out | in
    const [frontId, setFrontId] = useState(null); // node currently facing you
    const [openId, setOpenId] = useState(null);
    const [origin, setOrigin] = useState({ x: 0, y: 0 });
    const [closing, setClosing] = useState(false);

    const helixRef = useRef(null);
    const lastFocus = useRef(null);
    const openIdRef = useRef(null);
    const frontIdRef = useRef(null);
    const closingRef = useRef(false);
    const navigatedRef = useRef(false);
    const busyRef = useRef(false);
    openIdRef.current = openId;
    frontIdRef.current = frontId;

    const typed = useTypewriter(ROLES);
    const items = uiView === "projects" ? PROJECT_ITEMS : MAIN_ITEMS;

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        lsSet("theme", theme);
    }, [theme]);

    // The intro text changes with the view: let the helix re-measure its framing
    useEffect(() => {
        helixRef.current?.relayout();
    }, [uiView]);

    // Morph between main and project nodes on the shared DNA helix (the same call
    // plays it forwards or in reverse)
    const switchView = useCallback((next) => {
        if (busyRef.current) return;
        busyRef.current = true;
        setPhase("out");
        setView(next); // the 3D scene starts morphing right away
        setTimeout(() => {
            setUiView(next); // halfway: swap the text, colours and lists
            setFrontId(null);
            setPhase("in");
        }, MORPH_MS * 0.5);
        setTimeout(() => {
            setPhase("idle");
            busyRef.current = false;
        }, MORPH_MS + 80);
    }, []);

    const openItem = useCallback(
        (id, el) => {
            const it = ALL_ITEMS.find((i) => i.id === id);
            if (!it) return;
            if (it.kind === "home") {
                switchView("main");
                return;
            }
            if (it.kind === "hub") {
                switchView("projects");
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

    // Quick navigation: the first tap turns a node to the front,
    // tapping the node that is already in front opens it.
    const goTo = useCallback(
        (id) => {
            if (busyRef.current || openIdRef.current) return;
            if (id === "home") {
                openItem(id, helixRef.current?.nodeEl(id));
                return;
            }
            if (frontIdRef.current === id) {
                openItem(id, helixRef.current?.nodeEl(id));
            } else {
                helixRef.current?.focusItem(id);
            }
        },
        [openItem],
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
        }, 200);
    }, []);

    const seeProjects = useCallback(() => {
        closeModal();
        setTimeout(() => switchView("projects"), 240);
    }, [closeModal, switchView]);

    const goHome = () => {
        if (view === "projects") switchView("main");
        else helixRef.current?.focusItem("about");
    };

    // Esc on the Projects view goes back to the main helix
    useEffect(() => {
        const onKey = (e) => {
            if (
                e.key === "Escape" &&
                !openIdRef.current &&
                view === "projects"
            ) {
                switchView("main");
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [view, switchView]);

    const nav = {
        items,
        activeId: frontId,
        onSelect: goTo,
        title: uiView === "projects" ? "Projects" : "Contents",
    };

    return (
        <div
            className={`app view-${uiView} phase-${phase} ${openId ? "modal-open" : ""}`}
            style={{ "--ox": `${origin.x}px`, "--oy": `${origin.y}px` }}
        >
            <CursorGlow />
            <Header
                theme={theme}
                toggleTheme={() =>
                    setTheme((t) => (t === "dark" ? "light" : "dark"))
                }
                onHome={goHome}
                nav={nav}
            />

            {uiView === "projects" ? (
                <div className="intro" key="projects" data-view="projects">
                    <span className="hero-eyebrow">
                        <span className="status-dot" /> Selected projects
                    </span>
                    <div className="intro-row">
                        <h1>Things I've built.</h1>
                        {/* <button
                            className="back-btn"
                            onClick={() => switchView("main")}
                            aria-label="Back to main helix"
                        >
                            Back
                        </button> */}
                    </div>
                    <p className="subtitle">
                        Same DNA double helix, with one glowing node for each
                        project. Hover to peek, tap a node to open.
                    </p>
                </div>
            ) : (
                <div className="intro" key="main" data-view="main">
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
                    ref={helixRef}
                    mainItems={MAIN_ITEMS}
                    projectItems={PROJECT_ITEMS}
                    view={view}
                    onOpen={openItem}
                    onFrontChange={setFrontId}
                    activeId={openId}
                    paused={!!openId}
                />
            </div>

            {/* Desktop: faded table of contents to the right of the helix */}
            <QuickNav key={`nav-${uiView}`} {...nav} />

            <p className="hint">
                {uiView === "projects"
                    ? "Drag to spin · tap a node to open"
                    : "Drag to spin · tap a node to explore"}
            </p>
            <footer className="site-foot">
                <span>© {new Date().getFullYear()} — Built with</span>
                <span className="tech">
                    <ReactMark /> React
                </span>
                <span>+</span>
                <span className="tech">
                    <ThreeMark /> Three.js
                </span>
            </footer>

            {openId && (
                <Modal
                    id={openId}
                    items={items}
                    origin={origin}
                    closing={closing}
                    onClose={closeModal}
                    onNavigate={navigate}
                    onSeeProjects={seeProjects}
                />
            )}
        </div>
    );
}
