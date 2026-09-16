const DEFAULT_PROMPT = [
  "You are a replaceable reasoning engine inside a local system.",
  "The system owns state and authority. Never claim to approve or execute actions.",
  "If the user requests publishing, end your response with exactly",
  "'PROPOSED_ACTION: PUBLISH'. Otherwise end with 'PROPOSED_ACTION: NONE'.",
].join(" ");

class ReasoningProvider {
  constructor(name) {
    this.name = name;
  }

  async reason(_request) {
    throw new Error("ReasoningProvider.reason must be implemented.");
  }
}

function promptFor(request) {
  return `${DEFAULT_PROMPT}\n\nSYSTEM-OWNED STATE:\n${JSON.stringify(request.systemState, null, 2)}\n\nUSER MESSAGE:\n${request.userMessage}`;
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(120000),
  });
  if (!response.ok) throw new Error(`Provider returned HTTP ${response.status}.`);
  return response.json();
}

class OllamaProvider extends ReasoningProvider {
  constructor() {
    super("Provider A (Ollama)");
    this.url = process.env.OLLAMA_URL || "http://localhost:11434/api/generate";
    this.model = process.env.OLLAMA_MODEL || "llama3.2";
  }

  async reason(request) {
    const result = await postJson(this.url, {
      model: this.model,
      prompt: promptFor(request),
      stream: false,
    });
    return result.response;
  }
}

class OpenAICompatibleProvider extends ReasoningProvider {
  constructor() {
    super("Provider B (OpenAI-compatible)");
    this.url = process.env.OPENAI_COMPATIBLE_URL || "http://localhost:1234/v1/chat/completions";
    this.model = process.env.OPENAI_COMPATIBLE_MODEL || "local-model";
  }

  async reason(request) {
    const result = await postJson(this.url, {
      model: this.model,
      messages: [
        {
          role: "system",
          content: "You are a replaceable reasoning engine. Follow the system prompt in the user message.",
        },
        { role: "user", content: promptFor(request) },
      ],
    });
    return result.choices[0].message.content;
  }
}

module.exports = {
  ReasoningProvider,
  OllamaProvider,
  OpenAICompatibleProvider,
};
