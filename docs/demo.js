const samples = {
  chat: {
    title: "Ask AI",
    query: "Explain an API in one sentence.",
    text: "An API is a way for one program to request data or actions from another, using an agreed set of rules.\n\nA restaurant menu is a useful analogy: you choose what to request without needing to know how the kitchen works.",
    html: "<h3>A small interface. A useful connection.</h3><p>An <strong>API</strong> is a way for one program to request data or actions from another, using an agreed set of rules.</p><p>A restaurant menu is a useful analogy: you choose what to request without needing to know how the kitchen works.</p>",
  },
  dictionary: {
    title: "Dictionary",
    query: "hello",
    text: "hello / huh-LOH\ninterjection\n\nA greeting used when meeting someone, answering the phone, or starting a conversation.\n\nExample: Hello! It's lovely to see you again.\nSimilar expressions: hi, hey, good morning.",
    html: "<h3>hello <small>/ huh-LOH</small></h3><p><em>interjection</em></p><p>A greeting used when meeting someone, answering the phone, or starting a conversation.</p><p><strong>Example</strong><br />Hello! It's lovely to see you again.</p><p><strong>Similar expressions</strong><br />hi &middot; hey &middot; good morning</p>",
  },
  translator: {
    title: "Translator",
    query: "Translate into Spanish: Nice to meet you.",
    text: "Encantado de conocerte.\n\nA natural informal greeting. Set your own target language in the Translator command; there is no default translation language.",
    html: "<h3>Encantado de conocerte.</h3><p>A natural informal greeting.</p><p>Set your own target language in the Translator command; there is <strong>no default translation language</strong>.</p>",
  },
  agents: {
    title: "Ask AI / remote agent",
    query: "Summarize what you found, then suggest next steps.",
    text: "Your agent, within reach.\n\nPocket AI can connect to your Hermes or OpenClaw harness. Its own configured tools handle research and execution.\n\nAsk a follow-up in the same input bar. Approvals and cancellation remain available.",
    html: "<h3>Your agent, within reach.</h3><p>Pocket AI can connect to your <strong>Hermes</strong> or <strong>OpenClaw</strong> harness. Its own configured tools handle research and execution.</p><ul><li>Keep the server-owned conversation.</li><li>Ask a follow-up in the same input bar.</li><li>Review approvals and stop remote work.</li></ul>",
  },
};

let timer;
let scene = "chat";
const answer = document.getElementById("demo-answer");
const backend = document.getElementById("demo-backend");
const status = document.getElementById("stream-status");

function play(name) {
  clearInterval(timer);
  scene = name;
  const sample = samples[name];
  document.getElementById("tool-title").textContent = `/ ${sample.title}`;
  document.getElementById("demo-query").value = sample.query;
  document.getElementById("question").textContent = sample.query;
  document.querySelectorAll("[data-scene]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.scene === name));
  });
  backend.disabled = name === "dictionary" || name === "translator";
  if (backend.disabled) backend.value = "direct";
  if (name === "agents" && backend.value === "direct") backend.value = "hermes";
  document.getElementById("model-note").textContent =
    backend.value === "direct"
      ? "Model: your chosen model"
      : "Agent profile: configured on your server";
  answer.classList.add("streaming");
  answer.textContent = "";
  status.textContent = "Streaming";
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let length = 0;
  function tick() {
    length += reduced ? sample.text.length : 5;
    answer.textContent = sample.text.slice(0, length);
    if (length >= sample.text.length) {
      clearInterval(timer);
      answer.classList.remove("streaming");
      answer.innerHTML = sample.html;
      status.textContent = "Sample complete";
    }
  }
  tick();
  if (!reduced) timer = setInterval(tick, 25);
}

document.querySelectorAll("[data-scene]").forEach((button) => {
  button.addEventListener("click", () => play(button.dataset.scene));
});
backend.addEventListener("change", () =>
  play(backend.value === "direct" ? "chat" : "agents"),
);
play(scene);
