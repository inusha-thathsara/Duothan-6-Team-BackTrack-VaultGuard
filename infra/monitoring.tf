resource "google_monitoring_dashboard" "vaultguard_dashboard" {
  dashboard_json = jsonencode({
    displayName = "VaultGuard Operational Resilience & Performance Dashboard"
    gridLayout = {
      columns = 2
      widgets = [
        {
          title = "Cloud Run Request Count (by Status Code)"
          xyChart = {
            dataSets = [
              {
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "metric.type=\"run.googleapis.com/request_count\" resource.type=\"cloud_run_revision\""
                  }
                }
              }
            ]
          }
        },
        {
          title = "Cloud Run Request Latency (p95)"
          xyChart = {
            dataSets = [
              {
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "metric.type=\"run.googleapis.com/request_latencies\" resource.type=\"cloud_run_revision\""
                  }
                }
              }
            ]
          }
        },
        {
          title = "Cloud SQL CPU Utilization"
          xyChart = {
            dataSets = [
              {
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "metric.type=\"cloudsql.googleapis.com/database/cpu/utilization\" resource.type=\"cloudsql_database\""
                  }
                }
              }
            ]
          }
        },
        {
          title = "Pub/Sub Unacknowledged Message Count"
          xyChart = {
            dataSets = [
              {
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "metric.type=\"pubsub.googleapis.com/subscription/num_undelivered_messages\" resource.type=\"pubsub_subscription\""
                  }
                }
              }
            ]
          }
        }
      ]
    }
  })

  depends_on = [google_project_service.apis]
}
