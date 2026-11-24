const statusEl = document.getElementById('status');
const outputEl = document.getElementById('output');

function formatBody(text) {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

function show(message, isOk, body) {
  statusEl.textContent = message;
  statusEl.className = isOk ? 'ok' : 'error';
  outputEl.textContent = body;
}

async function callApi(method, path) {
  show(`${method} ${path} ...`, true, '');
  try {
    const response = await fetch(path, { method });
    const text = await response.text();
    show(
      `${method} ${path} -> ${response.status} ${response.statusText}`,
      response.ok,
      formatBody(text),
    );
  } catch (error) {
    show(`${method} ${path} -> request failed`, false, error.message);
  }
}

document.querySelectorAll('button[data-path]').forEach((button) => {
  button.addEventListener('click', () => {
    callApi(button.dataset.method, button.dataset.path);
  });
});
