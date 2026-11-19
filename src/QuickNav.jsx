import React, { useEffect, useRef, useState } from "react";

const pad = (i) => String(i + 1).padStart(2, "0");

/* Desktop: a faded table of contents to the right of the helix.
   The entry for the node in front is highlighted. */
export function QuickNav({ items, activeId, onSelect, title }) {
    return (
        <nav className="quicknav" aria-label={title}>
            <p className="quicknav-title">{title}</p>
            <ol>
                {items.map((it, i) => (
                    <li key={it.id}>
                        <button
                            type="button"
                            className={`qn-item ${activeId === it.id ? "on" : ""}`}
                            onClick={() => onSelect(it.id)}
                            aria-current={
                                activeId === it.id ? "true" : undefined
                            }
                        >
                            <span className="qn-num">{pad(i)}</span>
                            <span className="qn-label">{it.label}</span>
                        </button>
                    </li>
                ))}
            </ol>
        </nav>
    );
}

/* Phone (portrait): the same list as a button beside the theme toggle */
export function NavMenu({ items, activeId, onSelect, title }) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef(null);

    // Close when the list changes (switching between helixes)
    useEffect(() => setOpen(false), [items]);

    useEffect(() => {
        if (!open) return;
        const onDown = (e) => {
            if (!rootRef.current?.contains(e.target)) setOpen(false);
        };
        // Capture phase: Esc only closes the menu, it doesn't also leave the Projects view
        const onKey = (e) => {
            if (e.key === "Escape") {
                e.stopImmediatePropagation();
                setOpen(false);
            }
        };
        document.addEventListener("pointerdown", onDown);
        window.addEventListener("keydown", onKey, true);
        return () => {
            document.removeEventListener("pointerdown", onDown);
            window.removeEventListener("keydown", onKey, true);
        };
    }, [open]);

    return (
        <div className="navmenu" ref={rootRef}>
            <button
                type="button"
                className="theme-toggle nav-toggle"
                onClick={() => setOpen((o) => !o)}
                aria-label={`${title} list`}
                aria-haspopup="true"
                aria-expanded={open}
            >
                <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    aria-hidden="true"
                >
                    <line x1="4" y1="7" x2="20" y2="7" />
                    <line x1="4" y1="12" x2="20" y2="12" />
                    <line x1="4" y1="17" x2="14" y2="17" />
                </svg>
            </button>

            {open && (
                <div className="navmenu-panel" role="menu">
                    <p className="quicknav-title">{title}</p>
                    {items.map((it, i) => (
                        <button
                            key={it.id}
                            type="button"
                            role="menuitem"
                            className={`qn-item ${activeId === it.id ? "on" : ""}`}
                            onClick={() => {
                                onSelect(it.id);
                                setOpen(false);
                            }}
                        >
                            <span className="qn-num">{pad(i)}</span>
                            <span className="qn-label">{it.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
