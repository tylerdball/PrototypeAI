"""
ExportWriter: serialises lists of dicts to JSON, CSV, or files on disk.
"""

from __future__ import annotations

import csv
import io
import json
from pathlib import Path


class ExportWriter:
    """Serialise row data to various text formats."""

    # ------------------------------------------------------------------
    # JSON
    # ------------------------------------------------------------------

    def to_json(self, rows: list[dict], pretty: bool = True) -> str:
        """
        Serialise *rows* to a JSON string.

        Parameters
        ----------
        rows:
            List of flat dicts (e.g. persona records).
        pretty:
            When ``True`` (default) the output is indented with 2 spaces.

        Returns
        -------
        str
            JSON-encoded string.
        """
        indent = 2 if pretty else None
        return json.dumps(rows, indent=indent, default=str)

    # ------------------------------------------------------------------
    # CSV
    # ------------------------------------------------------------------

    def to_csv(self, rows: list[dict]) -> str:
        """
        Serialise *rows* to a CSV string with a header row.

        Parameters
        ----------
        rows:
            List of flat dicts; all dicts must share the same keys.

        Returns
        -------
        str
            CSV-encoded string (including header).

        Raises
        ------
        ValueError
            If *rows* is empty (no column names can be inferred).
        """
        if not rows:
            return ""

        output = io.StringIO()
        fieldnames = list(rows[0].keys())
        writer = csv.DictWriter(
            output,
            fieldnames=fieldnames,
            lineterminator="\n",
            extrasaction="ignore",
        )
        writer.writeheader()
        writer.writerows(rows)
        return output.getvalue()

    # ------------------------------------------------------------------
    # File output
    # ------------------------------------------------------------------

    def to_file(self, rows: list[dict], format: str, path: str) -> Path:
        """
        Write *rows* to *path* in the given *format*.

        Parameters
        ----------
        rows:
            List of flat dicts.
        format:
            ``"json"`` or ``"csv"`` (case-insensitive).
        path:
            Destination file path (created or overwritten).

        Returns
        -------
        Path
            Resolved :class:`pathlib.Path` of the written file.

        Raises
        ------
        ValueError
            If *format* is not ``"json"`` or ``"csv"``.
        """
        fmt = format.lower().strip()
        if fmt == "json":
            content = self.to_json(rows)
        elif fmt == "csv":
            content = self.to_csv(rows)
        else:
            raise ValueError(
                f"Unsupported format {format!r}. Choose 'json' or 'csv'."
            )

        dest = Path(path)
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(content, encoding="utf-8")
        return dest.resolve()
