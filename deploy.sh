#!/bin/bash

# Sarnies Loyalty App - Deployment Script
# Deploys to DigitalOcean Droplet at 152.42.209.198

set -e

# Configuration
SERVER_IP="152.42.209.198"
SERVER_USER="${DEPLOY_USER:-root}"
APP_DIR="/opt/sarnies-loyalty"
REPO_URL="${REPO_URL:-git@github.com:your-org/sarnies-loyalty.git}"
BRANCH="${BRANCH:-main}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# SSH command helper
ssh_cmd() {
    ssh -o StrictHostKeyChecking=no "${SERVER_USER}@${SERVER_IP}" "$1"
}

# SCP helper
scp_file() {
    scp -o StrictHostKeyChecking=no "$1" "${SERVER_USER}@${SERVER_IP}:$2"
}

# Print usage
usage() {
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  deploy       Full deployment (pull, build, migrate, restart)"
    echo "  quick        Quick deploy (pull and restart, no rebuild)"
    echo "  build        Build containers only"
    echo "  restart      Restart containers only"
    echo "  migrate      Run database migrations"
    echo "  logs         Show container logs"
    echo "  status       Show deployment status"
    echo "  setup        Initial server setup"
    echo "  rollback     Rollback to previous version"
    echo "  ssl          Setup SSL certificates with Let's Encrypt"
    echo ""
    echo "Environment variables:"
    echo "  DEPLOY_USER  SSH user (default: root)"
    echo "  REPO_URL     Git repository URL"
    echo "  BRANCH       Git branch to deploy (default: main)"
    echo ""
}

# Initial server setup
setup_server() {
    log_info "Setting up server at ${SERVER_IP}..."

    ssh_cmd "
        # Update system
        apt-get update && apt-get upgrade -y

        # Install Docker if not present
        if ! command -v docker &> /dev/null; then
            curl -fsSL https://get.docker.com -o get-docker.sh
            sh get-docker.sh
            rm get-docker.sh
        fi

        # Install Docker Compose if not present
        if ! command -v docker-compose &> /dev/null; then
            curl -L \"https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m)\" -o /usr/local/bin/docker-compose
            chmod +x /usr/local/bin/docker-compose
        fi

        # Install git if not present
        apt-get install -y git

        # Create app directory
        mkdir -p ${APP_DIR}

        # Create certbot directories for SSL
        mkdir -p ${APP_DIR}/certbot/conf
        mkdir -p ${APP_DIR}/certbot/www

        echo 'Server setup complete!'
    "

    log_success "Server setup complete!"
    log_warning "Don't forget to:"
    echo "  1. Clone the repository to ${APP_DIR}"
    echo "  2. Copy .env.production to ${APP_DIR}/.env"
    echo "  3. Run 'deploy.sh deploy' for first deployment"
}

# Full deployment
deploy() {
    log_info "Starting full deployment to ${SERVER_IP}..."

    # Pull latest code
    log_info "Pulling latest code from ${BRANCH}..."
    ssh_cmd "
        cd ${APP_DIR}
        git fetch origin
        git checkout ${BRANCH}
        git pull origin ${BRANCH}
    "

    # Build containers
    log_info "Building Docker containers..."
    ssh_cmd "
        cd ${APP_DIR}
        docker-compose build --no-cache
    "

    # Stop existing containers
    log_info "Stopping existing containers..."
    ssh_cmd "
        cd ${APP_DIR}
        docker-compose down || true
    "

    # Start containers
    log_info "Starting containers..."
    ssh_cmd "
        cd ${APP_DIR}
        docker-compose up -d
    "

    # Wait for services to be healthy
    log_info "Waiting for services to be healthy..."
    sleep 10

    # Run migrations
    log_info "Running database migrations..."
    ssh_cmd "
        cd ${APP_DIR}
        docker-compose exec -T backend npm run migrate || echo 'Migration may have already been applied'
    "

    # Show status
    show_status

    log_success "Deployment complete!"
}

