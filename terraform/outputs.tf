output "s3_bucket_name" {
  description = "Nombre del bucket S3"
  value       = aws_s3_bucket.drive_storage.id
}

output "s3_endpoint" {
  description = "Endpoint de S3 en LocalStack"
  value       = var.localstack_endpoint
}

output "sqs_queue_url" {
  description = "URL de la cola principal para subir archivos"
  value       = aws_sqs_queue.file_upload_queue.url
}

output "sqs_dlq_url" {
  description = "URL de la Dead Letter Queue"
  value       = aws_sqs_queue.file_upload_dlq.url
}