# Service Account for Main App / Frontend
resource "google_service_account" "sa_app" {
  account_id   = "sa-vaultguard-app"
  display_name = "VaultGuard Main App Service Account"
}

# Service Account for Auth Microservice
resource "google_service_account" "sa_auth" {
  account_id   = "sa-vaultguard-auth"
  display_name = "VaultGuard Auth Service Account"
}

# Service Account for Accounts Microservice
resource "google_service_account" "sa_accounts" {
  account_id   = "sa-vaultguard-accounts"
  display_name = "VaultGuard Accounts Service Account"
}

# Grant Cloud SQL Client Role to all Service Accounts
resource "google_project_iam_member" "app_cloudsql" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.sa_app.email}"
}

resource "google_project_iam_member" "auth_cloudsql" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.sa_auth.email}"
}

resource "google_project_iam_member" "accounts_cloudsql" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.sa_accounts.email}"
}

# Grant Secret Manager Access to Services
resource "google_secret_manager_secret_iam_member" "auth_secret_access" {
  secret_id = google_secret_manager_secret.jwt_secret.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.sa_auth.email}"
}

resource "google_secret_manager_secret_iam_member" "app_secret_access" {
  secret_id = google_secret_manager_secret.jwt_secret.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.sa_app.email}"
}