# Quick deployment (no rebuild)
quick_deploy() {
    log_info "Starting quick deployment to ${SERVER_IP}..."

    # Pull latest code
    log_info "Pulling latest code from ${BRANCH}..."
    ssh_cmd "
        cd ${APP_DIR}
        git fetch origin
        git checkout ${BRANCH}
        git pull origin ${BRANCH}
    "

    # Restart containers
    log_info "Restarting containers..."
    ssh_cmd "
        cd ${APP_DIR}
        docker-compose restart
    "

    # Wait for services
    sleep 5

    show_status
    log_success "Quick deployment complete!"
}

# Build containers
build() {
    log_info "Building containers..."
    ssh_cmd "
        cd ${APP_DIR}
        docker-compose build --no-cache
    "
    log_success "Build complete!"
}

# Restart containers
restart() {
    log_info "Restarting containers..."
    ssh_cmd "
        cd ${APP_DIR}
        docker-compose restart
    "
    sleep 5
    show_status
    log_success "Restart complete!"
}

# Run migrations
migrate() {
    log_info "Running database migrations..."
    ssh_cmd "
        cd ${APP_DIR}
        docker-compose exec -T backend npm run migrate
    "
    log_success "Migrations complete!"
}

# Show logs
show_logs() {
    log_info "Showing container logs (Ctrl+C to exit)..."
    ssh_cmd "
        cd ${APP_DIR}
        docker-compose logs -f --tail=100
    "
}

# Show deployment status
show_status() {
    log_info "Deployment Status:"
    echo ""

    ssh_cmd "
        cd ${APP_DIR}
        echo '=== Container Status ==='
        docker-compose ps
        echo ''
        echo '=== Resource Usage ==='
        docker stats --no-stream --format 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}'
        echo ''
        echo '=== Recent Logs (last 10 lines per service) ==='
        docker-compose logs --tail=10
    "

    echo ""
    log_info "Application URLs:"
    echo "  Frontend: http://${SERVER_IP}"
    echo "  API:      http://${SERVER_IP}/api"
    echo ""
}

# Rollback to previous version
rollback() {
    log_warning "Rolling back to previous version..."

    ssh_cmd "
        cd ${APP_DIR}
        git checkout HEAD~1
        docker-compose down
        docker-compose build
        docker-compose up -d
    "

    sleep 10
    show_status
    log_success "Rollback complete!"
}

# Setup SSL with Let's Encrypt
setup_ssl() {
    log_info "Setting up SSL certificates..."

    read -p "Enter your domain name (e.g., app.sarnies.com): " DOMAIN
    read -p "Enter your email for Let's Encrypt notifications: " EMAIL

    ssh_cmd "
        cd ${APP_DIR}

        # Stop nginx temporarily
        docker-compose stop nginx

        # Get certificates
        docker-compose run --rm certbot certonly \
            --webroot \
            --webroot-path=/var/www/certbot \
            --email ${EMAIL} \
            --agree-tos \
            --no-eff-email \
            -d ${DOMAIN}

        # Update nginx config to use SSL
        # (You'll need to manually uncomment the HTTPS server block in nginx.conf)

        # Restart nginx
        docker-compose start nginx
    "

    log_success "SSL setup initiated!"
    log_warning "Remember to:"
    echo "  1. Update nginx.conf to uncomment the HTTPS server block"
    echo "  2. Replace 'your-domain.com' with '${DOMAIN}'"
    echo "  3. Run 'deploy.sh restart' to apply changes"
}

# Seed database with initial data
seed() {
    log_info "Seeding database..."
    ssh_cmd "
        cd ${APP_DIR}
        docker-compose exec -T backend npm run seed
    "
    log_success "Database seeded!"
}

# Main script
case "${1:-}" in
    deploy)
        deploy
        ;;
    quick)
        quick_deploy
        ;;
    build)
        build
        ;;
    restart)
        restart
        ;;
    migrate)
        migrate
        ;;
    logs)
        show_logs
        ;;
    status)
        show_status
        ;;
    setup)
        setup_server
        ;;
    rollback)
        rollback
        ;;
    ssl)
        setup_ssl
        ;;
    seed)
        seed
        ;;
    *)
        usage
        exit 1
        ;;
esac
