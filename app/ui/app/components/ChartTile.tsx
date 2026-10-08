import React from "react";
import { useDql } from "@dynatrace-sdk/react-hooks";
import { Surface, Flex } from "@dynatrace/strato-components/layouts";
import { Heading } from "@dynatrace/strato-components/typography";
import {
  TimeseriesChart,
  convertToTimeseries,
} from "@dynatrace/strato-components/charts";
import { QueryState } from "./QueryState";

export interface ChartTileProps {
  /** A `timeseries ...` DQL query. */
  query: string;
  /** Chart title. */
  title: string;
  /** Visual variant. */
  variant?: "line" | "area";
  /** Pixel height for the chart body. */
  height?: number;
}

/**
 * A titled timeseries chart backed by a DQL query. Reuses the operations /
 * finops dashboard timeseries queries verbatim.
 */
export const ChartTile = ({
  query,
  title,
  variant = "line",
  height = 260,
}: ChartTileProps) => {
  const { data, error, isLoading } = useDql({ query });

  return (
    <Surface style={{ padding: 16, flex: "1 1 420px", minWidth: 360 }}>
      <Flex flexDirection="column" gap={8}>
        <Heading level={6}>{title}</Heading>
        {isLoading || error ? (
          <QueryState isLoading={isLoading} error={error} />
        ) : data?.records ? (
          <div style={{ height }}>
            <TimeseriesChart
              data={convertToTimeseries(data.records, data.types)}
              gapPolicy="connect"
              variant={variant}
            >
              <TimeseriesChart.Legend position="bottom" />
            </TimeseriesChart>
          </div>
        ) : null}
      </Flex>
    </Surface>
  );
};
