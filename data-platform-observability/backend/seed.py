"""Run once to populate demo data: python seed.py"""
from database import init_db, get_conn
from datetime import datetime, timedelta
import random

random.seed(42)

DATASETS = [
    ("customer_transactions", "Daily POS and online transaction records", "Data Engineering", "alice.wong", "finance", "Snowflake", "delta", "hourly", "finance,core,pii"),
    ("customer_profiles", "Master customer identity and attribute store", "Data Engineering", "alice.wong", "customers", "Salesforce CRM", "parquet", "daily", "customers,core,pii"),
    ("product_catalog", "Canonical product and SKU reference data", "Platform", "bob.chen", "products", "ERP System", "parquet", "daily", "products,reference"),
    ("marketing_events", "Click, impression, and conversion events from campaigns", "Marketing Analytics", "carol.james", "marketing", "Segment", "json", "real-time", "marketing,events"),
    ("support_tickets", "Customer support interactions and resolutions", "Customer Success", "dave.patel", "support", "Zendesk", "parquet", "daily", "support,customers"),
    ("inventory_levels", "Warehouse and store inventory snapshots", "Supply Chain", "eve.liu", "supply_chain", "SAP", "csv", "hourly", "supply-chain,inventory"),
    ("financial_ledger", "General ledger entries and reconciliation data", "Finance", "frank.omar", "finance", "Oracle Financials", "delta", "daily", "finance,accounting,pii"),
    ("web_sessions", "User session and page-view data from the web app", "Platform", "bob.chen", "product", "Kafka / Clickhouse", "parquet", "real-time", "product,events"),
    ("churn_predictions", "ML model output — monthly churn probability per customer", "Data Science", "grace.kim", "ml", "MLflow / S3", "parquet", "weekly", "ml,predictions,customers"),
    ("logistics_shipments", "Shipment tracking and carrier event data", "Supply Chain", "eve.liu", "supply_chain", "FedEx API / UPS API", "json", "hourly", "supply-chain,logistics"),
    ("ad_spend", "Daily advertising spend by channel and campaign", "Marketing Analytics", "carol.james", "marketing", "Google Ads / Meta", "csv", "daily", "marketing,finance"),
    ("data_quality_metrics", "Row counts, null rates, and schema drift metrics across datasets", "Platform", "bob.chen", "platform", "dbt / Great Expectations", "parquet", "daily", "platform,quality,internal"),
]

SLOS = [
    # dataset_id (1-indexed), type, description, target, current, unit, status
    (1, "freshness", "Data arrives within 2 hours of source transaction", 2.0, 1.4, "hours", "passing"),
    (1, "completeness", "Less than 0.1% null transaction IDs", 99.9, 99.95, "%", "passing"),
    (1, "availability", "Pipeline succeeds ≥ 99.5% of runs", 99.5, 97.2, "%", "failing"),
    (2, "freshness", "Profile updates land within 24 hours", 24.0, 26.1, "hours", "failing"),
    (2, "completeness", "Email address present on ≥ 98% of profiles", 98.0, 98.7, "%", "passing"),
    (3, "freshness", "Catalog refresh within 24 hours of ERP update", 24.0, 18.0, "hours", "passing"),
    (4, "freshness", "Events land within 5 minutes of emission", 5.0, 3.2, "minutes", "passing"),
    (4, "completeness", "User ID present on ≥ 99% of events", 99.0, 96.4, "%", "failing"),
    (7, "completeness", "All ledger lines have cost-centre codes", 100.0, 99.1, "%", "warning"),
    (7, "availability", "Pipeline succeeds ≥ 99.9% of runs", 99.9, 99.9, "%", "passing"),
    (8, "freshness", "Sessions indexed within 10 minutes", 10.0, 8.0, "minutes", "passing"),
    (9, "freshness", "Monthly predictions available by 1st of each month", 24.0, 18.0, "hours", "passing"),
    (12, "freshness", "Quality metrics computed within 6 hours of pipeline run", 6.0, 4.1, "hours", "passing"),
]

