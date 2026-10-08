import React from "react";
import { Flex } from "@dynatrace/strato-components/layouts";
import { Paragraph } from "@dynatrace/strato-components/typography";
import { ProgressCircle } from "@dynatrace/strato-components/content";
import Colors from "@dynatrace/strato-design-tokens/colors";
import { CriticalIcon } from "@dynatrace/strato-icons";

/**
 * Small shared helper that renders loading and error states consistently.
 * Returns `null` once data is ready so callers can render their own content.
 */
export const QueryState = ({
  isLoading,
  error,
}: {
  isLoading: boolean;
  error: Error | null;
}) => {
  if (error) {
    return (
      <Flex alignItems="center" gap={4} style={{ color: Colors.Text.Critical.Default }}>
        <CriticalIcon />
        <Paragraph>{error.message}</Paragraph>
      </Flex>
    );
  }
  if (isLoading) {
    return (
      <Flex alignItems="center" gap={8}>
        <ProgressCircle size="small" aria-label="Loading" />
        <Paragraph>Loading…</Paragraph>
      </Flex>
    );
  }
  return null;
};
