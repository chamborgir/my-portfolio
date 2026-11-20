import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// The current image, with a loading and an error state
function Shot({ src, alt }) {
    const [status, setStatus] = useState("loading"); // loading | ok | error
    return (
        <>
            {status === "loading" && (
                <span className="lightbox-status">Loading…</span>
            )}
            {status === "error" && (
                <span className="lightbox-status">
                    Couldn't load this image
                </span>
            )}
            <img
                src={src}
                alt={alt}
                className="lightbox-img"
                decoding="async"
                style={{ visibility: status === "ok" ? "visible" : "hidden" }}
                onLoad={() => setStatus("ok")}
                onError={() => setStatus("error")}
            />
        </>
    );
}

// Full-screen image viewer. Rendered in a portal so the modal can't clip it.
// Pass either `src` (one image) or `images` (+ `startIndex`) for a gallery.
export default function Lightbox({
    src,
    images,
    startIndex = 0,
    alt,
    onClose,
}) {
    const list = images && images.length ? images : [src];
    const many = list.length > 1;
    const [i, setI] = useState(Math.min(startIndex, list.length - 1));
    const touchX = useRef(null);

    const go = (d) => setI((x) => (x + d + list.length) % list.length);

    useEffect(() => {
        // Capture phase: Esc and arrows only affect the lightbox, not the modal under it
        const onKey = (e) => {
            if (!["Escape", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
            e.stopImmediatePropagation();
            if (e.key === "Escape") onClose();
            else if (many) go(e.key === "ArrowRight" ? 1 : -1);
        };
        window.addEventListener("keydown", onKey, true);
        return () => window.removeEventListener("keydown", onKey, true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [onClose, many, list.length]);

    return createPortal(
        <div
            className="lightbox"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label={alt}
            onTouchStart={(e) => {
                touchX.current =
                    e.touches.length === 1 ? e.touches[0].clientX : null;
            }}
            onTouchEnd={(e) => {
                if (!many || touchX.current == null) return;
                const dx = e.changedTouches[0].clientX - touchX.current;
                touchX.current = null;
                if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); // swipe left = next
            }}
        >
            <button
                type="button"
                className="icon-btn lightbox-close"
                onClick={onClose}
                aria-label="Close full-size preview"
            >
                ×
            </button>

            <Shot key={i} src={list[i]} alt={alt} />

            {many && (
                <>
                    <button
                        type="button"
                        className="icon-btn lightbox-nav prev"
                        onClick={(e) => {
                            e.stopPropagation();
                            go(-1);
                        }}
                        aria-label="Previous screenshot"
                    >
                        ‹
                    </button>
                    <button
                        type="button"
                        className="icon-btn lightbox-nav next"
                        onClick={(e) => {
                            e.stopPropagation();
                            go(1);
                        }}
                        aria-label="Next screenshot"
                    >
                        ›
                    </button>
                </>
            )}

            <p className="lightbox-hint">
                {many
                    ? `${i + 1} / ${list.length} · swipe or use ‹ › · tap to close`
                    : "Tap anywhere to close"}
            </p>
        </div>,
        document.body,
    );
}
