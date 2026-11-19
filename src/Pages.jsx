import React, { useState } from "react";
import profileImg from "./assets/pfp1.jpg";

export const EMAIL = "chamboquilon1@gmail.com";

export const SKILLS = [
    {
        group: "Programming Languages",
        items: ["Python", "C", "C++", "Java", "JavaScript", "SQL"],
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

// Nodes on the main (blue) helix
export const MAIN_ITEMS = [
    { id: "about", kind: "about", label: "About", kicker: "About me" },
    {
        id: "skills",
        kind: "skills",
        label: "Skills",
        kicker: "Professional skills",
    },
    {
        id: "projects",
        kind: "hub",
        label: "Projects",
        kicker: "Selected projects",
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

export const AboutBody = ({ onSeeProjects, onNavigate }) => (
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
                <button className="btn btn-primary" onClick={onSeeProjects}>
                    See my projects
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

export const SkillsBody = () => (
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

export const ContactBody = () => {
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