PIPELINES = [
    ("txn_loader_snowflake", 1, "Data Engineering", "hourly", "healthy", -1, 12.4, 0.98),
    ("txn_quality_checks", 1, "Platform", "hourly", "degraded", -2, 4.1, 0.81),
    ("customer_profile_sync", 2, "Data Engineering", "daily", "healthy", -5, 28.7, 0.97),
    ("product_catalog_refresh", 3, "Platform", "daily", "healthy", -3, 9.2, 1.0),
    ("marketing_event_stream", 4, "Marketing Analytics", "real-time", "healthy", 0, 0.8, 0.99),
    ("support_ticket_export", 5, "Customer Success", "daily", "healthy", -6, 15.3, 1.0),
    ("inventory_snapshot", 6, "Supply Chain", "hourly", "failed", -48, 0.0, 0.34),
    ("ledger_daily_close", 7, "Finance", "daily", "healthy", -1, 41.0, 1.0),
    ("web_session_pipeline", 8, "Platform", "real-time", "healthy", 0, 2.1, 0.98),
    ("churn_model_inference", 9, "Data Science", "weekly", "healthy", -7, 95.0, 1.0),
    ("logistics_event_sync", 10, "Supply Chain", "hourly", "degraded", -3, 18.2, 0.72),
    ("ad_spend_import", 11, "Marketing Analytics", "daily", "healthy", -1, 7.4, 0.96),
    ("dq_metrics_pipeline", 12, "Platform", "daily", "healthy", -1, 22.0, 1.0),
    ("customer_churn_alerts", 2, "Data Science", "daily", "healthy", -1, 5.5, 0.99),
]

ERROR_MESSAGES = {
    "inventory_snapshot": "Connection timeout to SAP endpoint after 3 retries. Last successful run: 2 days ago.",
    "txn_quality_checks": "Great Expectations suite 'txn_core' failing on 'expect_column_values_to_not_be_null' for column 'merchant_id'. Failure rate: 19%.",
    "logistics_event_sync": "Rate limit exceeded on FedEx Tracking API (429). Backing off. 28% of shipment records missing carrier events.",
}


def seed():
    init_db()
    with get_conn() as conn:
        # Skip if already seeded
        if conn.execute("SELECT COUNT(*) FROM datasets").fetchone()[0] > 0:
            print("Already seeded — skipping.")
            return

        now = datetime.utcnow()

        # Datasets
        dataset_ids = []
        for row in DATASETS:
            cur = conn.execute(
                "INSERT INTO datasets (name, description, owner_team, owner_person, domain, source_system, format, update_frequency, tags) VALUES (?,?,?,?,?,?,?,?,?)",
                row,
            )
            dataset_ids.append(cur.lastrowid)

        # SLOs
        for slo in SLOS:
            did_index, slo_type, desc, target, current, unit, status = slo
            conn.execute(
                "INSERT INTO slos (dataset_id, slo_type, description, target_value, current_value, unit, status, last_checked) VALUES (?,?,?,?,?,?,?,?)",
                (dataset_ids[did_index - 1], slo_type, desc, target, current, unit, status, now.isoformat()),
            )

        # Pipelines
        for p in PIPELINES:
            name, did_index, owner, schedule, status, hours_ago, duration, success_rate = p
            last_run = (now + timedelta(hours=hours_ago)).isoformat() if hours_ago <= 0 else None
            err = ERROR_MESSAGES.get(name)
            conn.execute(
                "INSERT INTO pipelines (name, dataset_id, owner_team, schedule, status, last_run_at, avg_duration_mins, success_rate_7d, error_message) VALUES (?,?,?,?,?,?,?,?,?)",
                (name, dataset_ids[did_index - 1], owner, schedule, status, last_run, duration, success_rate, err),
            )

    print(f"Seeded {len(DATASETS)} datasets, {len(SLOS)} SLOs, {len(PIPELINES)} pipelines.")


if __name__ == "__main__":
    seed()
