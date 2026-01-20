# Observability Dashboard Specification - LoanGenius

## Overview
Dashboard specifications for monitoring application health, performance, and business metrics.

---

## Dashboard 1: System Health Overview

### Panel 1.1: Error Rate (Last 24h)
```
Chart Type: Line graph
Metric: error_total / request_total * 100
Grouping: 5-minute buckets
Alert Threshold: > 5% error rate

Query:
SELECT 
  time_bucket('5 minutes', timestamp) as time,
  COUNT(*) FILTER (WHERE status = 'error') * 100.0 / COUNT(*) as error_rate
FROM telemetry
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY time
ORDER BY time
```

### Panel 1.2: Request Latency (P50, P95, P99)
```
Chart Type: Line graph with multiple series
Metric: http_request_duration_ms
Percentiles: 50, 95, 99
Alert Threshold: P95 > 3000ms

Visual:
- P50: Green line
- P95: Yellow line  
- P99: Red line
```

### Panel 1.3: Request Throughput
```
Chart Type: Area chart
Metric: http_request_total
Grouping: 1-minute buckets

Breakdown:
- By route (top 10)
- By status code
```

### Panel 1.4: Active Errors (Last Hour)
```
Chart Type: Table
Columns: Error Type | Count | Last Seen | Feature Area
Sort: Count DESC
Limit: 20

Action: Click to view error details
```

---

## Dashboard 2: Import/Export Health

### Panel 2.1: Import Success Rate
```
Chart Type: Gauge
Metric: (successful_imports / total_imports) * 100
Time Range: Last 24 hours
Thresholds:
- Green: > 95%
- Yellow: 80-95%
- Red: < 80%
```

### Panel 2.2: Import Duration Distribution
```
Chart Type: Histogram
Metric: import_duration_ms
Buckets: [1s, 5s, 10s, 30s, 60s, 120s, 300s]

Breakdown by:
- Source type (CSV, Google Sheets)
- Row count ranges
```

### Panel 2.3: Import Volume Over Time
```
Chart Type: Stacked bar
Metric: import_rows_total
Grouping: 1-hour buckets
Series: Imported | Updated | Skipped | Errors
```

### Panel 2.4: Export Success Rate
```
Chart Type: Gauge
Same format as import gauge
Breakdown: MISMO | PDF | CSV
```

### Panel 2.5: Export Duration by Type
```
Chart Type: Bar chart
Metric: export_duration_ms (P95)
Categories: MISMO | PDF | CSV | Report
```

---

## Dashboard 3: Business Metrics

### Panel 3.1: Active Deals by Stage
```
Chart Type: Funnel
Stages: Inquiry → Application → Processing → Underwriting → Approved → Closing → Funded
Show: Count + % conversion between stages
```

### Panel 3.2: Lead Conversion Rate
```
Chart Type: Line graph
Metric: converted_leads / total_leads * 100
Time Range: Last 30 days
Grouping: Daily

Overlay: Lead volume (secondary axis)
```

### Panel 3.3: Daily Activity
```
Chart Type: Stacked area
Metrics:
- Leads created
- Deals created
- Documents uploaded
- Emails sent

Grouping: Daily
```

### Panel 3.4: User Activity Heatmap
```
Chart Type: Heatmap
X-axis: Hour of day (0-23)
Y-axis: Day of week
Color: Request count
```

---

## Dashboard 4: Performance Deep Dive

### Panel 4.1: Slowest Endpoints (P95)
```
Chart Type: Horizontal bar
Metric: http_request_duration_ms P95
Grouping: By route
Top: 10 slowest

Drill-down: Click for trace samples
```

### Panel 4.2: Database Query Performance
```
Chart Type: Table
Columns: Entity | Operation | Avg Duration | P95 | Count
Sort: P95 DESC

Alert: P95 > 1000ms
```

### Panel 4.3: External API Latency
```
Chart Type: Line graph
Metric: external_api_duration_ms
Series:
- Google Sheets API
- Google Calendar API
- Lender APIs

Alert: P95 > 5000ms
```

### Panel 4.4: Frontend Load Times
```
Chart Type: Line graph
Metrics:
- Time to First Byte (TTFB)
- Largest Contentful Paint (LCP)
- Cumulative Layout Shift (CLS)

Grouping: By route
```

---

## Dashboard 5: Security & Compliance

### Panel 5.1: Authentication Events
```
Chart Type: Stacked bar
Metrics:
- Successful logins
- Failed logins
- Logouts
- Session expirations

Grouping: Hourly

Alert: Failed logins > 50/hour
```

### Panel 5.2: Permission Denied Events
```
Chart Type: Table
Columns: User (hashed) | Action | Resource | Count | Last Attempt
Time Range: Last 24 hours
Sort: Count DESC

Alert: Same user > 10 denials/hour
```

### Panel 5.3: Data Access by Role
```
Chart Type: Heatmap
X-axis: Resource type
Y-axis: Role
Color: Access count
```

### Panel 5.4: Audit Log Volume
```
Chart Type: Area chart
Metric: audit_log_count
Grouping: Hourly
Breakdown: By action_type
```

---

## Alert Definitions

### Critical Alerts (Page immediately)

| Alert | Condition | Window |
|-------|-----------|--------|
| Error Rate Spike | > 10% error rate | 5 min |
| Service Down | 0 requests | 2 min |
| Import Failures | > 50% failure rate | 15 min |
| Auth Failures Spike | > 100 failures | 5 min |

### Warning Alerts (Slack/Email)

| Alert | Condition | Window |
|-------|-----------|--------|
| Elevated Error Rate | > 5% error rate | 15 min |
| High Latency | P95 > 5s | 10 min |
| Import Slow | P95 > 60s | 30 min |
| Low Throughput | < 50% of baseline | 30 min |

---

## Dashboard Access Control

| Role | Dashboards |
|------|------------|
| Super Admin | All |
| Admin | All except Security Deep Dive |
| DevOps | System Health, Performance |
| Loan Officer | Business Metrics only |
| Others | No access |

---

## Implementation Notes

### Data Sources
- Primary: AuditLog entity (for business events)
- Primary: Metric entity (for telemetry)
- Secondary: Backend function logs

### Retention
- Raw telemetry: 7 days
- Aggregated metrics: 90 days
- Business metrics: Indefinite

### Refresh Rates
- Real-time panels: 30 seconds
- Aggregated panels: 5 minutes
- Business metrics: 1 hour

---

## Change Log
- 2026-01-20: Initial dashboard specification created