import React from "react";
import { Flex } from "@dynatrace/strato-components/layouts";
import { Heading, Text } from "@dynatrace/strato-components/typography";
import Colors from "@dynatrace/strato-design-tokens/colors";

/**
 * A plain-text KPI (label + large value). Deliberately does NOT use the charts
 * `SingleValue` component: that one sizes to its container height and renders
 * invisibly inside auto-height tiles. Plain typography always renders.
 */
export const KpiValue = ({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) => (
  <Flex flexDirection="column" gap={2} style={{ minWidth: 150 }}>
    <Text style={{ color: Colors.Text.Neutral.Default, fontSize: 13 }}>{label}</Text>
    <Heading level={2} style={{ fontSize: 30, lineHeight: "1.15" }}>
      {value}
    </Heading>
  </Flex>
);
