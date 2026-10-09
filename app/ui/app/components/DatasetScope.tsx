import React from "react";
import { LAKEHOUSE_DATASETS, type LakehouseDataset } from "../datasets";

export interface DatasetScopeProps {
  selected: string[];
  onChange: (selected: string[]) => void;
  datasets?: LakehouseDataset[];
  compact?: boolean;
}

/** Empty selection means all datasets. Individual chips support any subset. */
export const DatasetScope = ({ selected, onChange, datasets = LAKEHOUSE_DATASETS, compact = false }: DatasetScopeProps) => {
  const allSelected = selected.length === 0;
  const toggle = (key: string) => {
    if (allSelected) {
      onChange([key]);
      return;
    }
    const next = selected.includes(key)
      ? selected.filter((candidate) => candidate !== key)
      : [...selected, key];
    onChange(next.length === datasets.length ? [] : next);
  };

  return (
    <div className={`scope-strip ${compact ? "scope-strip--compact" : ""}`}>
      <div className="scope-copy">
        <span className="scope-eyebrow">DATASET SCOPE</span>
        <strong>{allSelected ? "All lakehouse datasets" : `${selected.length} selected`}</strong>
      </div>
      <div className="scope-actions" role="group" aria-label="Filter by dataset">
        <button
          type="button"
          className={`scope-chip scope-chip--all ${allSelected ? "is-active" : ""}`}
          onClick={() => onChange([])}
        >
          All
        </button>
        {datasets.map((dataset) => {
          const active = !allSelected && selected.includes(dataset.key);
          return (
            <button
              type="button"
              key={dataset.key}
              className={`scope-chip ${active ? "is-active" : ""}`}
              style={{ "--dataset-accent": dataset.accent } as React.CSSProperties}
              onClick={() => toggle(dataset.key)}
              aria-pressed={active}
              title={dataset.label}
            >
              <span className="scope-dot" />
              {dataset.shortLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
};
