terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region                      = var.aws_region
  access_key                  = "test"
  secret_key                  = "test"
  insecure                    = true
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true
  s3_use_path_style           = true

  endpoints {
    s3  = var.localstack_endpoint
    sqs = var.localstack_endpoint
  }
}

# --- Almacenamiento S3 ---
resource "aws_s3_bucket" "drive_storage" {
  bucket        = var.bucket_name
  force_destroy = true
}

resource "aws_s3_bucket_cors_configuration" "drive_storage_cors" {
  bucket = aws_s3_bucket.drive_storage.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# --- Colas SQS ---

# Dead Letter Queue (DLQ) para capturar fallos recurrentes
resource "aws_sqs_queue" "file_upload_dlq" {
  name                      = "${var.queue_name}-dlq"
  message_retention_seconds = 1209600 # 14 días
}

# Cola principal de subida de archivos
resource "aws_sqs_queue" "file_upload_queue" {
  name                      = var.queue_name
  delay_seconds             = 0
  max_message_size          = 262144 # 256 KB
  message_retention_seconds = 86400  # 1 día
  receive_wait_time_seconds = 10     # Long polling habilitado

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.file_upload_dlq.arn
    maxReceiveCount     = 3 # Reintenta 3 veces antes de mandar a la DLQ
  })
}