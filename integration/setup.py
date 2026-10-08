"""Packaging metadata for the S3 Tables (Iceberg/IRC) Extensions 2.0 extension.

The extension version is sourced from ``extension/extension.yaml`` so there is a
single source of truth. ``dt-sdk build`` bundles ``install_requires`` into the
extension's ``lib/`` folder.

NOTE on runtime dependencies: the collector (``poc/s3tables_core.py`` ->
``poc/common.py``) needs ``pyiceberg[pyarrow]``, ``boto3`` and ``requests``.
Those are intentionally *not* listed here for the default local build because
``dt-sdk build`` downloads wheels for the build host's platform, and ``pyarrow``
cannot be bundled from this macOS host for a Linux ActiveGate. For a real
ActiveGate deployment, add them (see README "Deploying to an ActiveGate") and
build with an explicit Linux platform/python target.
"""
from pathlib import Path

from setuptools import find_packages, setup


def find_version() -> str:
    version = "0.0.1"
    extension_yaml_path = Path(__file__).parent / "extension" / "extension.yaml"
    try:
        with open(extension_yaml_path, encoding="utf-8") as f:
            for line in f:
                if line.startswith("version"):
                    version = line.split(" ")[-1].strip().strip('"')
                    break
    except Exception:
        pass
    return version


setup(
    name="s3tables_iceberg",
    version=find_version(),
    description="Dynatrace Extensions 2.0 extension for Amazon S3 Tables (Iceberg via the S3 Tables IRC)",
    author="AWS + Dynatrace S3 Tables integration",
    packages=find_packages(),
    python_requires=">=3.10",
    include_package_data=True,
    install_requires=["dt-extensions-sdk"],
    extras_require={
        "dev": ["dt-extensions-sdk[cli]"],
        # Collector runtime deps — required on the ActiveGate (see README).
        "runtime": ["pyiceberg[pyarrow]==0.12.0", "boto3", "requests==2.34.2"],
    },
)
