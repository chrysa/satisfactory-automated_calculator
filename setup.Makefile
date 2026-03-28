# ── Setup & Configuration ─────────────────────────────────────────────────────

setup-env: ## Configure environment from .env
	@echo "$(BLUE)🔧 Configuring environment...$(NC)"
	@test -f .env || (echo "$(RED)✗ .env missing — create from .env.example: cp .env.example .env$(NC)"; exit 1)
	@echo "$(GREEN)✓ .env found$(NC)"
	@test -n "$(SCRIPT_ID)" && echo "$(GREEN)✓ SCRIPT_ID configured$(NC)" \
	  || echo "$(YELLOW)⚠ SCRIPT_ID not set in .env$(NC)"
	@mkdir -p $(BACKUP_DIR)
	@echo "$(GREEN)✅ Environment configured!$(NC)"

env-show: ## Display loaded environment variables
	@echo "$(BLUE)📋 Environment Variables$(NC)"
	@echo "$(YELLOW)PROJECT_NAME:$(NC) $(PROJECT_NAME)"
	@echo "$(YELLOW)VERSION:$(NC)      $(VERSION)"
	@echo "$(YELLOW)SCRIPT_ID:$(NC)    $(if $(SCRIPT_ID),$(SCRIPT_ID),$(RED)NOT SET$(NC))"
	@echo "$(YELLOW)GITHUB_REPO:$(NC)  $(if $(GITHUB_REPO),$(GITHUB_REPO),$(RED)NOT SET$(NC))"
	@echo "$(YELLOW)GIT_BRANCH:$(NC)   $(GIT_BRANCH)"
	@echo "$(YELLOW)ENVIRONMENT:$(NC)  $(ENVIRONMENT)"
	@echo "$(YELLOW)BACKUP_DIR:$(NC)   $(BACKUP_DIR)"
	@echo "$(YELLOW)CLASP_PATH:$(NC)   $(CLASP_PATH)"

setup-clasp: ## Install and configure clasp CLI
	@echo "$(BLUE)⚙️ Setting up Clasp...$(NC)"
	@npm install -g @google/clasp
	@$(CLASP_PATH) login
	@echo "$(GREEN)✅ Clasp configured!$(NC)"

setup-git: ## Initialize git repository and .gitignore
	@echo "$(BLUE)🔧 Setting up Git...$(NC)"
	@test -d .git && echo "$(YELLOW)⚠ Git already initialized$(NC)" || git init
	@test -f .gitignore || { \
	  printf '.env\nnode_modules/\n*.bak\nbackups/\n.clasp.json\n' > .gitignore; \
	  echo "$(GREEN)✓ .gitignore created$(NC)"; }
	@echo "$(GREEN)✅ Git configured!$(NC)"

install: ## Run post-push installation in GAS
	@echo "$(BLUE)⚙️ Running installation...$(NC)"
	@$(CLASP_PATH) run SAT_createDocumentationSheet --scriptId $(SCRIPT_ID) 2>/dev/null \
	  || echo "$(YELLOW)⚠ Documentation sheet may already exist$(NC)"
	@echo "$(GREEN)✅ Installation complete!$(NC)"

setup-all: setup-git setup-clasp setup-env ## Set up everything (git + clasp + env)
	@echo "$(GREEN)✅ Full setup complete!$(NC)"
	@echo "$(YELLOW)Next step: make deploy$(NC)"

setup-precommit: ## Install pre-commit hooks
	@echo "$(BLUE)🔧 Installing pre-commit...$(NC)"
	@pip install pre-commit
	@pre-commit install
	@echo "$(GREEN)✅ pre-commit active!$(NC)"
