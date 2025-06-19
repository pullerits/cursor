import React, { useState, useRef, useEffect } from 'react';
import './App.css';

function ChatWindow() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [username, setUsername] = useState('');
  const [showPrompt, setShowPrompt] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleInputChange = (e) => setInput(e.target.value);
  const handleSend = (e) => {
    e.preventDefault();
    if (input.trim() === '' || !username) return;
    setMessages([
      ...messages,
      {
        user: username,
        text: input,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setInput('');
  };

  const handleUsernameSubmit = (e) => {
    e.preventDefault();
    if (input.trim() === '') return;
    setUsername(input.trim());
    setInput('');
    setShowPrompt(false);
  };

  return (
    <div className="chat-window">
      <div className="chat-header">Team Chat</div>
      <div className="chat-messages" style={{display: 'flex', flexDirection: 'column', justifyContent: 'flex-end'}}>
        {messages.length === 0 ? (
          <div style={{color: '#aaa', marginTop: 'auto'}}>No messages yet.</div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} style={{marginBottom: '8px', textAlign: 'left'}}>
              <span style={{fontWeight: 'bold', color: '#60a5fa'}}>{msg.user}</span>
              <span style={{color: '#aaa', fontSize: '12px', marginLeft: 8}}>{msg.time}</span>
              <div style={{marginLeft: 8}}>{msg.text}</div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      {showPrompt ? (
        <form className="chat-input-bar" onSubmit={handleUsernameSubmit}>
          <input
            className="chat-input"
            type="text"
            placeholder="Enter your name..."
            value={input}
            onChange={handleInputChange}
            autoFocus
          />
          <button className="chat-send-btn" type="submit" disabled={!input.trim()}>
            Join
          </button>
        </form>
      ) : (
        <form className="chat-input-bar" onSubmit={handleSend}>
          <input
            className="chat-input"
            type="text"
            placeholder="Type a message..."
            value={input}
            onChange={handleInputChange}
            autoFocus
          />
          <button className="chat-send-btn" type="submit" disabled={!input.trim()}>
            Send
          </button>
        </form>
      )}
    </div>
  );
}

export default ChatWindow; 