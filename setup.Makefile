# ── Setup & Configuration ─────────────────────────────────────────────────────

setup-env: ## Configurer l'environnement depuis .env
	@echo "$(BLUE)🔧 Configuration de l'environnement...$(NC)"
	@test -f .env || (echo "$(RED)✗ .env absent — créer depuis .env.example : cp .env.example .env$(NC)"; exit 1)
	@echo "$(GREEN)✓ .env trouvé$(NC)"
	@test -n "$(SCRIPT_ID)" && echo "$(GREEN)✓ SCRIPT_ID configuré$(NC)" \
	  || echo "$(YELLOW)⚠ SCRIPT_ID non défini dans .env$(NC)"
	@mkdir -p $(BACKUP_DIR)
	@echo "$(GREEN)✅ Environnement configuré !$(NC)"

env-show: ## Afficher les variables d'environnement chargées
	@echo "$(BLUE)📋 Variables d'environnement$(NC)"
	@echo "$(YELLOW)PROJECT_NAME:$(NC) $(PROJECT_NAME)"
	@echo "$(YELLOW)VERSION:$(NC)      $(VERSION)"
	@echo "$(YELLOW)SCRIPT_ID:$(NC)    $(if $(SCRIPT_ID),$(SCRIPT_ID),$(RED)NON DÉFINI$(NC))"
	@echo "$(YELLOW)GITHUB_REPO:$(NC)  $(if $(GITHUB_REPO),$(GITHUB_REPO),$(RED)NON DÉFINI$(NC))"
	@echo "$(YELLOW)GIT_BRANCH:$(NC)   $(GIT_BRANCH)"
	@echo "$(YELLOW)ENVIRONMENT:$(NC)  $(ENVIRONMENT)"
	@echo "$(YELLOW)BACKUP_DIR:$(NC)   $(BACKUP_DIR)"
	@echo "$(YELLOW)CLASP_PATH:$(NC)   $(CLASP_PATH)"

setup-clasp: ## Installer et configurer clasp CLI
	@echo "$(BLUE)⚙️ Configuration de Clasp...$(NC)"
	@npm install -g @google/clasp
	@$(CLASP_PATH) login
	@echo "$(GREEN)✅ Clasp configuré !$(NC)"

setup-git: ## Initialiser le dépôt git + .gitignore
	@echo "$(BLUE)🔧 Configuration Git...$(NC)"
	@test -d .git && echo "$(YELLOW)⚠ Git déjà initialisé$(NC)" || git init
	@test -f .gitignore || { \
	  printf '.env\nnode_modules/\n*.bak\nbackups/\n.clasp.json\n' > .gitignore; \
	  echo "$(GREEN)✓ .gitignore créé$(NC)"; }
	@echo "$(GREEN)✅ Git configuré !$(NC)"

install: ## Lancer l'installation post-push dans GAS
	@echo "$(BLUE)⚙️ Lancement de l'installation...$(NC)"
	@$(CLASP_PATH) run SAT_createDocumentationSheet --scriptId $(SCRIPT_ID) 2>/dev/null \
	  || echo "$(YELLOW)⚠ Feuille de doc déjà existante$(NC)"
	@echo "$(GREEN)✅ Installation terminée !$(NC)"

setup-all: setup-git setup-clasp setup-env ## Tout configurer (git + clasp + env)
	@echo "$(GREEN)✅ Configuration complète !$(NC)"
	@echo "$(YELLOW)Prochaine étape : make deploy$(NC)"

setup-precommit: ## Installer les hooks pre-commit
	@echo "$(BLUE)🔧 Installation pre-commit...$(NC)"
	@pip install pre-commit
	@pre-commit install
	@echo "$(GREEN)✅ pre-commit actif !$(NC)"
