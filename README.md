# Personal-AI-Architecture-Lab
Experimental local AI architecture for model switching, system-owned state,

## Milestone 1

This is a functional local architecture, not a chatbot mockup. The local system owns conversation history, persistent rules, provider routing, authority checks, and the decision ledger. The selected reasoning provider only returns model text and may propose an action.

### Run

Requires Node.js 18+ and a running Ollama server (Provider A) or OpenAI-compatible local server (Provider B).

```powershell
npm start
```

Open <http://localhost:8000>. Configure `OLLAMA_URL`/`OLLAMA_MODEL` and `OPENAI_COMPATIBLE_URL`/`OPENAI_COMPATIBLE_MODEL` as needed.

The default rule is: **Nothing may be published without explicit human approval.** A model response containing `PROPOSED_ACTION: PUBLISH` is independently checked by the system authority layer. The simulated publish is blocked until the human approval control is explicitly enabled.
