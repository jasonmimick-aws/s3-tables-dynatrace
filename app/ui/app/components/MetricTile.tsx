import React from "react";
import { useDql } from "@dynatrace-sdk/react-hooks";
import { Surface } from "@dynatrace/strato-components/layouts";
import { QueryState } from "./QueryState";
import { KpiValue } from "./Kpi";

type TileFormat = "int" | "usd" | "raw";

export interface MetricTileProps {
  /** DQL that yields a single record containing `field`. */
  query: string;
  /** The record field name holding the value. */
  field: string;
  /** Label shown above the value. */
  label: string;
  /** How to format the numeric value. */
  format?: TileFormat;
}

function formatValue(value: unknown, format: TileFormat): string | number {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }
  const n = Number(value);
  switch (format) {
    case "usd":
      return n.toLocaleString(undefined, {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    case "int":
      return Math.round(n).toLocaleString();
    default:
      return n;
  }
}

/**
 * A single-value KPI tile backed by a DQL query. Reuses the operations /
 * finops dashboard single-value queries verbatim.
 */
export const MetricTile = ({ query, field, label, format = "int" }: MetricTileProps) => {
  const { data, error, isLoading } = useDql({ query });
  const record = data?.records?.[0] as Record<string, unknown> | undefined;

  return (
    <Surface
      style={{
        minWidth: 200,
        minHeight: 110,
        padding: 16,
        flex: "1 1 200px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      {isLoading || error ? (
        <QueryState isLoading={isLoading} error={error} />
      ) : (
        <KpiValue label={label} value={record ? formatValue(record[field], format) : "—"} />
      )}
    </Surface>
  );
};
