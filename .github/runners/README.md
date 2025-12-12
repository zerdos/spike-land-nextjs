# Self-Hosted GitHub Actions Runner

Run GitHub Actions jobs on your local machine using Docker.

## Quick Start

```bash
cd .github/runners

# 1. Generate runner token (requires gh CLI)
chmod +x setup.sh
./setup.sh

# 2. Start runner
docker compose up -d

# 3. Verify runner is registered
gh api /repos/zerdos/spike-land-nextjs/actions/runners --jq '.runners[] | {name, status}'
```

## Usage in Workflows

To use the self-hosted runner, update your workflow:

```yaml
jobs:
  build:
    # Use self-hosted runner with fallback to GitHub-hosted
    runs-on: [self-hosted, docker, mac]
    # Or keep using GitHub-hosted:
    # runs-on: ubuntu-latest
```

## Commands

| Command                  | Description                          |
| ------------------------ | ------------------------------------ |
| `docker compose up -d`   | Start runner in background           |
| `docker compose logs -f` | View logs                            |
| `docker compose down`    | Stop runner                          |
| `docker compose restart` | Restart runner                       |
| `./setup.sh`             | Regenerate token (expires in 1 hour) |

## Multiple Runners

Uncomment the `runner-2` service in `docker-compose.yml` to run multiple parallel runners.

## Troubleshooting

### Runner not appearing in GitHub

1. Check logs: `docker compose logs`
2. Regenerate token: `./setup.sh`
3. Restart: `docker compose down && docker compose up -d`

### Token expired

Runner tokens expire in 1 hour. If the runner fails to connect, run `./setup.sh` again.

### Docker socket permissions

On Linux, you may need to add your user to the docker group:

```bash
sudo usermod -aG docker $USER
```

## Resources

- [GitHub Docs: Self-hosted runners](https://docs.github.com/en/actions/hosting-your-own-runners)
- [Runner image: myoung34/github-runner](https://github.com/myoung34/docker-github-actions-runner)
