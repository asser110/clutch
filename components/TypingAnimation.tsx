
import React, { useState, useEffect } from 'react';

interface TypingAnimationProps {
  text: string;
  speed?: number;
  className?: string;
  onComplete?: () => void;
}

const TypingAnimation: React.FC<TypingAnimationProps> = ({ text, speed = 150, className, onComplete }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const onCompleteRef = { current: onComplete };

    if (!isComplete && displayedText.length < text.length) {
      const timeoutId = setTimeout(() => {
        setDisplayedText(text.substring(0, displayedText.length + 1));
      }, speed);
      return () => clearTimeout(timeoutId);
    } else if (!isComplete) {
      setIsComplete(true);
      if (onCompleteRef.current) {
        onCompleteRef.current();
      }
    }
  }, [displayedText, text, speed, isComplete, onComplete]);

  return (
    <div className={className}>
      {displayedText}
      {!isComplete && <span className="animate-pulse ml-2">|</span>}
    </div>
  );
};

export default TypingAnimation;
