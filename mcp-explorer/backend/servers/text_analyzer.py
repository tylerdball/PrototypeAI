"""Text Analyzer MCP server — analyse text without calling an LLM."""

import re
from collections import Counter

from mcp.server.fastmcp import FastMCP

mcp = FastMCP("text-analyzer")


@mcp.tool()
def word_count(text: str) -> dict:
    """Count words, characters, and unique words in text."""
    words = text.split()
    return {
        "word_count": len(words),
        "character_count": len(text),
        "character_count_no_spaces": len(text.replace(" ", "")),
        "unique_words": len(set(w.lower().strip(".,!?") for w in words)),
    }


@mcp.tool()
def sentence_count(text: str) -> dict:
    """Count sentences and estimate paragraph count."""
    sentences = re.split(r'[.!?]+', text)
    sentences = [s.strip() for s in sentences if s.strip()]
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    return {
        "sentence_count": len(sentences),
        "paragraph_count": max(1, len(paragraphs)),
        "avg_words_per_sentence": round(len(text.split()) / max(1, len(sentences)), 1),
    }


@mcp.tool()
def reading_time(text: str, words_per_minute: int = 200) -> dict:
    """Estimate reading time for text at a given reading speed."""
    word_count = len(text.split())
    minutes = word_count / words_per_minute
    return {
        "word_count": word_count,
        "words_per_minute": words_per_minute,
        "reading_time_minutes": round(minutes, 1),
        "reading_time_seconds": round(minutes * 60),
    }


@mcp.tool()
def top_words(text: str, n: int = 10) -> dict:
    """Find the N most frequent words, ignoring common stop words."""
    stop_words = {"the", "a", "an", "and", "or", "but", "in", "on", "at", "to",
                  "for", "of", "with", "is", "it", "this", "that", "was", "are", "be"}
    words = re.findall(r'\b[a-zA-Z]+\b', text.lower())
    filtered = [w for w in words if w not in stop_words and len(w) > 2]
    counts = Counter(filtered).most_common(n)
    return {"top_words": [{"word": w, "count": c} for w, c in counts]}


if __name__ == "__main__":
    mcp.run()
