# MCP Servers for Development: Comprehensive Guide 2025

## Table of Contents

1. [Introduction](#introduction)
2. [What is Model Context Protocol (MCP)?](#what-is-mcp)
3. [Popular MCP Servers by Category](#popular-mcp-servers-by-category)
4. [Development Use Cases](#development-use-cases)
5. [MCP Server Categories](#mcp-server-categories)
6. [Integration Patterns](#integration-patterns)
7. [Claude Desktop Configuration](#claude-desktop-configuration)
8. [Best MCP Servers by Task](#best-mcp-servers-by-task)
9. [Comparison Tables](#comparison-tables)
10. [Setup and Installation](#setup-and-installation)
11. [Troubleshooting](#troubleshooting)
12. [Resources and References](#resources-and-references)

---

## Introduction

This guide provides comprehensive information about Model Context Protocol (MCP)
servers that are most useful for development workflows. MCP servers extend AI
capabilities by providing secure, standardized access to tools, data sources,
and external services.

As of December 2025, there are over 12,000 MCP servers available through various
registries, with adoption accelerating across development teams. This document
focuses on production-ready, proven servers that directly enhance development
productivity.

---

## What is Model Context Protocol (MCP)?

### Overview

The Model Context Protocol (MCP) is an open standard, open-source framework
introduced by Anthropic in November 2024 to standardize how AI systems integrate
with external tools, systems, and data sources.

**Key Benefits:**

- Standardized interface for AI integration
- Secure, controlled access to local and remote resources
- Support across multiple AI platforms (Claude, OpenAI, Azure OpenAI, etc.)
- Language-agnostic implementation (Python, TypeScript, Go, Rust, C#, Java)

### Ecosystem Growth

- **November 2024**: MCP introduced by Anthropic
- **March 2025**: OpenAI officially adopted the MCP standard
- **May 2025**: AWS released MCP servers for Lambda, ECS, EKS
- **September 2025**: MCP Registry launched in preview
- **November 2025**: MCP Registry approaching general availability with 12,000+
  servers

### Industry Adoption

- OpenAI: Integrated into ChatGPT desktop app, Agents SDK, and Responses API
- Microsoft: Semantic Kernel and Azure OpenAI integration
- AWS: Native servers for serverless and container services
- Google: Data Commons MCP Server for public data access
- Windows: Windows 11 native MCP support

---

## Popular MCP Servers by Category

### Browser Automation & Web Testing

#### 1. **Playwright MCP** (Microsoft)

**Purpose**: Browser automation with web scraping, testing, and interaction
capabilities

**Repository**:
[microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp)

**Features**:

- Fast, lightweight browser control
- Uses accessibility tree (not screenshots) for LLM-friendly interaction
- Supports Chrome, Firefox, WebKit, Edge
- No vision model required
- Deterministic tool application

**Installation**:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

**Use Cases**:

- Automated testing of web applications
- Web scraping and data extraction
- Form filling and workflow automation
- Screenshot and PDF generation

**Alternative Implementation**: ExecuteAutomation's Playwright MCP for extended
features

---

#### 2. **Puppeteer MCP**

**Purpose**: Chrome/Firefox browser automation alternative to Playwright

**Features**:

- Programmatic control of headless browsers
- Screenshot and PDF capabilities
- Form submission and interaction
- Performance testing and monitoring

**Use Cases**:

- UI testing and validation
- Headless browser testing
- Content extraction from dynamic pages

---

#### 3. **Selenium MCP Server**

**Purpose**: WebDriver-based browser automation

**Creator**: Angie Jones

**Features**:

- Cross-browser support (Chrome, Firefox)
- Standardized WebDriver protocol
- Enterprise-grade testing capabilities

**Use Cases**:

- Enterprise test automation
- Complex cross-browser testing scenarios
- Legacy application testing

---

### File System & Local Access

#### 1. **Official MCP Filesystem Server**

**Repository**:
[modelcontextprotocol/servers/filesystem](https://github.com/modelcontextprotocol/servers)

**Features**:

- Read, write, and list files
- Directory access control via command-line args or Roots
- Flexible path handling
- Security-focused design

**Configuration Example**:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "node",
      "args": ["/path/to/filesystem-server.js", "/Users/username/Projects"],
      "disabled": false
    }
  }
}
```

**Allowed Directories**: Can specify multiple directories or specific file paths

---

#### 2. **mark3labs/mcp-filesystem-server** (Go)

**Features**:

- Go implementation for performance
- Docker support with volume mounting
- Cross-platform compatibility

---

#### 3. **MarcusJellinghaus/mcp_server_filesystem**

**Features**:

- Secure file operations with path validation
- Multiple reference project support
- Auto-discovery capabilities
- Production-ready error handling

---

#### 4. **cyanheads/filesystem-mcp-server**

**Features**:

- TypeScript implementation
- Both STDIO and HTTP transports
- Comprehensive logging and error handling
- Advanced search and replace functionality
- Directory tree traversal

---

### Version Control & Git

#### 1. **GitHub MCP Server**

**Purpose**: Direct GitHub API integration for repository management

**Features**:

- Pull request management
- Issue tracking and creation
- Commit analysis
- Repository metadata access
- Code search capabilities

**Use Cases**:

- Automated PR review
- Issue resolution assistance
- Repository analysis
- Code quality monitoring

---

#### 2. **GitLab MCP Server**

**Features**:

- GitLab API integration
- Project management
- Repository operations
- Pipeline management

---

### Database Access

#### 1. **PostgreSQL MCP Server**

**Repository**:
[modelcontextprotocol/server-postgres](https://github.com/modelcontextprotocol/servers)

**Features**:

- Schema inspection and exploration
- Query execution
- Connection pooling
- Transaction support

**Configuration**:

```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["mcp-server-postgres"],
      "env": {
        "DATABASE_URL": "postgresql://user:password@localhost:5432/dbname"
      }
    }
  }
}
```

---

#### 2. **SQLite MCP Server**

**Features**:

- Lightweight database access
- No external dependencies
- Business intelligence features
- Built-in analysis capabilities

**Use Cases**:

- Local development databases
- Data analysis without PostgreSQL setup
- Embedded data storage

---

#### 3. **MongoDB Atlas MCP Server**

**Repository**:
[montumodi/mongodb-atlas-mcp-server](https://github.com/montumodi/mongodb-atlas-mcp-server)

**Features**:

- MongoDB Atlas API integration
- Database and collection management
- Query execution
- User and security management

---

#### 4. **Neo4j MCP Server**

**Purpose**: Graph database integration

**Features**:

- Knowledge graph querying
- Neo4j Aura instance management
- Graph relationship exploration

---

#### 5. **BigQuery MCP Server**

**Repository**:
[LucasHild/mcp-server-bigquery](https://github.com/LucasHild/mcp-server-bigquery)

**Features**:

- Google BigQuery integration
- Schema inspection
- Complex query support
- Dataset management

---

#### 6. **Neon MCP Server**

**Purpose**: Serverless PostgreSQL database management

**Features**:

- Database creation and management
- Branching and snapshots
- Neon serverless Postgres integration

---

#### 7. **Snowflake MCP Server**

**Features**:

- Cloud data warehouse integration
- Complex query execution
- Warehouse management

---

### Cloud Platforms & Infrastructure

#### 1. **AWS Labs MCP Servers** (May 2025)

**Services Supported**:

- AWS Lambda
- Amazon ECS (Elastic Container Service)
- Amazon EKS (Elastic Kubernetes Service)
- Finch (local container runtime)

**Purpose**: Seamless integration with AWS services for AI-assisted development

**Use Cases**:

- Serverless function deployment and management
- Container orchestration assistance
- Kubernetes cluster management
- Infrastructure automation

---

#### 2. **Azure MCP Server**

**Services Supported**:

- Azure Storage
- Azure Cosmos DB
- Azure CLI integration
- Azure DevOps

**Features**:

- Repository management
- Work item tracking
- Build and release pipelines
- Code search

---

#### 3. **Google Cloud MCP**

**Services**:

- Google Drive integration
- Google Maps and location services
- Google Cloud Platform resources

---

### Development Tools & CI/CD

#### 1. **CircleCI MCP Server**

**Purpose**: Build failure diagnosis and fix automation

**Features**:

- Build log analysis
- Failure identification
- Automated fix suggestions

---

#### 2. **Claude Debugs For You**

**Features**:

- Breakpoint debugging
- Expression evaluation
- Language-agnostic debugging
- VS Code extension available

---

### API Development & Testing

#### 1. **Apidog MCP Server**

**Purpose**: API documentation and testing integration

**Features**:

- OpenAPI/Swagger file support
- Real-time API documentation access
- Code generation from API specs
- API testing capabilities

**Use Cases**:

- Accurate code generation from API contracts
- API documentation exploration
- Contract-driven development

---

### Accessibility & QA

#### 1. **MCP Accessibility Scanner**

**Features**:

- Playwright-based browser automation
- Axe-core accessibility testing
- AI-powered analysis
- Compliance reporting

**Use Cases**:

- WCAG compliance checking
- Accessibility testing automation
- Quality assurance

---

### Workflow & Integration Automation

#### 1. **Zapier MCP Server**

**Purpose**: Cross-app workflow automation

**Supported Integrations**:

- Gmail
- Slack
- Trello
- Notion
- 500+ business applications

**Use Cases**:

- Email automation
- Slack message routing
- Task automation across tools

---

#### 2. **Rube (Composio)**

**Purpose**: Universal integration platform

**Features**:

- 500+ app integrations
- Gmail, Slack, Notion, GitHub, Linear, Airtable, etc.
- Standardized tool interface
- Business and productivity apps

**Repository**: [Composio integration platform](https://composio.dev)

---

### Specialized Tools

#### 1. **iOS Simulator MCP Server**

**Features**:

- Simulator information retrieval
- UI action control
- UI element inspection

**Use Cases**:

- Mobile app testing
- iOS development assistance

---

#### 2. **Brave Search MCP**

**Features**:

- Web search capabilities
- Local search
- Real-time content retrieval

---

#### 3. **Google Drive MCP**

**Features**:

- File access and management
- Search capabilities
- Document operations

---

---

## Development Use Cases

### 1. **E2E Testing Automation**

**Problem**: Creating and maintaining automated browser tests is time-consuming

**Solution Stack**:

- **Playwright MCP** for browser automation
- **GitHub MCP** for test repo management
- **CircleCI MCP** for CI/CD integration

**Workflow**:

1. Claude analyzes test requirements
2. Playwright MCP generates test scenarios
3. GitHub MCP manages test code commits
4. CircleCI MCP monitors test execution

---

### 2. **Code Generation & API Development**

**Problem**: Generating accurate code from API specifications

**Solution Stack**:

- **Apidog MCP** for API schema access
- **GitHub MCP** for code repository management
- **Filesystem MCP** for local file operations

**Workflow**:

1. Apidog MCP provides API contract
2. Claude generates type-safe code
3. Filesystem MCP writes implementation
4. GitHub MCP handles version control

---

### 3. **Database Administration & Analysis**

**Problem**: Manual database queries and schema exploration

**Solution Stack**:

- **PostgreSQL/SQLite MCP** for direct database access
- **BigQuery MCP** for data warehouse analysis
- **MongoDB Atlas MCP** for document databases

**Workflow**:

1. AI agent analyzes schema via database MCP
2. Complex queries executed in natural language
3. Data analysis and reporting automated
4. Schema optimization recommendations

---

### 4. **Documentation Generation**

**Problem**: Keeping documentation in sync with code

**Solution Stack**:

- **Filesystem MCP** for code access
- **GitHub MCP** for repo analysis
- **Apidog MCP** for API documentation

**Workflow**:

1. Filesystem MCP reads source code
2. GitHub MCP analyzes commit history
3. Claude generates comprehensive docs
4. Apidog MCP includes API specifications

---

### 5. **Infrastructure Automation**

**Problem**: Managing cloud resources requires complex CLI knowledge

**Solution Stack**:

- **AWS MCP** for Lambda, ECS, EKS management
- **Azure MCP** for Azure services
- **GitHub MCP** for deployment tracking

**Workflow**:

1. AWS MCP provides infrastructure status
2. Claude assists with deployment decisions
3. Automated infrastructure updates
4. GitHub MCP tracks deployment history

---

### 6. **Web Scraping & Data Extraction**

**Problem**: Extracting data from dynamic websites

**Solution Stack**:

- **Playwright MCP** for browser automation
- **Filesystem MCP** for data storage
- **Brave Search MCP** for content discovery

**Workflow**:

1. Playwright MCP navigates to target sites
2. Data extraction executed with JavaScript
3. Filesystem MCP stores results
4. Processing and transformation automated

---

### 7. **Workflow Automation**

**Problem**: Managing complex workflows across multiple tools

**Solution Stack**:

- **Zapier MCP** for app integration
- **Rube (Composio)** for extended integrations
- **GitHub MCP** for code-based workflows

**Workflow**:

1. Triggers detected across integrated apps
2. Zapier MCP coordinates app actions
3. Slack notifications via Zapier
4. Data synchronized across platforms

---

---

## MCP Server Categories

### File System Access

| Server              | Language   | Type  | Best For                    |
| ------------------- | ---------- | ----- | --------------------------- |
| Official Filesystem | Node.js    | Local | Directory-based projects    |
| mark3labs           | Go         | Local | Performance-critical tasks  |
| cyanheads           | TypeScript | Local | Advanced search/replace     |
| MarcusJellinghaus   | Python     | Local | Secure multi-project access |

### Browser Automation

| Server         | Framework  | Headless | Use Cases             |
| -------------- | ---------- | -------- | --------------------- |
| Playwright MCP | Playwright | Yes      | E2E testing, scraping |
| Puppeteer MCP  | Puppeteer  | Yes      | Chrome/Firefox only   |
| Selenium MCP   | Selenium   | Yes      | Enterprise testing    |

### Database Access

| Server         | Database   | Query Type | Scale            |
| -------------- | ---------- | ---------- | ---------------- |
| PostgreSQL MCP | PostgreSQL | SQL        | Enterprise       |
| SQLite MCP     | SQLite     | SQL        | Development      |
| MongoDB Atlas  | MongoDB    | Query      | Document stores  |
| BigQuery MCP   | BigQuery   | SQL        | Data warehousing |
| Neo4j MCP      | Neo4j      | Cypher     | Graph databases  |

### Cloud & Infrastructure

| Server       | Platform | Services          | Use Cases             |
| ------------ | -------- | ----------------- | --------------------- |
| AWS MCP      | AWS      | Lambda, ECS, EKS  | Serverless automation |
| Azure MCP    | Azure    | Storage, CosmosDB | Azure ecosystem       |
| Google Cloud | GCP      | Drive, Maps, APIs | Google services       |

### Version Control & CI/CD

| Server       | Platform | Features            | Integration            |
| ------------ | -------- | ------------------- | ---------------------- |
| GitHub MCP   | GitHub   | PRs, Issues, Code   | Repository management  |
| GitLab MCP   | GitLab   | Projects, Pipelines | GitLab ecosystem       |
| CircleCI MCP | CircleCI | Build Logs          | Build failure analysis |

### Integration & Workflow

| Server          | Coverage | Type     | Strength      |
| --------------- | -------- | -------- | ------------- |
| Zapier MCP      | 5000+    | Workflow | Popular apps  |
| Rube (Composio) | 500+     | API      | Business apps |

---

## Integration Patterns

### Single Server Integration

**Use Case**: Simple, focused task requiring one tool

**Example**: File reading/writing

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["mcp-server-filesystem", "/path/to/project"]
    }
  }
}
```

---

### Multi-Server Integration

**Use Case**: Complex workflow requiring multiple tools

**Example**: Full-stack development (code + database + version control)

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["mcp-server-filesystem", "/Users/username/Projects"]
    },
    "postgres": {
      "command": "npx",
      "args": ["mcp-server-postgres"],
      "env": {
        "DATABASE_URL": "postgresql://user:password@localhost:5432/mydb"
      }
    },
    "github": {
      "command": "npx",
      "args": ["mcp-server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_xxxxxxxxxxxx"
      }
    }
  }
}
```

---

### Tool Chaining (Sequential Execution)

**Pattern**: One MCP server output feeds into another

**Example**: Code generation workflow

1. **Apidog MCP** retrieves API specification
2. **Claude** analyzes spec and generates code
3. **Filesystem MCP** writes generated code
4. **GitHub MCP** creates pull request with changes

---

### Parallel Execution

**Pattern**: Multiple MCP servers work independently

**Example**: Simultaneous testing and documentation

- **Playwright MCP** runs E2E tests
- **Filesystem MCP** generates documentation
- **GitHub MCP** commits both changes

---

---

## Claude Desktop Configuration

### Step-by-Step Setup

#### 1. Access Configuration File

**macOS**:

```
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Windows**:

```
%APPDATA%\Claude\claude_desktop_config.json
```

**Linux**:

```
~/.config/Claude/claude_desktop_config.json
```

#### 2. Open the Configuration

In Claude Desktop:

1. Click Settings icon (bottom left)
2. Click Developer tab
3. Click "Edit Config" button

This opens your `claude_desktop_config.json` file in your default text editor.

#### 3. Basic Structure

```json
{
  "mcpServers": {
    "server-name": {
      "command": "command-to-run",
      "args": ["arg1", "arg2"],
      "env": {
        "ENV_VAR": "value"
      },
      "disabled": false
    }
  }
}
```

#### 4. Save and Restart

- Save the JSON file
- Completely close Claude Desktop
- Reopen Claude Desktop
- Look for the MCP icon (hammer/tools) in the bottom-right corner

---

### Configuration Examples

#### Example 1: Filesystem Only

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "@modelcontextprotocol/server-filesystem@latest",
        "/Users/username/Projects"
      ]
    }
  }
}
```

#### Example 2: PostgreSQL Database

```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-postgres@latest"],
      "env": {
        "DATABASE_URL": "postgresql://user:password@localhost:5432/database_name"
      }
    }
  }
}
```

#### Example 3: Full Development Stack

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "@modelcontextprotocol/server-filesystem@latest",
        "/Users/username/Projects"
      ]
    },
    "postgres": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-postgres@latest"],
      "env": {
        "DATABASE_URL": "postgresql://user:password@localhost:5432/dev_db"
      }
    },
    "github": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-github@latest"],
      "env": {
        "GH_PAT_TOKEN": "ghp_your_token_here"
      }
    },
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

#### Example 4: AWS Integration

```json
{
  "mcpServers": {
    "aws": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-aws@latest"],
      "env": {
        "AWS_REGION": "us-east-1",
        "AWS_PROFILE": "default"
      }
    }
  }
}
```

#### Example 5: Docker-Based MCP

```json
{
  "mcpServers": {
    "mcp-docker": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "your-mcp-docker-image:latest"
      ]
    }
  }
}
```

---

### Environment Variables in Configuration

**Sensitive Data Handling**:

For API keys and credentials, use environment variables:

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["mcp-server-github"],
      "env": {
        "GH_PAT_TOKEN": "${GH_PAT_TOKEN}"
      }
    }
  }
}
```

