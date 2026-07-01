import React, { useState, useEffect } from "react";
import "./index.css";
import profileImg from "./assets/pfp.jpeg";

// 1. Header accepts the darkMode properties to handle the toggle action
const Header = ({ darkMode, setDarkMode }) => (
    <header className="header">
        <div
            className="logo"
            onClick={() => setDarkMode(!darkMode)}
            title="Toggle Dark Mode"
            style={{ cursor: "pointer", userSelect: "none" }}
        >
            RB
        </div>
        <nav className="nav">
            <a href="#about">About</a>
            <a href="#projects">Work</a>
            <a href="#contact">Contact</a>
        </nav>
    </header>
);

const About = () => (
    <section id="about" className="section hero-section">
        <div className="section-content hero-container">
            <div className="hero-text">
                <h1>Hi, I'm Rochambeau.</h1>
                <p className="subtitle">
                    Computer Science Graduate building modular solutions with{" "}
                    <b>React</b> and <b>AI integration</b>. Passionate about{" "}
                    <b>Robotics</b> and <b>Game Development</b>.
                </p>
            </div>
            <div className="hero-image-wrapper">
                <img
                    src={profileImg}
                    alt="Rochambeau Boquilon"
                    className="profile-image"
                />
            </div>
        </div>
    </section>
);

const Projects = () => {
    const projectList = [
        {
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
                    label: "Research Deep-Dive ",
                    url: "https://drive.google.com/file/d/1GMwjyfErjlWvVgXxfXujmwt-ReE_BUC1/view?usp=sharing",
                },
            ],
        },
        {
            title: "3D UFO Asteroid Shooter",
            category: "Project #2",
            desc: "An atmospheric 3D space arcade experience. Pilot a craft across 10 distinct celestial bodies, locating a randomly spawned weapon attachment to clear incoming asteroid hazards.",
            tags: ["Three.js", "WebGL", "Vite", "JavaScript"],
            links: [
                {
                    label: "GitHub",
                    url: "https://github.com/chamborgir/game",
                },
                {
                    label: "Live Demo",
                    url: "https://game-teal-psi.vercel.app/",
                },
            ],
        },
        {
            title: "Online Web Photobooth",
            category: "Project #3",
            desc: "A completely private browser photobooth utilizing WebRTC. Automates a 4-shot sequence, building a traditional vertical photostrip ready for high-resolution canvas download or hardware print.",
            tags: ["WebRTC API", "HTML5 Canvas", "JavaScript", "CSS3"],
            links: [
                {
                    label: "GitHub",
                    url: "https://github.com/chamborgir/chambeauPhotoBooth",
                },
                {
                    label: "Live Demo",
                    url: "https://chambeau-photo-booth.vercel.app/",
                },
            ],
        },
    ];

    return (
        <section id="projects" className="section">
            <div className="section-content">
                <h2 className="section-title">Selected Works</h2>
                <div className="project-grid">
                    {projectList.map((proj, idx) => (
                        <div key={idx} className="project-card">
                            <span className="project-category">
                                {proj.category}
                            </span>
                            <h3>{proj.title}</h3>
                            <p>{proj.desc}</p>
                            <div className="tag-container">
                                {proj.tags.map((tag, tIdx) => (
                                    <span key={tIdx} className="tag">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                            <div className="project-links-wrapper">
                                {proj.links.map((link, lIdx) => (
                                    <a
                                        key={lIdx}
                                        href={link.url}
                                        className="project-link"
                                        target={
                                            link.url.startsWith("#")
                                                ? "_self"
                                                : "_blank"
                                        }
                                        rel="noreferrer"
                                    >
                                        {link.label}
                                    </a>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

const Contact = () => (
    <section id="contact" className="section contact-section">
        <div className="section-content">
            <h2 className="section-title">Get In Touch</h2>
            <p className="contact-text">
                Let's build something together or chat about technology.
            </p>
            <div className="contact-links">
                <a href="mailto:chamboquilon1@gmail.com">Email</a>
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
            </div>
        </div>
    </section>
);

export default function App() {
    const [darkMode, setDarkMode] = useState(false);

    // 2. Synchronize theme dataset flags on the HTML document container root
    useEffect(() => {
        if (darkMode) {
            document.documentElement.setAttribute("data-theme", "dark");
        } else {
            document.documentElement.removeAttribute("data-theme");
        }
    }, [darkMode]);

    return (
        <div className="portfolio-container">
            {/* 3. Pass state tokens directly into the Header layout */}
            <Header darkMode={darkMode} setDarkMode={setDarkMode} />
            <main>
                <About />
                <Projects />
                <Contact />
            </main>
            <footer className="footer">
                <p>© {new Date().getFullYear()} — Built with React</p>
            </footer>
        </div>
    );
}
