SHELL := /bin/sh

.PHONY: help install-js dev-web dev-desktop dev-api dev-worker build-web build-desktop infra-up infra-down

help:
	@printf '%s\n' \
		'install-js     Install JavaScript workspace dependencies' \
		'dev-web        Run Next.js web app' \
		'dev-desktop    Run Electron desktop app' \
		'dev-api        Run FastAPI backend' \
		'dev-worker     Run Celery worker' \
		'build-web      Build Next.js web app' \
		'build-desktop  Build Electron desktop app' \
		'infra-up       Start local Postgres/Redis/MinIO' \
		'infra-down     Stop local Postgres/Redis/MinIO'

install-js:
	pnpm install

dev-web:
	pnpm dev

dev-desktop:
	pnpm dev:desktop

dev-api:
	python3 -m uvicorn app.main:app --reload --app-dir apps/api

dev-worker:
	python3 -m celery -A worker.celery_app.celery_app worker --workdir workers/ai

build-web:
	pnpm build:web

build-desktop:
	pnpm build:desktop

infra-up:
	docker compose -f infra/docker-compose.local.yml up -d

infra-down:
	docker compose -f infra/docker-compose.local.yml down
