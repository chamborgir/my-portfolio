import React, { useState, useEffect, useRef, useCallback } from "react";
import "./index.css";
import profileImg from "./assets/pfp1.jpg";
import work1Img from "./assets/work1.gif";
import work2Img from "./assets/work2.gif";
import work3Img from "./assets/work3.gif";
// TODO: add your new GIFs to ./assets, then uncomment and use them below:
import work4Img from "./assets/work4.gif";
import work5Img from "./assets/work5.gif";
// import work6Img from "./assets/work6.gif";
// import work7Img from "./assets/work7.gif";

/* ------------------------------------------------------------------
   Hooks & small helpers
   ------------------------------------------------------------------ */

// Fades/slides elements in when they scroll into view
const Reveal = ({ children, delay = 0 }) => {
    const ref = useRef(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        if (!("IntersectionObserver" in window)) {
            setVisible(true);
            return;
        }
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.12 },
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return (
        <div
            ref={ref}
            className={`reveal ${visible ? "is-visible" : ""}`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            {children}
        </div>
    );
};

// Highlights the nav link of the section currently in view
const useActiveSection = (ids) => {
    const [active, setActive] = useState(ids[0]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) setActive(entry.target.id);
                });
            },
            { rootMargin: "-45% 0px -45% 0px" },
        );
        ids.forEach((id) => {
            const el = document.getElementById(id);
            if (el) observer.observe(el);
        });
        return () => observer.disconnect();
    }, [ids]);

    return active;
};

// Types and deletes a rotating list of phrases
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

/* ------------------------------------------------------------------
   Ambient UI: scroll progress, cursor glow, back-to-top
   ------------------------------------------------------------------ */

