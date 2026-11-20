import React, { useState, useCallback } from "react";
import Lightbox from "./Lightbox";

/* ------------------------------------------------------------------
   HOW TO ADD A REVIEW: just drop screenshots into  src/assets/reviews/
   There is nothing to edit in this file.

   One folder per person (folder name = reviewee name):
       src/assets/reviews/Juan Dela Cruz/1.png
       src/assets/reviews/Juan Dela Cruz/2.png
   Or loose files named after the person (a trailing number groups them):
       src/assets/reviews/Maria Santos 1.png
       src/assets/reviews/Maria Santos 2.png
   Optional source label: end the name with (Something), e.g.
       src/assets/reviews/Juan Dela Cruz (Messenger)/1.png
   Optional order: start the name with a number, e.g. "01 Juan Dela Cruz"
   (the number is hidden on the site).
   ------------------------------------------------------------------ */

const files = import.meta.glob(
    "./assets/reviews/**/*.{png,jpg,jpeg,webp,gif,avif,PNG,JPG,JPEG,WEBP}",
    { eager: true, import: "default" },
);

const natural = (a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });

const buildReviews = () => {
    const groups = new Map();

    Object.entries(files).forEach(([path, url]) => {
        const parts = path.replace("./assets/reviews/", "").split("/");
        const file = parts[parts.length - 1];
        const stem = file.replace(/\.[^.]+$/, "");
        // In a folder: the folder is the person.
        // Loose file: the file name is, minus a trailing number ("Maria 2" -> "Maria").
        const key =
            parts.length > 1
                ? parts[0]
                : stem.replace(/[\s._-]*\d+$/, "").trim() || stem;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push({ file, url });
    });

    return [...groups.entries()]
        .sort(([a], [b]) => natural(a, b))
        .map(([key, shots]) => {
            const clean = key.replace(/^\d+[\s._-]+/, ""); // hide the ordering number
            const m = clean.match(/^(.*?)\s*\(([^)]+)\)\s*$/); // "Name (Source)"
            return {
                name: (m ? m[1] : clean).trim(),
                source: m ? m[2].trim() : "",
                images: shots
                    .sort((a, b) => natural(a.file, b.file))
                    .map((s) => s.url),
            };
        });
};

const REVIEWS = buildReviews();

const MAX_THUMBS = 6; // more than this: the last thumbnail shows "+N"

// Review screenshots, one card per person. The grid adapts to the number of images.
export const ReviewsBody = () => {
    const [zoom, setZoom] = useState(null);
    const closeZoom = useCallback(() => setZoom(null), []);

    return (
        <div>
            <h2 className="panel-title">Reviews</h2>
            <p className="panel-text">
                Kind words from people I've worked with. Tap a screenshot to
                view it full size.
            </p>

            {REVIEWS.length === 0 && (
                <p className="panel-text">Reviews coming soon.</p>
            )}

            <ul className="review-list">
                {REVIEWS.map((r) => {
                    const shown = r.images.slice(0, MAX_THUMBS);
                    const extra = r.images.length - shown.length;
                    const cls = shown.length >= 5 ? "many" : `c${shown.length}`;
                    return (
                        <li key={r.name + r.source} className="review-card">
                            <div className="review-top">
                                <span className="review-name">{r.name}</span>
                                {r.source && (
                                    <span className="review-source">
                                        {r.source}
                                    </span>
                                )}
                            </div>

                            <div className={`shot-grid ${cls}`}>
                                {shown.map((src, j) => (
                                    <button
                                        key={src}
                                        type="button"
                                        className="shot-btn"
                                        onClick={() =>
                                            setZoom({
                                                images: r.images,
                                                index: j,
                                                alt: `Review from ${r.name}`,
                                            })
                                        }
                                        aria-label={`View full-size review ${j + 1} of ${r.images.length} from ${r.name}`}
                                    >
                                        <img
                                            src={src}
                                            alt={`Review from ${r.name}`}
                                            loading="lazy"
                                            decoding="async"
                                        />
                                        {extra > 0 &&
                                            j === shown.length - 1 && (
                                                <span className="shot-more">
                                                    +{extra}
                                                </span>
                                            )}
                                    </button>
                                ))}
                            </div>
                        </li>
                    );
                })}
            </ul>

            {zoom && (
                <Lightbox
                    src={zoom.images[zoom.index]}
                    images={zoom.images}
                    startIndex={zoom.index}
                    alt={zoom.alt}
                    onClose={closeZoom}
                />
            )}
        </div>
    );
};
