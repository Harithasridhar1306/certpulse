terraform { required_version = ">= 1.6.0" }
variable "project_id" { type = string }
variable "region" { type = string default = "asia-south1" }
variable "service_name" { type = string default = "certpulse-api" }

provider "google" { project = var.project_id region = var.region }

resource "google_cloud_run_v2_service" "api" {
  name = var.service_name
  location = var.region
  deletion_protection = false
  template { containers { image = var.image } }
}
variable "image" { type = string }

output "api_url" { value = google_cloud_run_v2_service.api.uri }
