import React from "react";
import { Flex } from "@dynatrace/strato-components/layouts";
import { Heading, Paragraph } from "@dynatrace/strato-components/typography";
import { MetricTile } from "../components/MetricTile";
import { ChartTile } from "../components/ChartTile";
import { SINGLE_VALUE, OPS_CHARTS, POC } from "../queries";

export const Overview = () => {
  return (
    <Flex flexDirection="column" gap={24} padding={32}>
      <Flex flexDirection="column" gap={4}>
        <Heading>Airline data lake — overview</Heading>
        <Paragraph>
          Amazon S3 Tables + Apache Iceberg, surfaced in Dynatrace.{" "}
          <code>
            {POC.bucket} / {POC.namespace} / {POC.table}
          </code>{" "}
          · AWS account 347830095179 · us-east-1.
        </Paragraph>
      </Flex>

      <Heading level={5}>Current Iceberg state</Heading>
      <Flex gap={16} flexFlow="wrap">
        <MetricTile {...SINGLE_VALUE.rows} label="Flight records" />
        <MetricTile {...SINGLE_VALUE.files} label="Iceberg data files" />
        <MetricTile {...SINGLE_VALUE.snapshots} label="Snapshots" />
        <MetricTile {...SINGLE_VALUE.schemaFields} label="Schema fields" />
      </Flex>

      <Heading level={5}>Native AWS/S3 Tables request telemetry</Heading>
      <Flex gap={16} flexFlow="wrap">
        <ChartTile query={OPS_CHARTS.requests} title="Request volume (per minute)" variant="line" />
        <ChartTile query={OPS_CHARTS.latency} title="Request latency (ms)" variant="line" />
        <ChartTile query={OPS_CHARTS.bytes} title="Data transferred (bytes/min)" variant="area" />
        <ChartTile query={OPS_CHARTS.errors} title="Reliability — 4xx / 5xx" variant="area" />
      </Flex>
    </Flex>
  );
};
