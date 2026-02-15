###############################################################################
# Production V1 Environment
# Single-region deployment in us-east-1 with production sizing.
# No multi-region replication or Global Accelerator.
###############################################################################

terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }

  backend "s3" {
    bucket         = "spike-land-terraform-state"
    key            = "production-v1/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}

# --- Provider ---

provider "aws" {
  region = "us-east-1"

  default_tags {
    tags = {
      Environment = "production"
      Project     = "spike-land"
      ManagedBy   = "terraform"
    }
  }
}

# --- Data Sources ---

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

data "aws_availability_zones" "available" {
  state = "available"
}

# --- SSM Parameter Store references for secrets ---

data "aws_ssm_parameter" "openai_api_key" {
  name = "/${var.environment}/spike-land/OPENAI_API_KEY"
}

data "aws_ssm_parameter" "anthropic_api_key" {
  name = "/${var.environment}/spike-land/ANTHROPIC_API_KEY"
}

data "aws_ssm_parameter" "jwt_secret" {
  name = "/${var.environment}/spike-land/JWT_SECRET"
}

data "aws_ssm_parameter" "auth_secret" {
  name = "/${var.environment}/spike-land/AUTH_SECRET"
}

data "aws_ssm_parameter" "sentry_dsn" {
  name = "/${var.environment}/spike-land/SENTRY_DSN"
}

# --- Locals ---

locals {
  environment = var.environment
  region      = data.aws_region.current.name
  account_id  = data.aws_caller_identity.current.account_id
  azs         = slice(data.aws_availability_zones.available.names, 0, 3)
}

###############################################################################
# ECR Repositories
###############################################################################

resource "aws_ecr_repository" "workerd" {
  name                 = "spike-land-workerd"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name = "spike-land-workerd"
  }
}

resource "aws_ecr_lifecycle_policy" "workerd" {
  repository = aws_ecr_repository.workerd.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Expire untagged images after 14 days"
      selection = {
        tagStatus   = "untagged"
        countType   = "sinceImagePushed"
        countUnit   = "days"
        countNumber = 14
      }
      action = {
        type = "expire"
      }
    }]
  })
}

resource "aws_ecr_repository" "nextjs" {
  name                 = "spike-land-nextjs"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name = "spike-land-nextjs"
  }
}

resource "aws_ecr_lifecycle_policy" "nextjs" {
  repository = aws_ecr_repository.nextjs.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Expire untagged images after 14 days"
      selection = {
        tagStatus   = "untagged"
        countType   = "sinceImagePushed"
        countUnit   = "days"
        countNumber = 14
      }
      action = {
        type = "expire"
      }
    }]
  })
}

###############################################################################
# VPC
###############################################################################

module "vpc" {
  source = "../../modules/vpc"

  region      = local.region
  environment = local.environment
  vpc_cidr    = "10.20.0.0/16"
  azs         = local.azs
}

###############################################################################
# ECS
###############################################################################

module "ecs" {
  source = "../../modules/ecs"

  region             = local.region
  environment        = local.environment
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  public_subnet_ids  = module.vpc.public_subnet_ids

  workerd_image  = var.workerd_image
  nextjs_image   = var.nextjs_image
  workerd_cpu    = 256
  workerd_memory = 512
  nextjs_cpu     = 1024
  nextjs_memory  = 2048

  redis_url       = module.elasticache.connection_url
  database_url    = module.aurora.connection_url
  certificate_arn = var.certificate_arn

  # Application env vars
  app_env     = local.environment
  app_url     = "https://${var.domain_name}"
  cron_secret = var.cron_secret

  # SSM secrets for ECS task definitions
  ssm_openai_api_key_arn    = data.aws_ssm_parameter.openai_api_key.arn
  ssm_anthropic_api_key_arn = data.aws_ssm_parameter.anthropic_api_key.arn
  ssm_jwt_secret_arn        = data.aws_ssm_parameter.jwt_secret.arn
  ssm_auth_secret_arn       = data.aws_ssm_parameter.auth_secret.arn
  ssm_sentry_dsn_arn        = data.aws_ssm_parameter.sentry_dsn.arn
}

