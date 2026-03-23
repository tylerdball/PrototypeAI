"""Date Tools MCP server — date and time utilities."""

from datetime import date, datetime, timedelta

from mcp.server.fastmcp import FastMCP

mcp = FastMCP("date-tools")


@mcp.tool()
def today() -> dict:
    """Get today's date and day of the week."""
    d = date.today()
    return {
        "date": d.isoformat(),
        "day_of_week": d.strftime("%A"),
        "day": d.day,
        "month": d.strftime("%B"),
        "year": d.year,
        "iso_week": d.isocalendar().week,
    }


@mcp.tool()
def days_between(date1: str, date2: str) -> dict:
    """Calculate the number of days between two dates (YYYY-MM-DD format)."""
    d1 = date.fromisoformat(date1)
    d2 = date.fromisoformat(date2)
    delta = abs((d2 - d1).days)
    weeks, days = divmod(delta, 7)
    return {
        "date1": date1,
        "date2": date2,
        "days": delta,
        "weeks": weeks,
        "remaining_days": days,
    }


@mcp.tool()
def add_days(start_date: str, days: int) -> dict:
    """Add a number of days to a date (YYYY-MM-DD format). Use negative days to subtract."""
    d = date.fromisoformat(start_date)
    result = d + timedelta(days=days)
    return {
        "start_date": start_date,
        "days_added": days,
        "result_date": result.isoformat(),
        "result_day_of_week": result.strftime("%A"),
    }


@mcp.tool()
def what_day_is(target_date: str) -> dict:
    """Get the day of the week and other info for a specific date (YYYY-MM-DD)."""
    d = date.fromisoformat(target_date)
    today_date = date.today()
    delta = (d - today_date).days
    if delta == 0:
        relative = "today"
    elif delta == 1:
        relative = "tomorrow"
    elif delta == -1:
        relative = "yesterday"
    elif delta > 0:
        relative = f"in {delta} days"
    else:
        relative = f"{abs(delta)} days ago"
    return {
        "date": target_date,
        "day_of_week": d.strftime("%A"),
        "month": d.strftime("%B"),
        "year": d.year,
        "relative": relative,
        "is_weekend": d.weekday() >= 5,
    }


if __name__ == "__main__":
    mcp.run()
