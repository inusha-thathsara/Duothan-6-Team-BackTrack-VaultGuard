output "app_url" {
  description = "URL of the deployed main VaultGuard Web App"
  value       = google_cloud_run_v2_service.app_service.uri
}

output "auth_service_url" {
  description = "URL of the Auth Microservice"
  value       = google_cloud_run_v2_service.auth_service.uri
}

output "accounts_service_url" {
  description = "URL of the Accounts Microservice"
  value       = google_cloud_run_v2_service.accounts_service.uri
}

output "artifact_registry_repo" {
  description = "Artifact Registry Docker repository URI"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.vaultguard_repo.repository_id}"
}

output "cloudsql_connection_name" {
  description = "Cloud SQL Instance connection name"
  value       = google_sql_database_instance.vaultguard_db_instance.connection_name
}

output "redis_host" {
  description = "Memorystore for Redis IP address"
  value       = google_redis_instance.cache.host
}

output "pubsub_payment_events_topic" {
  description = "Pub/Sub Payment Events Topic Name"
  value       = google_pubsub_topic.payment_events_topic.name
}

output "pubsub_dlq_topic" {
  description = "Pub/Sub Dead Letter Queue Topic Name"
  value       = google_pubsub_topic.dlq_topic.name
}
