# Dead Letter Queue Topic (FR-14b)
resource "google_pubsub_topic" "dlq_topic" {
  name       = "vaultguard-audit-events-dlq"
  depends_on = [google_project_service.apis]
}

# Main Payment Events Topic
resource "google_pubsub_topic" "payment_events_topic" {
  name       = "vaultguard-payment-events"
  depends_on = [google_project_service.apis]
}

# Auth Events Topic
resource "google_pubsub_topic" "auth_events_topic" {
  name       = "vaultguard-auth-events"
  depends_on = [google_project_service.apis]
}

# Audit Consumer Subscription
resource "google_pubsub_subscription" "audit_subscription" {
  name                 = "vaultguard-audit-consumer"
  topic                = google_pubsub_topic.payment_events_topic.name
  ack_deadline_seconds = 60

  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.dlq_topic.id
    max_delivery_attempts = 5
  }

  retry_policy {
    minimum_backoff = "1s"
    maximum_backoff = "30s"
  }
}

# Notification Consumer Subscription
resource "google_pubsub_subscription" "notification_subscription" {
  name                 = "vaultguard-notification-consumer"
  topic                = google_pubsub_topic.payment_events_topic.name
  ack_deadline_seconds = 60

  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.dlq_topic.id
    max_delivery_attempts = 5
  }

  retry_policy {
    minimum_backoff = "1s"
    maximum_backoff = "30s"
  }
}
