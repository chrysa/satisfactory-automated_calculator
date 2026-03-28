# ── Outils & Maintenance ──────────────────────────────────────────────────────

test: ## Lancer les tests Jest (logique pure, sans GSheet)
	@echo "$(BLUE)🧪 Tests Jest...$(NC)"
	@test -f package.json && npm test || echo "$(YELLOW)⚠ package.json absent — npm install requis$(NC)"

parse-save(SAV): ## Parser un fichier .sav → CSV production + rapport collectibles
	@test -n "$(SAV)" || (echo "$(RED)✗ Fichier .sav non spécifié$(NC)"; echo "$(YELLOW)Usage : make parse-save SAV=<chemin.sav> [OUT=sortie.csv]$(NC)"; exit 1)
	@echo "$(BLUE)📦 Parsing : $(SAV)$(NC)"
	@node scripts/parse-save.js "$(SAV)" $(if $(OUT),"$(OUT)",)

clean: ## Supprimer les fichiers temporaires et backups
	@echo "$(BLUE)🧹 Nettoyage...$(NC)"
	@rm -f *.bak sat-assist-backup-*.tar.gz
	@echo "$(GREEN)✅ Nettoyage terminé !$(NC)"

diagnose: ## Diagnostics complets du projet
	@echo "$(BLUE)📋 Diagnostics...$(NC)"
	@echo "$(YELLOW)Répertoire :$(NC)" && pwd
	@echo "$(YELLOW)Fichiers .gs :$(NC)" && ls -1 src/*.gs 2>/dev/null | wc -l | xargs printf "  %s fichiers\n"
	@echo "$(YELLOW)Taille du projet :$(NC)" && du -sh . | awk '{print "  " $$1}'
	@echo "$(YELLOW)Statut git :$(NC)" && \
	  { test -d .git && git status -s 2>/dev/null | wc -l | xargs printf "  %s fichiers modifiés\n" \
	    || echo "  Pas de dépôt git"; }
	@echo "$(GREEN)✅ Diagnostics terminés !$(NC)"

info: ## Informations sur le projet
	@echo "$(BLUE)📊 Informations — $(PROJECT_NAME)$(NC)"
	@echo "$(YELLOW)Nom :$(NC)        $(PROJECT_NAME)"
	@echo "$(YELLOW)Version :$(NC)    $(VERSION)"
	@echo "$(YELLOW)Branche :$(NC)    $(GIT_BRANCH)"
	@echo "$(YELLOW)Répertoire :$(NC) $$(pwd)"
	@echo "$(YELLOW)Fichiers GAS :$(NC)" && ls -1 src/*.gs 2>/dev/null | sed 's/^/  /'

lint: ## Linter et pre-commit (tous les fichiers)
	@echo "$(BLUE)🔍 Lint & pre-commit...$(NC)"
	@pre-commit run --all-files || true
	@echo "$(GREEN)✅ Lint terminé$(NC)"
