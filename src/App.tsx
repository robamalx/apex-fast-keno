import { useEffect, useState } from 'react';

export default function App() {
  const [balance, setBalance] = useState('0.00');
  const [playerName, setPlayerName] = useState('Loading...');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Dynamically inject Telegram script for Vite
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-web-app.js';
    script.async = true;
    document.body.appendChild(script);

    script.onload = () => {
      const initApp = async () => {
        if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
          const tg = window.Telegram.WebApp;
          tg.ready();
          tg.expand();

          const user = tg.initDataUnsafe?.user;
          
          if (user && user.id) {
            try {
              const res = await fetch(`/api/balance?telegram_id=${user.id}`);
              const data = await res.json();
              
              if (data.balance) {
                setBalance(data.balance);
                setPlayerName(data.first_name || user.first_name);
              }
            } catch (error) {
              setPlayerName('Error loading data');
            }
          } else {
            setPlayerName('Not opened via Telegram');
          }
          setIsLoading(false);
        }
      };
      
      // Small delay to ensure Telegram object is fully registered
      setTimeout(initApp, 100);
    };

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    
      {isLoading ? (