Set environment variables before running Claude Desktop:

**macOS/Linux**:

```bash
export GH_PAT_TOKEN="your_token"
open /Applications/Claude.app
```

**Windows (PowerShell)**:

```powershell
$env:GH_PAT_TOKEN="your_token"
```

---

### Desktop Extensions (.mcpb files)

**Installation Method**: Recommended for published extensions

**Steps**:

1. In Claude Desktop, go to Settings > Extensions
2. Click "Advanced settings"
3. Click "Install Extension..."
4. Select the `.mcpb` file
5. Follow prompts to complete installation

**Benefits**:

- Bundles dependencies automatically
- Easier distribution
- Simplified configuration

---

### Alternative Installation: MCP Directory

**Official Extension Directory**:

1. Go to Settings > Extensions
2. Click "Browse extensions"
3. Browse available MCP servers
4. Click "Install"
5. Configure required credentials

---

---

## Best MCP Servers by Task

### Task: Automated E2E Testing

**Recommended Stack**:

1. **Playwright MCP** (primary)
2. **GitHub MCP** (test management)
3. **CircleCI MCP** (CI integration)

**Setup Priority**: Start with Playwright MCP

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"],
      "env": {
        "BROWSER": "chromium"
      }
    }
  }
}
```

**Workflow**:

```
Claude analyzes test requirements
→ Playwright MCP generates test code
→ GitHub MCP commits tests
→ CircleCI MCP runs tests
→ Results reported back to Claude
```

---

### Task: API Development

**Recommended Stack**:

1. **Apidog MCP** (API contracts)
2. **Filesystem MCP** (code generation)
3. **GitHub MCP** (version control)

```json
{
  "mcpServers": {
    "apidog": {
      "command": "npx",
      "args": ["mcp-server-apidog"],
      "env": {
        "APIDOG_API_KEY": "your_key"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-filesystem", "/path/to/project"]
    }
  }
}
```

---

### Task: Database Administration

**Recommended Stack**:

1. **PostgreSQL MCP** (primary database)
2. **SQLite MCP** (local/test database)
3. **Filesystem MCP** (backup/dump files)

```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-postgres"],
      "env": {
        "DATABASE_URL": "postgresql://user:pass@localhost/dbname"
      }
    },
    "sqlite": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-sqlite"],
      "env": {
        "SQLITE_DB_PATH": "/path/to/database.db"
      }
    }
  }
}
```

---

### Task: Web Scraping & Data Extraction

**Recommended Stack**:

1. **Playwright MCP** (primary)
2. **Filesystem MCP** (data storage)
3. **Brave Search MCP** (content discovery)

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    },
    "filesystem": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-filesystem", "/path/to/data"]
    }
  }
}
```

