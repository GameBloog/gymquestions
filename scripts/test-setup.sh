#!/bin/bash

# Script para configurar ambiente de testes
# Uso: ./scripts/test-setup.sh [start|stop|reset]

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para exibir mensagens coloridas
log_info() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

# Função para iniciar banco de testes
start_test_db() {
    log_info "Iniciando banco de dados de testes..."
    
    # Verificar se já está rodando
    if docker ps | grep -q api-gym-db-test; then
        log_warn "Banco de testes já está rodando"
    else
        docker-compose -f docker-compose.test.yml up -d
        
        # Aguardar o banco ficar pronto
        log_info "Aguardando banco de dados ficar pronto..."
        sleep 5
        
        # Verificar se está saudável
        until docker exec api-gym-db-test pg_isready -U postgres > /dev/null 2>&1; do
            echo "Aguardando PostgreSQL..."
            sleep 2
        done
        
        log_info "Banco de dados de testes iniciado na porta 5434"
    fi
}

# Função para parar banco de testes
stop_test_db() {
    log_info "Parando banco de dados de testes..."
    docker-compose -f docker-compose.test.yml down
    log_info "Banco de dados de testes parado"
}

# Função para resetar banco (remover volumes)
reset_test_db() {
    log_warn "Removendo banco de dados de testes e volumes..."
    docker-compose -f docker-compose.test.yml down -v
    log_info "Banco de dados de testes resetado"
}

# Função para executar migrações
run_migrations() {
    log_info "Executando migrações no banco de testes..."
    
    # Carregar variáveis de ambiente de teste
    export $(cat .env.test | grep -v '^#' | xargs)
    
    # Executar migrações
    pnpm prisma migrate deploy
    
    log_info "Migrações executadas com sucesso"
}

# Função para executar testes
run_tests() {
    log_info "Executando testes..."
    
    # Carregar variáveis de ambiente de teste
    export $(cat .env.test | grep -v '^#' | xargs)
    
    case "$1" in
        unit)
            log_info "Executando testes unitários..."
            pnpm test:unit
            ;;
        e2e)
            log_info "Executando testes E2E..."
            pnpm test:e2e
            ;;
        all)
            log_info "Executando todos os testes..."
            pnpm test:all
            ;;
        coverage)
            log_info "Executando testes com cobertura..."
            pnpm test:coverage
            ;;
        *)
            log_info "Executando todos os testes..."
            pnpm test:all
            ;;
    esac
}

# Função principal
main() {
    case "$1" in
        start)
            start_test_db
            run_migrations
            ;;
        stop)
            stop_test_db
            ;;
        reset)
            reset_test_db
            start_test_db
            run_migrations
            ;;
        migrate)
            run_migrations
            ;;
        test)
            run_tests "$2"
            ;;
        full)
            log_info "Setup completo de testes..."
            start_test_db
            run_migrations
            run_tests "$2"
            ;;
        *)
            echo "Uso: $0 {start|stop|reset|migrate|test [unit|e2e|all|coverage]|full [unit|e2e|all|coverage]}"
            echo ""
            echo "Comandos:"
            echo "  start     - Inicia o banco de dados de testes"
            echo "  stop      - Para o banco de dados de testes"
            echo "  reset     - Remove e recria o banco de dados de testes"
            echo "  migrate   - Executa as migrações no banco de testes"
            echo "  test      - Executa os testes (especifique: unit, e2e, all, coverage)"
            echo "  full      - Inicia o banco, executa migrações e testes"
            echo ""
            echo "Exemplos:"
            echo "  $0 start"
            echo "  $0 test unit"
            echo "  $0 full e2e"
            echo "  $0 reset"
            exit 1
            ;;
    esac
}

# Verificar se o arquivo .env.test existe
if [ ! -f .env.test ]; then
    log_error "Arquivo .env.test não encontrado!"
    log_info "Crie o arquivo .env.test baseado no .env.test.example"
    exit 1
fi

# Executar função principal
main "$@"