socket.on('receive_message', (data) => {
  const chatWindow = document.getElementById('chat-window');
  const msgElement = document.createElement('div');

  if (data.isAi) {
    // Styling specifically for AI Admin
    msgElement.className = 'message ai-admin-message';
    msgElement.innerHTML = `
      <div class="msg-header">
        <span class="bot-badge">🤖 AI ADMIN</span>
        <span class="time">${new Date(data.timestamp).toLocaleTimeString()}</span>
      </div>
      <div class="msg-body">${data.message}</div>
    `;
  } else {
    // Standard user message
    msgElement.className = 'message user-message';
    msgElement.innerHTML = `
      <strong>${data.sender}:</strong> ${data.message}
    `;
  }

  chatWindow.appendChild(msgElement);
  chatWindow.scrollTop = chatWindow.scrollHeight; // Auto-scroll to bottom
});