---

### Task: DevOps & Infrastructure

**Recommended Stack**:

1. **AWS MCP** (infrastructure)
2. **GitHub MCP** (deployment tracking)
3. **Filesystem MCP** (configuration files)

```json
{
  "mcpServers": {
    "aws": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-aws"],
      "env": {
        "AWS_REGION": "us-east-1"
      }
    },
    "github": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-github"],
      "env": {
        "GH_PAT_TOKEN": "your_token"
      }
    }
  }
}
```

---

### Task: Workflow Automation

**Recommended Stack**:

1. **Zapier MCP** (app integration)
2. **Rube/Composio** (extended integrations)
3. **GitHub MCP** (code-based triggers)

```json
{
  "mcpServers": {
    "zapier": {
      "command": "npx",
      "args": ["mcp-server-zapier"],
      "env": {
        "ZAPIER_API_KEY": "your_key"
      }
    }
  }
}
```

---

### Task: Documentation Generation

**Recommended Stack**:

1. **Filesystem MCP** (code reading)
2. **GitHub MCP** (repo analysis)
3. **Apidog MCP** (API docs)

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-filesystem", "/path/to/project"]
    },
    "github": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-github"],
      "env": {
        "GH_PAT_TOKEN": "your_token"
      }
    }
  }
}
```

---

---

## Comparison Tables

### Browser Automation Comparison

| Feature          | Playwright                    | Puppeteer        | Selenium           |
| ---------------- | ----------------------------- | ---------------- | ------------------ |
| Browser Support  | Chrome, Firefox, WebKit, Edge | Chrome, Firefox  | All major browsers |
| Headless         | Yes                           | Yes              | Yes                |
| Screenshots      | Yes                           | Yes              | Yes                |
| PDF Generation   | Yes                           | Yes              | No                 |
| Mobile Emulation | Yes                           | Yes              | Limited            |
| Performance      | Fast                          | Good             | Slower             |
| Learning Curve   | Low                           | Low              | Medium             |
| Enterprise Ready | Yes                           | Yes              | Yes                |
| Best For         | Modern web apps               | Chromium-focused | Complex scenarios  |

---

### Database MCP Comparison

| Database   | MCP Server    | Query Language | Best For           | Scale                 |
| ---------- | ------------- | -------------- | ------------------ | --------------------- |
| PostgreSQL | Official      | SQL            | Relational data    | Enterprise            |
| SQLite     | Official      | SQL            | Local development  | Single file           |
| MongoDB    | MongoDB Atlas | Query API      | Document stores    | Large documents       |
| BigQuery   | LucasHild     | SQL            | Data warehousing   | Analytics             |
| Neo4j      | neo4j-contrib | Cypher         | Graphs/networks    | Complex relationships |
| Snowflake  | Official      | SQL            | Cloud warehousing  | Massive scale         |
| MySQL      | Community     | SQL            | Web applications   | Medium scale          |
| MSSQL      | Community     | T-SQL          | Enterprise Windows | Legacy systems        |

---

### Cloud Platform MCP Comparison

| Platform     | Services                  | Release  | Maturity   | Best For            |
| ------------ | ------------------------- | -------- | ---------- | ------------------- |
| AWS          | Lambda, ECS, EKS, Finch   | May 2025 | Production | AWS-native apps     |
| Azure        | Storage, CosmosDB, DevOps | Mature   | Production | Microsoft ecosystem |
| Google Cloud | Drive, Maps, Data Commons | Mature   | Production | Google services     |

---

### Filesystem MCP Comparison

| Implementation    | Language   | Transport   | Security              | Performance |
| ----------------- | ---------- | ----------- | --------------------- | ----------- |
| Official          | Node.js    | STDIO       | Directory control     | Good        |
| mark3labs         | Go         | STDIO       | Path validation       | Excellent   |
| cyanheads         | TypeScript | STDIO, HTTP | Comprehensive         | Good        |
| MarcusJellinghaus | Python     | STDIO       | Multi-project support | Good        |

---

### Integration Platform Comparison

| Server          | Apps Supported | Type                | Best For      | Enterprise Ready |
| --------------- | -------------- | ------------------- | ------------- | ---------------- |
| Zapier MCP      | 5000+          | Workflow automation | Popular apps  | Yes              |
| Rube (Composio) | 500+           | API integration     | Business apps | Yes              |

---

---

## Setup and Installation

### Prerequisites

**Minimum Requirements**:

- Claude Desktop (latest version)
- Node.js 16+ (for npx-based servers)
- 1GB free disk space
- Modern terminal/shell

**For Cloud Services**:

- Valid API credentials/tokens
- Network connectivity
- Appropriate permissions in cloud platforms

---

### Quick Start: 3-Server Setup

**Goal**: Set up filesystem, PostgreSQL, and Playwright MCPs

**Step 1: Prepare Your Machine**

```bash
# Verify Node.js installation
node --version  # Should be v16+

