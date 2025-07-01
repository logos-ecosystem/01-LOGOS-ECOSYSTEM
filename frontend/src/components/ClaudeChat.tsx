import React, { useState, useRef, useEffect } from 'react';
import { getClaudeService } from '../services/claude.service';
import styles from '../styles/ClaudeChat.module.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface ClaudeChatProps {
  authToken: string;
  systemPrompt?: string;
  placeholder?: string;
  title?: string;
}

export const ClaudeChat: React.FC<ClaudeChatProps> = ({
  authToken,
  systemPrompt,
  placeholder = 'Type your message...',
  title = 'Chat with Claude AI',
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const claudeService = getClaudeService();

  useEffect(() => {
    claudeService.setAuthToken(authToken);
  }, [authToken]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setStreamingContent('');

    const assistantMessage: Message = {
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };

    setMessages((prev) => [...prev, assistantMessage]);

    try {
      await claudeService.streamMessage(
        [...messages, userMessage].map(({ role, content }) => ({ role, content })),
        (chunk) => {
          setStreamingContent((prev) => prev + chunk);
        },
        (totalContent) => {
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage && lastMessage.role === 'assistant') {
              lastMessage.content = totalContent;
              lastMessage.isStreaming = false;
            }
            return newMessages;
          });
          setStreamingContent('');
          setIsLoading(false);
        },
        (error) => {
          console.error('Stream error:', error);
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage && lastMessage.role === 'assistant') {
              lastMessage.content = 'Sorry, an error occurred while processing your request.';
              lastMessage.isStreaming = false;
            }
            return newMessages;
          });
          setStreamingContent('');
          setIsLoading(false);
        },
        { systemPrompt }
      );
    } catch (error) {
      console.error('Chat error:', error);
      setIsLoading(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={styles.chatContainer}>
      <div className={styles.chatHeader}>
        <h3>{title}</h3>
      </div>
      
      <div className={styles.messagesContainer}>
        {messages.length === 0 && (
          <div className={styles.emptyState}>
            <p>Start a conversation with Claude AI</p>
          </div>
        )}
        
        {messages.map((message, index) => (
          <div
            key={index}
            className={`${styles.message} ${
              message.role === 'user' ? styles.userMessage : styles.assistantMessage
            }`}
          >
            <div className={styles.messageHeader}>
              <span className={styles.role}>
                {message.role === 'user' ? 'You' : 'Claude'}
              </span>
              <span className={styles.timestamp}>{formatTime(message.timestamp)}</span>
            </div>
            <div className={styles.messageContent}>
              {message.isStreaming ? streamingContent || '...' : message.content}
              {message.isStreaming && <span className={styles.cursor}>|</span>}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSubmit} className={styles.inputForm}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          disabled={isLoading}
          className={styles.input}
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className={styles.sendButton}
        >
          {isLoading ? (
            <span className={styles.loadingSpinner}>⏳</span>
          ) : (
            'Send'
          )}
        </button>
      </form>
    </div>
  );
};

export default ClaudeChat;