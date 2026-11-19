import React, { useState, useCallback } from "react";
import Lightbox from "./Lightbox";
import work1Img from "./assets/work1.gif";
import work2Img from "./assets/work2.gif";
import work3Img from "./assets/work3.gif";
import work4Img from "./assets/work4.gif";
import work5Img from "./assets/work5.gif";

// Add a new project here and it becomes a new nucleotide on the Projects strand.
// Spacing, twist, strand length and nucleotide size all adjust automatically.
export const projectList = [
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

// Nodes on the Works (red) helix
// Nodes on the Projects strand (one linked nucleotide per project)
export const PROJECT_ITEMS = projectList.map((p, i) => ({
    id: `project-${i + 1}`,
    kind: "project",
    label: p.short,
    kicker: `${p.category} · ${p.type}`,
    image: p.image,
    project: p,
}));

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

export const ProjectBody = ({ project }) => {
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
