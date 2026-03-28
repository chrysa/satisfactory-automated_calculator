# ── Backup & Sync ───────────────────────────────────────────────────

backup: ## Create a dated backup archive of the source code
	@echo "$(BLUE)💾 Creating backup...$(NC)"
	@mkdir -p $(BACKUP_DIR)
	@BACKUP_FILE="$(BACKUP_DIR)/sat-$(ENVIRONMENT)-$$(date +%Y%m%d_%H%M%S).tar.gz" && \
	tar --exclude='.git' --exclude='node_modules' --exclude='*.bak' --exclude='.env' \
		-czf $$BACKUP_FILE src/*.gs appsscript.json README.md .env.example 2>/dev/null && \
	echo "$(GREEN)✅ Backup: $$BACKUP_FILE$(NC)" && \
	ls -lh $$BACKUP_FILE | awk '{print "  Size: " $$5}'

sync: setup-env ## Sync with GitHub (requires GITHUB_REPO in .env)
	@echo "$(BLUE)🔄 Syncing with GitHub...$(NC)"
	@test -n "$(GITHUB_REPO)" || (echo "$(YELLOW)⚠ GITHUB_REPO not set in .env$(NC)"; exit 0)
	@git status > /dev/null 2>&1 || (echo "$(RED)❌ Not a git repository$(NC)"; exit 1)
	@git add .
	@git commit -m "chore: auto-sync $(VERSION) [$(ENVIRONMENT)] $$(date +%Y-%m-%d)" || true
	@git push origin $(GIT_BRANCH)
	@echo "$(GREEN)✅ Synced to GitHub!$(NC)"

pull: ## Pull latest changes from GitHub
	@echo "$(BLUE)📥 Pulling from GitHub...$(NC)"
	@git pull origin $(GIT_BRANCH)
	@echo "$(GREEN)✅ Code updated!$(NC)"

full-backup: backup sync ## Full backup (archive + git sync)
	@echo "$(GREEN)✅ Full backup complete!$(NC)"
