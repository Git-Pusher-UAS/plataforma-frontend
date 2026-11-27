.DEFAULT_GOAL := help
.PHONY: help dev dev-simulado dev-mock mock sync-contract verify-contract gen gen-check test lint typecheck sec build e2e check

PRISM_VERSION := 5.16.0

help: ## Muestra los comandos disponibles
	@grep -E '^[a-zA-Z0-9_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-18s %s\n", $$1, $$2}'

dev: ## Servidor de desarrollo; dirige /api al backend local (http://localhost:3000)
	npm run dev

dev-simulado: ## Servidor de desarrollo con datos simulados en memoria (sin backend)
	VITE_DATOS_SIMULADOS=true npm run dev

dev-mock: ## Servidor de desarrollo dirigido al servidor simulado (make mock en otra terminal)
	VITE_API_PROXY_TARGET=http://localhost:4010 npm run dev

mock: ## Servidor simulado generado desde contract/openapi.yaml (puerto 4010)
	npx --yes @stoplight/prism-cli@$(PRISM_VERSION) mock contract/openapi.yaml -p 4010

sync-contract: ## Trae el contrato del backend: make sync-contract REF=contract-v1 BACKEND_REPO_URL=...
	@sh scripts/sync-contract.sh

verify-contract: ## Verifica que contract/ coincide con el backend en CONTRACT_REF
	@sh scripts/sync-contract.sh check

gen: ## Regenera los tipos desde contract/openapi.yaml
	@sh scripts/gen-api.sh

gen-check: gen ## Falla si los tipos generados subidos no coinciden con el contrato
	@git diff --exit-code -- src/api/generated contract

test: ## Pruebas unitarias (Vitest)
	npm test

lint: ## Análisis de estilo (ESLint)
	npm run lint

typecheck: ## Verificación de tipos (TypeScript)
	npm run typecheck

sec: ## Auditoría de dependencias (falla con severidad alta o crítica)
	npm run audit:deps

build: ## Compila el cliente
	npm run build

e2e: ## Pruebas de extremo a extremo (Playwright); la primera vez: npx playwright install chromium
	npm run e2e

check: lint typecheck test sec gen-check ## Todo lo que corre la integración continua
