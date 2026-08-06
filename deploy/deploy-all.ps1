# ============================================================
# VaultGuard — Phase 3 (FORTIFY) Full Cloud Deployment Script (PowerShell)
# ============================================================
# Usage:
#   .\deploy\deploy-all.ps1 -ProjectId "vaultguard-duothan" -Region "asia-south1"
# ============================================================

param (
    [string]$ProjectId = "vaultguard-duothan",
    [string]$Region = "asia-south1"
)

$ErrorActionPreference = "Stop"
$RepoName = "vaultguard-repo"
$RegistryUri = "${Region}-docker.pkg.dev/${ProjectId}/${RepoName}"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "🛡️  VaultGuard Phase 3 Deployment Initializing..." -ForegroundColor Green
Write-Host "    Project: $ProjectId"
Write-Host "    Region:  $Region"
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Ensure gcloud is configured
gcloud config set project $ProjectId
gcloud config set run/region $Region

# 2. Automatically enable all required GCP APIs
Write-Host "⚡ Enabling required GCP Service APIs..." -ForegroundColor Yellow
gcloud services enable `
  run.googleapis.com `
  sqladmin.googleapis.com `
  secretmanager.googleapis.com `
  cloudkms.googleapis.com `
  compute.googleapis.com `
  artifactregistry.googleapis.com `
  cloudbuild.googleapis.com `
  pubsub.googleapis.com `
  redis.googleapis.com `
  logging.googleapis.com `
  monitoring.googleapis.com

# 3. Configure Docker authentication
Write-Host "🔑 Authenticating Docker with GCP Artifact Registry..." -ForegroundColor Yellow
gcloud auth configure-docker "${Region}-docker.pkg.dev" --quiet

# 3. Create Artifact Registry repository if missing
Write-Host "📦 Ensuring Artifact Registry repository exists..." -ForegroundColor Yellow
gcloud artifacts repositories create $RepoName `
  --repository-format=docker `
  --location=$Region `
  --description="VaultGuard Docker Repo" 2>$null

# 4. Build and Push Container Images
Write-Host "🐳 Building & Pushing Next.js App image..." -ForegroundColor Green
docker build -t "${RegistryUri}/app:latest" .
docker push "${RegistryUri}/app:latest"

Write-Host "🐳 Building & Pushing Auth Microservice image..." -ForegroundColor Green
docker build -t "${RegistryUri}/auth-service:latest" ./services/auth-service/
docker push "${RegistryUri}/auth-service:latest"

Write-Host "🐳 Building & Pushing Accounts Microservice image..." -ForegroundColor Green
docker build -t "${RegistryUri}/accounts-service:latest" ./services/accounts-service/
docker push "${RegistryUri}/accounts-service:latest"

# 5. Execute Terraform Provisioning
Write-Host "🏗️  Applying Terraform Infrastructure..." -ForegroundColor Cyan
Set-Location -Path "infra"
if (-not (Test-Path "terraform.tfvars")) {
    Copy-Item "terraform.tfvars.example" "terraform.tfvars"
}
terraform init
terraform apply -auto-approve -var="project_id=$ProjectId" -var="region=$Region"
Set-Location -Path ".."

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "🎉 VaultGuard Phase 3 (FORTIFY) Deployment Complete!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
