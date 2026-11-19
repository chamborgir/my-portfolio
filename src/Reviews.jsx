import React, { useState, useCallback } from "react";
import Lightbox from "./Lightbox";

/* ------------------------------------------------------------------
   REVIEW SCREENSHOTS: step 1 of 2
   Put your screenshot files in  src/assets/reviews/  and import each
   one here. Uncomment the lines below once the files exist.
   ------------------------------------------------------------------ */
// import review1Img from "./assets/reviews/review1.png";
// import review2Img from "./assets/reviews/review2.png";
// import review3Img from "./assets/reviews/review3.png"; // <- new one? add a line like this

/* ------------------------------------------------------------------
   REVIEW SCREENSHOTS: step 2 of 2
   One entry per person. To add a NEW review, copy a block below,
   paste it at the end of the list (before the closing ];), then fill
   in the name and the screenshot(s).

     name    -> the reviewee's name
     source  -> optional small label, e.g. "Messenger" or "Client project"
     images  -> one or more screenshots, e.g. [review1Img] or [review1Img, review2Img]
                (leave [] and a "Screenshot coming soon" box shows)
   ------------------------------------------------------------------ */
export const REVIEWS = [
    // Review 1
    {
        name: "Reviewee name",
        source: "",
        images: [], // e.g. [review1Img]
    },
    // Review 2
    {
        name: "Reviewee name",
        source: "",
        images: [], // e.g. [review2Img]
    },
];

// Review screenshots, one card per person
export const ReviewsBody = () => {
    const [zoom, setZoom] = useState(null);
    const closeZoom = useCallback(() => setZoom(null), []);

    return (
        <div>
            {/* <h2 className="panel-title">Reviews</h2> */}
            <p className="panel-text">
                Kind words from people I've worked with. Tap a screenshot to
                view it full size.
            </p>

            {REVIEWS.length === 0 && (
                <p className="panel-text">Reviews coming soon.</p>
            )}

            <ul className="review-list">
                {REVIEWS.map((r, i) => (
                    <li key={i} className="review-card">
                        <div className="review-top">
                            <span className="review-name">{r.name}</span>
                            {r.source && (
                                <span className="review-source">
                                    {r.source}
                                </span>
                            )}
                        </div>

                        {r.images && r.images.length > 0 ? (
                            <div
                                className={`shot-grid ${r.images.length === 1 ? "single" : ""}`}
                            >
                                {r.images.map((src, j) => (
                                    <button
                                        key={j}
                                        type="button"
                                        className="shot-btn"
                                        onClick={() =>
                                            setZoom({
                                                src,
                                                alt: `Review from ${r.name}`,
                                            })
                                        }
                                        aria-label={`View full-size review from ${r.name}`}
                                    >
                                        <img
                                            src={src}
                                            alt={`Review from ${r.name}`}
                                            loading="lazy"
                                        />
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="shot-placeholder">
                                Screenshot coming soon
                            </div>
                        )}
                    </li>
                ))}
            </ul>

            {zoom && (
                <Lightbox src={zoom.src} alt={zoom.alt} onClose={closeZoom} />
            )}
        </div>
    );
};
