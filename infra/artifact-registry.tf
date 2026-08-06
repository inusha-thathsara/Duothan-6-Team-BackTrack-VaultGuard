resource "google_artifact_registry_repository" "vaultguard_repo" {
  provider      = google
  location      = var.region
  repository_id = "vaultguard-repo"
  description   = "Docker container images repository for VaultGuard microservices"
  format        = "DOCKER"

  depends_on = [google_project_service.apis]
}
