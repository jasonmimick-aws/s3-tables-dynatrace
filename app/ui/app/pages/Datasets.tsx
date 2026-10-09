import React, { useMemo } from "react";
import { useDql } from "@dynatrace-sdk/react-hooks";
import { Flex, Surface, Divider } from "@dynatrace/strato-components/layouts";
import { Heading, Paragraph, Strong } from "@dynatrace/strato-components/typography";
import { DataTable, type DataTableColumnDef } from "@dynatrace/strato-components/tables";
import { QueryState } from "../components/QueryState";
import {
  CATEGORY_BY_TABLE,
  NUMERIC_AVG_BY_TABLE,
  DATASET_LABELS,
  type CategoryRow,
  type NumericAvgRow,
} from "../queries";

const num = (v: unknown) =>
  v === null || v === undefined || Number.isNaN(Number(v)) ? "—" : Math.round(Number(v)).toLocaleString();
const dec = (v: unknown) =>
  v === null || v === undefined || Number.isNaN(Number(v)) ? "—" : Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 });

interface CatDisplay { category: string; count: string }
const catCols: DataTableColumnDef<CatDisplay>[] = [
  { id: "category", header: "Category", accessor: "category", width: "2fr" },
  { id: "count", header: "Records (sample)", accessor: "count", width: "1fr" },
];
interface AvgDisplay { field: string; avg: string }
const avgCols: DataTableColumnDef<AvgDisplay>[] = [
  { id: "field", header: "Numeric field", accessor: "field", width: "2fr" },
  { id: "avg", header: "Average", accessor: "avg", width: "1fr" },
];

export const Datasets = () => {
  const cats = useDql<CategoryRow>({ query: CATEGORY_BY_TABLE });
  const avgs = useDql<NumericAvgRow>({ query: NUMERIC_AVG_BY_TABLE });

  const grouped = useMemo(() => {
    const keys = new Set<string>();
    (cats.data?.records ?? []).forEach((r) => keys.add(`${r.ns}/${r.table}`));
    (avgs.data?.records ?? []).forEach((r) => keys.add(`${r.ns}/${r.table}`));
    return [...keys].sort().map((key) => ({
      key,
      label: DATASET_LABELS[key] ?? key,
      categories: (cats.data?.records ?? [])
        .filter((r) => `${r.ns}/${r.table}` === key)
        .map((r) => ({ category: String(r.category ?? "—"), count: num(r.c) })),
      numerics: (avgs.data?.records ?? [])
        .filter((r) => `${r.ns}/${r.table}` === key)
        .map((r) => ({ field: String(r.field ?? "—"), avg: dec(r.a) })),
    }));
  }, [cats.data, avgs.data]);

  const loading = cats.isLoading || avgs.isLoading;
  const error = cats.error || avgs.error;

  return (
    <Flex flexDirection="column" gap={24} padding={32}>
      <Flex flexDirection="column" gap={4}>
        <Heading>Datasets — data insights</Heading>
        <Paragraph>
          Business aggregates computed from the actual rows of every table in the lakehouse
          (sampled) and ingested as <code>s3tables.data.*</code> metrics — the same deep,
          data-level signal across every domain, not just storage and schema.
        </Paragraph>
      </Flex>

      {loading || error ? (
        <QueryState isLoading={loading} error={error} />
      ) : grouped.length === 0 ? (
        <Paragraph>No data insights found. Run <code>publish_all.py</code> to ingest them.</Paragraph>
      ) : (
        grouped.map((g) => (
          <Surface key={g.key} style={{ padding: 16 }}>
            <Flex flexDirection="column" gap={12}>
              <Flex flexDirection="column" gap={2}>
                <Heading level={5}>{g.label}</Heading>
                <Paragraph>
                  <Strong>{g.key}</Strong>
                </Paragraph>
              </Flex>
              <Divider />
              <Flex gap={24} flexFlow="wrap" alignItems="flex-start">
                <Flex flexDirection="column" gap={8} style={{ flex: "1 1 360px", minWidth: 300 }}>
                  <Paragraph>Breakdown by category</Paragraph>
                  <DataTable data={g.categories} columns={catCols} />
                </Flex>
                <Flex flexDirection="column" gap={8} style={{ flex: "1 1 280px", minWidth: 240 }}>
                  <Paragraph>Numeric averages</Paragraph>
                  <DataTable data={g.numerics} columns={avgCols} />
                </Flex>
              </Flex>
            </Flex>
          </Surface>
        ))
      )}
    </Flex>
  );
};