###############################################################################
# Aurora (single-region, no global database)
###############################################################################

module "aurora" {
  source = "../../modules/aurora"

  # Provide a dummy secondary provider since the module declares it.
  # create_secondary_cluster = false ensures it is never used.
  providers = {
    aws           = aws
    aws.secondary = aws
  }

  environment        = local.environment
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids

  allowed_security_group_ids = [
    module.ecs.workerd_security_group_id,
    module.ecs.nextjs_security_group_id,
  ]

  engine_version         = "16.4"
  instance_class         = "db.r6g.large"
  primary_instance_count = 2
  master_username        = var.db_master_username
  master_password        = var.db_master_password

  create_global_cluster    = false
  create_secondary_cluster = false
}

###############################################################################
# ElastiCache Redis (single-region, no global datastore)
###############################################################################

module "elasticache" {
  source = "../../modules/elasticache"

  # Same pattern: provide dummy secondary provider
  providers = {
    aws           = aws
    aws.secondary = aws
  }

  environment        = local.environment
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids

  allowed_security_group_ids = [
    module.ecs.workerd_security_group_id,
    module.ecs.nextjs_security_group_id,
  ]

  engine_version             = "7.1"
  node_type                  = "cache.r6g.large"
  primary_num_cache_clusters = 2

  create_global_datastore            = false
  create_secondary_replication_group = false
}

###############################################################################
# CloudFront
###############################################################################

module "cloudfront" {
  source = "../../modules/cloudfront"

  environment     = local.environment
  alb_dns_name    = module.ecs.alb_dns_name
  certificate_arn = var.cloudfront_certificate_arn
  domain_aliases  = var.domain_aliases
}

###############################################################################
# Cron (EventBridge + Lambda)
###############################################################################

module "cron" {
  source = "../../modules/cron"

  environment       = local.environment
  alb_dns_name      = module.ecs.alb_dns_name
  cron_secret       = var.cron_secret
  vpc_id            = module.vpc.vpc_id
  subnet_ids        = module.vpc.private_subnet_ids
  security_group_id = module.ecs.nextjs_security_group_id

  cron_jobs = [
    {
      name     = "publish-scheduled-posts"
      path     = "/api/cron/publish-scheduled-posts"
      schedule = "rate(1 minute)"
    },
    {
      name     = "pulse-metrics"
      path     = "/api/cron/pulse-metrics"
      schedule = "rate(15 minutes)"
    },
    {
      name     = "cleanup-jobs"
      path     = "/api/cron/cleanup-jobs"
      schedule = "rate(15 minutes)"
    },
    {
      name     = "marketing-sync"
      path     = "/api/cron/marketing-sync"
      schedule = "rate(1 hour)"
    },
    {
      name     = "allocator-autopilot"
      path     = "/api/cron/allocator-autopilot"
      schedule = "rate(15 minutes)"
    },
    {
      name     = "create-agent-alert"
      path     = "/api/cron/create-agent-alert"
      schedule = "rate(1 hour)"
    },
    {
      name     = "cleanup-tracking"
      path     = "/api/cron/cleanup-tracking"
      schedule = "cron(0 3 * * ? *)"
    },
    {
      name     = "cleanup-errors"
      path     = "/api/cron/cleanup-errors"
      schedule = "cron(0 4 * * ? *)"
    },
    {
      name     = "cleanup-bin"
      path     = "/api/cron/cleanup-bin"
      schedule = "cron(0 2 * * ? *)"
    },
    {
      name     = "cleanup-sandboxes"
      path     = "/api/cron/cleanup-sandboxes"
      schedule = "rate(15 minutes)"
    },
    {
      name     = "reset-workspace-credits"
      path     = "/api/cron/reset-workspace-credits"
      schedule = "cron(0 0 * * ? *)"
    },
  ]
}

# No Global Accelerator in production-v1 (single region)
