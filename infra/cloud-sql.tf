# Cloud SQL Instance (PostgreSQL 16)
resource "google_sql_database_instance" "vaultguard_db_instance" {
  name             = "vaultguard-db-${var.environment}"
  database_version = "POSTGRES_16"
  region           = var.region

  settings {
    tier              = "db-f1-micro"
    availability_type = "ZONAL"
    disk_size         = 10
    disk_type         = "PD_SSD"

    ip_configuration {
      ipv4_enabled = true
      authorized_networks {
        name  = "allow-all-demo"
        value = "0.0.0.0/0"
      }
    }

    backup_configuration {
      enabled    = true
      start_time = "03:00"
    }

    database_flags {
      name  = "log_connections"
      value = "on"
    }
    database_flags {
      name  = "log_disconnections"
      value = "on"
    }
  }

  deletion_protection = false

  depends_on = [google_project_service.apis]
}

# Root Database User
resource "google_sql_user" "vaultguard_user" {
  name     = "vaultguard"
  instance = google_sql_database_instance.vaultguard_db_instance.name
  password = var.db_password
}

# 1. Auth Domain Database
resource "google_sql_database" "auth_db" {
  name     = "auth_db"
  instance = google_sql_database_instance.vaultguard_db_instance.name
}

# 2. Accounts Domain Database
resource "google_sql_database" "accounts_db" {
  name     = "accounts_db"
  instance = google_sql_database_instance.vaultguard_db_instance.name
}

# 3. Payments Domain Database
resource "google_sql_database" "payments_db" {
  name     = "payments_db"
  instance = google_sql_database_instance.vaultguard_db_instance.name
}

# 4. Loans Domain Database
resource "google_sql_database" "loans_db" {
  name     = "loans_db"
  instance = google_sql_database_instance.vaultguard_db_instance.name
}

# 5. Audit Domain Database
resource "google_sql_database" "audit_db" {
  name     = "audit_db"
  instance = google_sql_database_instance.vaultguard_db_instance.name
}
