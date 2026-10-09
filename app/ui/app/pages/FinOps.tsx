import React, { useMemo } from "react";
import { useDql } from "@dynatrace-sdk/react-hooks";
import { Flex, Surface } from "@dynatrace/strato-components/layouts";
import { Heading, Paragraph } from "@dynatrace/strato-components/typography";
import { DataTable, type DataTableColumnDef } from "@dynatrace/strato-components/tables";
import { MetricTile } from "../components/MetricTile";
import { ChartTile } from "../components/ChartTile";
import { QueryState } from "../components/QueryState";
import {
  FINOPS_SINGLE_VALUE,
  FINOPS_CHARTS,
  FINOPS_SCALE,
  PRICE_CARD,
} from "../queries";

const usd = (v: unknown) =>
  v === null || v === undefined || Number.isNaN(Number(v))
    ? "—"
    : Number(v).toLocaleString(undefined, {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

interface ScaleRow {
  scale: string;
  gb: string;
  storage_usd: string;
}

const scaleColumns: DataTableColumnDef<ScaleRow>[] = [
  { id: "scale", header: "Scale", accessor: "scale", width: "1fr" },
  { id: "gb", header: "GB", accessor: "gb", width: "1fr" },
  { id: "storage_usd", header: "Storage / month", accessor: "storage_usd", width: "1fr" },
];

interface PriceRow {
  driver: string;
  rate: string;
  source: string;
}

const priceColumns: DataTableColumnDef<PriceRow>[] = [
  { id: "driver", header: "Driver", accessor: "driver", width: "1fr" },
  { id: "rate", header: "Rate used", accessor: "rate", width: "1fr" },
  { id: "source", header: "Telemetry source", accessor: "source", width: "2fr" },
];

export const FinOps = () => {
  const scale = useDql({ query: FINOPS_SCALE });

  const scaleRows = useMemo<ScaleRow[]>(() => {
    const recs = scale.data?.records ?? [];
    return recs.map((r) => ({
      scale: typeof r.scale === "string" ? r.scale : "",
      gb: Number(r.gb ?? 0).toLocaleString(),
      storage_usd: usd(r.storage_usd),
    }));
  }, [scale.data]);

  return (
    <Flex flexDirection="column" gap={24} padding={32}>
      <Flex flexDirection="column" gap={4}>
        <Heading>FinOps &amp; table intelligence</Heading>
        <Paragraph>
          Live Iceberg state and native request telemetry converted into operational cost
          estimates. These are estimates, not billing data.
        </Paragraph>
      </Flex>

      <Heading level={5}>Estimated cost</Heading>
      <Flex gap={16} flexFlow="wrap">
        <MetricTile {...FINOPS_SINGLE_VALUE.storage} label="Storage / month" format="usd" />
        <MetricTile {...FINOPS_SINGLE_VALUE.monitoring} label="Object monitoring / month" format="usd" />
        <MetricTile {...FINOPS_SINGLE_VALUE.requests} label="GET + PUT in timeframe" format="usd" />
        <MetricTile {...FINOPS_SINGLE_VALUE.total} label="Baseline / month" format="usd" />
      </Flex>

      <Heading level={5}>Cost drivers over time</Heading>
      <Flex gap={16} flexFlow="wrap">
        <ChartTile query={FINOPS_CHARTS.costTrend} title="Estimated storage cost as the table grows" variant="area" />
        <ChartTile query={FINOPS_CHARTS.requestTrend} title="Native request cost drivers" variant="area" />
      </Flex>

      <Heading level={5}>Airline-scale monthly storage projection</Heading>
      <Surface style={{ padding: 16 }}>
        {scale.isLoading || scale.error ? (
          <QueryState isLoading={scale.isLoading} error={scale.error} />
        ) : (
          <DataTable data={scaleRows} columns={scaleColumns} />
        )}
      </Surface>

      <Heading level={5}>Current AWS S3 Tables cost drivers</Heading>
      <Surface style={{ padding: 16 }}>
        <DataTable data={PRICE_CARD} columns={priceColumns} lineWrap fullWidth />
      </Surface>
    </Flex>
  );
};
