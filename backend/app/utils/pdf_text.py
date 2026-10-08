"""Plain-text escaping for reportlab Paragraphs (which parse XML-like markup)."""
from xml.sax.saxutils import escape


def esc(value) -> str:
    """Escape user-supplied text so <, >, & cannot break PDF layout."""
    return escape(str(value), {'"': "&quot;"})
