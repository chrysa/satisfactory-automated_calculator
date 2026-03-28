# ── Deployment ────────────────────────────────────────────────────────────────

deploy: verify backup push ## Full deployment (verify → backup → push)
	@echo "$(GREEN)✅ Deployment complete!$(NC)"
	@echo "$(YELLOW)→ Open your GSheet: S.A.T. → Data → 🧱 Install structure$(NC)"

verify: ## Check project file integrity
	@echo "$(BLUE)🔍 Verifying workspace...$(NC)"
	@test -f src/00_core_config.gs    && echo "$(GREEN)✓ Core config$(NC)"         || (echo "$(RED)✗ Core config missing$(NC)"; exit 1)
	@test -f src/appsscript.json      && echo "$(GREEN)✓ appsscript.json$(NC)"     || (echo "$(RED)✗ appsscript.json missing$(NC)"; exit 1)
	@test -f .clasp.json              && echo "$(GREEN)✓ .clasp.json$(NC)"         || (echo "$(RED)✗ .clasp.json missing$(NC)"; exit 1)
	@test -f README.md                && echo "$(GREEN)✓ README$(NC)"              || echo "$(YELLOW)⚠ README missing$(NC)"
	@test -f .env                     && echo "$(GREEN)✓ .env$(NC)"               || echo "$(YELLOW)⚠ .env absent$(NC)"
	@FILE_COUNT=$$(ls -1 src/*.gs 2>/dev/null | wc -l) && \
	  [ $$FILE_COUNT -ge 5 ] && echo "$(GREEN)✓ $$FILE_COUNT fichiers .gs$(NC)" \
	  || (echo "$(RED)✗ Only $$FILE_COUNT .gs files in src/ (≥5 expected)$(NC)"; exit 1)
	@echo "$(GREEN)✅ Verification passed!$(NC)"

push: verify ## Push code to Google Apps Script
	@echo "$(BLUE)📤 Pushing to Apps Script...$(NC)"
	@$(CLASP_PATH) push --force
	@echo "$(GREEN)✅ Code pushed!$(NC)"
	@echo "$(YELLOW)Note: on CI, GitVersion injects the version automatically.$(NC)"

push-staging(SCRIPT_ID_STAGING): verify ## Push to staging GSheet
	@test -n "$(SCRIPT_ID_STAGING)" || (echo "$(RED)✗ SCRIPT_ID_STAGING not set in .env$(NC)"; exit 1)
	@echo "$(BLUE)📤 Pushing to staging [id=$(SCRIPT_ID_STAGING)]...$(NC)"
	@echo '{"scriptId":"$(SCRIPT_ID_STAGING)","rootDir":"src"}' > .clasp.staging.json
	@CLASP_JSON=.clasp.staging.json $(CLASP_PATH) push --force 2>/dev/null || $(CLASP_PATH) push --force
	@rm -f .clasp.staging.json
	@echo "$(GREEN)✅ Staging ready!$(NC)"

open: ## Open the Apps Script editor in the browser
	@$(CLASP_PATH) open

open-sheet: ## Open the Google Sheet in the browser
	@SHEET_ID=$$(python3 -c "import json; d=json.load(open('.clasp.json')); print(d['scriptId'])" 2>/dev/null || echo "$(SCRIPT_ID)"); \
	URL="https://docs.google.com/spreadsheets/d/$$SHEET_ID"; \
	xdg-open "$$URL" 2>/dev/null || open "$$URL" 2>/dev/null || echo "$(YELLOW)$$URL$(NC)"

open-staging: ## Open the staging GSheet in the browser
	@test -n "$(SCRIPT_ID_STAGING)" || (echo "$(RED)✗ SCRIPT_ID_STAGING non défini$(NC)"; exit 1)
	@URL="https://script.google.com/d/$(SCRIPT_ID_STAGING)/edit"; \
	xdg-open "$$URL" 2>/dev/null || open "$$URL" 2>/dev/null || echo "$(YELLOW)$$URL$(NC)"

login: ## Authenticate with Google
	@$(CLASP_PATH) login

quick-deploy: verify push ## Fast deploy (no backup)
	@echo "$(GREEN)✅ Quick deploy complete!$(NC)"

test-staging: push-staging ## Push to staging + show GSheet URL
	@test -n "$(SCRIPT_ID_STAGING)" || exit 0
	@URL="https://script.google.com/d/$(SCRIPT_ID_STAGING)/edit"; \
	echo "$(GREEN)✅ Staging ready: $$URL$(NC)"; \
	xdg-open "$$URL" 2>/dev/null || open "$$URL" 2>/dev/null || true

bump-version: ## [DEPRECATED] GitVersion handles versioning automatically in CI
	@echo "$(YELLOW)⚠ bump-version is deprecated.$(NC)"
	@echo "$(YELLOW)  GitVersion computes the version from git history on CI.$(NC)"
	@echo "$(YELLOW)  Use Conventional Commits: feat: / fix: / chore:$(NC)"
