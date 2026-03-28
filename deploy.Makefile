# ── Déploiement ────────────────────────────────────────────────────────────────

deploy: verify backup push ## Déploiement complet (verify → backup → push)
	@echo "$(GREEN)✅ Déploiement terminé !$(NC)"
	@echo "$(YELLOW)→ Ouvre ton GSheet : S.A.T. → Données → 🧱 Installer structure$(NC)"

verify: ## Vérifier l'intégrité des fichiers du projet
	@echo "$(BLUE)🔍 Vérification de l'espace de travail...$(NC)"
	@test -f src/00_core_config.gs    && echo "$(GREEN)✓ Core config$(NC)"         || (echo "$(RED)✗ Core config manquant$(NC)"; exit 1)
	@test -f src/appsscript.json      && echo "$(GREEN)✓ appsscript.json$(NC)"     || (echo "$(RED)✗ appsscript.json manquant$(NC)"; exit 1)
	@test -f .clasp.json              && echo "$(GREEN)✓ .clasp.json$(NC)"         || (echo "$(RED)✗ .clasp.json manquant$(NC)"; exit 1)
	@test -f README.md                && echo "$(GREEN)✓ README$(NC)"              || echo "$(YELLOW)⚠ README manquant$(NC)"
	@test -f .env                     && echo "$(GREEN)✓ .env$(NC)"               || echo "$(YELLOW)⚠ .env absent$(NC)"
	@FILE_COUNT=$$(ls -1 src/*.gs 2>/dev/null | wc -l) && \
	  [ $$FILE_COUNT -ge 5 ] && echo "$(GREEN)✓ $$FILE_COUNT fichiers .gs$(NC)" \
	  || (echo "$(RED)✗ Seulement $$FILE_COUNT .gs dans src/ (≥5 attendus)$(NC)"; exit 1)
	@echo "$(GREEN)✅ Vérification OK$(NC)"

push: verify ## Pousser le code vers Google Apps Script
	@echo "$(BLUE)📤 Push vers Apps Script...$(NC)"
	@$(CLASP_PATH) push --force
	@echo "$(GREEN)✅ Code poussé !$(NC)"
	@echo "$(YELLOW)Note : en CI, GitVersion injecte automatiquement la version.$(NC)"

push-staging(SCRIPT_ID_STAGING): verify ## Pousser vers le GSheet de staging
	@test -n "$(SCRIPT_ID_STAGING)" || (echo "$(RED)✗ SCRIPT_ID_STAGING non défini dans .env$(NC)"; exit 1)
	@echo "$(BLUE)📤 Push staging [id=$(SCRIPT_ID_STAGING)]...$(NC)"
	@echo '{"scriptId":"$(SCRIPT_ID_STAGING)","rootDir":"src"}' > .clasp.staging.json
	@CLASP_JSON=.clasp.staging.json $(CLASP_PATH) push --force 2>/dev/null || $(CLASP_PATH) push --force
	@rm -f .clasp.staging.json
	@echo "$(GREEN)✅ Staging prêt !$(NC)"

open: ## Ouvrir l'éditeur Apps Script dans le navigateur
	@$(CLASP_PATH) open

open-sheet: ## Ouvrir le Google Sheet dans le navigateur
	@SHEET_ID=$$(python3 -c "import json; d=json.load(open('.clasp.json')); print(d['scriptId'])" 2>/dev/null || echo "$(SCRIPT_ID)"); \
	URL="https://docs.google.com/spreadsheets/d/$$SHEET_ID"; \
	xdg-open "$$URL" 2>/dev/null || open "$$URL" 2>/dev/null || echo "$(YELLOW)$$URL$(NC)"

open-staging: ## Ouvrir le GSheet de staging dans le navigateur
	@test -n "$(SCRIPT_ID_STAGING)" || (echo "$(RED)✗ SCRIPT_ID_STAGING non défini$(NC)"; exit 1)
	@URL="https://script.google.com/d/$(SCRIPT_ID_STAGING)/edit"; \
	xdg-open "$$URL" 2>/dev/null || open "$$URL" 2>/dev/null || echo "$(YELLOW)$$URL$(NC)"

login: ## Authentification Google
	@$(CLASP_PATH) login

quick-deploy: verify push ## Déploiement rapide (sans backup)
	@echo "$(GREEN)✅ Déploiement rapide terminé !$(NC)"

test-staging: push-staging ## Push staging + url du GSheet de test
	@test -n "$(SCRIPT_ID_STAGING)" || exit 0
	@URL="https://script.google.com/d/$(SCRIPT_ID_STAGING)/edit"; \
	echo "$(GREEN)✅ Staging prêt : $$URL$(NC)"; \
	xdg-open "$$URL" 2>/dev/null || open "$$URL" 2>/dev/null || true

bump-version: ## [OBSOLÈTE] GitVersion gère la version automatiquement en CI
	@echo "$(YELLOW)⚠ bump-version est obsolète.$(NC)"
	@echo "$(YELLOW)  GitVersion calcule la version depuis l'historique git en CI.$(NC)"
	@echo "$(YELLOW)  Utilise Conventional Commits : feat: / fix: / chore:$(NC)"
