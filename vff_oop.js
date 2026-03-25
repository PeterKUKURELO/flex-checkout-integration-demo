(() => {
  const CONFIG = {
    debug: true,
    environment: "tst",
    algApiVersion: "1709847567",
    qrExpirationMs: 1 * 60 * 1000,
    environments: {
      tst: {
        authBaseUrl: "https://auth.preprod.alignet.io",
        apiDevBaseUrl: "https://api.dev.alignet.io",
        cancelApiBaseUrl: "https://api.preprod.alignet.io",
        apiAudience: "https://api.dev.alignet.io",
        js: "https://flex.dev.pay-me.cloud/flex-payment-forms.min.js",
        css: "https://flex.dev.pay-me.cloud/main-flex-payment-forms.css",
        creds: {
          clientId: "Lj6tRqRzDiw56PPdSOOAgogT2HnIjf",
          clientSecret: "ijuVhdIETgcryjRRAJPGCd9nIu8HetTqDTIYe7VFcScgrprFY4Usu0e3H5KUPKeu",
          merchantCode: "453d8265-e01f-4ea5-9bfe-ca88b88e0beb"
        }
      },
      prod: {
        authBaseUrl: "https://auth.alignet.io",
        apiDevBaseUrl: "https://api.alignet.io",
        cancelApiBaseUrl: "https://api.alignet.io",
        apiAudience: "https://api.alignet.io",
        js: "https://flex.alignet.io/flex-payment-forms.min.js",
        css: "https://flex.alignet.io/main-flex-payment-forms.css",
        creds: {
          clientId: "Lj6tRqRzDiw56PPdSOOAgogT2HnIjf",
          clientSecret: "ijuVhdIETgcryjRRAJPGCd9nIu8HetTqDTIYe7VFcScgrprFY4Usu0e3H5KUPKeu",
          merchantCode: "453d8265-e01f-4ea5-9bfe-ca88b88e0beb"
        }
      }
    }
  };

  class Utils {
    static async parseJsonSafe(response) {
      const raw = await response.text();
      if (!raw) return {};
      try {
        return JSON.parse(raw);
      } catch (_e) {
        return { raw };
      }
    }

    static safeStringify(value) {
      try {
        const seen = new WeakSet();
        return JSON.stringify(
          value,
          (key, val) => {
            if (typeof val === "object" && val !== null) {
              if (seen.has(val)) return "[Circular]";
              seen.add(val);
            }
            if (typeof val === "function") return `[Function ${val.name || "anonymous"}]`;
            return val;
          },
          2
        );
      } catch (e) {
        return String(value);
      }
    }

    static twoDigits(n) {
      return n < 10 ? `0${n}` : `${n}`;
    }

    static formatDateTime(date) {
      return `${Utils.twoDigits(date.getDate())}/${Utils.twoDigits(date.getMonth() + 1)}/${date.getFullYear()} ${Utils.twoDigits(date.getHours())}:${Utils.twoDigits(date.getMinutes())}`;
    }

    static formatCountdown(ms) {
      const safeMs = Math.max(0, ms);
      const totalSeconds = Math.ceil(safeMs / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    static maskToken(token) {
      if (!token) return "{{access_token}}";
      return `${token.slice(0, 10)}...${token.slice(-6)}`;
    }
  }

  class Logger {
    constructor(enabled) {
      this.enabled = enabled;
      this.docClickAttached = false;
    }

    log(tag, data) {
      if (!this.enabled) return;
      try {
        console.log(`[VFF-DEBUG] ${tag}`, data || "");
      } catch (_e) {}
    }

    snapshotEl(el) {
      if (!el) return { exists: false };
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        exists: true,
        id: el.id || null,
        className: el.className || null,
        display: cs.display,
        visibility: cs.visibility,
        opacity: cs.opacity,
        pointerEvents: cs.pointerEvents,
        width: Math.round(r.width),
        height: Math.round(r.height),
        top: Math.round(r.top),
        left: Math.round(r.left),
        childCount: el.childElementCount,
        htmlLen: (el.innerHTML || "").length
      };
    }

    state(label) {
      if (!this.enabled) return;
      const stage = document.querySelector(".stage");
      const demo = document.getElementById("demo");
      const resp = document.getElementById("trxResponse");
      this.log(label, {
        stage: stage ? stage.className : null,
        demo: this.snapshotEl(demo),
        trxResponse: this.snapshotEl(resp)
      });
    }

    attachWatchers() {
      if (!this.enabled) return;
      const resp = document.getElementById("trxResponse");
      const demo = document.getElementById("demo");
      [resp, demo].forEach((el) => {
        if (!el || el.dataset.debugAttached === "1") return;
        const mo = new MutationObserver(() => this.log(`mutation#${el.id}`, this.snapshotEl(el)));
        mo.observe(el, { attributes: true, childList: true, subtree: true });
        ["click", "pointerdown", "mousedown"].forEach((evt) => {
          el.addEventListener(
            evt,
            () => {
              this.log(`${evt}#${el.id}`, this.snapshotEl(el));
            },
            true
          );
        });
        el.dataset.debugAttached = "1";
      });

      if (!this.docClickAttached) {
        document.addEventListener(
          "click",
          (e) => {
            const t = e.target;
            const id = t && t.id ? `#${t.id}` : "";
            const cls = t && t.className ? `.${String(t.className).replace(/\s+/g, ".")}` : "";
            this.log("document.click", `${t?.tagName || "?"}${id}${cls}`);
            this.state("after-document-click");
          },
          true
        );
        this.docClickAttached = true;
      }
    }
  }

  class NoticeService {
    getExpirationNotice(targetId) {
      if (targetId === "demo") return document.getElementById("qrExpirationNotice");
      if (targetId === "demoModal") return document.getElementById("qrExpirationNoticeModal");
      return null;
    }

    getCancellationNotice(targetId) {
      if (targetId === "demo") return document.getElementById("qrCancellationStatus");
      if (targetId === "demoModal") return document.getElementById("qrCancellationStatusModal");
      return null;
    }

    clearForTarget(targetId) {
      const expiration = this.getExpirationNotice(targetId);
      if (expiration) {
        expiration.textContent = "";
        expiration.hidden = true;
      }
      const cancellation = this.getCancellationNotice(targetId);
      if (cancellation) {
        cancellation.textContent = "";
        cancellation.className = "qr-cancel-status";
        cancellation.hidden = true;
      }
    }

    setExpiration(targetId, message) {
      const notice = this.getExpirationNotice(targetId);
      if (!notice) return;
      notice.textContent = message;
      notice.hidden = false;
    }

    setCancellation(targetId, text, type = "info") {
      const notice = this.getCancellationNotice(targetId);
      if (!notice) return;
      notice.textContent = text;
      notice.className = "qr-cancel-status";
      if (type === "success") notice.classList.add("is-success");
      if (type === "error") notice.classList.add("is-error");
      notice.hidden = false;
    }
  }

  class AuthService {
    constructor(config) {
      this.config = config;
    }

    async getAccessToken(audience = this.config.apiAudience || this.config.apiDevBaseUrl || "https://api.dev.alignet.io") {
      const url = `${this.config.authBaseUrl}/token`;
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "authorize",
          grant_type: "client_credentials",
          audience,
          client_id: this.config.creds.clientId,
          client_secret: this.config.creds.clientSecret,
          scope: "create:token post:charges offline_access"
        })
      });
      const data = await Utils.parseJsonSafe(r);
      if (!r.ok) {
        console.error("[VFF][AUTH][TOKEN] error", { status: r.status, audience, data });
        throw new Error(`Error token (${r.status})`);
      }
      if (!data?.access_token) {
        console.error("[VFF][AUTH][TOKEN] sin access_token", { audience, data });
        throw new Error("Respuesta de token sin access_token");
      }
      console.log("[VFF][AUTH][TOKEN] ok", { audience, token_len: String(data.access_token).length });
      return data.access_token;
    }

    async getNonce(accessToken) {
      const url = `${this.config.authBaseUrl}/nonce`;
      const r = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          action: "create.nonce",
          audience: this.config.apiAudience || this.config.apiDevBaseUrl || "https://api.dev.alignet.io",
          client_id: this.config.creds.clientId,
          scope: "post:charges"
        })
      });
      const data = await Utils.parseJsonSafe(r);
      if (!r.ok) {
        console.error("[VFF][AUTH][NONCE] error", { status: r.status, data });
        throw new Error(`Error nonce (${r.status})`);
      }
      if (!data?.nonce) {
        console.error("[VFF][AUTH][NONCE] sin nonce", { data });
        throw new Error("Respuesta de nonce sin nonce");
      }
      console.log("[VFF][AUTH][NONCE] ok", { nonce_len: String(data.nonce).length });
      return data.nonce;
    }
  }

  class ApiService {
    constructor(config, authService) {
      this.config = config;
      this.auth = authService;
    }

    async consultarCharge({ merchantCode, orderId, transactionId }) {
      const token = await this.auth.getAccessToken(this.config.apiAudience || this.config.apiDevBaseUrl || "https://api.dev.alignet.io");
      const url = `${this.config.apiDevBaseUrl}/charges/${merchantCode}/${orderId}/${transactionId}`;
      const r = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "ALG-API-VERSION": this.config.algApiVersion
        }
      });
      return r.json();
    }

    async cancelCharge({ merchantCode, orderId, accessToken }) {
      const url = `${this.config.cancelApiBaseUrl}/charges/${encodeURIComponent(merchantCode)}/${encodeURIComponent(orderId)}`;
      const r = await fetch(url, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "ALG-API-VERSION": this.config.algApiVersion
        }
      });
      const rawText = await r.text();
      let parsedBody = rawText;
      try {
        parsedBody = rawText ? JSON.parse(rawText) : {};
      } catch (_e) {}
      return {
        ok: r.ok,
        status: r.status,
        statusText: r.statusText,
        url,
        response: parsedBody
      };
    }
  }

  class ResponseRenderer {
    constructor({ apiService, payload, logger }) {
      this.api = apiService;
      this.payload = payload;
      this.logger = logger;
      this.payloadStr = Utils.safeStringify(payload);
    }

    render(container, resp) {
      const respStr = Utils.safeStringify(resp);
      container.innerHTML = "";
      container.classList.add("response-mode");
      container.style.display = "block";
      container.style.visibility = "visible";
      container.style.opacity = "1";

      if (!container.dataset.locked) {
        ["pointerdown", "mousedown", "click"].forEach((evt) => {
          container.addEventListener(evt, (ev) => ev.stopPropagation());
        });
        container.dataset.locked = "1";
      }

      const shell = document.createElement("div");
      shell.className = "trx-response";
      shell.style.display = "block";

      const tools = document.createElement("div");
      tools.className = "trx-tools";

      const btnResp = this.createButton("Ver respuesta");
      const btnPayload = this.createButton("Ver payload");
      const btnConsulta = this.createButton("Consultar charge");
      tools.append(btnResp, btnPayload, btnConsulta);

      const blockResp = this.createBlock("Response", respStr);
      const blockPayload = this.createBlock("Payload enviado", this.payloadStr);
      const blockConsulta = this.createConsultaBlock();
      const endpointEl = blockConsulta.querySelector(".trx-endpoint");
      const preConsulta = blockConsulta.querySelector("pre");

      shell.append(tools, blockResp, blockPayload, blockConsulta);
      container.appendChild(shell);

      const openBlock = (key) => {
        [blockResp, blockPayload, blockConsulta].forEach((el) => el.classList.remove("is-open"));
        if (key === "resp") blockResp.classList.add("is-open");
        if (key === "payload") blockPayload.classList.add("is-open");
        if (key === "consulta") blockConsulta.classList.add("is-open");
      };

      btnResp.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        openBlock("resp");
      });

      btnPayload.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        openBlock("payload");
      });

      btnConsulta.addEventListener("click", async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        try {
          btnConsulta.disabled = true;
          preConsulta.textContent = "Consultando...";
          openBlock("consulta");
          const transactionId = resp?.transaction?.transaction_id;
          endpointEl.textContent = `${CONFIG.apiDevBaseUrl}/charges/${this.payload.merchant_code}/${this.payload.merchant_operation_number}/${transactionId}`;
          const data = await this.api.consultarCharge({
            merchantCode: this.payload.merchant_code,
            orderId: this.payload.merchant_operation_number,
            transactionId
          });
          preConsulta.textContent = Utils.safeStringify(data);
        } catch (e) {
          preConsulta.textContent = Utils.safeStringify(e);
        } finally {
          btnConsulta.disabled = false;
        }
      });

      openBlock("resp");
      this.logger.state("renderResponse:end");
    }

    createButton(text) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "trx-btn";
      btn.textContent = text;
      return btn;
    }

    createBlock(label, content) {
      const block = document.createElement("div");
      block.className = "trx-block";
      const span = document.createElement("span");
      span.className = "trx-label";
      span.textContent = label;
      const pre = document.createElement("pre");
      pre.textContent = content;
      block.append(span, pre);
      return block;
    }

    createConsultaBlock() {
      const block = document.createElement("div");
      block.className = "trx-block";
      const label = document.createElement("span");
      label.className = "trx-label";
      label.textContent = "Consulta API";
      const endpoint = document.createElement("span");
      endpoint.className = "trx-endpoint";
      const pre = document.createElement("pre");
      block.append(label, endpoint, pre);
      return block;
    }
  }

  class QrCancellationController {
    constructor({ target, noticeService, apiService, initialAccessToken, merchantCode, orderId, expirationMs }) {
      this.target = target;
      this.noticeService = noticeService;
      this.apiService = apiService;
      this.initialAccessToken = initialAccessToken || "";
      this.merchantCode = merchantCode || CONFIG.creds.merchantCode;
      this.orderId = orderId || null;
      this.expirationMs = expirationMs;

      this.isDemoTarget = target.id === "demo" || target.id === "demoModal";
      this.cleaned = false;
      this.disposed = false;
      this.messageShown = false;
      this.qrSelectedAt = null;
      this.pendingExpirationMessage = "";
      this.cancelTimerId = null;
      this.countdownIntervalId = null;
      this.initialSelectionTimeout = null;
      this.expirationFieldTimeout = null;
      this.onClick = this.onClick.bind(this);
    }

    bind() {
      if (!this.target) return;
      this.target.addEventListener("click", this.onClick, true);
      this.initialSelectionTimeout = setTimeout(() => {
        if (this.target.querySelector(".payment-method-wrapper.payment_method_qr.selected")) {
          this.markQrSelected();
        }
      }, 350);
      this.expirationFieldTimeout = setTimeout(() => this.hideExpirationField(), 900);
    }

    onClick(ev) {
      const el = ev.target;
      const qrTrigger = el && el.closest ? el.closest(".payment-method-wrapper.payment_method_qr, .payment_method_qr, .payme-choose-btn-2") : null;
      if (qrTrigger) this.markQrSelected();

      const actionEl = el && el.closest ? el.closest("button, [role='button'], a") : null;
      const actionText = String(actionEl?.textContent || "").trim().toLowerCase();
      if (this.isDemoTarget && actionText.includes("entendido") && this.pendingExpirationMessage && !this.messageShown) {
        this.messageShown = true;
        alert(this.pendingExpirationMessage);
      }
    }

    markQrSelected() {
      this.qrSelectedAt = new Date();
      this.pendingExpirationMessage = this.buildExpirationMessage();
      this.messageShown = false;
      window.__vffQrExpirationMessage = this.pendingExpirationMessage;
      window.__vffQrSelectedAt = this.qrSelectedAt.toISOString();
      console.log("[VFF][QR][EXPIRACION]", this.pendingExpirationMessage);
      this.noticeService.setExpiration(this.target.id, this.pendingExpirationMessage);
      this.hideExpirationField();
      setTimeout(() => this.hideExpirationField(), 200);
      setTimeout(() => this.hideExpirationField(), 600);
      this.scheduleCancellation();
    }

    buildExpirationMessage() {
      const expirationDate = this.getExpirationDate();
      if (!expirationDate) return "";
      return `Este QR vence el ${Utils.formatDateTime(expirationDate)} (2 minutos desde su generacion).`;
    }

    getExpirationDate() {
      if (!this.qrSelectedAt) return null;
      return new Date(this.qrSelectedAt.getTime() + this.expirationMs);
    }

    hideExpirationField() {
      if (!this.isDemoTarget) return;
      const expirationField = this.target.querySelector(".field_expiration_date");
      if (!expirationField) return;
      expirationField.style.display = "none";
    }

    buildCancelUrl() {
      if (!this.merchantCode || !this.orderId) return `${CONFIG.cancelApiBaseUrl}/charges/{{merchant_code}}/{{order_id}}`;
      return `${CONFIG.cancelApiBaseUrl}/charges/${encodeURIComponent(this.merchantCode)}/${encodeURIComponent(this.orderId)}`;
    }

    logCancelEndpoint(tag, tokenPreview = "{{access_token}}") {
      console.log(`[VFF][QR][CANCELACION][${tag}]`, {
        method: "DELETE",
        url: this.buildCancelUrl(),
        headers: {
          Authorization: `Bearer ${tokenPreview}`,
          "ALG-API-VERSION": CONFIG.algApiVersion
        }
      });
    }

    setCancelState(state, { note = "", httpStatus = "", countdownText = "" } = {}) {
      const lines = ["API de Cancelacion QR", `Estado: ${state}`];
      if (countdownText) lines.push(`Contador: ${countdownText}`);
      if (note) lines.push("", `Nota: ${note}`);
      if (httpStatus) lines.push("", `HTTP: ${httpStatus}`);
      const type = state === "CANCELADO" ? "success" : state === "ERROR" ? "error" : "info";
      this.noticeService.setCancellation(this.target.id, lines.join("\n"), type);
    }

    clearCancelTimer() {
      if (this.cancelTimerId) {
        clearTimeout(this.cancelTimerId);
        this.cancelTimerId = null;
      }
    }

    clearCountdown() {
      if (this.countdownIntervalId) {
        clearInterval(this.countdownIntervalId);
        this.countdownIntervalId = null;
      }
    }

    startCountdown(expirationDate) {
      this.clearCountdown();
      const update = () => {
        const msLeft = expirationDate.getTime() - Date.now();
        this.setCancelState("PROGRAMADO", {
          countdownText: Utils.formatCountdown(msLeft),
          note: `Se ejecutara automaticamente a las ${Utils.formatDateTime(expirationDate)}`
        });
        if (msLeft <= 0) this.clearCountdown();
      };
      update();
      this.countdownIntervalId = setInterval(update, 1000);
    }

    async executeCancellation() {
      if (this.disposed || !this.qrSelectedAt) return;
      this.clearCountdown();
      if (!this.merchantCode || !this.orderId) {
        this.setCancelState("ERROR", { note: "No se pudo ejecutar DELETE porque falta merchant_code u order_id." });
        return;
      }
      if (!this.initialAccessToken) {
        this.setCancelState("ERROR", { note: "No hay token inicial para ejecutar el DELETE." });
        return;
      }

      this.logCancelEndpoint("EJECUTANDO", Utils.maskToken(this.initialAccessToken));
      this.setCancelState("EJECUTANDO", { note: "Enviando solicitud de cancelacion..." });

      try {
        const result = await this.apiService.cancelCharge({
          merchantCode: this.merchantCode,
          orderId: this.orderId,
          accessToken: this.initialAccessToken
        });

        window.__vffQrCancellationResult = {
          ok: result.ok,
          status: result.status,
          statusText: result.statusText,
          url: result.url,
          merchant_code: this.merchantCode,
          order_id: this.orderId,
          response: result.response
        };
        console.log("[VFF][QR][CANCELACION]", window.__vffQrCancellationResult);

        this.setCancelState(result.ok ? "CANCELADO" : "ERROR", {
          httpStatus: `${result.status} ${result.statusText || ""}`.trim(),
          note: "Revisa consola para detalle del endpoint y respuesta."
        });
      } catch (error) {
        window.__vffQrCancellationResult = {
          ok: false,
          status: 0,
          statusText: "NETWORK_ERROR",
          url: this.buildCancelUrl(),
          merchant_code: this.merchantCode,
          order_id: this.orderId,
          response: String(error?.message || error)
        };
        console.error("[VFF][QR][CANCELACION] error", error);
        this.setCancelState("ERROR", { note: `Revisa consola: ${String(error?.message || error)}` });
      }
    }

    scheduleCancellation() {
      const expirationDate = this.getExpirationDate();
      if (!expirationDate) return;
      this.clearCancelTimer();
      this.clearCountdown();

      if (!this.merchantCode || !this.orderId) {
        this.setCancelState("PENDIENTE", {
          countdownText: Utils.formatCountdown(expirationDate.getTime() - Date.now()),
          note: `Esperando merchant_code/order_id. Vence: ${Utils.formatDateTime(expirationDate)}`
        });
        return;
      }

      const msUntilExpiration = expirationDate.getTime() - Date.now();
      if (msUntilExpiration <= 0) {
        this.executeCancellation();
        return;
      }

      this.logCancelEndpoint("PROGRAMADO");
      this.startCountdown(expirationDate);
      this.cancelTimerId = setTimeout(() => {
        this.cancelTimerId = null;
        this.executeCancellation();
      }, msUntilExpiration);
    }

    setChargeData(resp) {
      const merchantFromResp = resp?.merchant_code || resp?.data?.merchant_code || null;
      const orderFromResp = resp?.merchant_operation_number || resp?.order_id || resp?.data?.order_id || null;
      if (merchantFromResp) {
        this.merchantCode = merchantFromResp;
        window.__vffQrMerchantCode = merchantFromResp;
      }
      if (orderFromResp) {
        this.orderId = orderFromResp;
        window.__vffQrOrderId = orderFromResp;
      }
      if (this.qrSelectedAt) this.scheduleCancellation();
    }

    forceNow() {
      if (!this.qrSelectedAt) {
        console.log("[VFF][QR][CANCELACION][MANUAL] Primero selecciona QR.");
        return;
      }
      this.executeCancellation();
    }

    stopInteraction() {
      if (this.cleaned) return;
      this.cleaned = true;
      clearTimeout(this.initialSelectionTimeout);
      clearTimeout(this.expirationFieldTimeout);
      this.target.removeEventListener("click", this.onClick, true);
    }

    dispose() {
      if (this.disposed) return;
      this.disposed = true;
      this.stopInteraction();
      this.clearCancelTimer();
      this.clearCountdown();
    }
  }

  class CheckoutApp {
    constructor(config) {
      this.config = config;
      this.logger = new Logger(config.debug);
      this.noticeService = new NoticeService();
      this.authService = new AuthService(config);
      this.apiService = new ApiService(config, this.authService);
      this.controllers = new Map();
      this.flexScriptPromise = null;
      this.flexScriptUrl = "";
      this.lastOperationSeed = 0;
      this.operationSequence = 0;

      const savedEnvironment = this.readStoredEnvironment();
      const preferredEnvironment = savedEnvironment || this.config.environment || "tst";
      this.setEnvironment(preferredEnvironment, { persist: false });
    }

    readStoredEnvironment() {
      try {
        return String(localStorage.getItem("vffEnvironment") || "").trim();
      } catch (_e) {
        return "";
      }
    }

    persistEnvironment(key) {
      try {
        localStorage.setItem("vffEnvironment", key);
      } catch (_e) {}
    }

    resolveEnvironmentKey(rawKey) {
      const key = String(rawKey || "").trim().toLowerCase();
      if (this.config.environments && this.config.environments[key]) return key;
      return "tst";
    }

    getEnvironmentConfig(rawKey) {
      const key = this.resolveEnvironmentKey(rawKey || this.config.environment);
      return this.config.environments[key];
    }

    setEnvironment(rawKey, { persist = true } = {}) {
      const key = this.resolveEnvironmentKey(rawKey);
      const env = this.getEnvironmentConfig(key);
      if (!env) return;

      this.config.environment = key;
      this.config.authBaseUrl = env.authBaseUrl;
      this.config.apiDevBaseUrl = env.apiDevBaseUrl;
      this.config.cancelApiBaseUrl = env.cancelApiBaseUrl;
      this.config.apiAudience = env.apiAudience || env.apiDevBaseUrl;

      const creds = env.creds || {};
      this.config.creds = {
        clientId: String(creds.clientId || "").trim(),
        clientSecret: String(creds.clientSecret || "").trim(),
        merchantCode: String(creds.merchantCode || "").trim()
      };

      if (persist) this.persistEnvironment(key);
    }

    updateCredentialInputs() {
      const clientIdInput = document.getElementById("secureClientId");
      const clientSecretInput = document.getElementById("secureClientSecret");
      const merchantCodeInput = document.getElementById("secureMerchantCode");
      if (!clientIdInput || !clientSecretInput || !merchantCodeInput) return;
      clientIdInput.value = this.config.creds.clientId || "";
      clientSecretInput.value = this.config.creds.clientSecret || "";
      merchantCodeInput.value = this.config.creds.merchantCode || "";
    }

    updateEnvironmentInput() {
      const environmentInput = document.getElementById("secureEnvironment");
      if (!environmentInput) return;
      environmentInput.value = this.resolveEnvironmentKey(this.config.environment);
    }

    ensureFlexCss(cssUrl) {
      if (!cssUrl) return;
      let cssEl = document.getElementById("flexPaymentCss");
      if (!cssEl) {
        cssEl = document.createElement("link");
        cssEl.id = "flexPaymentCss";
        cssEl.rel = "stylesheet";
        cssEl.type = "text/css";
        document.head.appendChild(cssEl);
      }
      if (cssEl.getAttribute("href") !== cssUrl) {
        cssEl.setAttribute("href", cssUrl);
      }
    }

    ensureFlexScript(jsUrl) {
      if (!jsUrl) return Promise.reject(new Error("No hay URL de script Flex para el ambiente seleccionado."));

      if (this.flexScriptPromise && this.flexScriptUrl === jsUrl) {
        return this.flexScriptPromise;
      }

      const existing = document.getElementById("flexPaymentJs");
      const existingSrc = existing ? String(existing.getAttribute("src") || "").trim() : "";
      if (existing && existingSrc === jsUrl && typeof window.FlexPaymentForms === "function") {
        this.flexScriptUrl = jsUrl;
        this.flexScriptPromise = Promise.resolve();
        return this.flexScriptPromise;
      }

      if (existing) existing.remove();

      this.flexScriptUrl = jsUrl;
      this.flexScriptPromise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.id = "flexPaymentJs";
        script.src = jsUrl;
        script.async = false;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`No se pudo cargar FlexPaymentForms desde ${jsUrl}`));
        document.head.appendChild(script);
      }).then(() => {
        if (typeof window.FlexPaymentForms !== "function") {
          throw new Error("FlexPaymentForms no esta disponible despues de cargar el script.");
        }
      }).catch((error) => {
        this.flexScriptPromise = null;
        this.flexScriptUrl = "";
        throw error;
      });

      return this.flexScriptPromise;
    }

    async ensureFlexAssets() {
      const env = this.getEnvironmentConfig();
      if (!env) throw new Error("Ambiente de Flex no configurado.");
      this.ensureFlexCss(env.css);
      await this.ensureFlexScript(env.js);
    }

    setCredentials({ clientId, clientSecret, merchantCode } = {}) {
      const current = this.config.creds || {};
      const clean = (value) => String(value ?? "").trim();
      const next = {
        clientId: clean(clientId) || current.clientId,
        clientSecret: clean(clientSecret) || current.clientSecret,
        merchantCode: clean(merchantCode) || current.merchantCode
      };
      this.config.creds = next;
    }

    bindSecureCredentialsPanel() {
      const toggle = document.getElementById("secureCredentialsToggle");
      const panel = document.getElementById("secureCredentialsPanel");
      const devIndicator = document.getElementById("secureDevIndicator");
      const environmentInput = document.getElementById("secureEnvironment");
      const usageMode = document.getElementById("secureUsageMode");
      const profileRow = document.getElementById("secureProfileRow");
      const profileSelect = document.getElementById("secureProfileSelect");
      const profileActionsToggle = document.getElementById("secureProfileActionsToggle");
      const profileActionsMenu = document.getElementById("secureProfileActionsMenu");
      const actionEdit = document.getElementById("secureActionEdit");
      const actionExport = document.getElementById("secureActionExport");
      const actionDelete = document.getElementById("secureActionDelete");
      const saveProfileBtn = document.getElementById("secureSaveProfileBtn");
      const showSecretBtn = document.getElementById("secureShowSecretBtn");
      const clientIdInput = document.getElementById("secureClientId");
      const clientSecretInput = document.getElementById("secureClientSecret");
      const merchantCodeInput = document.getElementById("secureMerchantCode");
      const clientIdField = clientIdInput ? clientIdInput.closest(".ops-field") : null;
      const clientSecretField = clientSecretInput ? clientSecretInput.closest(".ops-field") : null;
      const merchantCodeField = merchantCodeInput ? merchantCodeInput.closest(".ops-field") : null;
      const profileModal = document.getElementById("secureProfileModal");
      const profileModalTitle = document.getElementById("secureProfileModalTitle");
      const profileNameInput = document.getElementById("secureProfileNameInput");
      const profileModalCancel = document.getElementById("secureProfileModalCancel");
      const profileModalSave = document.getElementById("secureProfileModalSave");

      if (
        !toggle ||
        !panel ||
        !devIndicator ||
        !environmentInput ||
        !usageMode ||
        !profileRow ||
        !profileSelect ||
        !profileActionsToggle ||
        !profileActionsMenu ||
        !actionEdit ||
        !actionExport ||
        !actionDelete ||
        !saveProfileBtn ||
        !showSecretBtn ||
        !clientIdInput ||
        !clientSecretInput ||
        !merchantCodeInput ||
        !clientIdField ||
        !clientSecretField ||
        !merchantCodeField ||
        !profileModal ||
        !profileModalTitle ||
        !profileNameInput ||
        !profileModalCancel ||
        !profileModalSave
      ) {
        return;
      }

      if (toggle.dataset.bound === "1") return;
      toggle.dataset.bound = "1";

      const PROFILE_STORAGE_KEY = "paymentCredentialProfiles";
      let editingProfileId = null;
      let selectedProfileId = "";

      const loadProfiles = () => {
        try {
          const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
          const parsed = raw ? JSON.parse(raw) : [];
          return Array.isArray(parsed) ? parsed : [];
        } catch (_e) {
          return [];
        }
      };
      let profiles = loadProfiles();

      const saveProfiles = () => {
        try {
          localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profiles));
        } catch (_e) {}
      };

      const createProfileId = () => `profile_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const readCredentials = () => ({
        clientId: String(clientIdInput.value || "").trim(),
        clientSecret: String(clientSecretInput.value || "").trim(),
        merchantCode: String(merchantCodeInput.value || "").trim()
      });

      this.updateEnvironmentInput();
      this.updateCredentialInputs();

      const syncCredentials = () => {
        this.setCredentials({
          clientId: clientIdInput.value,
          clientSecret: clientSecretInput.value,
          merchantCode: merchantCodeInput.value
        });
      };

      const applyCredentials = (profile) => {
        if (!profile) return;
        clientIdInput.value = String(profile.clientId || "");
        clientSecretInput.value = String(profile.clientSecret || "");
        merchantCodeInput.value = String(profile.merchantCode || "");
        clientSecretInput.type = "password";
        showSecretBtn.textContent = "Mostrar";
        syncCredentials();
      };

      const showGuestCredentialsAsBlank = () => {
        clientIdInput.value = "";
        clientSecretInput.value = "";
        merchantCodeInput.value = "";
        clientSecretInput.type = "password";
        showSecretBtn.textContent = "Mostrar";
      };

      const updateSaveProfileButton = () => {
        const selectedProfile = getVisibleProfiles().find((profile) => profile.id === selectedProfileId);
        const canEdit = usageMode.value === "saved_profile" && !!selectedProfile;
        saveProfileBtn.textContent = canEdit ? "Editar credenciales" : "Guardar como perfil";
        saveProfileBtn.title = canEdit ? "Editar perfil" : "Guardar como perfil";
      };

      const getProfileEnvironment = (profile) => this.resolveEnvironmentKey(profile?.environment || "tst");

      const getVisibleProfiles = () => {
        const currentEnvironment = this.resolveEnvironmentKey(environmentInput.value || this.config.environment);
        return profiles.filter((profile) => getProfileEnvironment(profile) === currentEnvironment);
      };

      const renderProfileOptions = () => {
        const visibleProfiles = getVisibleProfiles();
        const previous = selectedProfileId;
        profileSelect.innerHTML = '<option value="">Seleccionar perfil</option>';
        visibleProfiles.forEach((profile) => {
          const option = document.createElement("option");
          option.value = profile.id;
          option.textContent = profile.profileName || "Perfil";
          profileSelect.appendChild(option);
        });

        if (previous && visibleProfiles.some((profile) => profile.id === previous)) {
          selectedProfileId = previous;
          profileSelect.value = previous;
        } else {
          selectedProfileId = "";
          profileSelect.value = "";
        }

        updateSaveProfileButton();
      };

      const updateModeUI = () => {
        const isSavedMode = usageMode.value === "saved_profile";
        const isGuestMode = usageMode.value === "guest";
        profileRow.hidden = !isSavedMode;
        profileRow.style.display = isSavedMode ? "flex" : "none";
        clientIdField.hidden = !isSavedMode;
        clientSecretField.hidden = !isSavedMode;
        merchantCodeField.hidden = !isSavedMode;
        saveProfileBtn.hidden = !isSavedMode;
        [clientIdInput, clientSecretInput, merchantCodeInput].forEach((input) => {
          input.readOnly = isGuestMode;
        });
        showSecretBtn.disabled = isGuestMode;
        if (isGuestMode) {
          this.setEnvironment(environmentInput.value, { persist: false });
          showGuestCredentialsAsBlank();
        } else {
          const selectedProfile = getVisibleProfiles().find((profile) => profile.id === selectedProfileId);
          if (selectedProfile) {
            applyCredentials(selectedProfile);
          } else {
            this.updateCredentialInputs();
            clientSecretInput.type = "password";
            showSecretBtn.textContent = "Mostrar";
          }
        }
        updateSaveProfileButton();
      };

      const closeActionsMenu = () => {
        profileActionsMenu.hidden = true;
      };

      const openProfileModal = (title, initialValue = "", profileId = null) => {
        editingProfileId = profileId;
        profileModalTitle.textContent = title;
        profileNameInput.value = initialValue;
        profileModal.hidden = false;
        setTimeout(() => profileNameInput.focus(), 0);
      };

      const closeProfileModal = () => {
        profileModal.hidden = true;
        editingProfileId = null;
      };

      const downloadProfileJson = (profile) => {
        if (!profile) return;
        const exportPayload = {
          environment: profile.environment || this.resolveEnvironmentKey(this.config.environment),
          clientId: profile.clientId || "",
          clientSecret: profile.clientSecret || "",
          merchantCode: profile.merchantCode || ""
        };
        const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${profile.profileName || "payment-profile"}.json`;
        a.click();
        URL.revokeObjectURL(url);
      };

      renderProfileOptions();
      updateModeUI();

      [clientIdInput, clientSecretInput, merchantCodeInput].forEach((input) => {
        input.addEventListener("change", syncCredentials);
        input.addEventListener("blur", syncCredentials);
      });

      environmentInput.addEventListener("change", async () => {
        this.setEnvironment(environmentInput.value);
        this.updateEnvironmentInput();
        this.updateCredentialInputs();
        renderProfileOptions();
        if (usageMode.value === "saved_profile" && selectedProfileId) {
          const selectedProfile = getVisibleProfiles().find((profile) => profile.id === selectedProfileId);
          if (selectedProfile) applyCredentials(selectedProfile);
        }
        try {
          await this.ensureFlexAssets();
        } catch (error) {
          console.error("[VFF][ENV] No se pudieron cargar los assets del ambiente.", error);
          alert("No se pudo cargar el ambiente seleccionado.");
        }
        updateModeUI();
      });

      usageMode.addEventListener("change", () => {
        updateModeUI();
        if (usageMode.value !== "saved_profile") closeActionsMenu();
      });

      profileSelect.addEventListener("change", async () => {
        selectedProfileId = profileSelect.value;
        if (!selectedProfileId) {
          updateSaveProfileButton();
          return;
        }
        const profile = getVisibleProfiles().find((p) => p.id === selectedProfileId) || profiles.find((p) => p.id === selectedProfileId);
        if (!profile) {
          updateSaveProfileButton();
          return;
        }

        const profileEnvironment = profile.environment ? this.resolveEnvironmentKey(profile.environment) : null;
        if (profileEnvironment) {
          this.setEnvironment(profileEnvironment);
          this.updateEnvironmentInput();
          try {
            await this.ensureFlexAssets();
          } catch (error) {
            console.error("[VFF][ENV] No se pudieron cargar los assets del perfil.", error);
          }
        }
        applyCredentials(profile);
        updateSaveProfileButton();
      });

      showSecretBtn.addEventListener("click", () => {
        const isPassword = clientSecretInput.type === "password";
        clientSecretInput.type = isPassword ? "text" : "password";
        showSecretBtn.textContent = isPassword ? "Ocultar" : "Mostrar";
      });

      saveProfileBtn.addEventListener("click", () => {
        const profile = profiles.find((p) => p.id === selectedProfileId);
        if (usageMode.value === "saved_profile" && profile) {
          openProfileModal("Editar perfil", profile.profileName, profile.id);
          return;
        }
        openProfileModal("Guardar como perfil");
      });

      profileActionsToggle.addEventListener("click", (event) => {
        event.stopPropagation();
        if (!selectedProfileId) return;
        profileActionsMenu.hidden = !profileActionsMenu.hidden;
      });

      profileActionsMenu.addEventListener("click", (event) => event.stopPropagation());
      document.addEventListener("click", () => closeActionsMenu());

      actionEdit.addEventListener("click", () => {
        if (!selectedProfileId) return;
        const profile = profiles.find((p) => p.id === selectedProfileId);
        if (!profile) return;
        openProfileModal("Editar perfil", profile.profileName, profile.id);
        closeActionsMenu();
      });

      actionExport.addEventListener("click", () => {
        if (!selectedProfileId) return;
        const profile = profiles.find((p) => p.id === selectedProfileId);
        downloadProfileJson(profile);
        closeActionsMenu();
      });

      actionDelete.addEventListener("click", () => {
        if (!selectedProfileId) return;
        const profile = profiles.find((p) => p.id === selectedProfileId);
        if (!profile) return;
        const ok = window.confirm(`Eliminar perfil "${profile.profileName}"?`);
        if (!ok) return;
        profiles = profiles.filter((p) => p.id !== selectedProfileId);
        selectedProfileId = "";
        profileSelect.value = "";
        saveProfiles();
        renderProfileOptions();
        updateSaveProfileButton();
        closeActionsMenu();
      });

      profileModalCancel.addEventListener("click", closeProfileModal);
      profileModal.addEventListener("click", (event) => {
        if (event.target === profileModal) closeProfileModal();
      });

      profileModalSave.addEventListener("click", () => {
        const profileName = String(profileNameInput.value || "").trim();
        if (!profileName) return;
        const creds = readCredentials();
        const environment = this.resolveEnvironmentKey(environmentInput.value);

        if (editingProfileId) {
          profiles = profiles.map((profile) =>
            profile.id === editingProfileId
              ? { ...profile, profileName, environment, ...creds }
              : profile
          );
          selectedProfileId = editingProfileId;
        } else {
          const profile = { id: createProfileId(), profileName, environment, ...creds };
          profiles.push(profile);
          selectedProfileId = profile.id;
          usageMode.value = "saved_profile";
          updateModeUI();
        }

        saveProfiles();
        renderProfileOptions();
        profileSelect.value = selectedProfileId;
        updateSaveProfileButton();
        closeProfileModal();
      });

      toggle.addEventListener("click", () => {
        const isExpanded = toggle.getAttribute("aria-expanded") === "true";
        const nextExpanded = !isExpanded;
        toggle.setAttribute("aria-expanded", String(nextExpanded));
        panel.hidden = !nextExpanded;
        devIndicator.hidden = !nextExpanded;
        if (nextExpanded) environmentInput.focus();
      });
    }

    isMobileViewport() {
      try {
        return window.matchMedia("(max-width: 980px)").matches;
      } catch (_e) {
        return window.innerWidth <= 980;
      }
    }

    setMobileOptionsVisible(isVisible, { scroll = false } = {}) {
      const stage = document.querySelector(".stage");
      const toggleBtn = document.getElementById("mobileOptionsToggle");
      const options = document.querySelector(".options");
      const paymentWrap = document.querySelector(".payment-wrap");
      if (!stage) return;

      const isMobile = this.isMobileViewport();
      const nextVisible = isMobile ? !!isVisible : true;
      if (isMobile && nextVisible) {
        stage.classList.remove("expandido");
      }
      stage.classList.toggle("mobile-flex-only", isMobile && !nextVisible);
      if (toggleBtn) {
        toggleBtn.hidden = !isMobile;
        toggleBtn.setAttribute("aria-expanded", String(nextVisible));
        toggleBtn.textContent = nextVisible ? "Ver solo Flex" : "Mostrar opciones";
      }

      if (scroll && isMobile) {
        const target = nextVisible ? options : paymentWrap;
        target?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }

    bindMobileOptionsToggle() {
      const toggleBtn = document.getElementById("mobileOptionsToggle");
      if (!toggleBtn) return;
      if (toggleBtn.dataset.bound === "1") return;
      toggleBtn.dataset.bound = "1";

      const toggleVisibility = () => {
        const stage = document.querySelector(".stage");
        const isCollapsed = !!stage?.classList.contains("mobile-flex-only");
        this.setMobileOptionsVisible(isCollapsed, { scroll: true });
      };

      toggleBtn.addEventListener("click", toggleVisibility);

      const media = window.matchMedia("(max-width: 980px)");
      const onViewportChange = () => this.setMobileOptionsVisible(!this.isMobileViewport());
      if (media.addEventListener) {
        media.addEventListener("change", onViewportChange);
      } else if (media.addListener) {
        media.addListener(onViewportChange);
      }

      this.setMobileOptionsVisible(!this.isMobileViewport());
    }

    setMobileNavOpen(isOpen) {
      const navBtn = document.getElementById("mobileHamburgerToggle");
      if (!navBtn) return;
      const isCompact = window.matchMedia("(max-width: 640px)").matches;
      const nextOpen = isCompact ? !!isOpen : false;
      document.body.classList.toggle("mobile-nav-open", nextOpen);
      navBtn.setAttribute("aria-expanded", String(nextOpen));
      navBtn.setAttribute("aria-label", nextOpen ? "Cerrar menu" : "Abrir menu");
      const icon = navBtn.querySelector("i");
      if (icon) {
        icon.classList.toggle("bi-list", !nextOpen);
        icon.classList.toggle("bi-x-lg", nextOpen);
      }
    }

    bindMobileNavToggle() {
      const navBtn = document.getElementById("mobileHamburgerToggle");
      const nav = document.getElementById("mainNav");
      if (!navBtn || !nav) return;
      if (navBtn.dataset.navBound === "1") return;
      navBtn.dataset.navBound = "1";

      navBtn.addEventListener("click", () => {
        const isOpen = document.body.classList.contains("mobile-nav-open");
        this.setMobileNavOpen(!isOpen);
      });

      const checkoutLink = document.getElementById("mainNavCheckout");
      if (checkoutLink) {
        checkoutLink.addEventListener("click", (event) => {
          event.preventDefault();
          const checkout = this.getCheckoutValues();
          this.openNormal(checkout.amount, checkout.currency.numeric);
        });
      }

      nav.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => this.setMobileNavOpen(false));
      });

      const media = window.matchMedia("(max-width: 640px)");
      const onViewportChange = () => this.setMobileNavOpen(false);
      if (media.addEventListener) {
        media.addEventListener("change", onViewportChange);
      } else if (media.addListener) {
        media.addListener(onViewportChange);
      }

      this.setMobileNavOpen(false);
    }

    bindMobileHeaderAutoHide() {
      if (this._mobileHeaderBound) return;
      this._mobileHeaderBound = true;

      let lastY = Math.max(0, window.scrollY || 0);
      let ticking = false;

      const update = () => {
        ticking = false;
        const y = Math.max(0, window.scrollY || 0);
        const isMobile = this.isMobileViewport();

        if (!isMobile) {
          document.body.classList.remove("mobile-header-hidden");
          lastY = y;
          return;
        }

        if (document.body.classList.contains("mobile-nav-open")) {
          document.body.classList.remove("mobile-header-hidden");
          lastY = y;
          return;
        }

        const stage = document.querySelector(".stage");
        const optionsVisible = stage && !stage.classList.contains("mobile-flex-only");
        if (optionsVisible) {
          document.body.classList.remove("mobile-header-hidden");
          lastY = y;
          return;
        }

        if (y <= 8) {
          document.body.classList.remove("mobile-header-hidden");
          lastY = y;
          return;
        }

        if (y > lastY + 6) {
          document.body.classList.add("mobile-header-hidden");
        } else if (y < lastY - 6) {
          document.body.classList.remove("mobile-header-hidden");
        }

        lastY = y;
      };

      const onScroll = () => {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(update);
      };

      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll, { passive: true });
      update();
    }

    focusFlexOnMobile() {
      this.setMobileNavOpen(false);
      this.setMobileOptionsVisible(false, { scroll: true });
    }

    parseAmount(rawAmount) {
      const parsed = Number.parseFloat(String(rawAmount ?? "").replace(",", "."));
      if (!Number.isFinite(parsed) || parsed <= 0) return 100;
      return parsed;
    }

    parseCurrency(rawCurrency) {
      const normalized = String(rawCurrency ?? "PEN").trim().toUpperCase();
      if (normalized === "USD") {
        return { iso: "USD", numeric: "840" };
      }
      return { iso: "PEN", numeric: "604" };
    }

    getCheckoutValues(monto, moneda) {
      const amountFromUi = document.getElementById("paymentAmount")?.value;
      const currencyFromUi = document.getElementById("paymentCurrency")?.value;
      const amount = this.parseAmount(monto ?? amountFromUi);
      const currency = this.parseCurrency(moneda ?? currencyFromUi);
      return { amount, currency };
    }

    generateOperationNumber() {
      const seed = Date.now();
      this.operationSequence = seed === this.lastOperationSeed ? this.operationSequence + 1 : 0;
      this.lastOperationSeed = seed;
      return `${seed}${String(this.operationSequence).padStart(3, "0")}`;
    }

    buildPayload(monto, currencyCode = "604") {
      const profile = {
        first_name: "Peter",
        last_name: "Kukurelo",
        email: "peter.kukurelo@pay-me.com",
        phone: { country_code: "+51", subscriber: "999999999" },
        location: {
          line_1: "Av. Ejemplo 123",
          line_2: "",
          city: "Lima",
          state: "",
          country: "Peru"
        }
      };
      return {
        action: "authorize",
        channel: "ecommerce",
        merchant_code: this.config.creds.merchantCode,
        merchant_operation_number: this.generateOperationNumber(),
        payment_method: {},
        payment_details: {
          amount: Math.round(monto).toString(),
          currency: currencyCode,
          billing: profile,
          shipping: profile,
          customer: profile
        }
      };
    }

    getMethods() {
      const selected = [...document.querySelectorAll('input[name="pm"]:checked')].map((i) => i.value);
      return selected.length ? selected : ["CARD"];
    }

    clearRuntimeOrderState() {
      window.__vffQrExpirationMessage = null;
      window.__vffQrSelectedAt = null;
      window.__vffQrCancellationResult = null;
      window.__vffQrMerchantCode = null;
      window.__vffQrOrderId = null;
      window.__vffActiveQrController = null;
    }

    disposeController(targetId) {
      const controller = this.controllers.get(targetId);
      if (!controller) return;
      controller.dispose();
      this.controllers.delete(targetId);
      if (window.__vffActiveQrController === controller) {
        window.__vffActiveQrController = null;
      }
    }

    disposeAllControllers() {
      [...this.controllers.keys()].forEach((targetId) => this.disposeController(targetId));
    }

    resetTargetState(target, loadingEl) {
      this.disposeController(target.id);
      this.clearRuntimeOrderState();
      this.logger.attachWatchers();
      this.logger.state("cargarFormulario:start");
      target.classList.remove("response-mode");
      this.noticeService.clearForTarget(target.id);
      loadingEl.classList.remove("welcome");
      loadingEl.innerHTML = 'Cargando pasarela<span class="dots"></span>';
      loadingEl.style.display = "block";
      target.style.display = "none";
      target.innerHTML = "";
      const legacy = target.id === "demo" ? document.getElementById("trxResponse") : document.getElementById("trxResponseModal");
      if (legacy) {
        legacy.style.display = "none";
        legacy.textContent = "";
      }
    }

    getController(targetId) {
      return this.controllers.get(targetId) || null;
    }

    setController(targetId, controller) {
      const prev = this.controllers.get(targetId);
      if (prev) prev.dispose();
      this.controllers.set(targetId, controller);
      window.__vffActiveQrController = controller;
    }

    async load(target, loadingEl, monto, currencyCode = "604") {
      this.disposeAllControllers();
      this.resetTargetState(target, loadingEl);
      const methods = this.getMethods();
      let controller = null;

      try {
        await this.ensureFlexAssets();
        const token = await this.authService.getAccessToken(this.config.apiAudience || this.config.apiDevBaseUrl || "https://api.dev.alignet.io");
        const nonce = await this.authService.getNonce(token);
        const payload = this.buildPayload(monto, currencyCode);

        controller = new QrCancellationController({
          target,
          noticeService: this.noticeService,
          apiService: this.apiService,
          initialAccessToken: token,
          merchantCode: payload.merchant_code,
          orderId: payload.merchant_operation_number,
          expirationMs: this.config.qrExpirationMs
        });
        controller.bind();
        this.setController(target.id, controller);

        const renderer = new ResponseRenderer({
          apiService: this.apiService,
          payload,
          logger: this.logger
        });

        const pf = new FlexPaymentForms({
          nonce,
          payload,
          settings: {
            show_close_button: true,
            display_result_screen: true
          },
          display_settings: { methods },
          i18n: {
            mode: "multi",
            default_language: "es",
            languages: ["es", "en"]
          }
        });

        let finalized = false;
        const finalize = (kind, data) => {
          if (finalized) {
            console.log("[FINALIZE] duplicado ignorado", kind, target.id, data);
            return;
          }
          finalized = true;
          console.log("[FINALIZE]", kind, target.id, data);
          try {
            controller.setChargeData(data);
            controller.stopInteraction();
            try {
              if (pf.terminate) pf.terminate();
            } catch (e) {
              console.warn("[FINALIZE] terminate", e);
            }
            renderer.render(target, data);
          } catch (e) {
            console.error("[FINALIZE] render fallo", e);
          }
        };

        const onSuccess = (resp) => {
          this.logger.state("onSuccess:before-finalize");
          finalize("success", resp);
          this.logger.state("onSuccess:after-finalize");
        };
        const onCancel = (resp) => {
          this.logger.state("onCancel:before-finalize");
          finalize("cancel", resp);
          this.logger.state("onCancel:after-finalize");
        };
        const onError = (error) => {
          this.logger.state("onError:start");
          console.error(error);
          const errorMsg = String(error?.error?.message || error?.message || "").toLowerCase();
          const isModalFlow = target.id === "demoModal";
          const isCartClosedError = errorMsg.includes("carrito") && (errorMsg.includes("cerre") || errorMsg.includes("cerro") || errorMsg.includes("cerr"));
          if (isCartClosedError && isModalFlow) {
            this.closeModal();
            const demo = document.getElementById("demo");
            if (demo) {
              demo.innerHTML = "";
              demo.style.display = "none";
            }
            document.querySelector(".stage")?.classList.remove("flow-activo");
            return;
          }
          finalize("error", error);
          this.logger.state("onError:after-finalize");
        };

        pf.init(target, onSuccess, onCancel, onError);
        loadingEl.style.display = "none";
        target.style.display = "block";
        this.logger.state("cargarFormulario:after-init");
      } catch (e) {
        if (controller) controller.dispose();
        console.error(e);
        alert("Error al cargar formulario.");
        loadingEl.style.display = "none";
      }
    }

    openNormal(monto, currencyCode = "604") {
      document.querySelector(".stage")?.classList.remove("expandido");
      this.focusFlexOnMobile();
      return this.load(document.getElementById("demo"), document.getElementById("loading"), monto, currencyCode);
    }

    openModal(monto, currencyCode = "604") {
      document.querySelector(".stage")?.classList.remove("expandido");
      document.getElementById("paymentModal").style.display = "block";
      return this.load(document.getElementById("demoModal"), document.getElementById("loadingModal"), monto, currencyCode);
    }

    openExpanded(monto, currencyCode = "604") {
      document.querySelector(".stage")?.classList.add("expandido");
      this.focusFlexOnMobile();
      return this.load(document.getElementById("demo"), document.getElementById("loading"), monto, currencyCode);
    }

    closeModal() {
      document.getElementById("paymentModal").style.display = "none";
      document.getElementById("demoModal").innerHTML = "";
      this.noticeService.clearForTarget("demoModal");
      this.disposeController("demoModal");
      this.clearRuntimeOrderState();
    }

    forceCancellation() {
      const controller = window.__vffActiveQrController || this.getController("demo") || this.getController("demoModal");
      if (!controller) {
        console.log("[VFF][QR][CANCELACION][MANUAL] No hay flujo activo.");
        return;
      }
      controller.forceNow();
    }
  }

  const app = new CheckoutApp(CONFIG);
  app.bindSecureCredentialsPanel();
  app.bindMobileNavToggle();
  app.bindMobileOptionsToggle();
  app.bindMobileHeaderAutoHide();
  const getCheckoutValues = (monto, moneda) => app.getCheckoutValues(monto, moneda);
  window.abrirFormularioNormal = (monto, moneda) => {
    const checkout = getCheckoutValues(monto, moneda);
    return app.openNormal(checkout.amount, checkout.currency.numeric);
  };
  window.abrirModal = (monto, moneda) => {
    const checkout = getCheckoutValues(monto, moneda);
    return app.openModal(checkout.amount, checkout.currency.numeric);
  };
  window.abrirFormularioExpandido = (monto, moneda) => {
    const checkout = getCheckoutValues(monto, moneda);
    return app.openExpanded(checkout.amount, checkout.currency.numeric);
  };
  window.cerrarModal = () => app.closeModal();
  window.volverAlInicio = () => window.location.reload();
  window.forceQrCancellationNow = () => app.forceCancellation();
  window.printQrExpiration = () => {
    if (window.__vffQrExpirationMessage) {
      console.log("[VFF][QR][EXPIRACION][MANUAL]", window.__vffQrExpirationMessage);
    } else {
      console.log("[VFF][QR][EXPIRACION][MANUAL] Sin mensaje aun. Selecciona QR primero.");
    }
  };
  window.printQrCancellation = () => {
    if (window.__vffQrCancellationResult) {
      console.log("[VFF][QR][CANCELACION][MANUAL]", window.__vffQrCancellationResult);
    } else {
      console.log("[VFF][QR][CANCELACION][MANUAL] Sin resultado aun.");
    }
  };
  window.vffDebugState = (label = "manual") => app.logger.state(label);
})();
