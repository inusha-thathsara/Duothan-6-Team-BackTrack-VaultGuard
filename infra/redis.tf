resource "google_redis_instance" "cache" {
  name           = "vaultguard-cache-${var.environment}"
  tier           = "BASIC"
  memory_size_gb = 1
  region         = var.region

  display_name = "VaultGuard Memorystore Redis Cache & Rate Limits"

  redis_version = "REDIS_7_0"

  depends_on = [google_project_service.apis]
}
