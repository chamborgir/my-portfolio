import React, { useEffect, useRef, useCallback } from "react";
import { AboutBody, SkillsBody, ContactBody } from "./Pages";
import { ProjectBody } from "./Projects";
import { ReviewsBody } from "./Reviews";

// Zooms out of the tapped node, background blurred
export default function Modal({
    id,
    items,
    origin,
    closing,
    onClose,
    onNavigate,
    onSeeProjects,
}) {
    // Hub and Home entries change views; only content items belong in modal navigation.
    const navItems = items.filter(
        (i) => i.kind !== "hub" && i.kind !== "home",
    );
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
        body = (
            <AboutBody onSeeProjects={onSeeProjects} onNavigate={onNavigate} />
        );
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
}
