import React, { useMemo } from "react";
import { useDql } from "@dynatrace-sdk/react-hooks";
import { Flex, Surface } from "@dynatrace/strato-components/layouts";
import { Heading, Paragraph } from "@dynatrace/strato-components/typography";
import { DataTable, type DataTableColumnDef } from "@dynatrace/strato-components/tables";
import { MetricTile } from "../components/MetricTile";
import { ChartTile } from "../components/ChartTile";
import { QueryState } from "../components/QueryState";
import {
  LAKEHOUSE_SINGLE_VALUE,
  OPS_CHARTS,
  DATASETS_TABLE,
  DATASET_LABELS,
  type DatasetRow,
} from "../queries";

const num = (v: unknown) =>
  v === null || v === undefined || Number.isNaN(Number(v)) ? "—" : Math.round(Number(v)).toLocaleString();

interface DatasetDisplay {
  dataset: string;
  table: string;
  rows: string;
  files: string;
  snaps: string;
  fields: string;
}

const columns: DataTableColumnDef<DatasetDisplay>[] = [
  { id: "dataset", header: "Dataset", accessor: "dataset", width: "2fr" },
  { id: "table", header: "Namespace / table", accessor: "table", width: "1.5fr" },
  { id: "rows", header: "Rows", accessor: "rows", width: "1fr" },
  { id: "files", header: "Data files", accessor: "files", width: "1fr" },
  { id: "snaps", header: "Snapshots", accessor: "snaps", width: "1fr" },
  { id: "fields", header: "Columns", accessor: "fields", width: "1fr" },
];

export const Overview = () => {
  const datasets = useDql<DatasetRow>({ query: DATASETS_TABLE });

  const rows = useMemo<DatasetDisplay[]>(
    () =>
      (datasets.data?.records ?? []).map((r) => {
        const key = `${r.ns}/${r.table}`;
        return {
          dataset: DATASET_LABELS[key] ?? key,
          table: key,
          rows: num(r.rows_n),
          files: num(r.files_n),
          snaps: num(r.snaps_n),
          fields: num(r.fields_n),
        };
      }),
    [datasets.data],
  );

  return (
    <Flex flexDirection="column" gap={24} padding={32}>
      <Flex flexDirection="column" gap={4}>
        <Heading>Lakehouse overview</Heading>
        <Paragraph>
          Amazon S3 Tables + Apache Iceberg, surfaced in Dynatrace. One table bucket{" "}
          <code>airline-datalake-poc</code> with multiple domains · AWS account 347830095179 · us-east-1.
        </Paragraph>
      </Flex>

      <Heading level={5}>Lakehouse totals</Heading>
      <Flex gap={16} flexFlow="wrap">
        <MetricTile {...LAKEHOUSE_SINGLE_VALUE.rows} label="Total rows" />
        <MetricTile {...LAKEHOUSE_SINGLE_VALUE.files} label="Total data files" />
        <MetricTile {...LAKEHOUSE_SINGLE_VALUE.snapshots} label="Total snapshots" />
        <MetricTile {...LAKEHOUSE_SINGLE_VALUE.tables} label="Tables" />
      </Flex>

      <Heading level={5}>Datasets</Heading>
      <Surface style={{ padding: 16 }}>
        {datasets.isLoading || datasets.error ? (
          <QueryState isLoading={datasets.isLoading} error={datasets.error} />
        ) : (
          <DataTable data={rows} columns={columns} />
        )}
      </Surface>

      <Heading level={5}>Native AWS/S3 Tables request telemetry (bucket-wide)</Heading>
      <Flex gap={16} flexFlow="wrap">
        <ChartTile query={OPS_CHARTS.requests} title="Request volume (per minute)" variant="line" />
        <ChartTile query={OPS_CHARTS.latency} title="Request latency (ms)" variant="line" />
        <ChartTile query={OPS_CHARTS.bytes} title="Data transferred (bytes/min)" variant="area" />
        <ChartTile query={OPS_CHARTS.errors} title="Reliability — 4xx / 5xx" variant="area" />
      </Flex>
    </Flex>
  );
};
