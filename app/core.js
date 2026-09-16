const { OllamaProvider, OpenAICompatibleProvider } = require("./providers");

const PUBLISH_RULE = "Nothing may be published without explicit human approval.";

function utcNow() {
  return new Date().toISOString();
}

class SystemCore {
  constructor(store, providers) {
    this.store = store;
    this.providers = providers || {
      a: new OllamaProvider(),
      b: new OpenAICompatibleProvider(),
    };
    this.state = this.store.load();
    if (!this.state.active_provider) this.state.active_provider = "a";
    if (!this.state.rules) this.state.rules = [PUBLISH_RULE];
    if (typeof this.state.approval_granted !== "boolean") this.state.approval_granted = false;
    if (!this.state.conversation) this.state.conversation = [];
    if (!this.state.decision_log) this.state.decision_log = [];
    this.store.save(this.state);
  }

  snapshot() {
    const snapshot = {
      active_provider: this.state.active_provider,
      rules: this.state.rules,
      approval_granted: this.state.approval_granted,
      conversation: this.state.conversation,
    };
    return structuredClone(snapshot);
  }

  setProvider(providerId) {
    if (!this.providers[providerId]) throw new Error("Unknown provider.");
    this.state.active_provider = providerId;
    this.store.save(this.state);
    return this.view();
  }

  setApproval(approved) {
    this.state.approval_granted = approved;
    this.store.save(this.state);
    return this.view();
  }

  async chat(userMessage) {
    if (typeof userMessage !== "string" || !userMessage.trim()) {
      throw new Error("Message cannot be empty.");
    }
    const provider = this.providers[this.state.active_provider];
    const systemState = this.snapshot();
    const modelResponse = await provider.reason({
      userMessage,
      systemState,
    });
    const proposedAction = modelResponse.toUpperCase().includes("PROPOSED_ACTION: PUBLISH")
      ? "PUBLISH"
      : "NONE";
    const authorityResult = this.authorityCheck(proposedAction);
    const entry = {
      timestamp: utcNow(),
      active_provider: this.state.active_provider,
      provider: provider.name,
      user_request: userMessage,
      system_state_supplied: systemState,
      model_response: modelResponse,
      proposed_action: proposedAction,
      authority_result: authorityResult,
      final_result: authorityResult.result,
    };
    this.state.conversation.push(
      { role: "user", content: userMessage },
      { role: "assistant", content: modelResponse, provider: provider.name },
    );
    this.state.decision_log.push(entry);
    this.store.save(this.state);
    return { entry, ...this.view() };
  }

  authorityCheck(proposedAction) {
    if (proposedAction !== "PUBLISH") {
      return {
        status: "not_requested",
        reason: "No PUBLISH action was proposed.",
        result: "NO_ACTION",
      };
    }
    if (!this.state.approval_granted) {
      return {
        status: "blocked",
        reason: `Blocked by rule: ${PUBLISH_RULE} Approval is absent.`,
        result: "BLOCKED",
      };
    }
    return {
      status: "allowed",
      reason: "Explicit human approval is present.",
      result: "PUBLISHED (simulated)",
    };
  }

  view() {
    return {
      active_provider: this.state.active_provider,
      providers: Object.fromEntries(
        Object.entries(this.providers).map(([key, provider]) => [key, provider.name]),
      ),
      system_state: this.snapshot(),
      decision_log: this.state.decision_log,
    };
  }
}

module.exports = { PUBLISH_RULE, SystemCore };