# Check for required tools
which npx       # Should exist
```

**Step 2: Generate API Tokens**

- **GitHub**: [github.com/settings/tokens](https://github.com/settings/tokens) →
  Create personal access token
- **PostgreSQL**: Get connection string from your database provider

**Step 3: Edit Configuration**

Open Claude Desktop → Settings → Developer → Edit Config

Paste this configuration:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "@modelcontextprotocol/server-filesystem@latest",
        "/Users/username/Projects"
      ]
    },
    "postgres": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-postgres@latest"],
      "env": {
        "DATABASE_URL": "postgresql://user:password@localhost:5432/mydb"
      }
    },
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

**Step 4: Customize Paths**

Replace:

- `/Users/username/Projects` with your actual project path
- PostgreSQL connection string with your actual database URL

**Step 5: Save and Restart**

1. Save the JSON file
2. Close Claude Desktop completely
3. Reopen Claude Desktop
4. Verify MCP icon appears (bottom right corner)

---

### Installation by Server Type

#### npx-Based Servers

**Most Common Method**:

```json
{
  "command": "npx",
  "args": ["@modelcontextprotocol/server-name@latest", "additional-args"]
}
```

**Servers Using This**:

- Filesystem
- PostgreSQL
- SQLite
- GitHub
- Playwright
- Most official servers

#### Docker-Based Servers

```json
{
  "command": "docker",
  "args": [
    "run",
    "-i",
    "--rm",
    "image-name:latest"
  ]
}
```

**Prerequisites**:

- Docker Desktop installed
- Docker image available locally or on Docker Hub

#### Python-Based Servers

```json
{
  "command": "python3",
  "args": ["-m", "mcp_server_module_name"]
}
```

**Prerequisites**:

- Python 3.8+
- Required Python packages installed (`pip install package-name`)

#### Go-Based Servers

```json
{
  "command": "/path/to/executable-binary"
}
```

**Prerequisites**:

- Pre-compiled binary
- Executable permissions set

---

### Verification Checklist

After installation, verify each server works:

- [ ] Claude Desktop starts without errors
- [ ] MCP icon visible in bottom right
- [ ] Hover over icon shows server names
- [ ] No errors in Claude Desktop logs
- [ ] Server responses appear in chat

---

---

## Troubleshooting

### Common Issues and Solutions

#### Issue 1: MCP Server Not Appearing

**Symptoms**: No MCP icon in Claude Desktop, servers listed as unavailable

**Solutions**:

1. **Check JSON Syntax**
   ```bash
   # macOS
   cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | python3 -m json.tool

   # Linux
   cat ~/.config/Claude/claude_desktop_config.json | python3 -m json.tool

   # Windows PowerShell
   Get-Content $env:APPDATA\Claude\claude_desktop_config.json | ConvertFrom-Json
   ```

2. **Verify Command Exists**
   ```bash
   which npx          # For npx-based servers
   which docker       # For docker-based servers
   which python3      # For Python servers
   ```

3. **Test npx Installation**
   ```bash
   npx @modelcontextprotocol/server-filesystem --help
   ```

4. **Restart Claude Desktop**
   - Completely quit (not just close window)
   - Reopen application

---

#### Issue 2: "Command Not Found" Error

**Symptoms**: Error message: "command not found: npx" or "command not found:
docker"

**Solutions**:

1. **For npx issues**:
   ```bash
   npm install -g npm           # Upgrade npm
   npm install -g npx          # Ensure npx is global
   ```

2. **For docker issues**:
   ```bash
   docker --version            # Verify Docker is installed
   docker ps                   # Verify Docker daemon is running
   ```

3. **For Python issues**:
   ```bash
   python3 --version           # Verify Python 3.8+
   pip install mcp_server_name # Install required packages
   ```

---

#### Issue 3: Database Connection Fails

**Symptoms**: "Connection refused" or "Authentication failed" error

**Solutions**:

1. **Verify Connection String**
   ```bash
   # Test PostgreSQL connection
   psql "postgresql://user:password@localhost:5432/dbname"

   # Test MongoDB Atlas
   mongosh "mongodb+srv://user:password@cluster.mongodb.net/dbname"
   ```

2. **Check Credentials**
   - Verify username, password, host, port
   - Check for special characters (URL-encode if needed)
   - Verify database/service is running and accessible

3. **Network Issues**
   - Check firewall rules
   - Verify VPN connection if needed
   - Test with `ping` or `nc` (netcat)

4. **Permissions**
   - Verify database user has appropriate permissions
   - Check security groups (cloud providers)

---

#### Issue 4: "Too Many MCPs" Slowdown

**Symptoms**: Claude Desktop takes long time to start, sluggish responses

**Solutions**:

1. **Reduce Number of MCPs**
   - Comment out unused MCPs in config
   - Keep only 2-3 active MCPs
   - Add others later when needed

2. **Verify MCP Health**
   ```bash
   # Check process load
   top -l 1 | grep -i "python\|node\|docker"
   ```

3. **Optimize Configuration**
   - Remove MCPs with long startup times
   - Consider Docker-based MCPs for better isolation

---

#### Issue 5: File Path Issues (Windows)

**Symptoms**: "File not found" or path-related errors on Windows

**Solutions**:

1. **Use Forward Slashes**
   ```json
   // CORRECT
   "C:/Users/Username/Projects"

   // INCORRECT
   "C:\Users\Username\Projects"
   ```

2. **Use ${APPDATA} Variable**
   ```json
   "env": {
     "DATABASE_PATH": "${APPDATA}/MyApp/database.db"
   }
   ```

3. **Check Permissions**
   ```powershell
   # Run as Administrator if needed
   icacls "C:\Users\Username\Projects" /grant Everyone:F
   ```

---

#### Issue 6: Environment Variables Not Working

**Symptoms**: Environment variables not recognized, "undefined" values in MCP

**Solutions**:

1. **Use Full Path**
   ```json
   "env": {
     "GH_PAT_TOKEN": "ghp_xxxxxxxxxxxx"  // Use actual value instead of ${GH_PAT_TOKEN}
   }
   ```

2. **Set System Environment Variables** (macOS/Linux)
   ```bash
   export GH_PAT_TOKEN="your_token"
   source ~/.bashrc  # or ~/.zshrc
   ```

3. **Set System Environment Variables** (Windows)
   ```powershell
   [Environment]::SetEnvironmentVariable("GH_PAT_TOKEN", "your_token", "User")
   ```

4. **Restart Claude Desktop**
   - System variables require application restart

---

#### Issue 7: Docker MCP Not Connecting

**Symptoms**: Docker MCP appears but cannot execute commands

**Solutions**:

1. **Verify Docker is Running**
   ```bash
   docker ps          # Should list containers without error
   docker version     # Should show client and server info
   ```

2. **Check Docker Daemon**
   ```bash
   sudo systemctl start docker    # Linux
   open /Applications/Docker.app  # macOS
   # Windows: Ensure Docker Desktop is running
   ```

3. **Verify Image Exists**
   ```bash
   docker images "your-image-name"
   ```

4. **Pull Latest Image**
   ```bash
   docker pull image-name:latest
   ```

---

### Debug Mode

**Enable MCP Debug Logging**:

```bash
# macOS/Linux
MCP_DEBUG=1 /Applications/Claude.app/Contents/MacOS/Claude

