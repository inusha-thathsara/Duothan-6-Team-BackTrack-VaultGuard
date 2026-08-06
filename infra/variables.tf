variable "project_id" {
  description = "Google Cloud Platform Project ID"
  type        = string
  default     = "vaultguard-duothan"
}

variable "region" {
  description = "GCP Region for resource deployment"
  type        = string
  default     = "asia-south1"
}

variable "environment" {
  description = "Deployment environment (production/staging)"
  type        = string
  default     = "production"
}

variable "db_password" {
  description = "Root password for Cloud SQL PostgreSQL databases"
  type        = string
  sensitive   = true
  default     = "VaultGuard2026SecurePass!"
}

variable "jwt_secret" {
  description = "Secret key for signing and verifying JWT tokens"
  type        = string
  sensitive   = true
  default     = "vaultguard-phase3-hsm-backed-jwt-secret-2026"
}

variable "internal_secret" {
  description = "Internal secret key for inter-service authentication"
  type        = string
  sensitive   = true
  default     = "vaultguard-internal-m2m-token-2026"
}
