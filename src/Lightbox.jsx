import { useEffect } from "react";
import { createPortal } from "react-dom";

// Full-screen image viewer. Rendered in a portal so the modal can't clip it.
export default function Lightbox({ src, alt, onClose }) {
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
}
