"""
StreamingExporter: memory-efficient generators for large datasets.

Each method is a generator so callers can pipe the output directly to an
HTTP response, a file write loop, or any other consumer without buffering
the entire dataset in memory.
"""

from __future__ import annotations

import csv
import io
import json
from typing import Generator, Iterator


class StreamingExporter:
    """Yield serialised rows incrementally as :class:`bytes` chunks."""

    # ------------------------------------------------------------------
    # CSV streaming
    # ------------------------------------------------------------------

    def stream_csv(
        self,
        rows: list[dict],
    ) -> Generator[bytes, None, None]:
        """
        Yield the CSV header followed by one row per yield, each as UTF-8
        encoded bytes (including the trailing newline).

        Parameters
        ----------
        rows:
            List of flat dicts.  All dicts must share the same keys.

        Yields
        ------
        bytes
            Header line first, then one data row per iteration.

        Example
        -------
        ::

            exporter = StreamingExporter()
            for chunk in exporter.stream_csv(personas):
                response.write(chunk)
        """
        if not rows:
            return

        fieldnames = list(rows[0].keys())

        # --- header ---
        header_buf = io.StringIO()
        header_writer = csv.DictWriter(
            header_buf,
            fieldnames=fieldnames,
            lineterminator="\n",
            extrasaction="ignore",
        )
        header_writer.writeheader()
        yield header_buf.getvalue().encode("utf-8")

        # --- data rows (one per yield) ---
        for row in rows:
            row_buf = io.StringIO()
            row_writer = csv.DictWriter(
                row_buf,
                fieldnames=fieldnames,
                lineterminator="\n",
                extrasaction="ignore",
            )
            row_writer.writerow(row)
            yield row_buf.getvalue().encode("utf-8")

    # ------------------------------------------------------------------
    # JSON streaming
    # ------------------------------------------------------------------

    def stream_json(
        self,
        rows: list[dict],
    ) -> Generator[bytes, None, None]:
        """
        Yield a JSON array in chunks as UTF-8 bytes.

        The array is emitted in the following sequence:

        1. Opening bracket ``[\\n``
        2. One JSON-encoded object per row (with trailing comma except the last)
        3. Closing bracket ``]\\n``

        Parameters
        ----------
        rows:
            List of flat dicts.

        Yields
        ------
        bytes
            JSON chunks that, when concatenated, form a valid JSON array.

        Example
        -------
        ::

            exporter = StreamingExporter()
            for chunk in exporter.stream_json(personas):
                response.write(chunk)
        """
        if not rows:
            yield b"[]\n"
            return

        yield b"[\n"

        last_index = len(rows) - 1
        for i, row in enumerate(rows):
            encoded = json.dumps(row, default=str)
            if i < last_index:
                yield (encoded + ",\n").encode("utf-8")
            else:
                yield (encoded + "\n").encode("utf-8")

        yield b"]\n"
