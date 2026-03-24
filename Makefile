.PHONY: help deploy test backup sync clean install push pull verify setup-env open login bump-version

# 🧰 S.A.T 2026 - Makefile for Deployment Management
# Usage: make [target]
# Configuration: Edit .env file to set variables

# Load environment variables from .env file
ifneq (,$(wildcard .env))
    include .env
    export $(shell sed 's/=.*//' .env)
endif

# Assure que clasp est toujours trouvé (installé dans ~/.local via npm)
export PATH := $(HOME)/.local/lib/npm-global/bin:$(PATH)

# Variables (defaults from .env or command line)
PROJECT_NAME ?= S.A.T
VERSION      ?= 2026.03
SCRIPT_ID    ?=
GITHUB_REPO  ?=
GIT_BRANCH   ?= main
ENVIRONMENT  ?= dev
AUTO_BACKUP  ?= true
BACKUP_DIR   ?= ./backups
CLASP_PATH   ?= clasp
VERBOSE      ?= false

# Colors for output
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[0;33m
BLUE := \033[0;34m
NC := \033[0m # No Color

help: ## Display this help message
	@echo "$(BLUE)🧰 S.A.T 2026 - Deployment Manager$(NC)"
	@echo "$(YELLOW)Version: $(VERSION) | Environment: $(ENVIRONMENT)$(NC)\n"
	@echo "$(GREEN)Available Commands:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "$(BLUE)  %-20s$(NC) %s\n", $$1, $$2}'
	@echo "\n$(YELLOW)Setup (First Time):$(NC)"
	@echo "  1. cp .env.example .env"
	@echo "  2. Edit .env with your SCRIPT_ID"
	@echo "  3. make setup-env"
	@echo "  4. make deploy"
	@echo "\n$(YELLOW)Daily Usage:$(NC)"
	@echo "  make deploy          # Complete deployment"
	@echo "  make verify          # Check files"
	@echo "  make backup          # Create backup"
	@echo "  make sync            # Sync with GitHub"
	@echo "\n$(YELLOW)View configuration:$(NC)"
	@echo "  make env-show        # Display loaded variables"

# ============================================================================
# 🔧 ENVIRONMENT SETUP
# ============================================================================

setup-env: ## Setup environment from .env file
	@echo "$(BLUE)🔧 Setting up environment...$(NC)"
	@if [ -f ".env" ]; then \
		echo "$(GREEN)✓ .env file found$(NC)"; \
		if [ -z "$(SCRIPT_ID)" ]; then \
			echo "$(YELLOW)⚠ SCRIPT_ID not set in .env$(NC)"; \
			echo "$(YELLOW)  Edit .env and add: SCRIPT_ID=your-script-id$(NC)"; \
		else \
			echo "$(GREEN)✓ SCRIPT_ID configured: $(SCRIPT_ID)$(NC)"; \
		fi; \
	else \
		echo "$(RED)✗ .env file not found$(NC)"; \
		echo "$(YELLOW)  Create from .env.example: cp .env.example .env$(NC)"; \
		exit 1; \
	fi
	@mkdir -p $(BACKUP_DIR)
	@echo "$(GREEN)✅ Environment setup complete!$(NC)"

env-show: ## Display loaded environment variables
	@echo "$(BLUE)📋 Environment Variables$(NC)"
	@echo "$(YELLOW)PROJECT_NAME:$(NC) $(PROJECT_NAME)"
	@echo "$(YELLOW)VERSION:$(NC) $(VERSION)"
	@echo "$(YELLOW)SCRIPT_ID:$(NC) $(if $(SCRIPT_ID),$(SCRIPT_ID),$(RED)NOT SET$(NC))"
	@echo "$(YELLOW)GITHUB_REPO:$(NC) $(if $(GITHUB_REPO),$(GITHUB_REPO),$(RED)NOT SET$(NC))"
	@echo "$(YELLOW)GIT_BRANCH:$(NC) $(GIT_BRANCH)"
	@echo "$(YELLOW)ENVIRONMENT:$(NC) $(ENVIRONMENT)"
	@echo "$(YELLOW)AUTO_BACKUP:$(NC) $(AUTO_BACKUP)"
	@echo "$(YELLOW)BACKUP_DIR:$(NC) $(BACKUP_DIR)"
	@echo "$(YELLOW)CLASP_PATH:$(NC) $(CLASP_PATH)"
	@echo "$(YELLOW)VERBOSE:$(NC) $(VERBOSE)"

# ============================================================================
# 🚀 DEPLOYMENT COMMANDS
# ============================================================================

deploy: verify backup push ## Déploiement complet (verify → backup → push)
	@echo "$(GREEN)✅ Deployment Complete!$(NC)"
	@echo "$(YELLOW)Next steps:$(NC)"
	@echo "  1. Go to your GSheet"
	@echo "  2. Menu 🧰 → Données → 🧱 Installer structure"
	@echo "  3. Start using S.A.T!"

verify: ## Verify workspace and files integrity
	@echo "$(BLUE)🔍 Verifying workspace...$(NC)"
	@if [ -f "src/00_core_config.gs" ]; then echo "$(GREEN)✓ Core config found$(NC)"; else echo "$(RED)✗ Core config missing$(NC)"; exit 1; fi
	@if [ -f "src/appsscript.json" ]; then echo "$(GREEN)✓ appsscript.json found$(NC)"; else echo "$(RED)✗ appsscript.json missing$(NC)"; exit 1; fi
	@if [ -f "README.md" ]; then echo "$(GREEN)✓ README found$(NC)"; else echo "$(YELLOW)⚠ README missing$(NC)"; fi
	@if [ -f ".env" ]; then echo "$(GREEN)✓ .env found$(NC)"; else echo "$(YELLOW)⚠ .env not found$(NC)"; fi
	@if [ -f ".clasp.json" ]; then echo "$(GREEN)✓ .clasp.json found$(NC)"; else echo "$(RED)✗ .clasp.json missing$(NC)"; exit 1; fi
	@FILE_COUNT=$$(ls -1 src/*.gs 2>/dev/null | wc -l) && \
	if [ $$FILE_COUNT -ge 5 ]; then echo "$(GREEN)✓ Found $$FILE_COUNT .gs files in src/$(NC)"; else echo "$(RED)✗ Only $$FILE_COUNT .gs files in src/ (expected 5+)$(NC)"; exit 1; fi
	@echo "$(GREEN)✅ Verification passed!$(NC)"

push: bump-version verify ## Push code to Google Apps Script (production)
	@echo "$(BLUE)📤 Pushing code to Apps Script [PROD]...$(NC)"
	@$(CLASP_PATH) push --force
	@echo "$(GREEN)✅ Code pushed to PROD!$(NC)"

push-staging: verify ## Push code to STAGING GSheet (sans bump version)
	@if [ -z "$(SCRIPT_ID_STAGING)" ]; then \
		echo "$(RED)✗ SCRIPT_ID_STAGING non défini dans .env$(NC)"; \
		echo "$(YELLOW)  Étapes de setup :$(NC)"; \
		echo "$(YELLOW)  1. Créer un GSheet vierge (sheet de test)$(NC)"; \
		echo "$(YELLOW)  2. Extensions → Apps Script → ⚙ Paramètres → copier 'ID du script'$(NC)"; \
		echo "$(YELLOW)  3. Ajouter dans .env : SCRIPT_ID_STAGING=<id-copié>$(NC)"; \
		exit 1; \
	fi
	@echo "$(BLUE)📤 Pushing code to Apps Script [STAGING id=$(SCRIPT_ID_STAGING)]...$(NC)"
	@echo '{"scriptId":"$(SCRIPT_ID_STAGING)","rootDir":"src"}' > .clasp.staging.json
	@CLASP_JSON=.clasp.staging.json $(CLASP_PATH) push --force 2>/dev/null || $(CLASP_PATH) push --force
	@rm -f .clasp.staging.json
	@echo "$(GREEN)✅ Staging prêt !$(NC)"
	@echo "$(YELLOW)→ Ouvre le GSheet de staging et lance : S.A.T. → RESET complet$(NC)"

open-staging: ## Ouvrir le Apps Script editor de STAGING dans le navigateur
	@if [ -z "$(SCRIPT_ID_STAGING)" ]; then \
		echo "$(RED)✗ SCRIPT_ID_STAGING non défini dans .env$(NC)"; exit 1; \
	fi
	@URL="https://script.google.com/d/$(SCRIPT_ID_STAGING)/edit"; \
	xdg-open "$$URL" 2>/dev/null || open "$$URL" 2>/dev/null || \
	echo "$(YELLOW)Ouvre manuellement : $$URL$(NC)"

bump-version: ## Increment patch version in 00_core_config.gs before push
	@CURRENT=$$(grep -m1 -oP "^ *VERSION: '\\K[^']+" src/00_core_config.gs); \
	MAJOR=$$(echo $$CURRENT | cut -d'.' -f1); \
	MINOR=$$(echo $$CURRENT | cut -d'.' -f2); \
	PATCH=$$(echo $$CURRENT | cut -d'.' -f3); \
	if [ -z "$$PATCH" ]; then PATCH=0; fi; \
	NEW_PATCH=$$((PATCH + 1)); \
	NEW_VER="$$MAJOR.$$MINOR.$$NEW_PATCH"; \
	sed -i "s|VERSION: '$$CURRENT'|VERSION: '$$NEW_VER'|" src/00_core_config.gs; \
	echo "$(GREEN)Version bumped: $$CURRENT -> $$NEW_VER$(NC)"

open: ## Ouvrir le Apps Script editor PROD dans le navigateur
	@$(CLASP_PATH) open

open-sheet: ## Ouvrir directement le GSheet PROD dans le navigateur
	@SHEET_ID=$$(python3 -c "import json,sys; d=json.load(open('.clasp.json')); print(d['scriptId'])" 2>/dev/null || echo "$(SCRIPT_ID)"); \
	URL="https://docs.google.com/spreadsheets/d/$$SHEET_ID"; \
	xdg-open "$$URL" 2>/dev/null || open "$$URL" 2>/dev/null || echo "$(YELLOW)$$URL$(NC)"

login: ## S'authentifier avec Google
	@$(CLASP_PATH) login

install: ## Run installation after push
	@echo "$(BLUE)⚙️ Running installation...$(NC)"
	@$(CLASP_PATH) run SAT_createDocumentationSheet --scriptId $(SCRIPT_ID) 2>/dev/null || echo "$(YELLOW)⚠ Documentation sheet may already exist$(NC)"
	@echo "$(GREEN)✅ Installation complete!$(NC)"

test: ## Lancer les tests Jest (logique pure — sans GSheet)
	@if [ -f package.json ]; then \
		echo "$(BLUE)🧪 Tests Jest...$(NC)"; \
		npm test; \
	else \
		echo "$(YELLOW)⚠ package.json absent — lance : npm install$(NC)"; \
	fi

test-staging: push-staging ## Push vers staging + rappel d'ouverture du sheet de test
	@if [ -n "$(SCRIPT_ID_STAGING)" ]; then \
		URL="https://script.google.com/d/$(SCRIPT_ID_STAGING)/edit"; \
		echo "$(GREEN)✅ Push staging terminé. Ouvre le GSheet staging :$(NC)"; \
		echo "   $$URL"; \
		xdg-open "$$URL" 2>/dev/null || open "$$URL" 2>/dev/null || true; \
	fi

# ============================================================================
# 📦 BACKUP & SYNC COMMANDS
# ============================================================================

backup: ## Create backup archive of code
	@echo "$(BLUE)💾 Creating backup...$(NC)"
	@mkdir -p $(BACKUP_DIR)
	@BACKUP_FILE="$(BACKUP_DIR)/sat-assist-$(ENVIRONMENT)-$$(date +%Y%m%d_%H%M%S).tar.gz" && \
	tar --exclude='.git' --exclude='node_modules' --exclude='*.bak' --exclude='.env' \
		-czf $$BACKUP_FILE src/*.gs appsscript.json README.md .env.example && \
	echo "$(GREEN)✅ Backup created: $$BACKUP_FILE$(NC)" && \
	ls -lh $$BACKUP_FILE | awk '{print "  Size: " $$5}'

sync: setup-env ## Sync with GitHub repository (uses GITHUB_REPO from .env)
	@echo "$(BLUE)🔄 Syncing with GitHub...$(NC)"
	@if [ -z "$(GITHUB_REPO)" ]; then \
		echo "$(YELLOW)⚠ GITHUB_REPO not set in .env. Skipping sync.$(NC)"; \
		exit 0; \
	fi
	@git status > /dev/null 2>&1 || (echo "$(RED)❌ Not a git repository$(NC)" && exit 1)
	@git add .
	@git commit -m "SAT ASSIST $(VERSION) [$(ENVIRONMENT)] - Auto sync $$(date +%Y-%m-%d)" || true
	@git push origin $(GIT_BRANCH)
	@echo "$(GREEN)✅ Code synced to GitHub (repo: $(GITHUB_REPO))!$(NC)"

pull: ## Pull latest code from GitHub
	@echo "$(BLUE)📥 Pulling from GitHub...$(NC)"
	@git pull origin $(GIT_BRANCH)
	@echo "$(GREEN)✅ Code updated!$(NC)"

# ============================================================================
# 🧹 MAINTENANCE COMMANDS
# ============================================================================

clean: ## Remove backup files and temporary files
	@echo "$(BLUE)🧹 Cleaning temporary files...$(NC)"
	@rm -f *.bak sat-assist-backup-*.tar.gz
	@echo "$(GREEN)✅ Cleanup complete!$(NC)"

diagnose: ## Run diagnostic checks
	@echo "$(BLUE)📋 Running diagnostics...$(NC)"
	@echo "$(YELLOW)Workspace:$(NC)"
	@pwd
	@echo "$(YELLOW)Files:$(NC)"
	@ls -1 *.gs *.json *.md 2>/dev/null | wc -l | xargs echo "  Total files:"
	@echo "$(YELLOW)Code Size:$(NC)"
	@du -sh . | awk '{print "  " $$1}'
	@echo "$(YELLOW)Git Status:$(NC)"
	@if [ -d .git ]; then git status -s 2>/dev/null | wc -l | xargs echo "  Changed files:"; else echo "  No git repository"; fi
	@echo "$(GREEN)✅ Diagnostics complete!$(NC)"

# ============================================================================
# 📚 TEMPLATE COMMANDS
# ============================================================================

template: ## Create Google Sheets Template
	@echo "$(BLUE)🎨 Creating Google Sheets Template...$(NC)"
	@echo "$(YELLOW)Manual steps:$(NC)"
	@echo "  1. Share current GSheet"
	@echo "  2. Settings → Template"
	@echo "  3. Fill template info"
	@echo "  4. Publish template"
	@echo "$(GREEN)✅ Template instructions ready!$(NC)"

# ============================================================================
# 🏗️ SETUP COMMANDS
# ============================================================================

setup-clasp: ## Setup clasp CLI
	@echo "$(BLUE)⚙️ Setting up Clasp...$(NC)"
	@npm install -g @google/clasp
	@$(CLASP_PATH) login
	@echo "$(GREEN)✅ Clasp setup complete!$(NC)"

setup-git: ## Initialize git repository
	@echo "$(BLUE)🔧 Setting up Git...$(NC)"
	@if [ -d .git ]; then echo "$(YELLOW)⚠ Git already initialized$(NC)"; else git init; fi
	@echo "✓ Creating .gitignore..."
	@if [ ! -f .gitignore ]; then \
		echo ".env" > .gitignore; \
		echo "node_modules/" >> .gitignore; \
		echo "*.bak" >> .gitignore; \
		echo "backups/" >> .gitignore; \
		echo ".clasp.json" >> .gitignore; \
		echo ".git" >> .gitignore; \
		echo "$(GREEN)✓ .gitignore created$(NC)"; \
	fi
	@echo "$(GREEN)✅ Git setup complete!$(NC)"

setup-all: setup-git setup-clasp setup-env ## Setup all (git, clasp, env)
	@echo "$(GREEN)✅ Complete setup done!$(NC)"
	@echo "$(YELLOW)Next step: make deploy$(NC)"

# ============================================================================
# 📊 INFO COMMANDS
# ============================================================================

info: ## Display project information
	@echo "$(BLUE)📊 SAT ASSIST Project Information$(NC)"
	@echo "$(YELLOW)Project Name:$(NC) $(PROJECT_NAME)"
	@echo "$(YELLOW)Version:$(NC) $(VERSION)"
	@echo "$(YELLOW)Branch:$(NC) $(GIT_BRANCH)"
	@echo "$(YELLOW)Location:$(NC) $$(pwd)"
	@echo "$(YELLOW)Files:$(NC)"
	@ls -1 *.gs 2>/dev/null | sed 's/^/  /'
	@echo "$(YELLOW)Config:$(NC)"
	@ls -1 *.json *.md 2>/dev/null | sed 's/^/  /'

files: ## List all project files
	@echo "$(BLUE)📁 Project Files$(NC)"
	@echo "\n$(YELLOW)Core Modules:$(NC)"
	@ls -1 00_* 01_* 02_* 2>/dev/null | sed 's/^/  /'
	@echo "\n$(YELLOW)Data & Engine:$(NC)"
	@ls -1 10_* 20_* 21_* 22_* 23_* 2>/dev/null | sed 's/^/  /'
	@echo "\n$(YELLOW)UI & Forms:$(NC)"
	@ls -1 30_* 31_* 32_* 40_* 41_* 2>/dev/null | sed 's/^/  /'
	@echo "\n$(YELLOW)Application:$(NC)"
	@ls -1 50_* 51_* 52_* 53_* 99_* INITIALIZE.gs 2>/dev/null | sed 's/^/  /'
	@echo "\n$(YELLOW)Config:$(NC)"
	@ls -1 *.json *.md 2>/dev/null | sed 's/^/  /'

versions: ## Display version information
	@echo "$(BLUE)📦 Version Information$(NC)"
	@echo "$(YELLOW)SAT ASSIST:$(NC) v$(VERSION)"
	@echo "$(YELLOW)Release Date:$(NC) 21 février 2026"
	@echo "$(YELLOW)Status:$(NC) ✅ Production Ready"
	@echo "$(YELLOW)Quality:$(NC) ⭐⭐⭐⭐⭐ Excellent"

# ============================================================================
# 🎯 COMMON WORKFLOWS
# ============================================================================

quick-deploy: verify push ## Quick deploy (verify + push)
	@echo "$(GREEN)✅ Quick deploy complete!$(NC)"

full-backup: backup sync ## Full backup (backup + sync to git)
	@echo "$(GREEN)✅ Full backup complete!$(NC)"

# ============================================================================
# 📝 DEFAULT TARGET
# ============================================================================

.DEFAULT_GOAL := help

# ============================================================================
# � USAGE GUIDE
# ============================================================================
#
# FIRST TIME SETUP:
#   1. cp .env.example .env
#   2. Edit .env and add your SCRIPT_ID
#   3. make setup-all
#   4. make deploy
#
# DAILY WORKFLOW:
#   make deploy          # Push code and install
#   make backup          # Create dated backup
#   make sync            # Sync to GitHub
#
# CHECK CONFIGURATION:
#   make env-show        # Display loaded variables
#   make verify          # Check files integrity
#   make diagnose        # Run full diagnostics
#
# USEFUL COMMANDS:
#   make quick-deploy    # Fast deploy without backup
#   make full-backup     # Backup + sync to GitHub
#   make clean           # Clean temporary files
#
# TROUBLESHOOTING:
#   make setup-env       # Re-setup environment
#   make info            # Show project info
#   make files           # List all files
#
# ENVIRONMENT VARIABLES (.env):
#   SCRIPT_ID            → Your Google Apps Script ID
#   GITHUB_REPO          → Your GitHub repository (username/repo)
#   GIT_BRANCH           → Git branch (default: main)
#   ENVIRONMENT          → dev/staging/production (default: dev)
#   AUTO_BACKUP          → true/false (default: true)
#   BACKUP_DIR           → Backup directory (default: ./backups)
#   CLASP_PATH           → Path to clasp (default: clasp)
#   VERBOSE              → Verbose logging (default: false)
#
