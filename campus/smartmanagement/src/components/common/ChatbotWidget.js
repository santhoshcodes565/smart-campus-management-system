import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import '../../styles/ChatbotWidget.css';

// Icons as SVG components
const ChatIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
);

const CloseIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);

const SendIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13"></line>
        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
    </svg>
);

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ChatbotWidget = () => {
    const { user, token, isAuthenticated } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [suggestions, setSuggestions] = useState([
        'Today Assignment',
        'Today Timetable',
        'My Attendance',
        'Announcements'
    ]);
    const messagesEndRef = useRef(null);

    // Scroll to bottom when messages change
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Add welcome message when chat is opened for the first time
    useEffect(() => {
        if (isOpen && messages.length === 0 && user) {
            setMessages([{
                type: 'bot',
                content: `👋 Hi ${user.name?.split(' ')[0] || 'there'}! I'm your Campus Assistant.\n\nI can help you with:\n• Assignments & Homework\n• Timetable & Classes\n• Attendance Status\n• Announcements & Notices\n• Exam Dates\n\nHow can I help you today?`,
                timestamp: new Date()
            }]);
        }
    }, [isOpen, messages.length, user]);

    // Only show for authenticated users - AFTER all hooks
    if (!isAuthenticated || !user || !token) {
        return null;
    }

    // Send message to API
    const sendMessage = async (messageText) => {
        if (!messageText.trim() || isLoading) return;

        const userMessage = {
            type: 'user',
            content: messageText.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch(`${API_URL}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    message: messageText.trim(),
                    userId: user._id,
                    userRole: user.role
                })
            });

            const data = await response.json();

            const botMessage = {
                type: 'bot',
                content: data.response || 'Sorry, I couldn\'t process your request.',
                timestamp: new Date()
            };

            setMessages(prev => [...prev, botMessage]);

            // Update suggestions if provided
            if (data.suggestions && data.suggestions.length > 0) {
                setSuggestions(data.suggestions);
            }

        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, {
                type: 'bot',
                content: 'Sorry, I\'m having trouble connecting. Please try again.',
                timestamp: new Date()
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle form submit
    const handleSubmit = (e) => {
        e.preventDefault();
        sendMessage(input);
    };

    // Handle suggestion click
    const handleSuggestionClick = (suggestion) => {
        sendMessage(suggestion);
    };

    // Format message content with basic markdown support
    const formatMessage = (content) => {
        // Convert **bold** to <strong>
        let formatted = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Convert newlines to <br>
        formatted = formatted.replace(/\n/g, '<br>');
        // Convert bullet points
        formatted = formatted.replace(/• /g, '&bull; ');

        return formatted;
    };

    return (
        <>
            {/* Floating Action Button */}
            <button
                className={`chatbot-fab ${isOpen ? 'open' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                aria-label={isOpen ? 'Close chat' : 'Open chat'}
            >
                {isOpen ? <CloseIcon /> : <ChatIcon />}
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div className="chatbot-window">
                    {/* Header */}
                    <div className="chatbot-header">
                        <div className="chatbot-avatar">🎓</div>
                        <div className="chatbot-header-info">
                            <h3 className="chatbot-header-title">Campus Assistant</h3>
                            <span className="chatbot-header-status">Online</span>
                        </div>
                        <button
                            className="chatbot-close-btn"
                            onClick={() => setIsOpen(false)}
                            aria-label="Close chat"
                        >
                            <CloseIcon />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="chatbot-messages">
                        {messages.map((message, index) => (
                            <div
                                key={index}
                                className={`chatbot-message ${message.type}`}
                            >
                                <div className="chatbot-message-avatar">
                                    {message.type === 'bot' ? '🤖' : '👤'}
                                </div>
                                <div
                                    className="chatbot-message-content"
                                    dangerouslySetInnerHTML={{
                                        __html: formatMessage(message.content)
                                    }}
                                />
                            </div>
                        ))}

                        {/* Typing Indicator */}
                        {isLoading && (
                            <div className="chatbot-message bot">
                                <div className="chatbot-message-avatar">🤖</div>
                                <div className="chatbot-typing">
                                    <div className="chatbot-typing-dot"></div>
                                    <div className="chatbot-typing-dot"></div>
                                    <div className="chatbot-typing-dot"></div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Suggestions */}
                    <div className="chatbot-suggestions">
                        {suggestions.map((suggestion, index) => (
                            <button
                                key={index}
                                className="chatbot-suggestion-btn"
                                onClick={() => handleSuggestionClick(suggestion)}
                                disabled={isLoading}
                            >
                                {suggestion}
                            </button>
                        ))}
                    </div>

                    {/* Input Area */}
                    <form className="chatbot-input-area" onSubmit={handleSubmit}>
                        <input
                            type="text"
                            className="chatbot-input"
                            placeholder="Ask about assignments, timetable..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={isLoading}
                            maxLength={500}
                        />
                        <button
                            type="submit"
                            className="chatbot-send-btn"
                            disabled={!input.trim() || isLoading}
                            aria-label="Send message"
                        >
                            <SendIcon />
                        </button>
                    </form>
                </div>
            )}
        </>
    );
};

export default ChatbotWidget;
