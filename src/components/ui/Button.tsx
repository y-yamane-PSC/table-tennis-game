import { ReactNode } from 'react';
import './Button.css';

interface ButtonProps {
  children: ReactNode;
  onClick: () => void;
  variant?: 'pink' | 'blue' | 'purple' | 'primary';
  isSelected?: boolean;
  disabled?: boolean;
  icon?: string;
  className?: string;
}

function Button({ 
  children, 
  onClick, 
  variant = 'primary', 
  isSelected = false,
  disabled = false,
  icon,
  className = ''
}: ButtonProps) {
  return (
      <button
        className={`button button-${variant} ${isSelected ? 'selected' : ''} ${className}`}
        onClick={onClick}
        disabled={disabled}
      >
      {icon && <span className="button-icon">{icon}</span>}
      <span>{children}</span>
      </button>
  );
}

export default Button;
