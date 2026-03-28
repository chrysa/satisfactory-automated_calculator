# =============================================================================
# S.A.T. — Main Makefile
# Based on: https://github.com/Forge-Stack-Workshop/base-makefile (Makefile.with-sub-folder)
# All commands are prefixed with @ (silent output).
# =============================================================================

#!make
ifneq (,)
	$(error This Makefile requires GNU Make)
endif

# ── Environment loading ───────────────────────────────────────────────────────
ifneq (,$(wildcard .env))
    include .env
    export $(shell sed 's/=.*//' .env)
endif

# ── clasp PATH ────────────────────────────────────────────────────────────────
export PATH := $(HOME)/.local/lib/npm-global/bin:$(PATH)

# ── Variables (from .env or command line) ─────────────────────────────────────
PROJECT_NAME ?= S.A.T
VERSION      ?= $(shell git describe --tags --always 2>/dev/null || echo "dev")
SCRIPT_ID    ?=
GITHUB_REPO  ?=
GIT_BRANCH   ?= main
ENVIRONMENT  ?= dev
BACKUP_DIR   ?= ./backups
CLASP_PATH   ?= clasp

# ── Colors ────────────────────────────────────────────────────────────────────
RED    := \033[0;31m
GREEN  := \033[0;32m
YELLOW := \033[0;33m
BLUE   := \033[0;34m
CYAN   := \033[0;36m
NC     := \033[0m

# ── Sub-makefile inclusion (Makefile.with-sub-folder pattern) ─────────────────
include $(wildcard *.Makefile)

# ── Auto-PHONY ────────────────────────────────────────────────────────────────
.PHONY: $(shell grep -E '^[a-zA-Z_-]+(\([^)]*\))?:.*?## .*$$' $(MAKEFILE_LIST) | sort | cut -d":" -f1 | tr "\n" " ")

.DEFAULT_GOAL := help

# ── Help target (base-makefile with-sub-folder format) ────────────────────────
help: ## Show this help
	@echo "==================================================================="
	@echo "  $(PROJECT_NAME) — Development Environment"
	@echo "  Env: $(ENVIRONMENT) | Version: $(VERSION)"
	@echo "==================================================================="
	@echo ""
	@echo "  Available commands:"
	@echo ""
	@for file in $(MAKEFILE_LIST); do \
		grep -E '^[a-zA-Z_-]+(\([^)]*\))?:.*?## .*$$' $$file 2>/dev/null | sort | \
		awk 'BEGIN {FS = ":.*?## "}; { \
cmd = $$1; desc = $$2; \
if (match(cmd, /\([^)]+\)/)) { \
args = substr(cmd, RSTART+1, RLENGTH-2); \
gsub(/\([^)]+\)/, "", cmd); \
printf "  \033[36m%-22s\033[0m \033[33m%-12s\033[0m %s\n", cmd, args, desc; \
} else { \
printf "  \033[36m%-22s\033[0m \033[33m%-12s\033[0m %s\n", cmd, "", desc; \
} \
}'; \
		echo ""; \
	done
	@echo "==================================================================="
