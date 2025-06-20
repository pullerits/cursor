import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import './DrawingCanvas.css';
import ChatWindow from './ChatWindow';

const DrawingCanvas = () => {
  // =====================================
  // STATE MANAGEMENT & REFS
  // =====================================
  const canvasRef = useRef(null); // Reference to the HTML5 canvas element
  const socketRef = useRef(null); // Reference to the Socket.io connection
  const [isDrawing, setIsDrawing] = useState(false); // Track if user is currently drawing
  const [currentColor, setCurrentColor] = useState('#1e293b'); // Current selected color (professional default)
  const [brushSize, setBrushSize] = useState(3); // Current brush size (smaller default for precision)
  const [connectedUsers, setConnectedUsers] = useState(0); // Number of connected users
  const [showChat, setShowChat] = useState(false);
  // Chat state lifted up
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatUsername, setChatUsername] = useState('');
  const [chatShowPrompt, setChatShowPrompt] = useState(true);
  const [textToolActive, setTextToolActive] = useState(false);
  const [canvasTexts, setCanvasTexts] = useState([]); // [{id, x, y, text, color, fontSize}]
  const [drawingLines, setDrawingLines] = useState([]); // Add state for storing lines
  const [textInput, setTextInput] = useState('');
  const [textInputPos, setTextInputPos] = useState(null); // {x, y} or null
  const [editingTextId, setEditingTextId] = useState(null); // New state for tracking which text is being edited
  const [unreadCount, setUnreadCount] = useState(0); // New state for unread messages

  // =====================================
  // SOCKET.IO CONNECTION & CANVAS SETUP
  // =====================================
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    // Calculate canvas size to fit within viewport without causing overflow
    const setCanvasSize = () => {
      const container = canvas.parentElement;
      const containerRect = container.getBoundingClientRect();
      
      // Set canvas size with padding to prevent overflow
      canvas.width = Math.max(400, containerRect.width - 40); // Min 400px width for professional use
      canvas.height = Math.max(300, containerRect.height - 40); // Min 300px height
    };
    
    // Set initial canvas size
    setCanvasSize();
    
    // Initialize Socket.io connection to the server
    // Use current hostname to work for both local and network connections
    const serverUrl = `${window.location.protocol}//${window.location.hostname}:3001`;
    console.log('🔌 Attempting to connect to Socket.IO server at:', serverUrl);
    socketRef.current = io(serverUrl);
    
    // Connection event handlers
    socketRef.current.on('connect', () => {
      console.log('✅ Connected to Socket.IO server!');
      console.log('🆔 Socket ID:', socketRef.current.id);
    });
    
    socketRef.current.on('connect_error', (error) => {
      console.error('❌ Socket.IO connection failed:', error.message);
      console.log('💡 Make sure the server is running with: node server.js');
    });
    
    socketRef.current.on('disconnect', (reason) => {
      console.log('🔌 Disconnected from server:', reason);
    });
    
    // Listen for drawing data from other users (real-time collaboration)
    socketRef.current.on('drawing-data', (data) => {
      console.log('🎨 Received drawing data from another user:', {
        color: data.color,
        brushSize: data.brushSize,
        from: `(${data.x0}, ${data.y0})`,
        to: `(${data.x1}, ${data.y1})`
      });
      drawLine(data);
    });
    
    // Load existing drawing data when a new user joins
    socketRef.current.on('load-drawing', (drawingData) => {
      console.log('📥 Loading existing drawing data:', drawingData.length, 'strokes');
      drawingData.forEach((data, index) => {
        console.log(`  Stroke ${index + 1}:`, data.color, `(${data.x0}, ${data.y0}) -> (${data.x1}, ${data.y1})`);
        drawLine(data);
      });
    });
    
    // Clear canvas when another user clears it
    socketRef.current.on('clear-canvas', () => {
      console.log('🗑️ Canvas cleared by another user');
      context.clearRect(0, 0, canvas.width, canvas.height);
    });

    // Handle chat messages from other users
    socketRef.current.on('chat-message', (message) => {
      console.log('💬 Received chat message:', message);
      setChatMessages(prev => [...prev, message]);
      if (!showChat) {
        setUnreadCount(prev => prev + 1);
      }
    });
    
    // Listen for text updates from the server
    socketRef.current.on('canvas-texts', (receivedTexts) => {
      setCanvasTexts(receivedTexts);
    });

    // Handle user count updates
    socketRef.current.on('user-count', (count) => {
      setConnectedUsers(count);
    });
    
    // Handle window resize to maintain canvas proportions
    const handleResize = () => {
      setCanvasSize();
    };
    
    window.addEventListener('resize', handleResize);
    
    // Load initial state from server
    socketRef.current.on('load-texts', (loadedTexts) => {
      setCanvasTexts(loadedTexts);
    });

    // Listen for granular text updates from other clients
    socketRef.current.on('add-text', (newText) => {
      setCanvasTexts(prev => [...prev, newText]);
    });
    socketRef.current.on('update-text', (updatedText) => {
      setCanvasTexts(prev => prev.map(t => t.id === updatedText.id ? updatedText : t));
    });
    socketRef.current.on('delete-text', (textId) => {
      setCanvasTexts(prev => prev.filter(t => t.id !== textId));
    });

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up Socket.IO connection');
      if (socketRef.current) {
        socketRef.current.off('drawing-data');
        socketRef.current.off('load-drawing');
        socketRef.current.off('clear-canvas');
        socketRef.current.off('chat-message');
        socketRef.current.off('canvas-texts');
        socketRef.current.off('user-count');
        socketRef.current.off('load-texts');
        socketRef.current.off('add-text');
        socketRef.current.off('update-text');
        socketRef.current.off('delete-text');
        socketRef.current.disconnect();
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [showChat]);

  const textUpdateTimeout = useRef(null);
  // New useEffect to send text updates to the server
  useEffect(() => {
    // Clear previous timeout
    if (textUpdateTimeout.current) {
      clearTimeout(textUpdateTimeout.current);
    }
    // Set a new timeout to send data after 250ms of inactivity
    textUpdateTimeout.current = setTimeout(() => {
      if (socketRef.current) {
        socketRef.current.emit('canvas-texts', canvasTexts);
      }
    }, 250);
  }, [canvasTexts]);

  // =====================================
  // DRAWING FUNCTIONS
  // =====================================
  
  // Modified drawLine function to store the line
  const drawLine = (data) => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    // Set drawing properties for professional appearance
    context.globalCompositeOperation = 'source-over';
    context.strokeStyle = data.color;
    context.lineWidth = data.brushSize;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    
    // Draw the line
    context.beginPath();
    context.moveTo(data.x0, data.y0);
    context.lineTo(data.x1, data.y1);
    context.stroke();

    // Store the line data
    setDrawingLines(lines => [...lines, data]);
  };

  // Start drawing when mouse is pressed down
  const startDrawing = (e) => {
    setIsDrawing(true);
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Store the starting point for the drawing line
    canvasRef.current.lastX = x;
    canvasRef.current.lastY = y;
  };

  // Continue drawing as mouse moves (if mouse is pressed)
  const draw = (e) => {
    if (!isDrawing) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Create drawing data object with line coordinates and styling
    const drawingData = {
      x0: canvasRef.current.lastX,
      y0: canvasRef.current.lastY,
      x1: x,
      y1: y,
      color: currentColor,
      brushSize: brushSize
    };
    
    // Draw locally on this user's canvas
    drawLine(drawingData);
    
    // Send drawing data to server for other users to see
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('drawing-data', drawingData);
      console.log('📤 Sent drawing data to server:', {
        color: drawingData.color,
        brushSize: drawingData.brushSize,
        from: `(${drawingData.x0}, ${drawingData.y0})`,
        to: `(${drawingData.x1}, ${drawingData.y1})`
      });
    } else {
      console.log('⚠️ Socket not connected, drawing locally only');
    }
    
    // Update last position for next drawing segment
    canvasRef.current.lastX = x;
    canvasRef.current.lastY = y;
  };

  // Stop drawing when mouse is released
  const stopDrawing = () => {
    setIsDrawing(false);
  };

  // =====================================
  // UTILITY FUNCTIONS
  // =====================================
  
  // Modified redrawCanvas function to handle both lines and text
  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Clear the canvas first
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Redraw all lines
    drawingLines.forEach(line => {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = line.color;
      ctx.lineWidth = line.brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.beginPath();
      ctx.moveTo(line.x0, line.y0);
      ctx.lineTo(line.x1, line.y1);
      ctx.stroke();
    });
    
    // Redraw all texts
    canvasTexts.forEach(t => {
      ctx.save();
      ctx.font = `${t.fontSize || 20}px Arial, sans-serif`;
      ctx.fillStyle = t.color || '#1e293b';
      ctx.textBaseline = 'top';
      ctx.fillText(t.text, t.x, t.y);
      ctx.restore();
    });
  };

  // Modified clearCanvas function to clear both lines and text
  const clearCanvas = () => {
    console.log('🗑️ Clearing canvas locally');
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Clear stored lines and texts
    setDrawingLines([]);
    setCanvasTexts([]);
    
    // Notify other users to clear their canvas too
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('clear-canvas');
      console.log('📤 Sent clear canvas request to server');
    } else {
      console.log('⚠️ Socket not connected, clearing locally only');
    }
  };

  // Save canvas as image (professional feature)
  const saveCanvas = () => {
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = `brainstorm-session-${new Date().toISOString().split('T')[0]}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  // Professional color palette - business appropriate colors (max 12)
  const colors = [
    '#1e293b', // Slate Gray (default)
    '#dc2626', // Red
    '#059669', // Green
    '#2563eb', // Blue
    '#7c3aed', // Purple
    '#ea580c', // Orange
    '#0891b2', // Cyan
    '#be123c', // Rose
    '#4338ca', // Indigo
    '#65a30d', // Lime
    '#c2410c', // Orange Red
    '#0f766e'  // Teal
  ];

  // =====================================
  // RENDER COMPONENT UI
  // =====================================
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Draw all texts on the canvas
    canvasTexts.forEach(t => {
      ctx.save();
      ctx.font = `${t.fontSize || 20}px Arial, sans-serif`;
      ctx.fillStyle = t.color || '#1e293b';
      ctx.textBaseline = 'top'; // Ensure consistent text positioning
      ctx.fillText(t.text, t.x, t.y);
      ctx.restore();
    });
  }, [canvasTexts]);

  // Function to check if a point is near text
  const findTextAtPoint = (x, y) => {
    const ctx = canvasRef.current.getContext('2d');
    return canvasTexts.find(text => {
      ctx.font = `${text.fontSize || 20}px Arial, sans-serif`;
      const metrics = ctx.measureText(text.text);
      const textWidth = metrics.width;
      const textHeight = text.fontSize || 20;
      
      return x >= text.x &&
             x <= text.x + textWidth &&
             y >= text.y &&
             y <= text.y + textHeight;
    });
  };

  // Modified handleCanvasClick to handle both new text and text editing
  const handleCanvasClick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if we clicked on existing text
    const clickedText = findTextAtPoint(x, y);
    
    if (clickedText) {
      // Start editing existing text
      setTextInput(clickedText.text);
      setTextInputPos({ x: clickedText.x, y: clickedText.y });
      setEditingTextId(clickedText.id);
    } else if (textToolActive) {
      // Create new text
      setTextInput('');
      setTextInputPos({ x, y });
      setEditingTextId(null);
    }
  };

  // Add useEffect to redraw canvas when texts change
  useEffect(() => {
    redrawCanvas();
  }, [canvasTexts]);

  // Modified handleTextInputKeyDown to handle text deletion
  const handleTextInputKeyDown = (e) => {
    if (e.key === 'Enter' && textInputPos) {
      if (editingTextId) {
        if (textInput.trim() === '') {
          // DELETE: Update locally and emit delete event
          setCanvasTexts(texts => texts.filter(text => text.id !== editingTextId));
          socketRef.current.emit('delete-text', editingTextId);
        } else {
          // UPDATE: Update locally and emit update event
          const updatedText = { id: editingTextId, text: textInput };
          setCanvasTexts(texts =>
            texts.map(text => (text.id === editingTextId ? { ...text, ...updatedText } : text))
          );
          socketRef.current.emit('update-text', { ...canvasTexts.find(t => t.id === editingTextId), text: textInput });
        }
      } else if (textInput.trim() !== '') {
        // ADD: Create new text, update locally, and emit add event
        const newText = {
          id: Date.now(),
          x: textInputPos.x,
          y: textInputPos.y,
          text: textInput,
          color: currentColor,
          fontSize: 20
        };
        setCanvasTexts(texts => [...texts, newText]);
        socketRef.current.emit('add-text', newText);
      }
      setTextInput('');
      setTextInputPos(null);
      setEditingTextId(null);
      // No need to call redrawCanvas here, the state update will trigger it
    } else if (e.key === 'Escape') {
      setTextInput('');
      setTextInputPos(null);
      setEditingTextId(null);
    }
  };

  // Modified function to handle showing chat and resetting unread count
  const handleToggleChat = () => {
    if (!showChat) {
      setUnreadCount(0); // Reset count when opening chat
    }
    setShowChat(v => !v);
  };

  return (
    <div className="drawing-container" style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      {/* Show/Hide Chat Button */}
      <div style={{ position: 'fixed', top: 16, right: showChat ? 370 : 16, zIndex: 2100 }}>
        <button
          style={{
            background: '#23272f',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            padding: '8px 16px',
            fontSize: 15,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            opacity: 0.85,
            position: 'relative' // Needed for positioning the bubble
          }}
          onClick={handleToggleChat} // Use the new handler
        >
          {showChat ? 'Hide Chat' : 'Show Chat'}
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute',
              top: '-8px',
              left: '-8px',
              background: '#3b82f6',
              color: 'white',
              borderRadius: '50%',
              padding: '2px 6px',
              fontSize: '12px',
              fontWeight: 'bold',
              minWidth: '20px',
              textAlign: 'center'
            }}>
              {unreadCount}
            </span>
          )}
        </button>
      </div>
      {/* ================================= */}
      {/* TOOLBAR - Professional control panel */}
      {/* ================================= */}
      <div className="toolbar">
        {/* Application header */}
        <div className="toolbar-header">
          <h2>Team Brainstorming Board</h2>
          <div className="toolbar-subtitle">
            Collaborate in real-time with your team members
          </div>
        </div>
        
        {/* BRUSH SIZE CONTROL SECTION */}
        <div className="tool-section brush-section">
          <div className="tool-section-title" style={{ color: '#bbb' }}>Drawing Tools</div>
          <div className="brush-controls">
            <div className="brush-size-display">
              <span className="brush-size-label">Brush Size</span>
              <span className="brush-size-value">{brushSize}px</span>
            </div>
            <input
              type="range"
              min="1"
              max="15"
              value={brushSize}
              onChange={(e) => setBrushSize(parseInt(e.target.value))}
              className="brush-slider"
            />
          </div>
        </div>
        
        {/* COLOR SELECTOR SECTION */}
        <div className="tool-section color-section">
          <div className="tool-section-title" style={{ color: '#bbb' }}>Color Palette</div>
          <div className="color-palette">
            {colors.map(color => (
              <button
                key={color}
                className={`color-btn ${currentColor === color ? 'active' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => setCurrentColor(color)}
                title={`Select ${color} color`}
              />
            ))}
          </div>
        </div>
        
        {/* TEXT TOOL SECTION */}
        <div className="tool-section text-section">
          <div className="tool-section-title" style={{ color: '#bbb' }}>Text Tool</div>
          <button
            className={textToolActive ? 'active' : ''}
            style={{ margin: '8px 0', padding: '8px 16px', borderRadius: 4, border: '1px solid #444', background: textToolActive ? '#2563eb' : '#23272f', color: '#fff', cursor: 'pointer' }}
            onClick={() => setTextToolActive(a => !a)}
          >
            {textToolActive ? 'Text Tool (Active)' : 'Text Tool'}
          </button>
        </div>
        <hr style={{ border: 0, borderTop: '1px solid #fff', margin: '16px 0' }} />
        {/* ACTIONS SECTION */}
        <div className="tool-section actions-section">
          <div className="tool-section-title" style={{ color: '#bbb' }}>Actions</div>
          <div className="action-buttons">
            <button className="save-btn" onClick={saveCanvas}>
              💾 Save Board
            </button>
            <button className="clear-btn" onClick={clearCanvas}>
              🗑️ Clear Board
            </button>
          </div>
        </div>
        
        {/* STATUS & COLLABORATION INFO SECTION */}
        <div className="status-section">
          <div className="connection-status">
            <div className="status-indicator"></div>
            <span className="status-text">Connected</span>
          </div>
          <div className="collaboration-info">
            Real-time collaboration active. All team members can see changes instantly.
          </div>
          <div className="user-count">
            Active collaborators: {connectedUsers || 1}
          </div>
        </div>
      </div>
      
      {/* ================================= */}
      {/* DRAWING CANVAS - Professional workspace */}
      {/* ================================= */}
      <div className="canvas-container">
        <div className="canvas-wrapper" style={{ position: 'relative' }}>
          <canvas
            ref={canvasRef}
            className="drawing-canvas"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseOut={stopDrawing}
            onClick={handleCanvasClick}
          />
          <div className="canvas-overlay">
            {textInputPos && (
              <input
                type="text"
                className="text-input"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={handleTextInputKeyDown}
                style={{
                  left: textInputPos.x + 'px',
                  top: textInputPos.y + 'px',
                }}
                autoFocus
              />
            )}
          </div>
        </div>
      </div>
      {/* ================================= */}
      {/* CHAT WINDOW OVERLAY - Always in front */}
      {/* ================================= */}
      {showChat && (
        <div style={{ position: 'fixed', top: 0, right: 0, zIndex: 2000, height: '100vh', pointerEvents: 'auto' }}>
          <ChatWindow
            input={chatInput}
            setInput={setChatInput}
            messages={chatMessages}
            setMessages={setChatMessages}
            username={chatUsername}
            setUsername={setChatUsername}
            showPrompt={chatShowPrompt}
            setShowPrompt={setChatShowPrompt}
            socket={socketRef.current}
          />
        </div>
      )}
    </div>
  );
};

export default DrawingCanvas; 