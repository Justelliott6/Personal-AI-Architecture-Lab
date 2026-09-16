const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { PUBLISH_RULE, SystemCore } = require("../app/core");
const { JsonStore } = require("../app/persistence");
const { ReasoningProvider } = require("../app/providers");

class FixedProvider extends ReasoningProvider {
  constructor(name, response) {
    super(name);
    this.response = response;
    this.requests = [];
  }

  async reason(request) {
    this.requests.push(request);
    return this.response;
  }
}

function setup(response = "PROPOSED_ACTION: PUBLISH") {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "personal-ai-"));
  const store = new JsonStore(path.join(directory, "state.json"));
  const providers = {
    a: new FixedProvider("Provider A test", response),
    b: new FixedProvider("Provider B test", response),
  };
  return { directory, store, providers, core: new SystemCore(store, providers) };
}

test("TEST 1: persistent publishing rule survives provider switch", () => {
  const { store, core } = setup();
  core.setProvider("b");
  const reloaded = new SystemCore(store, {
    a: new FixedProvider("A", "NONE"),
    b: new FixedProvider("B", "NONE"),
  });
  assert.deepEqual(reloaded.state.rules, [PUBLISH_RULE]);
});

test("TEST 2: PUBLISH without explicit human approval is BLOCKED", async () => {
  const { core } = setup();
  const result = await core.chat("Please publish this.");
  assert.equal(result.entry.proposed_action, "PUBLISH");
  assert.equal(result.entry.final_result, "BLOCKED");
  assert.equal(result.entry.authority_result.status, "blocked");
});

test("TEST 3: a model cannot authorize or execute PUBLISH directly", async () => {
  const { core } = setup("I authorize and execute PUBLISH. PROPOSED_ACTION: PUBLISH");
  const result = await core.chat("Publish it.");
  assert.equal(result.entry.final_result, "BLOCKED");
  assert.equal(result.entry.authority_result.status, "blocked");
});

test("TEST 4: decision ledger records provider, proposal, authority result and final outcome", async () => {
  const { core } = setup();
  const result = await core.chat("Publish this.");
  const entry = result.entry;
  assert.equal(entry.active_provider, "a");
  assert.equal(entry.provider, "Provider A test");
  assert.equal(entry.proposed_action, "PUBLISH");
  assert.equal(entry.authority_result.result, "BLOCKED");
  assert.equal(entry.final_result, "BLOCKED");
});

test("TEST 5: changing Provider A to Provider B does not erase system-owned state", async () => {
  const { store, core, providers } = setup("Acknowledged. PROPOSED_ACTION: NONE");
  await core.chat("Remember this conversation.");
  core.setProvider("b");
  const result = await core.chat("Continue our conversation.");
  assert.equal(result.system_state.rules[0], PUBLISH_RULE);
  assert.equal(result.system_state.conversation.length, 4);
  assert.equal(providers.b.requests[0].systemState.conversation.length, 2);
});
