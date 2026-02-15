output "alb_dns" {
  description = "ALB DNS name (Next.js)"
  value       = module.ecs.alb_dns_name
}

output "nlb_dns" {
  description = "NLB DNS name (workerd)"
  value       = module.ecs.nlb_dns_name
}

output "cloudfront_distribution_domain" {
  description = "CloudFront distribution domain name"
  value       = module.cloudfront.distribution_domain_name
}

output "aurora_endpoint" {
  description = "Aurora writer endpoint"
  value       = module.aurora.cluster_endpoint
}

output "aurora_reader_endpoint" {
  description = "Aurora reader endpoint"
  value       = module.aurora.cluster_reader_endpoint
}

output "redis_endpoint" {
  description = "Redis primary endpoint"
  value       = module.elasticache.primary_endpoint
}

output "static_assets_bucket" {
  description = "S3 bucket name for static assets"
  value       = module.cloudfront.static_assets_bucket_name
}

output "ecr_workerd_repo_url" {
  description = "ECR repository URL for workerd"
  value       = aws_ecr_repository.workerd.repository_url
}

output "ecr_nextjs_repo_url" {
  description = "ECR repository URL for Next.js"
  value       = aws_ecr_repository.nextjs.repository_url
}

output "cron_lambda_arn" {
  description = "ARN of the cron Lambda function"
  value       = module.cron.lambda_function_arn
}
