# ── Backup & Synchronisation ───────────────────────────────────────────────────

backup: ## Créer une archive de sauvegarde du code
	@echo "$(BLUE)💾 Création du backup...$(NC)"
	@mkdir -p $(BACKUP_DIR)
	@BACKUP_FILE="$(BACKUP_DIR)/sat-$(ENVIRONMENT)-$$(date +%Y%m%d_%H%M%S).tar.gz" && \
	tar --exclude='.git' --exclude='node_modules' --exclude='*.bak' --exclude='.env' \
		-czf $$BACKUP_FILE src/*.gs appsscript.json README.md .env.example 2>/dev/null && \
	echo "$(GREEN)✅ Backup : $$BACKUP_FILE$(NC)" && \
	ls -lh $$BACKUP_FILE | awk '{print "  Taille : " $$5}'

sync: setup-env ## Synchroniser avec GitHub (GITHUB_REPO requis dans .env)
	@echo "$(BLUE)🔄 Synchronisation avec GitHub...$(NC)"
	@test -n "$(GITHUB_REPO)" || (echo "$(YELLOW)⚠ GITHUB_REPO non défini dans .env$(NC)"; exit 0)
	@git status > /dev/null 2>&1 || (echo "$(RED)❌ Pas un dépôt git$(NC)"; exit 1)
	@git add .
	@git commit -m "chore: auto-sync $(VERSION) [$(ENVIRONMENT)] $$(date +%Y-%m-%d)" || true
	@git push origin $(GIT_BRANCH)
	@echo "$(GREEN)✅ Synchronisé vers GitHub !$(NC)"

pull: ## Tirer les dernières modifications depuis GitHub
	@echo "$(BLUE)📥 Tirage depuis GitHub...$(NC)"
	@git pull origin $(GIT_BRANCH)
	@echo "$(GREEN)✅ Code mis à jour !$(NC)"

full-backup: backup sync ## Backup complet (archive + sync git)
	@echo "$(GREEN)✅ Backup complet terminé !$(NC)"
