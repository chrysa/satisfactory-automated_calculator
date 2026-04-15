# Changelog

All notable changes to S.A.T. are documented here.
Format: [Conventional Commits](https://www.conventionalcommits.org/) | [Keep a Changelog](https://keepachangelog.com/)

## [3.6.0-57] — 2026-04-15


### Features

- **sa-34**: Consumption optimizer — power waste report and idle detector (#53) ([`0e153db`](0e153db151e25b549fdda1fe6f4413ef51503dcc))
## [3.6.0-56] — 2026-04-12


### CI/CD

- Add FUNDING.yml (sponsoring) ([`8c2b657`](8c2b657e63ef4ffdb6957e294c5ead5219415b91))
## [3.6.0-55] — 2026-04-12


### CI/CD

- Add FUNDING.yml (sponsoring) ([`d411759`](d4117597ccc8a4f2630df648b2ce700cf5ed2772))

### Features

- **sa**: Add Python FastAPI backend foundation (M-SA #28) (#43) ([`748714d`](748714d191085b6a7d56197640f8253aa58b600a))
- **sa**: Add parse-save-json.js — .sav → WorldState JSON parser (closes #44) ([`8be4af7`](8be4af711a526a61cc49b3f71a7f1d28b30ca292))
- **sa**: Add GET /api/v1/kpis — power + factory KPI snapshot (closes #45) ([`2bd06f2`](2bd06f2fc5b42eab43cc16b5208b6f29d78ff1f1))
- **sa**: Add sat_watcher.py — local .sav polling service (closes #31) ([`1c0d39a`](1c0d39a8ecbd02aefdedcba574331a0aad5faa2b))
- **sa**: Add GET /api/v1/analyze/bottlenecks — factory bottleneck detector (closes #33 #46) ([`a8fec22`](a8fec22b27058266443489983a0757ee4b4f1a65))

### Miscellaneous

- Add Python __pycache__ and build artifacts to .gitignore ([`9751ca8`](9751ca833592f9be042fe80ac16ba44688d60ad9))
## [3.6.0-48] — 2026-04-06


### Documentation

- **arch**: Add ADR-001 and M-SA save analysis strategy (#42) ([`1c58495`](1c5849505f882e64a06b3e94a37bc726a554da43))
## [3.6.0-47] — 2026-04-06


### Miscellaneous

- **ci**: Bump actions/upload-artifact from 4 to 7 (#38) ([`e1573c8`](e1573c872622e10e71332ba8264f898a22217974))
- **ci**: Bump actions/github-script from 7 to 8 (#39) ([`1c87671`](1c87671ffa2fc2ccea6ad12f96bb885a28a50dd2))
- **ci**: Bump actions/labeler from 5 to 6 (#40) ([`8d056a9`](8d056a9e59a98e7fe1ce6fd940bde3f108fb4d89))
- **ci**: Bump actions/download-artifact from 4 to 8 (#41) ([`b6475da`](b6475da486d4dc0538cddc38494a48f7a4fedd6d))
## [3.6.0-43] — 2026-04-03


### Miscellaneous

- Standardize CI action refs, remove pre-commit-hooks-changelog (#9) ([`0bbf912`](0bbf912dc8c70e48989e684a15dad1a6bb0a978a))
- Add dependencies-action, PR labeler, and CI standards ([`955a5cc`](955a5cc4945e6749b7f482b6276a02045a96972e))
- Add CLAUDE.md with project context ([`fc6b878`](fc6b878de639f10f3597276e60535b47a176baf6))
- **ci**: Bump actions/checkout from 4 to 6 ([`e18a29f`](e18a29f09016124dcbaabab5750829f3d6e7fdfd))
- **ci**: Bump actions/setup-node from 4 to 6 ([`9f6f4fc`](9f6f4fca0254621df62e21e8b252f4c38d68c01f))
- Standardize repo configuration ([`a0b9a5a`](a0b9a5a13e1eca8d47c059dc81f8c1a1d05ca538))
## [3.6.0-37] — 2026-03-29


### Miscellaneous

- Add copilot-instructions and instruction files (#10) ([`dbe83e6`](dbe83e6f4462bb199a7ea505d725e1f8cd180165))
## [3.6.0-35] — 2026-03-28


### Bug Fixes

- **ci**: Fix CI failure + translate all files to English + update README ([`c4891fc`](c4891fcd7e2d6d5427b9d6711836d9a3622993ee))
## [3.6.0-31] — 2026-03-28


### Bug Fixes

- **dashboard**: Move chart buffer from row 66 to row 500, wipe rows 20-600 on refresh ([`389a488`](389a4885d0e2ef11f9999e2dc23d2a4558f8eb17))
- **floors**: Hypothesis B — elevator drives height/level calculation ([`9576124`](957612447cdb7b2c36f9371e152bd7d6d9149e48))
- Disable yaml-sorter (upstream bug chrysa/pre-commit-tools#37) ([`1ece032`](1ece032dbbb42aeb8c5191e3b82a0c07d14149ba))
## [3.6.0-30] — 2026-03-28


### Features

- Fix 6 issues — production fill, floor detection, elec sub-lines, charts, changelog, parasitic data ([`56c8a10`](56c8a10373365e311ed68be2b8506c4ab7d96065))
## [3.6.0-29] — 2026-03-28


### Bug Fixes

- **ux**: Refonte rapport import — % collectibles, affichage limaces, ergonomie sidebar ([`f93d137`](f93d1372f8df703c5f52be39277b93a1aeb26346))
- **ci**: Add next-version fallback in GitVersion.yml to fix undefined output when no tag exists ([`ed71c35`](ed71c3519da62a7af342286b029c1c8cb030579d))
- **ci**: Migrate GitVersion.yml to v6 syntax ([`bfc5f7d`](bfc5f7d93c41a814397ecf6b85572a12fbe3446a))
- **ci**: Sed must not overwrite GAME_VERSION when injecting SAT app VERSION ([`58e6374`](58e63749fd8a08fa0b969d3265b1406c54395aa6))
- **ci**: Grant pull-requests:read and pass GITHUB_TOKEN to git-cliff ([`b6b5d7a`](b6b5d7a35e3744f1935a823317975543293637b3))

### CI/CD

- Split workflow into lint.yml (PR) and deploy.yml (push main) ([`c8ba1ef`](c8ba1ef660470151c195624feb29621c28a6b626))
- **lint**: Add workflow_dispatch trigger ([`24a556c`](24a556c48cb4c3dda5fca260f45b9100a78e9a05))

### Features

- Auto versioning via GitVersion + git-cliff, fix collectibles, English docs ([`293dbd8`](293dbd816b144c7013ebdc4c2cc23ba96d5325ab))

### Miscellaneous

- Add dependabot, pre-commit config, rename user guide ([`3efb5d1`](3efb5d16fcab9baf6499b68149f2aeb8ce9b9b32))
- **deps**: Bump jest in the dev-dependencies group ([`4d4315c`](4d4315c919be65a4003b8aa5f1d604657bf3da09))
- **pre-commit**: Bump https://github.com/pre-commit/pre-commit-hooks ([`995b09b`](995b09bd2fa52c359af4fbbdcf2c2f753cd87a7f))
- **ci**: Bump actions/checkout from 4 to 6 ([`67e29dc`](67e29dc7cd980ca57da9671145077d159f03e4aa))
- **ci**: Bump actions/setup-node from 4 to 6 ([`7216e4b`](7216e4beafacc3de189e408652853598eaaeb7d6))
- **ci**: Bump gittools/actions from 3 to 4 ([`d8ebf5b`](d8ebf5bb57401600e0b36afaed2e347a1ab7b749))
- **pre-commit**: Add .pre-commit-hooks.yaml + check-gs-syntax hook ([`d5be877`](d5be8770f82006ae7ad623891bd1ba3ecbeea998))

### Refactor

- Sous-dossiers par version + couleurs onglets + mise en forme conditionnelle Production ([`ccc2633`](ccc26338678cbd3688399a24510eec3dbe3387d1))
## [3.5.5] — 2026-03-27


### Bug Fixes

- Syntax error in 50_assistant.gs (missing comma) + ci: agnostic auth step with CLASP_SCRIPT_ID guard ([`2c8776f`](2c8776fad0a21ebda998053fecae9614d7bf7622))
- **import**: Cluster z-values by proximity instead of fixed 400cm grid to avoid floor over-detection ([`c8ef9bc`](c8ef9bc70188efcc307aab9f6f4d7355537f7e5a))
- Populate Etages on import, fix trigger setup from simple onOpen, exclude OFF machines, bump v3.5.5 ([`5a28b16`](5a28b16a89b3eda3ccddb5a3844f87bca74282c8))

### CI/CD

- Remove all production references, rename job to deploy ([`35cb0cc`](35cb0ccb46623d59f6170852d3e72b166811c376))
- Merge lint into deploy.yml, fix paths, drop obsolete checks ([`f75a84c`](f75a84c6acd5dce0babdecdd3c3ddee1ced436f3))

### Features

- Auto-open assistant via installable trigger, import button in sidebar, version popup ([`74d1430`](74d1430a01741f2056cfdd8482004534951efbce))
## [3.5.4] — 2026-03-27


### Bug Fixes

- **dashboard**: Charts out of data tables, fix row heights, buf=50 ([`ed05ce5`](ed05ce5ff158bd9b0721fdd7d8c07b880f2929c9))
- **dashboard**: Merge cols for tips/changelog, auto bump-version on push ([`4f73396`](4f73396b83799031a1fc22cf27da27474699df53))
- **ux**: Largeurs colonnes, Machine lecture seule, Somersloops actifs v3.5.0 ([`c98d466`](c98d4662ef1e2a5cba4c6159f2d0a1375cf987cc))
- **ci**: Use printf for clasprc.json to avoid JSON corruption, validate before push ([`cc933bf`](cc933bf167c3bd8645a6df76c955841e436fa101))
- **import**: Rename 51_import.html → 51_import_ui.html (clasp name conflict)" ([`20ee9bb`](20ee9bbe2c8246d08435ac26ca53163b05cc1195))
- **ci**: Guard against empty CLASPRC_JSON in production step ([`d6becb7`](d6becb71993bfef1de55fd71238c7520b352bbc6))
- **ci**: Grant contents:write permission for release job ([`c843046`](c84304660b46f7c55ac47724513e270b12efbd8e))

### CI/CD

- Staging/prod split deploy, make push-staging, make test-staging ([`a87ad8e`](a87ad8ea7daba7008b820e773510bf8312552e18))
- Add release job to deploy workflow on push to main ([`7354ea5`](7354ea5f6c2281f61af00356d668162854ead797))
- Simplify workflow to single environment ([`c5fa031`](c5fa031f0abc34b4cb1668282f59ea24b02f48a1))

### Documentation

- Update README/GUIDE/NOTION to v3.4.2, add new features, remove old arch refs ([`d521688`](d5216880025e1149d0a03b7176ceea13967c76c2))

### Features

- V3.3 — ergonomics, automation, fixes ([`0455b12`](0455b120d1ac99c090a1715a76bc9fc838e1ce45))
- **v3.4**: Forms, stage sizes, machine dimensions, conventions ([`97e25e4`](97e25e404fd57afe893fd069ae3da7d7cdf3df11))
- **dashboard**: Elec max MW at 250% OC, backup/restore on reinstall, dynamic changelog version ([`d4f1547`](d4f1547bf63ddde6fc69551f7282bd58a339f3dc))
- **solver**: Solveur récursif, phases jeu, feuille Objectifs, stats dashboard ([`b8a9fd0`](b8a9fd09af2148e6a509aeedc8509a7b3522b702))
- **floors**: Dimensions étages depuis wiki — hauteur/larg/long, ascenseur, aération, isolement nucléaire v3.4.8 ([`9112461`](91124615f27c81e3368522d00583e37747a4481d))
- **form**: Machine d\u00e9duite de la recette + Somersloops dynamiques v3.4.9 ([`4bf4650`](4bf4650fe3a2f41d23552e6a77a317a1df7652b2))
- **assistant**: Smart sidebar with actionable suggestions (bottleneck fix, OC normalize, phase coaching) ([`845225e`](845225e5e34bc1fec10423a1c663ac10a0ea835a))
- Save import sidebar + parse-save script + docs update ([`395c8f6`](395c8f61462265d2520a76c88ade0c1f6b7a059b))
- Open assistant sidebar on spreadsheet open ([`80ec529`](80ec529d42c05577a3648db75a99ba1af4878d06))

### Miscellaneous

- Bump version to v3.5.1, update changelog with assistant features ([`eb50a3a`](eb50a3ab7854c6782d7ed68dbf117fbd0e99e2e6))
- Remove stale 51_import.html + version bump 3.5.4 ([`757651b`](757651b08acba99ddc7866a8c9905fbb6a1bfe58))

