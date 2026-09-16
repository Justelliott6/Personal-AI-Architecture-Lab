const provider = document.querySelector("#provider");
const chat = document.querySelector("#chat");
const state = document.querySelector("#state");
const log = document.querySelector("#log");
const approval = document.querySelector("#approval");
const approvalState = document.querySelector("#approvalState");

async function api(path, options = {}) {
  const response = await fetch(path, { headers: {"Content-Type": "application/json"}, ...options });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error || "Request failed");
  return value;
}

function render(value) {
  provider.innerHTML = Object.entries(value.providers)
    .map(([id, name]) => `<option value="${id}">${name}</option>`).join("");
  provider.value = value.active_provider;
  state.textContent = JSON.stringify(value.system_state, null, 2);
  approvalState.textContent = value.system_state.approval_granted ? "Approval present" : "No approval";
  approval.textContent = value.system_state.approval_granted ? "Revoke approval" : "Grant explicit human approval";
  chat.innerHTML = value.system_state.conversation.map(item =>
    `<div class="message ${item.role}"><strong>${item.role}${item.provider ? ` (${item.provider})` : ""}</strong><p>${escapeHtml(item.content)}</p></div>`
  ).join("");
  log.innerHTML = value.decision_log.slice().reverse().map(entry =>
    `<article><strong>${entry.final_result}</strong> · ${entry.provider}<p>${escapeHtml(entry.user_message)}</p><small>Proposed: ${entry.proposed_action}<br>${escapeHtml(entry.authority_result.reason)}</small></article>`
  ).join("") || "<p>No decisions yet.</p>";
}

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, character => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[character]));
}

provider.addEventListener("change", async () => render(await api("/api/provider", {method: "POST", body: JSON.stringify({provider: provider.value})})));
approval.addEventListener("click", async () => render(await api("/api/approval", {method: "POST", body: JSON.stringify({approved: !approvalState.textContent.startsWith("Approval")})})));
document.querySelector("#chatForm").addEventListener("submit", async event => {
  event.preventDefault();
  const input = document.querySelector("#message");
  const button = event.target.querySelector("button");
  button.disabled = true;
  try { render(await api("/api/chat", {method: "POST", body: JSON.stringify({message: input.value})})); input.value = ""; }
  catch (error) { alert(error.message); }
  finally { button.disabled = false; }
});
api("/api/state").then(render).catch(error => alert(error.message));
