#!/usr/bin/env bash
# Deploy the S3 Tables stack and enable 1-minute request metrics.
# Requires valid creds for the Dynatrace-integrated account (945488516368).
set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
STACK="s3tables-dt-poc"
HERE="$(cd "$(dirname "$0")" && pwd)"

aws cloudformation deploy \
  --template-file "$HERE/s3tables.yaml" \
  --stack-name "$STACK" \
  --region "$REGION" \
  --no-cli-pager

ARN=$(aws cloudformation describe-stacks \
  --stack-name "$STACK" --region "$REGION" --no-cli-pager \
  --query "Stacks[0].Outputs[?OutputKey=='TableBucketArn'].OutputValue" \
  --output text)

echo "$ARN" > "$HERE/../poc/.table_bucket_arn"
echo "Table bucket ARN: $ARN"

# Storage + maintenance metrics are on by default (daily, free). Request metrics are
# opt-in and give 1-minute data — enable them so the dashboards show live traffic.
aws s3tables put-table-bucket-metrics-configuration \
  --table-bucket-arn "$ARN" \
  --region "$REGION" --no-cli-pager

echo "Request metrics enabled. Deploy complete."
