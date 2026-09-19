import type { Dictionary } from "./types";

export const en: Dictionary = {
  "app.name": "Hoflayn",
  "app.description":
    "The AI-powered workbench for handmade and boutique makers.",

  "locale.tr": "Türkçe",
  "locale.en": "English",

  "landing.title": "The AI workbench for your studio",
  "landing.subtitle":
    "Product photos, descriptions and catalogues — built for makers, without the busywork.",
  "landing.relation":
    "This app is the workbench for the hoflayn.com marketplace. It is studio tools, not the public shop. If you already sell there, use the same email.",
  "landing.cta.signup": "Start for free",
  "landing.cta.login": "Sign in",
  "landing.cta.marketplace": "Browse hoflayn.com",

  "auth.email.label": "Email",
  "auth.email.placeholder": "you@studio.com",
  "auth.password.label": "Password",
  "auth.or": "or",
  "auth.google": "Continue with Google",

  "auth.login.title": "Sign in",
  "auth.login.description": "Back to your studio workbench — Hoflayn",
  "auth.login.submit": "Sign in",
  "auth.login.submitting": "Signing in…",
  "auth.login.forgot": "Forgot my password",
  "auth.login.noAccount": "No account yet?",
  "auth.login.signupLink": "Sign up",

  "auth.signup.title": "Create account",
  "auth.signup.description":
    "Your first {credits} credits are on us — process a product photo right away",
  "auth.signup.name.label": "Your name",
  "auth.signup.name.placeholder": "Alex",
  "auth.signup.submit": "Sign up",
  "auth.signup.submitting": "Saving…",
  "auth.signup.hasAccount": "Already have an account?",
  "auth.signup.loginLink": "Sign in",
  "auth.signup.success":
    "You're registered. If email confirmation is on, check your inbox; otherwise you can sign in now.",
  "auth.signup.explore": "Explore without signing in",
  "auth.invite.check": "Check this email",

  "auth.forgot.title": "Forgot my password",
  "auth.forgot.description":
    "We'll send a reset link to your invited email address.",
  "auth.forgot.submit": "Send reset link",
  "auth.forgot.submitting": "Sending…",
  "auth.forgot.backToLogin": "Back to sign in",
  "auth.forgot.success":
    "If your address is on the list, a reset link is on its way. Check your inbox.",

  "auth.reset.title": "New password",
  "auth.reset.description":
    "If you arrived from the email link, set your new password.",
  "auth.reset.password.label": "New password",
  "auth.reset.confirm.label": "Repeat password",
  "auth.reset.submit": "Update password",
  "auth.reset.submitting": "Saving…",
  "auth.reset.expiredPrefix": "If the link has expired,",
  "auth.reset.expiredLink": "request a new one",

  "auth.error.invalidForm": "Invalid form",
  "auth.error.invalidEmail": "Enter a valid email address",
  "auth.error.passwordMin": "Password must be at least {min} characters",
  "auth.error.passwordMismatch": "Passwords don't match",
  "auth.error.noSession":
    "No session found. Open the reset link from your email again.",
  "auth.error.google":
    "Google sign-in could not be started. Try again in a moment.",
  "auth.error.callback":
    "The Google session could not be verified. Try again.",

  "beta.badge": "Closed beta",
  "beta.inviteRequired": "Invited email required",
  "beta.problem": "Running into trouble?",
  "beta.notInvited": "This email isn't on the invite list. For support, reach",
  "beta.mail.subject": "[Hoflayn Beta] Invite / support",
  "beta.mail.body": "Hi,\n\nAbout the closed beta:\n",
  "beta.error.closed":
    "Closed beta registrations are paused right now. Write to {support} for details.",
  "beta.error.exhausted":
    "The closed beta is at capacity. Write to {support} for a new invite.",
  "beta.error.notInvited":
    "Hoflayn is currently an invite-only closed beta. This email isn't on the list. Write to {support} for an invite.",

  "settings.language.title": "Language",
  "settings.language.description":
    "Interface language. Your choice is saved to your account and follows you across devices.",

  "nav.dashboard": "Dashboard",
  "nav.studio": "Studio",
  "nav.products": "Products",
  "nav.billing": "Plan",
  "nav.settings": "Settings",
  "nav.signOut": "Sign out",

  "error.eyebrow": "Something went wrong",
  "error.title": "Couldn't load your workbench",
  "error.description":
    "Try refreshing the page. If it keeps happening, sign out and back in.",
  "error.retry": "Try again",

  "credits.insufficient":
    "Not enough credits (needed: {required}, available: {available})",

  "welcome.eyebrow": "Closed beta · first steps",
  "welcome.title": "Set up your workbench",
  "welcome.progress": "{done}/{total} done",
  "welcome.step.studioPhoto.title": "Process a product photo",
  "welcome.step.studioPhoto.hint": "remove_bg or white_bg in Studio",
  "welcome.step.productCreated.title": "Add a product",
  "welcome.step.productCreated.hint":
    "Create the first card in your catalogue",
  "welcome.step.captionGenerated.title": "Generate an Instagram caption",
  "welcome.step.captionGenerated.hint":
    "Generate and copy it from a product page",

  "dashboard.eyebrow": "Workbench",
  "dashboard.slugLabel": "Slug",
  "dashboard.credits.title": "Credit balance",
  "dashboard.credits.costs":
    "remove_bg = {removeBg} · white_bg = {whiteBg} · description = {description} · Instagram = {caption} credits",
  "dashboard.credits.cta": "Plan and credits",
  "dashboard.usage.title.one": "Last {count} day",
  "dashboard.usage.title.other": "Last {count} days",
  "dashboard.usage.description":
    "AI cost for your studio (estimated provider USD) and credits spent.",
  "dashboard.usage.credits": "Credits",
  "dashboard.usage.usd": "~USD",
  "dashboard.usage.jobs": "Jobs",
  "dashboard.usage.succeeded": "Succeeded",
  "dashboard.studio.title": "AI Photo Studio",
  "dashboard.studio.description":
    "Upload a product photo, clear the background or generate a white backdrop.",
  "dashboard.studio.cta": "Open Studio",
  "dashboard.testJob.title": "AI backbone (test)",
  "dashboard.testJob.description":
    "Smoke test for credits and the job lifecycle using the mock provider.",
  "dashboard.testJob.submit": "Test AI job (remove_bg · mock)",
  "dashboard.testJob.submitting": "Processing…",
  "dashboard.testJob.result":
    "Job {status}: {jobId}… · provider={provider} · credits={credits}",
  "dashboard.testJob.error.noDatabase":
    "DATABASE_URL isn't set. Add your Supabase connection to .env.local.",
  "dashboard.jobs.empty.title": "No AI jobs yet",
  "dashboard.jobs.empty.description":
    "Create a product and generate an AI description or Instagram caption, or process a photo in Studio.",
  "dashboard.jobs.empty.action": "Go to products",
  "dashboard.support.description":
    "We're still in beta — tell us anything you get stuck on and we'll come back fast.",
  "dashboard.support.cta": "Contact support",
  "dashboard.support.mail.subject": "[Hoflayn Beta] Support — {slug}",
  "dashboard.support.mail.body":
    "Studio: {name}\nUser: {email}\n\nDescribe the problem or idea:\n",

  "products.eyebrow": "Catalogue",
  "products.new": "New product",
  "products.backToList": "Back to list",
  "products.card.title": "Studio products",
  "products.card.description":
    "Your SaaS catalogue — push it to Hoflayn Web in one click.",
  "products.empty.title": "No products yet",
  "products.empty.description":
    "Create your first product card: generate an AI description and Instagram caption, and set a studio image as the cover.",
  "products.empty.action": "Create the first product",

  "products.form.cardTitle": "Product card",
  "products.form.cardDescription":
    "You can pick the cover from your studio output.",
  "products.form.name": "Product name",
  "products.form.description": "Description",
  "products.form.price": "Sale price",
  "products.form.cost": "Cost",
  "products.form.stock": "Stock",
  "products.form.category": "Category",
  "products.form.categoryPlaceholder": "e.g. Ceramic bowl",
  "products.form.tags": "Tags",
  "products.form.tagsPlaceholder": "comma separated",
  "products.form.cover": "Cover image (Studio output)",
  "products.form.coverEmpty":
    "No studio images yet. Process a photo in Studio first.",
  "products.form.coverNone": "None",
  "products.form.saving": "Saving…",
  "products.form.create": "Create product",
  "products.form.update": "Save changes",
  "products.form.delete": "Delete product",
  "products.form.deleting": "Deleting…",
  "products.form.deleteConfirm":
    "Delete this product? Its cover image will be marked as an orphan.",

  "products.detail.editTitle": "Edit product",
  "products.detail.aiApproved":
    "The description was generated by AI (approved).",
  "products.detail.manualOrAi":
    "You can write the description yourself or generate it with AI.",
  "products.detail.caption.title": "Instagram caption",
  "products.detail.caption.description":
    "Generate caption copy and hashtag suggestions, review them, then copy to your clipboard. Nothing is written to the product automatically.",
  "products.detail.description.title": "AI product description",
  "products.detail.description.description":
    "Generate first, review it, then save it to the product — nothing is written automatically.",
  "products.detail.bridge.title": "Hoflayn Web marketplace",
  "products.detail.bridge.description":
    "Exports the product; the PHP side queues it for admin approval. hoflayn.app remains the source of truth.",

  "products.saved": "Saved",
  "products.error.nameMin": "Product name must be at least {min} characters",
  "products.error.invalidPrice": "Invalid price",
  "products.error.coverNotOwned":
    "That cover image doesn't belong to this studio",
  "products.error.createFailed": "Couldn't create the product",
  "products.error.saveFailed": "Couldn't save",
  "products.error.invalidProduct": "Invalid product",
  "products.error.notFound": "Product not found",
  "products.error.deleteRole": "Deleting products requires admin permission.",

  "ai.balance": "Balance: {credits}",
  "ai.generating": "Generating…",
  "ai.writer.disabled": "The AI Writer module is off on your plan.",
  "ai.writer.devBypass":
    "In development you can try it with the mock (entitlement bypass).",
  "ai.writer.upgrade": "Upgrade to Pro to unlock it.",
  "ai.writer.captionBypass":
    "The AI Writer entitlement is off; the mock will run via the development bypass.",
  "ai.writer.captionProOnly":
    "This feature is available in the Pro AI Writer module.",

  "ai.description.material": "Material",
  "ai.description.materialPlaceholder": "e.g. stoneware clay",
  "ai.description.audience": "Target audience",
  "ai.description.audiencePlaceholder": "e.g. gift shoppers",
  "ai.description.features": "Features",
  "ai.description.featuresPlaceholder": "e.g. hand-formed, matte glaze",
  "ai.description.generate": "AI description (−{credits} credits)",
  "ai.description.generateMock": "Try the mock (−{credits} credits)",
  "ai.description.preview":
    "Preview — nothing is written to the product until you approve",
  "ai.description.save": "Save description to product",
  "ai.description.saved": "The description was saved to the product.",

  "ai.caption.tone": "Tone",
  "ai.caption.tone.samimi": "Friendly",
  "ai.caption.tone.hikaye": "Story-driven",
  "ai.caption.tone.sade": "Minimal",
  "ai.caption.generate": "Generate Instagram caption (−{credits} credits)",
  "ai.caption.preview":
    "Preview — nothing is written to the product automatically",
  "ai.caption.copy": "Approve and copy",
  "ai.caption.copied": "Caption copied to your clipboard.",
  "ai.caption.copyFailed":
    "Clipboard permission was denied. You can select and copy the text manually.",

  "ai.error.productName": "Product name is required",
  "ai.error.writerRequired":
    "The AI Writer module is off on your plan. Upgrade to Pro, or set DEV_UNLOCK_WRITER=true in development.",
  "ai.error.descriptionFailed": "Couldn't generate the AI description",
  "ai.error.confirmMissing": "The AI output needed for approval is missing",
  "ai.error.updateFailed": "Couldn't update the product",
  "ai.error.captionInvalid": "Invalid product or tone selection",
  "ai.error.captionWriterRequired":
    "Instagram captions need the AI Writer module. You can upgrade to Pro.",
  "ai.error.captionFailed": "Couldn't generate the Instagram caption",

  "bridge.status.notSent": "Not sent",
  "bridge.status.draft": "Draft",
  "bridge.status.pending": "Awaiting approval",
  "bridge.status.published": "Published",
  "bridge.status.rejected": "Rejected",
  "bridge.status.failed": "Failed",
  "bridge.status.archived": "Archived",
  "bridge.externalId": "External ID",
  "bridge.viewOnWeb": "View on Hoflayn Web",
  "bridge.localChanges": "Local changes pending",
  "bridge.lastAttempt": "Last attempt: {date}",
  "bridge.lastSuccess": "Last successful export: {date}",
  "bridge.send": "Send to Hoflayn Web",
  "bridge.resend": "Send to Hoflayn Web again",
  "bridge.sending": "Sending…",
  "bridge.archive": "Remove from the Hoflayn Web storefront",
  "bridge.archiveConfirm":
    "Archive this product from the Hoflayn Web storefront?",
  "bridge.sent": "Sent · status: {status}",
  "bridge.rejectionReason": "Hoflayn Web reason: {reason}",
  "bridge.lastError": "Last error: {error}",
  "bridge.error.role": "Marketplace export requires admin permission.",
  "bridge.error.exportFailed": "Export failed",
  "bridge.error.notConfigured":
    "The Hoflayn Web Bridge isn't configured. HOFLAYN_WEB_BRIDGE_URL and HOFLAYN_WEB_BRIDGE_API_KEY are required.",
  "bridge.error.badResponse": "Hoflayn Web returned an invalid response.",
  "bridge.error.timeout":
    "Hoflayn Web didn't respond ({seconds}s timeout).",
  "bridge.error.unreachable": "Couldn't reach Hoflayn Web: {message}",
  "bridge.error.rejectedByWeb": "Hoflayn Web rejected the request: {message}",
  "bridge.error.syncLinkMissing": "No sync record found for this product.",
  "bridge.error.missingFields":
    "Fill in these fields before publishing: {fields}.",

  "bridge.field.name": "product name",
  "bridge.field.price": "price",
  "bridge.field.description": "description",
  "bridge.field.category": "category",
  "bridge.field.coverImage": "cover image",

  "studio.title": "Process a product photo",
  "studio.disabled.title": "Photo Studio is off",
  "studio.disabled.description":
    "This module isn't active on your plan. You can upgrade to Pro from the Plan page.",
  "studio.disabled.action": "View plan",
  "studio.noCredits.title": "You're out of credits",
  "studio.noCredits.description":
    "Studio jobs spend credits. If your free balance is gone, buy a pack or move to Pro.",
  "studio.noCredits.action": "Credits / plan",
  "studio.card.title": "Upload and process",
  "studio.card.description":
    "Background removal or a white backdrop — compare the results side by side.",
  "studio.mode": "Mode",
  "studio.mode.remove_bg.title": "Remove background",
  "studio.mode.remove_bg.desc": "Transparent PNG cutout",
  "studio.mode.white_bg.title": "White backdrop",
  "studio.mode.white_bg.desc": "Cutout on a white background",
  "studio.mode.cost": "{desc} · {credits} credits",
  "studio.image": "Product photo",
  "studio.upload.cta": "Drag and drop, or click",
  "studio.upload.hint": "JPEG / PNG / WebP · max {mb} MB",
  "studio.process": "Process (−{credits} credits)",
  "studio.processing": "Processing…",
  "studio.balanceLabel": "Balance",
  "studio.compare": "Comparison",
  "studio.download": "Download",
  "studio.before": "Before",
  "studio.after": "After",
  "studio.alt.preview": "Preview",
  "studio.alt.original": "Original",
  "studio.alt.result": "AI result",
  "studio.error.moduleOff":
    "Photo Studio is off on your plan. Upgrade your plan.",
  "studio.error.noDatabase": "DATABASE_URL isn't set.",
  "studio.error.rateLimit":
    "Too many requests. You can run at most {limit} jobs per minute. Try again in {seconds}s.",
  "studio.error.invalidMode": "Invalid mode selection.",
  "studio.error.noFile": "Choose a product photo.",
  "studio.error.badType": "You can only upload JPEG, PNG or WebP.",
  "studio.error.tooLarge": "The file can be at most {mb} MB.",
  "studio.error.jobFailed": "The job failed",

  // Craft categories. These also feed AI prompts and catalog exports, so they
  // follow the tenant's content locale rather than the UI locale.
  "craft.ceramics.label": "Ceramics",
  "craft.ceramics.description":
    "Bowls, vases, plates — clay and glaze focused pieces",
  "craft.candle.label": "Candles / scented goods",
  "craft.candle.description":
    "Candles, soap, room scents and similar small-batch goods",
  "craft.wood.label": "Wood",
  "craft.wood.description": "Carving, cutting, furniture accessories",
  "craft.epoxy.label": "Epoxy",
  "craft.epoxy.description": "Epoxy tables, jewellery, decorative casting",
  "craft.textile.label": "Textiles",
  "craft.textile.description": "Sewing, knitting, printing, fabric goods",
  "craft.other.label": "Other",
  "craft.other.description":
    "Not on the list? Start here and we'll narrow it down later",
  "craft.error.required": "Pick at least one craft.",

  // Onboarding
  "onboarding.title": "Tell us about your studio",
  "onboarding.description":
    "One step. If you already sell on the marketplace, use that same email — product export is linked by it.",
  "onboarding.name": "Studio name",
  "onboarding.namePlaceholder": "e.g. Clay & Form",
  "onboarding.craftLegend": "What do you make?",
  "onboarding.craftHint":
    "Your craft helps us tune AI copy and suggestions to your studio.",
  "onboarding.submit": "Continue",
  "onboarding.nextSteps.title": "Next steps",
  "onboarding.nextSteps.description":
    "Three short paths for your first closed-beta session — just go in order.",
  "onboarding.step.studio.title": "Studio",
  "onboarding.step.studio.body":
    "Upload a product photo, then remove the background or add a white backdrop.",
  "onboarding.step.product.title": "Product",
  "onboarding.step.product.body":
    "Add your first product card, and make the studio output its cover if you like.",
  "onboarding.step.caption.title": "Caption",
  "onboarding.step.caption.body":
    "Generate an Instagram caption from the product page, review it, copy it.",
  "onboarding.error.nameMin":
    "Studio name must be at least {min} characters",
  "onboarding.error.noDatabase":
    "DATABASE_URL isn't set. Add your Supabase connection.",

  // Settings
  "settings.eyebrow": "Account",
  "settings.workshop.title": "Studio",
  "settings.workshop.description":
    "The name and craft shape AI copy tone and your dashboard label.",
  "settings.craftLegend": "Craft category",
  "settings.save": "Save",
  "settings.saving": "Saving…",
  "settings.saved": "Studio settings saved.",
  "settings.support.title": "Support",
  "settings.support.description":
    "During the beta, email is the fastest way to reach us.",
  "settings.support.cta": "Email support ({email})",
  "settings.support.mail.subject": "[Hoflayn] Support — {slug}",
  "settings.support.mail.body": "Studio: {name}\nUser: {email}\n\n",
  "settings.delete.title": "Delete account",
  "settings.delete.description":
    "No self-serve deletion — we email the request and handle it manually. Credits and billing records are retained.",
  "settings.delete.cta": "Send deletion request",
  "settings.delete.mail.subject": "[Hoflayn] Account deletion request — {slug}",
  "settings.delete.mail.body":
    "Studio: {name}\nUser: {email}\nTenant ID: {tenantId}\n\nI'd like my account and studio data deleted.\n",

  // Billing
  "billing.eyebrow": "Plan and credits",
  "billing.title": "Billing",
  "billing.testMode":
    "Stripe test mode is active — no real card is charged. See the cutover checklist for live payments.",
  "billing.paymentReceived":
    "Payment received. Your plan and credits update once the Stripe webhook is processed.",
  "billing.currentPlan": "Current plan: {plan}",
  "billing.plan.pro": "Professional",
  "billing.plan.free": "Free",
  "billing.creditBalance": "Credit balance: {credits}",
  "billing.subscriptionStatus": "Subscription status: {status}",
  "billing.proPrice": "Pro · ${price}/mo",
  "billing.proPerks":
    "{credits} credits a month · higher daily limit · Photo Studio",
  "billing.upgrade": "Upgrade to Pro",
  "billing.upgradeOpening": "Opening Stripe…",
  "billing.managePortal": "Manage subscription",
  "billing.managePortalOpening": "Opening…",
  "billing.packs.title": "One-time credits",
  "billing.packs.description":
    "No subscription needed; credits land in your balance after the payment webhook.",
  "billing.packs.label": "{credits} credits",
  "billing.error.invalidPack": "Invalid credit pack.",
  "billing.error.checkoutFailed": "Couldn't start the payment.",

  // API boundary. `code` is the contract clients branch on; these strings are
  // the human-readable fallback rendered in the caller's language.
  "api.error.internal": "An unexpected server error occurred.",
  "api.error.invalidJson": "Send a valid JSON body.",
  "api.error.missingToken": "You need to sign in.",
  "api.error.invalidToken": "Your session has expired.",
  "api.error.provisionFailed": "Your account couldn't be prepared.",
  "api.error.membershipMissing": "No studio membership found.",
  "api.error.onboardingRequired": "Finish setting up your studio first.",
  "api.error.invalidData": "Invalid data.",
  "api.error.validation.workshop": "Studio details are invalid.",
  "api.error.validation.product": "Product details are invalid.",
  "api.error.validation.studio": "Invalid studio job.",
  "api.error.invalidJobId": "Invalid AI job.",
  "api.error.jobNotFound": "AI job not found.",
  "api.error.invalidStudioJobId": "Invalid job.",
  "api.error.studioJobNotFound": "Job not found.",

  "workshop.error.notFound": "Studio not found.",

  "products.error.invalidMeasure": "Invalid dimension or weight.",
  "products.error.analyzeImageRequired":
    "Choose a product photo to analyze.",
  "products.error.notFoundWithId": "Product not found: {id}",

  "stock.error.negativeRole":
    "Allowing negative stock requires admin permission.",
  "stock.error.saveFailed": "The stock movement couldn't be saved.",
  "stock.error.thresholdRole":
    "Changing the stock threshold requires admin permission.",

  "sales.error.roleRecord": "Recording a sale requires admin permission.",
  "sales.error.roleVoid": "Voiding a sale requires admin permission.",
  "sales.error.roleImport": "Importing sales CSV requires admin permission.",
  "sales.error.voidConflict":
    "This sale can't be voided (status: {status}).",
  "sales.csv.error.tooFewLines":
    "The CSV must have a header plus at least one row.",
  "sales.csv.error.header":
    "The CSV header must include sku, quantity and unit_price.",
  "sales.csv.error.skuEmpty": "Row {line}: sku is empty.",
  "sales.csv.error.quantityInvalid": "Row {line}: quantity is invalid.",
  "sales.csv.error.unitPriceEmpty": "Row {line}: unit_price is empty.",
  "sales.error.unsupportedSource":
    "The Hoflayn Web sales source isn't supported yet (separate adapter).",
  "sales.error.saveFailed": "The sale couldn't be saved.",
  "sales.error.lineSaveFailed": "The sale line couldn't be saved.",
  "sales.error.notFound": "Sale not found.",
  "sales.error.voidFailed": "The sale couldn't be voided.",
  "sales.error.importEmpty": "There are no rows to import.",
  "sales.error.skuNotFound": "SKU not found: {skus}",

  "catalogs.error.planRequired":
    "PDF Catalog requires the Professional plan.",
  "catalogs.error.role": "Creating a catalog requires admin permission.",
  "catalogs.error.notFound": "Catalog not found.",
  "catalogs.error.itemNotFound": "One of the selected products wasn't found.",
  "catalogs.error.coverNotFound": "The cover product wasn't found.",
  "catalogs.error.createFailed": "The catalog couldn't be created.",
  "catalogs.error.insufficientCredits":
    "You don't have enough credits for a catalog PDF.",
  "catalogs.error.exportCreateFailed":
    "The export record couldn't be created.",
  "catalogs.error.exportNotFound": "Export not found.",

  "labels.error.planRequired":
    "Barcodes and labels require the Professional plan.",
  "labels.error.role": "Generating labels requires admin permission.",
  "labels.error.exportNotFound": "Label export not found.",
  "labels.error.insufficientCredits":
    "You don't have enough credits for a label PDF.",
  "labels.error.itemNotFound": "One of the selected products wasn't found.",
  "labels.error.payloadRequired": "A SKU or barcode value is required.",
  "labels.error.gs1Digits":
    "GS1-128 needs an 8–48 digit numeric value (GTIN / AI stream).",
  "labels.error.payloadTooLong":
    "A barcode value can be at most 64 characters.",
  "labels.pdf.barcodeFailed": "Barcode failed",

  "catalog.pdf.itemCount.one": "{count} product",
  "catalog.pdf.itemCount.other": "{count} products",
  "catalog.pdf.noImage": "No image",

  "ai.fallbackProductName": "Product",

  "tenant.defaultName": "{owner}'s Workshop",
  "tenant.defaultName.fallback": "My Workshop",

  "stock.cause.sale": "Sale",
  "stock.cause.saleVoid": "Sale voided",
  "stock.cause.saleDraft": "Draft sale reservation",

  "seo.audit.titleLength":
    "The title is {length} characters; aim for {min}-{max}.",
  "seo.audit.metaLength":
    "The meta description is {length} characters; aim for {min}-{max}.",
  "seo.audit.slugFormat":
    "A slug may only contain lowercase letters, digits and hyphens.",
  "seo.audit.keywordInTitle": "The primary keyword is missing from the title.",
  "seo.audit.keywordInMeta":
    "The primary keyword is missing from the meta description.",
  "seo.audit.keywordRepetition": "Repeated keywords: {keywords}",
  "seo.audit.secondaryCount.one":
    "There is {count} secondary keyword; the maximum is {max}.",
  "seo.audit.secondaryCount.other":
    "There are {count} secondary keywords; the maximum is {max}.",

  "labels.error.exportCreateFailed":
    "The label export couldn't be created.",

  "scenarios.error.notFound": "Scenario not found.",
  "scenarios.error.saveFailed": "The scenario couldn't be saved.",
  "scenarios.error.productRequired":
    "Choose a product to apply the scenario to.",
  "scenarios.error.fieldRequired": "Choose at least one field to apply.",

  "seo.error.planRequired":
    "SEO Assistant requires the Professional plan (Writer module).",
  "seo.error.applyRole": "Applying SEO requires admin permission.",
  "seo.error.insufficientCredits":
    "You don't have enough credits for an SEO analysis.",
  "seo.error.generateFailed": "The SEO analysis couldn't be generated.",

  "ai.error.planRequired":
    "The AI Writer module requires the Professional plan.",
  "ai.error.descriptionCredits":
    "You don't have enough credits for an AI description.",
  "ai.error.descriptionGenerateFailed":
    "The AI description couldn't be generated.",
  "ai.error.captionCredits":
    "You don't have enough credits for an Instagram caption.",
  "ai.error.captionGenerateFailed":
    "The Instagram caption couldn't be generated.",

  "studio.error.rateLimitSeconds":
    "Too many requests. Try again in {seconds} seconds.",

  "billing.error.role": "Billing actions require admin permission.",
  "billing.return.success":
    "Payment complete. Your balance is updating and will refresh shortly.",
  "billing.return.canceled": "Payment canceled. You can try again any time.",

  "ai.error.costCapHourly":
    "The hourly AI cost limit was reached (≈${spent} / ${cap}). Please try again later.",
  "ai.error.costCapDaily":
    "The daily AI cost limit was reached (≈${spent} / ${cap}). Try again tomorrow or contact support.",
  "catalogs.error.exportRole":
    "Generating a catalog PDF requires admin permission.",
  "products.error.invalidCover": "The cover details are invalid.",
  "bridge.error.archiveRole":
    "Archiving on the marketplace requires admin permission.",
  "settings.error.role": "Changing studio settings requires admin permission.",
  "scenarios.error.applyRole":
    "Applying to a product requires admin permission.",
  "scenarios.error.invalidKind": "Invalid scenario type.",
  "sales.error.roleReserve":
    "Reserving stock requires admin permission.",
  "stock.error.insufficient":
    "Not enough stock: {requested} requested, {available} available.",
  "stock.error.notInteger": "The stock quantity must be a whole number.",
  "stock.error.negative": "The stock quantity can't be negative.",
  "stock.error.zero": "The quantity must be greater than 0.",

  // Keys mirror CREDIT_COSTS operations; a test enforces full coverage.
  "credits.operation.remove_bg": "Background removal",
  "credits.operation.white_bg": "White backdrop",
  "credits.operation.analyze_product_image": "Product photo analysis",
  "credits.operation.generate_description": "Product description",
  "credits.operation.generate_caption": "Social media caption",
  "credits.operation.analyze_seo": "SEO analysis",
  "credits.operation.generate_catalog": "PDF catalog",
  "credits.operation.generate_labels": "Barcode / label",

  "settings.contentLanguage.title": "Content language",
  "settings.contentLanguage.description":
    "AI descriptions, Instagram captions, SEO suggestions and PDF exports are written in this language. It's independent of the interface language — you can work in English and sell to a Turkish market.",
  "settings.contentLanguage.readOnly":
    "Only a workshop admin can change this setting.",

  "settings.currency": "Currency",
  "settings.currency.hint":
    "Product prices, catalogs and label exports are shown in this currency.",
  "currency.TRY": "₺ Turkish lira (TRY)",
  "currency.USD": "$ US dollar (USD)",
  "currency.EUR": "€ Euro (EUR)",
  "currency.GBP": "£ Pound sterling (GBP)",

  "calc.money.invalid": "Invalid amount: {raw}",
  "calc.money.required": "An amount is required.",
  "calc.component.materials": "Materials",
  "calc.component.labor": "Labor",
  "calc.component.packaging": "Packaging",
  "calc.component.commission": "Commission",
  "calc.component.shipping": "Shipping",
  "calc.component.other": "Other",
  "calc.profit.quantityPositive": "Quantity must be a positive whole number.",
  "calc.profit.quantityDefault":
    "No quantity was entered; unit cost was calculated for 1 product.",
  "calc.profit.missing.materials": "Materials were left blank; treated as 0.",
  "calc.profit.missing.labor": "Labor was left blank; treated as 0.",
  "calc.profit.missing.packaging": "Packaging was left blank; treated as 0.",
  "calc.profit.missing.shipping": "Shipping was left blank; treated as 0.",
  "calc.profit.missing.other": "Other costs were left blank; treated as 0.",
  "calc.profit.missing.commission": "Commission was left blank; treated as 0.",
  "calc.profit.commissionRange": "Commission must be between 0 and 100.",
  "calc.profit.commissionPercent":
    "Commission was taken as {percent}% of the selling price.",
  "calc.profit.batchSplit":
    "Production cost {batch} was split across {quantity} units.",
  "calc.profit.sellNegative": "The selling price can't be negative.",
  "calc.profit.sellMissing":
    "No selling price was entered; profit and margin were not calculated.",
  "calc.profit.sellZero": "The selling price is 0; margin is undefined.",
  "calc.profit.marginRange": "Target margin must be between 0 and 100.",
  "calc.profit.marginPlusCommission":
    "Target margin plus commission can't exceed 100%.",
  "calc.profit.targetMissing":
    "No target margin was entered; a target selling price was not calculated.",
  "calc.desi.invalidCarrier": "Unknown carrier profile.",
  "calc.desi.divisorPositive": "The volumetric divisor must be positive.",
  "calc.desi.customDivisorDefault":
    "No custom divisor was entered; the default 3000 was used.",
  "calc.desi.divisorOverride":
    "The profile divisor is {profile}; your value {custom} was used instead.",
  "calc.desi.lengthPositive": "Length must be a positive number.",
  "calc.desi.widthPositive": "Width must be a positive number.",
  "calc.desi.heightPositive": "Height must be a positive number.",
  "calc.desi.weightPositive": "Weight must be zero or positive.",
  "calc.desi.weightMissing":
    "No actual weight was entered; billable weight was taken as equal to desi.",
  "calc.carrier.yurtici.label": "Yurtiçi Kargo",
  "calc.carrier.yurtici.notes": "Common TR desi divisor (cm³ / 3000).",
  "calc.carrier.aras.label": "Aras Kargo",
  "calc.carrier.aras.notes":
    "Usually uses a 3000 divisor; the carrier tariff may change.",
  "calc.carrier.mng.label": "MNG Kargo",
  "calc.carrier.mng.notes":
    "Usually uses a 3000 divisor; the carrier tariff may change.",
  "calc.carrier.custom.label": "Custom divisor",
  "calc.carrier.custom.notes": "Enter your own desi divisor.",

  "legal.privacy.title": "Privacy policy",
  "legal.privacy.updated": "Last updated: 14 September 2026",
  "legal.privacy.p1":
    "Hoflayn is a workbench for handmade and boutique makers. We process your account email, workshop name, product and sales records, uploaded images, and AI job inputs/outputs to provide the service.",
  "legal.privacy.p2":
    "Data is hosted in European infrastructure (Supabase / Vercel). Payments go through Stripe; card numbers are not stored on Hoflayn servers. AI image and text jobs are sent to the chosen providers (for example OpenAI and Replicate).",
  "legal.privacy.p3":
    "We use a session cookie, a language cookie (hoflayn_locale), and an IP-country header only to guess the interface language. There are no marketing cookies or third-party analytics.",
  "legal.privacy.p4":
    "You keep KVKK and GDPR rights to access, correct, and delete your data. Use Account deletion in Settings or email support.",
  "legal.privacy.p5":
    "When an account is deleted, workshop data, media, and the billing customer record are removed within a reasonable time. Payment records Stripe must keep for legal reasons may remain there.",
  "legal.privacy.p6":
    "If we update this policy we will publish it here and in the app. Questions go to support.",
  "legal.terms.title": "Terms of use",
  "legal.terms.updated": "Last updated: 14 September 2026",
  "legal.terms.p1":
    "Hoflayn is a software service. The free plan includes limited credits; paid plans add a subscription and credit packs. Credits are spent on AI jobs and are non-refundable unless required by law.",
  "legal.terms.p2":
    "You are responsible for the content you upload. Illegal use, infringement, or anything that disrupts the service is forbidden. Review AI output before you publish it; Hoflayn does not guarantee accuracy.",
  "legal.terms.p3":
    "The service is provided as-is. Maintenance and provider outages can happen. Our liability is capped at the amount you paid us in the last 12 months.",
  "legal.terms.p4":
    "You can cancel a subscription from web billing. Until Play Billing is approved, the store build may hide external checkout.",
  "legal.terms.p5":
    "You may delete your account at any time. If you do not accept these terms, do not use the service.",
  "legal.delete.title": "Delete your account",
  "legal.delete.updated": "Last updated: 14 September 2026",
  "legal.delete.p1":
    "To delete your account and workshop data, sign in and use Settings → Delete account, or email us from the address below. After we verify the request, the data is removed.",
  "legal.delete.p2":
    "Deletion covers products, images, sales records, AI job history, and your session. Invoices the payment provider must retain may stay with them.",
  "legal.delete.cta": "Email a deletion request to {email}",
  "legal.delete.mail.subject": "Account deletion request",
  "legal.delete.mail.body":
    "Please delete my Hoflayn account and workshop data. The registered email is the sender of this message.",
  "legal.back": "Home",
  "landing.legal.privacy": "Privacy",
  "landing.legal.terms": "Terms",
  "landing.legal.marketplace": "Marketplace",
  "auth.terms.label": "I have read and accept the privacy policy and terms of use.",
  "auth.terms.required":
    "You must accept the privacy policy and terms of use to create an account.",
  "auth.terms.google":
    "By continuing with Google you accept the privacy policy and terms of use.",
  "auth.public.support": "Need help? {email}",
};
