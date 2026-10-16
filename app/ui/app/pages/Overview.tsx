import React, { useMemo } from "react";
import { useDql } from "@dynatrace-sdk/react-hooks";
import { useNavigate } from "react-router-dom";
import { QueryKpi } from "../components/QueryKpi";
import { ChartTile } from "../components/ChartTile";
import { QueryState } from "../components/QueryState";
import { BentoCard, BentoGrid, Hero } from "../components/Bento";
import {
  LAKEHOUSE_SINGLE_VALUE,
  OPS_CHARTS,
  DATASETS_TABLE,
  scopedSchemaChangesQuery,
  type DatasetRow,
} from "../queries";
import { describeDataset } from "../datasets";
import { ExportPngButton } from "../components/ExportPngButton";

const num = (value: unknown) =>
  value === null || value === undefined || Number.isNaN(Number(value))
    ? "—"
    : Math.round(Number(value)).toLocaleString();

export const Overview = () => {
  const navigate = useNavigate();
  const datasets = useDql<DatasetRow>({ query: DATASETS_TABLE });
  const changes = useDql({ query: scopedSchemaChangesQuery([]) });
  const rows = useMemo(() => datasets.data?.records ?? [], [datasets.data]);

  return (
    <main className="app-page">
      <Hero
        kicker="AMAZON S3 TABLES OBSERVABILITY"
        title="Operational intelligence for your Iceberg tables."
        description="Bring native AWS request telemetry together with Iceberg catalog metadata, data-level signals, change awareness, and cost—across every namespace and table discovered in the connected environment."
        aside={<div className="hero-tools"><span>LIVE CATALOG · AWS TELEMETRY</span><ExportPngButton filename="amazon-s3-tables-overview" /></div>}
      />

      <BentoGrid>
        <QueryKpi {...LAKEHOUSE_SINGLE_VALUE.rows} label="rows under observation" eyebrow="LAKEHOUSE SCALE" accent="#73e5ff" />
        <QueryKpi {...LAKEHOUSE_SINGLE_VALUE.tables} label="managed Iceberg tables" eyebrow="CATALOG" accent="#a9f27c" />
        <QueryKpi {...LAKEHOUSE_SINGLE_VALUE.files} label="active data files" eyebrow="STORAGE SHAPE" accent="#ffc857" />
        <QueryKpi {...LAKEHOUSE_SINGLE_VALUE.snapshots} label="Iceberg snapshots" eyebrow="CHANGE HISTORY" accent="#a995ff" />

        <BentoCard className="bento-card--full" eyebrow="DATASET CATALOG" title="What is in this lakehouse?" accent="#73e5ff">
          {datasets.isLoading || datasets.error ? (
            <QueryState isLoading={datasets.isLoading} error={datasets.error} />
          ) : (
            <div className="catalog-list">
              {rows.map((row) => {
                const key = `${row.ns}/${row.table}`;
                const dataset = describeDataset(String(row.ns), String(row.table), rows.indexOf(row));
                return (
                  <button
                    type="button"
                    className="catalog-row catalog-row--button"
                    key={key}
                    onClick={() => navigate(`/explore?datasets=${encodeURIComponent(key)}`)}
                  >
                    <div>
                      <div className="catalog-row__label" style={{ color: dataset.accent }}>
                        {dataset.label}
                      </div>
                      <div className="bento-copy">{dataset.description} · Click to explore</div>
                    </div>
                    <div className="catalog-row__path">{key}</div>
                    <div className="catalog-stat"><strong>{num(row.rows_n)}</strong><span>rows</span></div>
                    <div className="catalog-stat"><strong>{num(row.files_n)}</strong><span>files</span></div>
                    <div className="catalog-stat"><strong>{num(row.snaps_n)}</strong><span>snapshots</span></div>
                    <div className="catalog-stat"><strong>{num(row.fields_n)}</strong><span>columns</span></div>
                  </button>
                );
              })}
            </div>
          )}
        </BentoCard>

        <BentoCard className="bento-card--narrow" eyebrow="CONTRACT CHANGES · 30D" title={`${changes.data?.records?.length ?? 0} detected`} accent={(changes.data?.records?.length ?? 0) > 0 ? "#ffc857" : "#a9f27c"}>
          <p className="bento-copy">Only actual schema changes are counted—not routine state observations.</p>
        </BentoCard>
        <BentoCard className="bento-card--wide" eyebrow="INVESTIGATE" title="Move from estate view to a scoped analysis" accent="#73e5ff">
          <p className="bento-copy">Choose any table above, or open Explore to compare a subset across operations, data profile, changes, and cost.</p>
          <button type="button" className="primary-action" onClick={() => navigate("/explore")}>Explore all datasets →</button>
        </BentoCard>

        <BentoCard className="bento-card--medium bento-card--tall" eyebrow="NATIVE AWS" title="Request volume" accent="#73e5ff">
          <ChartTile query={OPS_CHARTS.requests} title="Requests per minute" variant="line" height={270} />
        </BentoCard>
        <BentoCard className="bento-card--medium bento-card--tall" eyebrow="PERFORMANCE" title="Request latency" accent="#a9f27c">
          <ChartTile query={OPS_CHARTS.latency} title="First byte and total latency" variant="line" height={270} />
        </BentoCard>
        <BentoCard className="bento-card--wide bento-card--tall" eyebrow="THROUGHPUT" title="Data transferred" accent="#a995ff">
          <ChartTile query={OPS_CHARTS.bytes} title="Downloaded and uploaded bytes" variant="area" height={250} />
        </BentoCard>
        <BentoCard className="bento-card--narrow bento-card--tall" eyebrow="RELIABILITY" title="Errors" accent="#ff7f7f">
          <ChartTile query={OPS_CHARTS.errors} title="4xx / 5xx" variant="area" height={250} />
        </BentoCard>
      </BentoGrid>
    </main>
  );
};
