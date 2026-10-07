# Amazon S3 Tables — references

Curated, authoritative references, grouped by how they map to this project.
Descriptions are paraphrased from AWS documentation for compliance.

## Product & overview

- [Amazon S3 Tables — feature page](https://aws.amazon.com/s3/features/tables/) — product
  overview; S3 Tables expose the Iceberg REST Catalog API and work with Spark, Trino, Flink,
  Athena, Redshift, Snowflake, and other engines.

## Iceberg REST Catalog access (the integration-opportunity core)

- [Accessing tables using the Amazon S3 Tables Iceberg REST endpoint](https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-tables-integrating-open-source.html)
  — the **S3 Tables IRC** endpoint (direct, single table bucket; APN/custom catalogs).
- [Accessing Amazon S3 tables using the AWS Glue Iceberg REST endpoint](https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-tables-integrating-glue-endpoint.html)
  — the **Glue IRC** endpoint; implements the Iceberg REST Catalog OpenAPI spec with IAM +
  Lake Formation permissions.
- [Accessing S3 tables with the S3 Tables Catalog for Apache Iceberg](https://docs.aws.amazon.com/us_en/AmazonS3/latest/userguide/s3-tables-client-catalog.html)
  — open-source AWS Labs client catalog that translates Iceberg operations into S3 Tables
  API calls.
- [S3 table access options overview](https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-tables-access.html)
  — how S3 table buckets integrate with the Glue Data Catalog and federate to analytics
  services.

## Monitoring (what the current CloudWatch-based integration consumes)

- [Monitoring metrics with Amazon CloudWatch (S3 Tables)](https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-tables-cloudwatch-metrics.html)
  — the `AWS/S3/Tables` namespace; daily storage metrics at no cost.
- [S3 Tables metrics and dimensions](https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-tables-metrics-dimensions.html)
  — authoritative metric + dimension catalog (storage, maintenance, request metrics;
  TableBucketName / Namespace / TableName).
- [Managing S3 Tables CloudWatch metrics](https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-tables-managing-cloudwatch-metrics.html)
  — storage metrics on by default; request metrics are opt-in via console/CLI/SDK.
- [Accessing S3 Tables metrics in CloudWatch](https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-tables-accessing-cloudwatch-metrics.html)
  — viewing them in the console.

## Hands-on / deeper

- [Access S3 Tables using PyIceberg through the Glue Iceberg REST endpoint](https://aws.amazon.com/blogs/storage/access-data-in-amazon-s3-tables-using-pyiceberg-through-the-aws-glue-iceberg-rest-endpoint/)
  — AWS blog; closest reference to what this POC's IRC collector does.
- [Accessing S3 tables with Amazon EMR](https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-tables-integrating-emr.html)
  — Spark-on-EMR access patterns.
- [Working with Apache Iceberg V3](https://docs.aws.amazon.com/AmazonS3/latest/userguide/working-with-apache-iceberg-v3.html)
  — newer Iceberg V3 features (variant/geometry types, maintenance).
