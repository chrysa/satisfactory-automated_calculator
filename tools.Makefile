# ── Tools & Maintenance ──────────────────────────────────────────────────────

test: ## Run Jest unit tests (pure logic, no GSheet required)
	@echo "$(BLUE)🧪 Running Jest tests...$(NC)"
	@test -f package.json && npm test || echo "$(YELLOW)⚠ package.json missing — run: npm install$(NC)"

parse-save(SAV): ## Parse a .sav file → production CSV + collectibles report
	@test -n "$(SAV)" || (echo "$(RED)✗ .sav file not specified$(NC)"; echo "$(YELLOW)Usage: make parse-save SAV=<path.sav> [OUT=output.csv]$(NC)"; exit 1)
	@echo "$(BLUE)📦 Parsing: $(SAV)$(NC)"
	@node scripts/parse-save.js "$(SAV)" $(if $(OUT),"$(OUT)",)

clean: ## Remove temporary files and old backups
	@echo "$(BLUE)🧹 Cleaning...$(NC)"
	@rm -f *.bak sat-assist-backup-*.tar.gz
	@echo "$(GREEN)✅ Cleanup complete!$(NC)"

diagnose: ## Run project diagnostics
	@echo "$(BLUE)📋 Diagnostics...$(NC)"
	@echo "$(YELLOW)Directory:$(NC)" && pwd
	@echo "$(YELLOW).gs files:$(NC)" && ls -1 src/*.gs 2>/dev/null | wc -l | xargs printf "  %s files\n"
	@echo "$(YELLOW)Project size:$(NC)" && du -sh . | awk '{print "  " $$1}'
	@echo "$(YELLOW)Git status:$(NC)" && \
	  { test -d .git && git status -s 2>/dev/null | wc -l | xargs printf "  %s changed files\n" \
	    || echo "  Not a git repository"; }
	@echo "$(GREEN)✅ Diagnostics complete!$(NC)"

info: ## Display project information
	@echo "$(BLUE)📊 Project Information — $(PROJECT_NAME)$(NC)"
	@echo "$(YELLOW)Name:$(NC)        $(PROJECT_NAME)"
	@echo "$(YELLOW)Version:$(NC)    $(VERSION)"
	@echo "$(YELLOW)Branch:$(NC)    $(GIT_BRANCH)"
	@echo "$(YELLOW)Directory:$(NC) $$(pwd)"
	@echo "$(YELLOW)GAS files:$(NC)" && ls -1 src/*.gs 2>/dev/null | sed 's/^/  /'

lint: ## Run pre-commit hooks on all files
	@echo "$(BLUE)🔍 Linting...$(NC)"
	@pre-commit run --all-files || true
	@echo "$(GREEN)✅ Lint complete!$(NC)"
