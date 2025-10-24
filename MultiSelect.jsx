// File: src/components/common/MultiSelect.jsx

import React, { useState, useRef, useMemo, useEffect } from "react";
import downIcon from "../../assets/icons/down.svg"; // Make sure this path is correct
import "./MultiSelect.css";

/**
 * Custom hook to detect clicks outside a specified element.
 */
const useClickAway = (ref, onAway) => {
  useEffect(() => {
    const handleDocumentClick = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        onAway?.(); // Use optional chaining for safety
      }
    };

    document.addEventListener("mousedown", handleDocumentClick);
    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
    };
  }, [ref, onAway]); // Correct dependency array
};

/**
 * Helper function for case-insensitive string searching.
 */
const includesCI = (haystack, needle) =>
  String(haystack || "")
    .toLowerCase()
    .includes(String(needle || "").toLowerCase());

// ===================================================================
// MAIN COMPONENT
// ===================================================================

export const MultiSelect = React.memo(function MultiSelect({
  label,
  options = [],
  value = [],
  onChange,
}) {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  // Now we use the correctly defined hook
  useClickAway(ref, () => setOpen(false));

  const visibleOptions = useMemo(
    () => options.filter((o) => includesCI(o, q)).slice(0, 300),
    [options, q]
  );

  const toggle = (v) => {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  };

  return (
    <div className="msel" ref={ref}>
      <button
        type="button"
        className={`msel-btn${value.length ? " is-active" : ""}`}
        onClick={() => setOpen((prev) => !prev)}
      >
        {label}
        {value.length ? ` (${value.length})` : ""}{" "}
        <img src={downIcon} alt="" className="msel-caret" />
      </button>
      {open && (
        <div className="msel-panel">
          <input
            className="msel-search"
            placeholder={`Search ${label.toLowerCase()}...`}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
          />
          <div className="msel-list">
            {visibleOptions.length === 0 ? (
              <div className="msel-empty">No matches</div>
            ) : (
              visibleOptions.map((v) => (
                <label key={v} className="msel-row">
                  <input
                    type="checkbox"
                    checked={value.includes(v)}
                    onChange={() => toggle(v)}
                  />
                  <span>{v}</span>
                </label>
              ))
            )}
          </div>
          <div className="msel-footer">
            <button
              type="button"
              className="link sm"
              onClick={() => onChange([])}
            >
              Clear
            </button>
            <button
              type="button"
              className="link sm"
              onClick={() => onChange(options)}
            >
              Select All
            </button>
            <div style={{ flex: 1 }} />
            <button
              type="button"
              className="btn sm"
              onClick={() => setOpen(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
