socket.on('receive_message', (data) => {
  const chatWindow = document.getElementById('chat-window');
  if (!chatWindow) return;

  const msgElement = document.createElement('div');

  // Safely parse timestamp with fallback to current time
  const rawDate = data.timestamp ? new Date(data.timestamp) : new Date();
  const timeString = !isNaN(rawDate.getTime()) ? rawDate.toLocaleTimeString() : '';

  if (data.isAi) {
    msgElement.className = 'message ai-admin-message';

    const msgHeader = document.createElement('div');
    msgHeader.className = 'msg-header';

    const botBadge = document.createElement('span');
    botBadge.className = 'bot-badge';
    botBadge.textContent = '🤖 AI ADMIN';

    const timeSpan = document.createElement('span');
    timeSpan.className = 'time';
    timeSpan.textContent = timeString;

    msgHeader.appendChild(botBadge);
    msgHeader.appendChild(timeSpan);

    const msgBody = document.createElement('div');
    msgBody.className = 'msg-body';
    msgBody.textContent = data.message || '';

    msgElement.appendChild(msgHeader);
    msgElement.appendChild(msgBody);
  } else {
    msgElement.className = 'message user-message';

    const senderElement = document.createElement('strong');
    senderElement.textContent = `${data.sender || 'User'}: `;

    const messageText = document.createTextNode(data.message || '');

    msgElement.appendChild(senderElement);
    msgElement.appendChild(messageText);
  }

  chatWindow.appendChild(msgElement);
  chatWindow.scrollTop = chatWindow.scrollHeight; // Auto-scroll to bottom
});