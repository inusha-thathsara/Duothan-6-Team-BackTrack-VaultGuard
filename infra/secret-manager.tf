# JWT Secret
resource "google_secret_manager_secret" "jwt_secret" {
  secret_id = "vaultguard-jwt-secret"
  replication {
    auto {}
  }
  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "jwt_secret_val" {
  secret      = google_secret_manager_secret.jwt_secret.id
  secret_data = var.jwt_secret
}

# Internal Service Secret
resource "google_secret_manager_secret" "internal_secret" {
  secret_id = "vaultguard-internal-secret"
  replication {
    auto {}
  }
  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "internal_secret_val" {
  secret      = google_secret_manager_secret.internal_secret.id
  secret_data = var.internal_secret
}

# Database Connection URLs for each domain service
resource "google_secret_manager_secret" "auth_db_url" {
  secret_id = "vaultguard-auth-db-url"
  replication {
    auto {}
  }
  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "auth_db_url_val" {
  secret      = google_secret_manager_secret.auth_db_url.id
  secret_data = "postgresql://vaultguard:${var.db_password}@/${google_sql_database.auth_db.name}?host=/cloudsql/${google_sql_database_instance.vaultguard_db_instance.connection_name}"
}

resource "google_secret_manager_secret" "accounts_db_url" {
  secret_id = "vaultguard-accounts-db-url"
  replication {
    auto {}
  }
  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "accounts_db_url_val" {
  secret      = google_secret_manager_secret.accounts_db_url.id
  secret_data = "postgresql://vaultguard:${var.db_password}@/${google_sql_database.accounts_db.name}?host=/cloudsql/${google_sql_database_instance.vaultguard_db_instance.connection_name}"
}