# Windows PowerShell
$env:MCP_DEBUG="1"
# Then launch Claude Desktop normally
```

Check Claude Desktop logs for detailed error messages in:

- macOS: `~/Library/Logs/Claude/`
- Windows: `%APPDATA%\Claude\logs\`
- Linux: `~/.cache/Claude/logs/`

---

### Getting Help

1. **Official Documentation**:
   - [Model Context Protocol Documentation](https://modelcontextprotocol.io)
   - [Claude Desktop Support](https://support.claude.com)

2. **GitHub Issues**:
   - Report issues on the specific MCP server's GitHub repository
   - Include configuration, error messages, and system info

3. **Community Resources**:
   - Anthropic Discord server
   - GitHub Discussions on MCP repositories
   - Stack Overflow (tag: model-context-protocol)

---

---

## Resources and References

### Official Documentation

- [Model Context Protocol Official Docs](https://modelcontextprotocol.io)
- [Claude Support - Getting Started with MCP](https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop)
- [MCP Development Guide](https://modelcontextprotocol.io/development)

### MCP Server Repositories

**Official Servers** (Anthropic):

- [modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers) -
  Official example servers

**Browser Automation**:

- [microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp)
- [executeautomation/mcp-playwright](https://github.com/executeautomation/mcp-playwright)

**Filesystem**:

- [mark3labs/mcp-filesystem-server](https://github.com/mark3labs/mcp-filesystem-server)
- [MarcusJellinghaus/mcp_server_filesystem](https://github.com/MarcusJellinghaus/mcp_server_filesystem)
- [cyanheads/filesystem-mcp-server](https://github.com/cyanheads/filesystem-mcp-server)

**Cloud Platforms**:

- [AWS MCP Servers](https://github.com/aws/aws-mcp-servers)
- [Azure MCP Server](https://github.com/azure/mcp-server-azure)

**Database**:

- [MongoDB Atlas MCP](https://github.com/montumodi/mongodb-atlas-mcp-server)
- [Neo4j MCP](https://github.com/neo4j-contrib/mcp-neo4j)
- [BigQuery MCP](https://github.com/LucasHild/mcp-server-bigquery)

### Community Collections

- [punkpeye/awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers) -
  Comprehensive MCP server directory
- [PipedreamHQ/awesome-mcp-servers](https://github.com/PipedreamHQ/awesome-mcp-servers) -
  Alternative collection
- [MCPServers.org](https://mcpservers.org) - Interactive server directory
- [AIAgentsList - MCP Servers](https://aiagentslist.com/mcp-servers) - 593+ MCP
  servers catalog
- [Glama.ai MCP Servers](https://glama.ai/mcp/servers) - 12,000+ server registry
- [MCP.so](https://mcp.so) - Server directory and browser

### Guides and Tutorials

- [A Complete Guide to MCP (2025)](https://www.keywordsai.co/blog/introduction-to-mcp)
- [Claude Code Best Practices](https://www.anthropic.com/engineering/claude-code-best-practices)
- [Top MCP Servers for Claude Code](https://mcpcat.io/guides/best-mcp-servers-for-claude-code/)
- [Using Playwright MCP with Claude](https://til.simonwillison.net/claude-code/playwright-mcp-claude-code)
- [Continue IDE MCP Setup](https://docs.continue.dev/customize/deep-dives/mcp)

### Articles and News

- [Anthropic: Introducing Model Context Protocol](https://www.anthropic.com/news/model-context-protocol)
- [OpenAI Adopts MCP (March 2025)](https://openai.com)
- [AWS Announces MCP Servers (May 2025)](https://aws.amazon.com)
- [MCP Roadmap](https://modelcontextprotocol.io/development/roadmap)
- [MCP Spec Updates (June 2025)](https://auth0.com/blog/mcp-specs-update-all-about-auth/)

### Security Resources

- [MCP Security Considerations](https://modelcontextprotocol.io/docs/security)
- [Windows 11 MCP Support](https://blogs.windows.com/windowsexperience/2025/05/19/securing-the-model-context-protocol-building-a-safer-agentic-future-on-windows/)

### Best Practices

- [Claude Code Best Practices for Agentic Coding](https://www.anthropic.com/engineering/claude-code-best-practices)
- [Desktop Extensions Guide](https://www.anthropic.com/engineering/desktop-extensions)

---

## Summary

Model Context Protocol (MCP) servers represent a paradigm shift in how AI agents
interact with external systems. By December 2025, the ecosystem has matured
significantly with:

- **12,000+ available servers** across multiple registries
- **Industry-wide adoption** (OpenAI, Microsoft, AWS, Google)
- **Production-ready implementations** in multiple languages
- **Enterprise security features** and compliance support

### Key Recommendations

1. **Start Small**: Begin with 2-3 essential MCPs for your primary workflow
2. **Choose Official First**: Prefer Anthropic's official servers when available
3. **Document Everything**: Keep your configuration file organized with comments
4. **Security First**: Use environment variables for sensitive credentials
5. **Monitor Performance**: Add MCPs incrementally to avoid startup slowdown

### Next Steps

1. Identify your primary development workflow
2. Select 2-3 relevant MCPs from this guide
3. Follow the setup instructions for your chosen servers
4. Refer to the troubleshooting section if issues arise
5. Explore advanced configurations as you gain proficiency

---

**Document Version**: 1.0 **Last Updated**: December 6, 2025 **Status**:
Production Ready

For the latest updates and new MCPs, visit the
[MCP Registry](https://glama.ai/mcp/servers).
