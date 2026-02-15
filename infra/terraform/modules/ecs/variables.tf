variable "region" {
  description = "AWS region"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g. production, staging)"
  type        = string
}

variable "vpc_id" {
  description = "ID of the VPC"
  type        = string
}

variable "private_subnet_ids" {
  description = "IDs of the private subnets for ECS tasks"
  type        = list(string)
}

variable "public_subnet_ids" {
  description = "IDs of the public subnets for load balancers"
  type        = list(string)
}

variable "workerd_image" {
  description = "Docker image URI for the workerd container"
  type        = string
}

variable "nextjs_image" {
  description = "Docker image URI for the Next.js container"
  type        = string
}

variable "workerd_cpu" {
  description = "CPU units for workerd task (1 vCPU = 1024)"
  type        = number
  default     = 256
}

variable "workerd_memory" {
  description = "Memory (MiB) for workerd task"
  type        = number
  default     = 512
}

variable "nextjs_cpu" {
  description = "CPU units for Next.js task (1 vCPU = 1024)"
  type        = number
  default     = 1024
}

variable "nextjs_memory" {
  description = "Memory (MiB) for Next.js task"
  type        = number
  default     = 2048
}

variable "redis_url" {
  description = "Redis connection URL"
  type        = string
  sensitive   = true
}

variable "database_url" {
  description = "PostgreSQL connection URL"
  type        = string
  sensitive   = true
}

variable "certificate_arn" {
  description = "ARN of the ACM certificate for TLS termination"
  type        = string
}
