#!/usr/bin/env bash
# ============================================================
# VaultGuard — Phase 3 (FORTIFY) Full Cloud Deployment Script
# ============================================================
# Usage:
#   ./deploy/deploy-all.sh <GCP_PROJECT_ID> [REGION]
# ============================================================

set -e

PROJECT_ID=${1:-"vaultguard-duothan"}
REGION=${2:-"asia-south1"}
REPO_NAME="vaultguard-repo"
REGISTRY_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}"

echo "============================================================"
echo "🛡️  VaultGuard Phase 3 Deployment Initializing..."
echo "    Project: ${PROJECT_ID}"
echo "    Region:  ${REGION}"
echo "============================================================"

# 1. Ensure gcloud is configured
gcloud config set project "${PROJECT_ID}"
gcloud config set run/region "${REGION}"

# 2. Automatically enable all required GCP APIs
echo "⚡ Enabling required GCP Service APIs..."
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  cloudkms.googleapis.com \
  compute.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  pubsub.googleapis.com \
  redis.googleapis.com \
  logging.googleapis.com \
  monitoring.googleapis.com

# 3. Configure Docker authentication
echo "🔑 Authenticating Docker with GCP Artifact Registry..."
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

# 3. Create Artifact Registry repository if missing
echo "📦 Ensuring Artifact Registry repository exists..."
gcloud artifacts repositories create "${REPO_NAME}" \
  --repository-format=docker \
  --location="${REGION}" \
  --description="VaultGuard Docker Repo" 2>/dev/null || true

# 4. Build and Push Container Images
echo "🐳 Building & Pushing Next.js App image..."
docker build -t "${REGISTRY_URI}/app:latest" .
docker push "${REGISTRY_URI}/app:latest"

echo "🐳 Building & Pushing Auth Microservice image..."
docker build -t "${REGISTRY_URI}/auth-service:latest" ./services/auth-service/
docker push "${REGISTRY_URI}/auth-service:latest"

echo "🐳 Building & Pushing Accounts Microservice image..."
docker build -t "${REGISTRY_URI}/accounts-service:latest" ./services/accounts-service/
docker push "${REGISTRY_URI}/accounts-service:latest"

# 5. Execute Terraform Provisioning
echo "🏗️  Applying Terraform Infrastructure..."
cd infra
if [ ! -f "terraform.tfvars" ]; then
  cp terraform.tfvars.example terraform.tfvars
fi
terraform init
terraform apply -auto-approve -var="project_id=${PROJECT_ID}" -var="region=${REGION}"
cd ..

echo "============================================================"
echo "🎉 VaultGuard Phase 3 (FORTIFY) Deployment Complete!"
echo "============================================================"
