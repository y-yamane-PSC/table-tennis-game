import { useState, useEffect } from 'react';
import './MessageDisplay.css';

interface MessageDisplayProps {
  message?: string;
  duration?: number;
  type?: 'info' | 'success' | 'warning';
}

function MessageDisplay({ message, duration = 2000, type = 'info' }: MessageDisplayProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [message, duration]);

  if (!visible || !message) return null;

  return (
    <div className={`message-display message-${type}`}>
      {message}
    </div>
  );
}

export default MessageDisplay;
