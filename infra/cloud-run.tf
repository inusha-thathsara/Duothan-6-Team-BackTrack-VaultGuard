# 1. Main Next.js Web App Service
resource "google_cloud_run_v2_service" "app_service" {
  name     = "vaultguard-app"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.sa_app.email

    scaling {
      min_instance_count = 1
      max_instance_count = 5
    }

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/vaultguard-repo/app:latest"

      ports {
        container_port = 3000
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "USE_PUBSUB"
        value = "true"
      }
      env {
        name  = "GCP_PROJECT_ID"
        value = var.project_id
      }
      env {
        name = "JWT_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.jwt_secret.secret_id
            version = "latest"
          }
        }
      }

      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }

      resources {
        limits = {
          cpu    = "1000m"
          memory = "512Mi"
        }
      }
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [google_sql_database_instance.vaultguard_db_instance.connection_name]
      }
    }
  }

  depends_on = [
    google_project_service.apis,
    google_sql_database_instance.vaultguard_db_instance
  ]
}

# Allow Unauthenticated Access to Main Web App
resource "google_cloud_run_v2_service_iam_member" "app_public_access" {
  location = google_cloud_run_v2_service.app_service.location
  name     = google_cloud_run_v2_service.app_service.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# 2. Auth Microservice
resource "google_cloud_run_v2_service" "auth_service" {
  name     = "vaultguard-auth"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.sa_auth.email

    scaling {
      min_instance_count = 0
      max_instance_count = 3
    }

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/vaultguard-repo/auth-service:latest"

      ports {
        container_port = 4001
      }

      env {
        name  = "PORT"
        value = "4001"
      }
      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.auth_db_url.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "JWT_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.jwt_secret.secret_id
            version = "latest"
          }
        }
      }

      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }

      resources {
        limits = {
          cpu    = "1000m"
          memory = "256Mi"
        }
      }
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [google_sql_database_instance.vaultguard_db_instance.connection_name]
      }
    }
  }

  depends_on = [
    google_project_service.apis,
    google_sql_database_instance.vaultguard_db_instance
  ]
}

# 3. Accounts Microservice
resource "google_cloud_run_v2_service" "accounts_service" {
  name     = "vaultguard-accounts"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.sa_accounts.email

    scaling {
      min_instance_count = 0
      max_instance_count = 3
    }

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/vaultguard-repo/accounts-service:latest"

      ports {
        container_port = 4002
      }

      env {
        name  = "PORT"
        value = "4002"
      }
      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.accounts_db_url.secret_id
            version = "latest"
          }
        }
      }

      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }

      resources {
        limits = {
          cpu    = "1000m"
          memory = "256Mi"
        }
      }
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [google_sql_database_instance.vaultguard_db_instance.connection_name]
      }
    }
  }

  depends_on = [
    google_project_service.apis,
    google_sql_database_instance.vaultguard_db_instance
  ]
}
