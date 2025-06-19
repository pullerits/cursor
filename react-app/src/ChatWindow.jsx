import React, { useState } from 'react';
import './App.css';

function ChatWindow() {
  const [input, setInput] = useState('');

  const handleInputChange = (e) => setInput(e.target.value);
  const handleSend = (e) => {
    e.preventDefault();
    if (input.trim() === '') return;
    setInput('');
  };

  return (
    <div className="chat-window">
      <div className="chat-header">Team Chat</div>
      <div className="chat-messages">
        {/* Messages will go here */}
        <div style={{color: '#aaa'}}>No messages yet.</div>
      </div>
      <form className="chat-input-bar" onSubmit={handleSend}>
        <input
          className="chat-input"
          type="text"
          placeholder="Type a message..."
          value={input}
          onChange={handleInputChange}
        />
        <button className="chat-send-btn" type="submit" disabled={!input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}

export default ChatWindow; 