import React, { useMemo, useState } from "react";
import { useDql } from "@dynatrace-sdk/react-hooks";
import { useSearchParams } from "react-router-dom";
import { BentoCard, BentoGrid, Hero } from "../components/Bento";
import { DatasetScope } from "../components/DatasetScope";
import { QueryKpi } from "../components/QueryKpi";
import { QueryState } from "../components/QueryState";
import { ChartTile } from "../components/ChartTile";
import { useDatasetCatalog } from "../hooks/useDatasetCatalog";
import { datasetByKey } from "../datasets";
import {
  scopedCatalogQuery,
  scopedDataTotalsQuery,
  scopedCategoryQuery,
  scopedNumericQuery,
  scopedSchemaEventsQuery,
  scopedCostSummaryQuery,
  scopedCostTableQuery,
  scopedRequestCostQuery,
  scopedRequestTrendQuery,
  scopedLatencyQuery,
  scopedErrorsQuery,
  scopedBytesQuery,
  type ScopedDatasetRow,
  type SchemaEventRecord,
} from "../queries";

interface CategoryRecord { ns: string; table: string; category: string; count: number | null }
interface NumericRecord { ns: string; table: string; field: string; average: number | null }
interface CostRecord { ns: string; table: string; current_bytes: number | null; current_objects: number | null; storage_usd: number | null; monitoring_usd: number | null; baseline_usd: number | null }