const ScrollProgress = () => {
    const barRef = useRef(null);

    useEffect(() => {
        const onScroll = () => {
            const doc = document.documentElement;
            const max = doc.scrollHeight - doc.clientHeight;
            const pct = max > 0 ? doc.scrollTop / max : 0;
            if (barRef.current) {
                barRef.current.style.transform = `scaleX(${pct})`;
            }
        };
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return <div className="scroll-progress" ref={barRef} aria-hidden="true" />;
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

const BackToTop = () => {
    const [show, setShow] = useState(false);

    useEffect(() => {
        const onScroll = () => setShow(window.scrollY > 600);
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <button
            className={`back-to-top ${show ? "show" : ""}`}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Back to top"
        >
            ↑
        </button>
    );
};

/* ------------------------------------------------------------------
   Layout components
   ------------------------------------------------------------------ */

const NAV_ITEMS = [
    { id: "about", label: "About" },
    { id: "projects", label: "Work" },
    { id: "contact", label: "Contact" },
];

// Tracks scroll position to style and auto-hide the navbar
// Tracks scroll position to style and auto-hide the navbar
const useNavScroll = () => {
    const [scrolled, setScrolled] = useState(false);
    const [hidden, setHidden] = useState(false);

    useEffect(() => {
        const HOVER_ZONE = 90; // px from the top of the screen that reveals the navbar
        let lastY = window.scrollY;
        let ticking = false;
        let mouseNearTop = false;

        const update = () => {
            const y = window.scrollY;
            setScrolled(y > 20);
            // Hide when scrolling down past the first screen, show when scrolling up.
            // Never hide while the mouse is resting near the top.
            if (y > lastY && y > 200 && !mouseNearTop) setHidden(true);
            else if (y < lastY) setHidden(false);
            lastY = y;
            ticking = false;
        };

        const onScroll = () => {
            if (!ticking) {
                requestAnimationFrame(update);
                ticking = true;
            }
        };

        const onMouseMove = (e) => {
            mouseNearTop = e.clientY <= HOVER_ZONE;
            if (mouseNearTop) setHidden(false);
        };

        // Cursor leaves the window through the top edge: reveal the navbar too
        const onMouseOut = (e) => {
            if (!e.relatedTarget && e.clientY <= HOVER_ZONE) {
                mouseNearTop = true;
                setHidden(false);
            }
        };

        update();
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("mousemove", onMouseMove, { passive: true });
        document.addEventListener("mouseout", onMouseOut);
        return () => {
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseout", onMouseOut);
        };
    }, []);

    return { scrolled, hidden };
};

const Header = ({ theme, toggleTheme, active }) => {
    const { scrolled, hidden } = useNavScroll();

    return (
        <header
            className={`header ${scrolled ? "scrolled" : ""} ${hidden ? "hidden" : ""}`}
        >
            <div className="header-inner">
                <a href="#about" className="logo" aria-label="Back to top">
                    RB<span className="logo-dot">.</span>
                </a>
                <div className="header-right">
                    <nav className="nav">
                        {NAV_ITEMS.map((item) => (
                            <a
                                key={item.id}
                                href={`#${item.id}`}
                                className={active === item.id ? "active" : ""}
                            >
                                {item.label}
                            </a>
                        ))}
                    </nav>
                    <button
                        className="theme-toggle"
                        onClick={toggleTheme}
                        title={`Switch to ${theme === "black" ? "midnight" : "black"} theme`}
                        aria-label="Switch theme"
                    >
                        <span className={`theme-dot ${theme}`} />
                    </button>
                </div>
            </div>
        </header>
    );
};

const ROLES = [
    "modular React apps",
    "AI-powered systems",
    "robotic pipelines",
    "interactive 3D games",
];

const About = () => {
    const typed = useTypewriter(ROLES);

    return (
        <section id="about" className="section hero-section">
            <div className="section-content hero-container">
                <div className="hero-text">
                    <span className="hero-eyebrow">
                        <span className="status-dot" /> Available for work
                    </span>
                    <h1>Hi, I'm Rochambeau.</h1>
                    <p className="typed-line">
                        I build <span className="typed">{typed}</span>
                        <span className="caret" aria-hidden="true" />
                    </p>
                    <p className="subtitle">
                        Software developer building modular, scalable web
                        applications with <b>React</b> and <b>AI integration</b>
                        . Designing complex interactive systems across{" "}
                        <b>Robotics</b> and <b>Game Development</b>.
                    </p>
                    <div className="hero-cta">
                        <a href="#projects" className="btn btn-primary">
                            View my work
                        </a>
                        <a href="#contact" className="btn btn-ghost">
                            Get in touch
                        </a>
                    </div>
                </div>
                <div className="hero-image-wrapper">
                    <div className="profile-frame">
                        <img
                            src={profileImg}
                            alt="Rochambeau Boquilon"
                            className="profile-image"
                        />
                    </div>
                </div>
            </div>
        </section>
    );
};

/* ------------------------------------------------------------------
   Modal (maximized GIF view with prev / next)
   ------------------------------------------------------------------ */

const ImageModal = ({ project, gallery, onNavigate, onClose }) => {
    const index = project
        ? gallery.findIndex((p) => p.title === project.title)
        : -1;

    const go = useCallback(
        (dir) => {
            if (gallery.length < 2 || index === -1) return;
            const next = (index + dir + gallery.length) % gallery.length;
            onNavigate(gallery[next]);
        },
        [gallery, index, onNavigate],
    );

    useEffect(() => {
        if (!project) return;
        const onKey = (e) => {
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowRight") go(1);
            if (e.key === "ArrowLeft") go(-1);
        };
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener("keydown", onKey);
        };
    }, [project, onClose, go]);

    if (!project) return null;

    return (
        <div
            className="modal-backdrop"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label={`${project.title} preview`}
        >
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button
                    className="modal-close"
                    onClick={onClose}
                    aria-label="Close preview"
                >
                    ×
                </button>

                {gallery.length > 1 && (
                    <>
                        <button
                            className="modal-nav prev"
                            onClick={() => go(-1)}
                            aria-label="Previous project"
                        >
                            ‹
                        </button>
                        <button
                            className="modal-nav next"
                            onClick={() => go(1)}
                            aria-label="Next project"
                        >
                            ›
                        </button>
                    </>
                )}

                <img
                    key={project.title}
                    src={project.image}
                    alt={`${project.title} full preview`}
                    className="modal-image"
                />
                <p className="modal-caption">
                    {project.title}
                    {gallery.length > 1 && index !== -1 && (
                        <span className="modal-counter">
                            {index + 1} / {gallery.length}
                        </span>
                    )}
                </p>
            </div>
        </div>
    );
};

/* ------------------------------------------------------------------
   Projects
   ------------------------------------------------------------------ */

const projectList = [
    {
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

    /* ----- NEW WORKS: replace the placeholder text, type, links and image ----- */
    {
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
    // {
    //     image: null, // e.g. work6Img
    //     type: "Web",
    //     title: "Project Title #6",
    //     category: "Project #6",
    //     desc: "Short description of what this project does, the problem it solves, and your role in building it.",
    //     tags: ["React", "Tag 2", "Tag 3"],
    //     links: [{ label: "GitHub", url: "#" }],
    // },
    // {
    //     image: null, // e.g. work7Img
    //     type: "Web",
    //     title: "Project Title #7",
    //     category: "Project #7",
    //     desc: "Short description of what this project does, the problem it solves, and your role in building it.",
    //     tags: ["React", "Tag 2", "Tag 3"],
    //     links: [{ label: "GitHub", url: "#" }],
    // },
];

const FILTERS = ["All", ...Array.from(new Set(projectList.map((p) => p.type)))];

const ProjectCard = ({ proj, onExpand }) => {
    // Feeds the cursor position to CSS for the spotlight border/glow
    const handleMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty("--x", `${e.clientX - rect.left}px`);
        e.currentTarget.style.setProperty("--y", `${e.clientY - rect.top}px`);
    };

    return (
        <article className="project-card" onMouseMove={handleMove}>
            <span className="project-category">
                {proj.category} · {proj.type}
            </span>

            {proj.image ? (
                <button
                    type="button"
                    className="project-image-container"
                    onClick={() => onExpand(proj)}
                    aria-label={`Expand ${proj.title} preview`}
                >
                    <img
                        src={proj.image}
                        alt={`${proj.title} thumbnail`}
                        className="project-image"
                        loading="lazy"
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
                <div className="project-image-container placeholder">
                    <span>Preview coming soon</span>
                </div>
            )}

            <h3>{proj.title}</h3>
            <p>{proj.desc}</p>
            <div className="tag-container">
                {proj.tags.map((tag) => (
                    <span key={tag} className="tag">
                        {tag}
                    </span>
                ))}
            </div>
            <div className="project-links-wrapper">
                {proj.links.map((link) => {
                    // Unavailable if flagged, empty, or still a "#" placeholder
                    const unavailable =
                        link.disabled || !link.url || link.url === "#";

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
        </article>
    );
};

const Projects = ({ onExpand }) => {
    const [filter, setFilter] = useState("All");
    const visible =
        filter === "All"
            ? projectList
            : projectList.filter((p) => p.type === filter);

    return (
        <section id="projects" className="section projects-section">
            <div className="section-content">
                <h2 className="section-title">Selected Works</h2>

                <div
                    className="filter-bar"
                    role="tablist"
                    aria-label="Filter projects"
                >
                    {FILTERS.map((f) => (
                        <button
                            key={f}
                            role="tab"
                            aria-selected={filter === f}
                            className={`filter-chip ${filter === f ? "active" : ""}`}
                            onClick={() => setFilter(f)}
                        >
                            {f}
                        </button>
                    ))}
                </div>

                <div className="project-grid">
                    {visible.map((proj, idx) => (
                        <Reveal key={proj.title} delay={(idx % 2) * 90}>
                            <ProjectCard proj={proj} onExpand={onExpand} />
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    );
};

const Contact = () => {
    const [copied, setCopied] = useState(false);
    const email = "chamboquilon1@gmail.com";

    const copyEmail = async () => {
        try {
            await navigator.clipboard.writeText(email);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch (e) {
            window.location.href = `mailto:${email}`;
        }
    };

    return (
        <section id="contact" className="section contact-section">
            <div className="section-content">
                <h2 className="section-title">Get In Touch</h2>
                <Reveal>
                    <p className="contact-text">
                        Open for freelance opportunities, full-time positions,
                        or just chat about tech. Let's build something great
                        together.
                    </p>
                    <button className="email-copy" onClick={copyEmail}>
                        {copied ? "Copied to clipboard ✓" : email}
                    </button>
                    <div className="contact-links">
                        <a href={`mailto:${email}`}>Email</a>
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
                </Reveal>
            </div>
        </section>
    );
};

/* ------------------------------------------------------------------
   App
   ------------------------------------------------------------------ */

const SECTION_IDS = NAV_ITEMS.map((n) => n.id);

export default function App() {
    // "black" (pure black) or "midnight" (deep navy), remembered per visitor
    const [theme, setTheme] = useState(() => {
        try {
            return localStorage.getItem("theme") === "midnight"
                ? "midnight"
                : "black";
        } catch (e) {
            return "black";
        }
    });
    const [activeProject, setActiveProject] = useState(null);
    const active = useActiveSection(SECTION_IDS);
    const closeModal = useCallback(() => setActiveProject(null), []);
    const gallery = projectList.filter((p) => p.image);

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        try {
            localStorage.setItem("theme", theme);
        } catch (e) {
            /* storage unavailable */
        }
    }, [theme]);

    const toggleTheme = () =>
        setTheme((t) => (t === "black" ? "midnight" : "black"));

    return (
        <div className="portfolio-container">
            <ScrollProgress />
            <CursorGlow />
            <Header theme={theme} toggleTheme={toggleTheme} active={active} />
            <main>
                <About />
                <Projects onExpand={setActiveProject} />
                <Contact />
            </main>
            <footer className="footer">
                <p>© {new Date().getFullYear()} — Built with React</p>
            </footer>
            <BackToTop />
            <ImageModal
                project={activeProject}
                gallery={gallery}
                onNavigate={setActiveProject}
                onClose={closeModal}
            />
        </div>
    );
}
