import React, { useState, useRef, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

interface WebCLIProps {
  session: Session;
}

type Line = {
  type: 'input' | 'output';
  content: string;
};

const HELP_MESSAGE = `
  Clutch CLI v1.0.0
  Available commands:
  
  <span class="text-white">help</span>          - Show this help message
  <span class="text-white">whoami</span>        - Display current user's email
  <span class="text-white">gen-invite</span>    - Generate a new 15-minute invite link
  <span class="text-white">clear</span>         - Clear the terminal screen
  <span class="text-white">logout</span>        - Log out of the current session
`;

const WebCLI: React.FC<WebCLIProps> = ({ session }) => {
  const [lines, setLines] = useState<Line[]>([
    { type: 'output', content: 'Welcome to Clutch. Type "help" for a list of commands.' },
  ]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const username = session.user?.user_metadata?.username || session.user?.email?.split('@')[0] || 'user';
  const prompt = `${username}@clutch:~$`;

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const processCommand = async (command: string): Promise<Line[]> => {
    const [cmd, ...args] = command.trim().toLowerCase().split(' ');
    switch (cmd) {
      case 'help':
        return [{ type: 'output', content: HELP_MESSAGE }];
      case 'whoami':
        return [{ type: 'output', content: session.user.email ?? 'No email found.' }];
      case 'gen-invite':
        const token = crypto.randomUUID();
        const expires = Date.now() + 15 * 60 * 1000;
        const link = `${window.location.origin}/signup?token=${token}&expires=${expires}`;
        return [{ type: 'output', content: `Invite link generated: ${link}` }];
      case 'clear':
        setLines([]);
        return [];
      case 'logout':
        await supabase.auth.signOut();
        return [{ type: 'output', content: 'Logging out...' }];
      case '':
        return [];
      default:
        return [{ type: 'output', content: `command not found: ${command}` }];
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const command = input.trim();
      const newHistory = [command, ...history];
      setHistory(newHistory);
      setHistoryIndex(-1);
      
      const inputLine: Line = { type: 'input', content: `${prompt} ${command}` };
      setInput('');
      
      const outputLines = await processCommand(command);
      setLines(prevLines => [...prevLines, inputLine, ...outputLines]);

    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setInput(history[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(history[newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput('');
      }
    }
  };

  return (
    <div className="flex-grow p-4 text-sm text-gray-300 overflow-y-auto" onClick={() => inputRef.current?.focus()}>
      {lines.map((line, index) => (
        <div key={index} className={line.type === 'input' ? 'text-white' : 'text-gray-400 whitespace-pre-wrap'}>
          <span dangerouslySetInnerHTML={{ __html: line.content }} />
        </div>
      ))}
      <div className="flex">
        <span className="text-white flex-shrink-0">{prompt}&nbsp;</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className="bg-transparent border-none text-white focus:outline-none w-full"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
        />
      </div>
      <div ref={scrollRef}></div>
    </div>
  );
};

export default WebCLI;