const number = (value: unknown) => Number(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
const money = (value: unknown) => Number(value ?? 0).toLocaleString(undefined, { style: "currency", currency: "USD", minimumFractionDigits: 3, maximumFractionDigits: 4 });
const size = (value: unknown) => {
  const mb = Number(value ?? 0) / 1024 / 1024;
  return mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(1)} MB`;
};
const parseFields = (raw?: string) => (raw ?? "").split(",").map((pair) => {
  const [name, ...type] = pair.trim().split(":");
  return { name, type: type.join(":") || "unknown" };
}).filter((field) => field.name);

export const Explore = () => {
  const [params, setParams] = useSearchParams();
  const initial = params.get("datasets")?.split(",").filter(Boolean) ?? [];
  const [selected, setSelected] = useState<string[]>(initial);
  const catalog = useDatasetCatalog();

  const setScope = (next: string[]) => {
    setSelected(next);
    const updated = new URLSearchParams(params);
    if (next.length === 0) updated.delete("datasets");
    else updated.set("datasets", next.join(","));
    setParams(updated, { replace: true });
  };

  const query = useMemo(() => ({
    catalog: scopedCatalogQuery(selected),
    dataTotals: scopedDataTotalsQuery(selected),
    categories: scopedCategoryQuery(selected),
    numerics: scopedNumericQuery(selected),
    schemas: scopedSchemaEventsQuery(selected),
    costSummary: scopedCostSummaryQuery(selected),
    costTable: scopedCostTableQuery(selected),
    requestCost: scopedRequestCostQuery(selected),
    requests: scopedRequestTrendQuery(selected),
    latency: scopedLatencyQuery(selected),
    errors: scopedErrorsQuery(selected),
    bytes: scopedBytesQuery(selected),
  }), [selected]);

  const tableState = useDql<ScopedDatasetRow>({ query: query.catalog });
  const categories = useDql<CategoryRecord>({ query: query.categories });
  const numerics = useDql<NumericRecord>({ query: query.numerics });
  const schemas = useDql<SchemaEventRecord>({ query: query.schemas });
  const costs = useDql<CostRecord>({ query: query.costTable });

  const schemaRows = useMemo(() => schemas.data?.records ?? [], [schemas.data]);
  const changes = schemaRows.filter((row) => row["event.name"] === "S3 Tables schema change");
  const latestStates = useMemo(() => {
    const map = new Map<string, SchemaEventRecord>();
    for (const row of schemaRows) {
      if (row["event.name"] !== "S3 Tables schema state") continue;
      const key = `${row.namespace ?? ""}/${row.table ?? ""}`;
      if (!map.has(key)) map.set(key, row);
    }
    return map;
  }, [schemaRows]);
  const visible = selected.length === 0 ? catalog.datasets : catalog.datasets.filter((dataset) => selected.includes(dataset.key));
  const singleState = visible.length === 1 ? latestStates.get(visible[0].key) : undefined;

  return (
    <main className="app-page">
      <Hero
        kicker="INVESTIGATION WORKSPACE"
        title="Explore tables, signals, changes, and cost."
        description="Select one dataset, compare any subset, or keep the full environment in scope. Every section below follows the same selection."
        aside={<span>{selected.length === 0 ? "ALL DATASETS" : `${selected.length} DATASET${selected.length === 1 ? "" : "S"}`}</span>}
      />
      <DatasetScope selected={selected} onChange={setScope} datasets={catalog.datasets} />

      <nav className="section-nav" aria-label="Explore sections">
        <a href="#state">Iceberg state</a><a href="#operations">Operations</a><a href="#data-profile">Data profile</a><a href="#changes">Changes</a><a href="#cost">Cost</a>
      </nav>

      <section id="state" className="explore-section">
        <div className="section-heading"><span>01</span><div><h2>Iceberg state</h2><p>Catalog metadata embedded in the investigation—not a separate topology destination.</p></div></div>
        <BentoGrid>
          <QueryKpi query={query.catalog + "\n| summarize total=sum(rows_n)"} field="total" label="rows in scope" eyebrow="ROWS" accent="#73e5ff" />
          <QueryKpi query={query.catalog + "\n| summarize total=sum(files_n)"} field="total" label="active data files" eyebrow="FILES" accent="#a9f27c" />
          <QueryKpi query={query.catalog + "\n| summarize total=sum(snaps_n)"} field="total" label="Iceberg snapshots" eyebrow="HISTORY" accent="#a995ff" />
          <QueryKpi query={query.catalog + "\n| summarize total=count()"} field="total" label="tables in scope" eyebrow="TABLES" accent="#ffc857" />
          <BentoCard className="bento-card--full" eyebrow="TABLE STATE" title="Current metadata by table" accent="#73e5ff">
            {tableState.isLoading || tableState.error ? <QueryState isLoading={tableState.isLoading} error={tableState.error} /> : (
              <div className="catalog-list">
                {(tableState.data?.records ?? []).map((row) => {
                  const key = `${row.ns}/${row.table}`;
                  const dataset = catalog.datasets.find((item) => item.key === key) ?? datasetByKey(key);
                  return <button type="button" className="catalog-row catalog-row--button" key={key} onClick={() => setScope([key])}>
                    <div><div className="catalog-row__label" style={{ color: dataset?.accent }}>{dataset?.label ?? key}</div><div className="bento-copy">Click to isolate this table</div></div>
                    <div className="catalog-row__path">{key}</div>
                    <div className="catalog-stat"><strong>{number(row.rows_n)}</strong><span>rows</span></div>
                    <div className="catalog-stat"><strong>{number(row.files_n)}</strong><span>files</span></div>
                    <div className="catalog-stat"><strong>{number(row.snaps_n)}</strong><span>snapshots</span></div>
                    <div className="catalog-stat"><strong>{number(row.fields_n)}</strong><span>columns</span></div>
                  </button>;
                })}
              </div>
            )}
          </BentoCard>
        </BentoGrid>
      </section>

      <section id="operations" className="explore-section">
        <div className="section-heading"><span>02</span><div><h2>Operational activity</h2><p>Native AWS/S3 Tables telemetry, filtered to the selected namespaces.</p></div></div>
        <BentoGrid>
          <BentoCard className="bento-card--medium bento-card--tall" eyebrow="REQUESTS" title="Volume by namespace" accent="#73e5ff"><ChartTile query={query.requests} title="Requests / minute" variant="area" height={250} /></BentoCard>
          <BentoCard className="bento-card--medium bento-card--tall" eyebrow="PERFORMANCE" title="Latency" accent="#a9f27c"><ChartTile query={query.latency} title="First byte and total" height={250} /></BentoCard>
          <BentoCard className="bento-card--wide bento-card--tall" eyebrow="THROUGHPUT" title="Data transferred" accent="#a995ff"><ChartTile query={query.bytes} title="Downloaded / uploaded" variant="area" height={230} /></BentoCard>
          <BentoCard className="bento-card--narrow bento-card--tall" eyebrow="RELIABILITY" title="Errors" accent="#ff7f7f"><ChartTile query={query.errors} title="4xx / 5xx" variant="area" height={230} /></BentoCard>
        </BentoGrid>
      </section>

      <section id="data-profile" className="explore-section">
        <div className="section-heading"><span>03</span><div><h2>Data profile</h2><p>Sampled aggregates provide workload context; raw records remain in AWS.</p></div></div>
        <BentoGrid>
          <QueryKpi query={query.dataTotals} field="rows_analyzed" label="sampled rows represented" eyebrow="COVERAGE" accent="#73e5ff" />
          <QueryKpi query={query.dataTotals} field="tables" label="profiled tables" eyebrow="SCOPE" accent="#a9f27c" />
          <BentoCard className="bento-card--wide" eyebrow="GUARDRAIL" title="Observability signal, not a query engine" accent="#ffc857"><p className="bento-copy">Only bounded category counts and numeric averages are ingested. This adds operational context without copying customer rows into Dynatrace.</p></BentoCard>
          {visible.map((dataset) => {
            const cats = (categories.data?.records ?? []).filter((row) => `${row.ns}/${row.table}` === dataset.key);
            const nums = (numerics.data?.records ?? []).filter((row) => `${row.ns}/${row.table}` === dataset.key);
            const max = Math.max(1, ...cats.map((row) => Number(row.count ?? 0)));
            return <BentoCard className="bento-card--medium" key={dataset.key} eyebrow={dataset.domain} title={dataset.label} accent={dataset.accent}>
              {categories.isLoading || numerics.isLoading ? <QueryState isLoading error={null} /> : <div className="insight-layout">
                <div className="insight-breakdown"><span className="mini-label">CATEGORY MIX</span>{cats.slice(0, 7).map((row) => <div className="bar-row" key={row.category}><span>{row.category}</span><div className="bar-track"><div className="bar-fill" style={{ width: `${Math.max(3, Number(row.count ?? 0) / max * 100)}%`, background: dataset.accent }} /></div><strong>{number(row.count)}</strong></div>)}</div>
                <div className="numeric-stack"><span className="mini-label">AVERAGES</span>{nums.map((row) => <div className="numeric-row" key={row.field}><span>{row.field.replaceAll("_", " ")}</span><strong>{number(row.average)}</strong></div>)}</div>
              </div>}
            </BentoCard>;
          })}
        </BentoGrid>
      </section>

      <section id="changes" className="explore-section">
        <div className="section-heading"><span>04</span><div><h2>Change intelligence</h2><p>Track actual contract changes separately from routine schema-state observations.</p></div></div>
        <BentoGrid>
          <BentoCard className="bento-card--narrow" eyebrow="30-DAY CHANGES" title={`${changes.length} detected`} accent={changes.length ? "#ffc857" : "#a9f27c"}><p className="bento-copy">Schema changes are signals, not automatically incidents. Removals and incompatible type changes carry the most risk.</p></BentoCard>
          <BentoCard className="bento-card--wide" eyebrow="CORRELATION" title="Connect contract changes to operational impact" accent="#73e5ff"><div className="change-list">{changes.length === 0 ? <div className="empty-state">No schema changes in the current scope.</div> : changes.map((change, index) => <div className="change-item" key={`${change.timestamp}-${index}`}><span className="scope-dot" /><div><strong>{change.namespace}/{change.table}</strong><span>{new Date(change.timestamp).toLocaleString()}</span></div><div className="change-tags">{change.added && change.added !== "none" && <span className="tag tag--added">+ {change.added}</span>}{change.removed && change.removed !== "none" && <span className="tag tag--removed">− {change.removed}</span>}</div></div>)}</div></BentoCard>
          <BentoCard className="bento-card--full" eyebrow="CURRENT CONTRACT" title={singleState ? `${visible[0].label} fields` : "Select one dataset to inspect its fields"} accent="#a995ff">{singleState ? <div className="field-cloud">{parseFields(singleState.fields).map((field) => <span className="field-pill" key={field.name}><strong>{field.name}</strong><small>{field.type}</small></span>)}</div> : <div className="empty-state">Choose one dataset above for field-level inspection.</div>}</BentoCard>
        </BentoGrid>
      </section>

      <section id="cost" className="explore-section">
        <div className="section-heading"><span>05</span><div><h2>Cost & capacity</h2><p>Operational estimates follow the same dataset scope.</p></div></div>
        <BentoGrid>
          <QueryKpi query={query.costSummary} field="storage_usd" label="storage / month" eyebrow="STORAGE" accent="#73e5ff" format="currency" />
          <QueryKpi query={query.costSummary} field="monitoring_usd" label="object monitoring / month" eyebrow="FILES" accent="#a9f27c" format="currency" />
          <QueryKpi query={query.requestCost} field="request_usd" label="GET + PUT · 2 hours" eyebrow="REQUESTS" accent="#ffc857" format="currency" />
          <QueryKpi query={query.costSummary} field="baseline_usd" label="estimated baseline / month" eyebrow="BASELINE" accent="#a995ff" format="currency" />
          <BentoCard className="bento-card--full" eyebrow="ALLOCATION" title="Current footprint by table" accent="#a9f27c">{costs.isLoading || costs.error ? <QueryState isLoading={costs.isLoading} error={costs.error} /> : <div className="cost-grid">{(costs.data?.records ?? []).map((row) => { const key = `${row.ns}/${row.table}`; const dataset = catalog.datasets.find((item) => item.key === key); return <div className="cost-row" key={key}><div><span className="scope-dot" style={{ "--dataset-accent": dataset?.accent ?? "#73e5ff" } as React.CSSProperties} /><strong>{dataset?.label ?? key}</strong><small>{key}</small></div><div><strong>{size(row.current_bytes)}</strong><span>storage</span></div><div><strong>{number(row.current_objects)}</strong><span>files</span></div><div><strong>{money(row.storage_usd)}</strong><span>storage/mo</span></div><div><strong>{money(row.monitoring_usd)}</strong><span>monitoring/mo</span></div></div>; })}</div>}</BentoCard>
        </BentoGrid>
      </section>
    </main>
  );
};
