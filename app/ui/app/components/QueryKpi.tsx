import React from "react";
import { useDql } from "@dynatrace-sdk/react-hooks";
import { BentoCard } from "./Bento";
import { QueryState } from "./QueryState";

export const QueryKpi = ({
  query,
  field,
  label,
  eyebrow,
  accent,
  format = "integer",
}: {
  query: string;
  field: string;
  label: string;
  eyebrow?: string;
  accent?: string;
  format?: "integer" | "decimal" | "bytes" | "currency";
}) => {
  const result = useDql({ query });
  const value = result.data?.records?.[0]?.[field];
  const number = Number(value);

  const display = (() => {
    if (value === null || value === undefined || Number.isNaN(number)) return "—";
    if (format === "currency")
      return number.toLocaleString(undefined, { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 3 });
    if (format === "decimal") return number.toLocaleString(undefined, { maximumFractionDigits: 2 });
    if (format === "bytes") {
      const mb = number / 1024 / 1024;
      return mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(1)} MB`;
    }
    return Math.round(number).toLocaleString();
  })();

  return (
    <BentoCard className="bento-card--hero" eyebrow={eyebrow} accent={accent}>
      {result.isLoading || result.error ? (
        <QueryState isLoading={result.isLoading} error={result.error} />
      ) : (
        <>
          <div className="kpi-number">{display}</div>
          <div className="kpi-label">{label}</div>
        </>
      )}
    </BentoCard>
  );
};
