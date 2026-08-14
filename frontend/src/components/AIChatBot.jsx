import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function AIChatBot() {
  const { apiFetch, token } = useAuth();
  const { locale, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: 'bot', text: t('greeting') }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  // Sync initial greeting on language switch
  useEffect(() => {
    setMessages(prev => {
      if (prev.length === 1 && prev[0].sender === 'bot') {
        return [{ sender: 'bot', text: t('greeting') }];
      }
      return prev;
    });
  }, [locale]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  const quickQuestions = {
    en: [
      "I need a tractor near Coimbatore.",
      "Which equipment is suitable for paddy harvesting?",
      "What is the rental cost of a harvester?"
    ],
    ta: [
      "கோயம்புத்தூர் அருகே டிராக்டர் தேவை.",
      "நெல் அறுவடைக்கு எந்த இயந்திரம் சிறந்தது?",
      "அறுவடை இயந்திரத்தின் வாடகை என்ன?"
    ],
    hi: [
      "मुझे कोयंबटूर के पास एक ट्रैक्टर चाहिए।",
      "धान कटाई के लिए कौन सा उपकरण उपयुक्त है?",
      "हार्वेस्टर का किराया कितना है?"
    ]
  };

  const activeQuickQuestions = quickQuestions[locale] || quickQuestions['en'];

  const handleSendMessage = async (text) => {
    if (!text.trim()) return;
    
    // Add user message
    setMessages(prev => [...prev, { sender: 'user', text }]);
    setInputText('');
    setIsTyping(true);

    try {
      if (!token) {
        // Mock reply if not logged in
        setTimeout(() => {
          setMessages(prev => [...prev, { 
            sender: 'bot', 
            text: locale === 'ta' ? "தயவுசெய்து முதலில் உள்நுழையவும்." : locale === 'hi' ? "कृपया पहले लॉग इन करें।" : "Please log in first to use the AI assistant." 
          }]);
          setIsTyping(false);
        }, 1000);
        return;
      }

      const response = await apiFetch('/api/ai/chat/', {
        method: 'POST',
        body: JSON.stringify({ message: text })
      });

      setMessages(prev => [...prev, { sender: 'bot', text: response.reply }]);
    } catch (e) {
      setMessages(prev => [...prev, { sender: 'bot', text: "Error: " + e.message }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[999] font-sans">
      {/* 1. Closed State Chat Bubble */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center justify-center w-14 h-14 bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 text-white rounded-full shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 group"
        >
          <div className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
          </div>
          <MessageSquare className="w-6 h-6 group-hover:rotate-12 transition-transform" />
        </button>
      )}

      {/* 2. Open State Chat Window */}
      {isOpen && (
        <div className="w-80 sm:w-96 h-[480px] sm:h-[520px] rounded-2xl shadow-2xl glass flex flex-col overflow-hidden animate-slide-up border border-slate-200/50 dark:border-slate-800/50">
          
          {/* Header */}
          <div className="px-4 py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                <Bot className="w-4 h-4 text-emerald-100" />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight flex items-center gap-1">
                  AgriRent AI Assistant
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse-subtle" />
                </h3>
                <span className="text-[10px] text-emerald-100 opacity-90">Online • English, தமிழ், हिन्दी</span>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)} 
              className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50 dark:bg-slate-900/30 no-scrollbar">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`max-w-[85%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-line ${
                    msg.sender === 'user' 
                      ? 'bg-emerald-600 text-white rounded-br-none' 
                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-none border border-slate-100 dark:border-slate-700'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="px-4 py-2.5 bg-white dark:bg-slate-800 rounded-2xl rounded-bl-none border border-slate-100 dark:border-slate-700 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Suggestions */}
          <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/10 flex flex-wrap gap-1.5">
            {activeQuickQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(q)}
                className="text-[10px] sm:text-xs text-left px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all text-slate-600 dark:text-slate-300"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input field */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputText);
            }}
            className="p-3 border-t border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 flex gap-2 items-center"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={t('typeMessage')}
              className="flex-1 px-3.5 py-2 text-sm rounded-full bg-slate-100 dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-100"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2 bg-emerald-600 dark:bg-emerald-500 text-white rounded-full hover:bg-emerald-700 dark:hover:bg-emerald-600 disabled:opacity-50 transition-all shadow-md"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>
      )}
    </div>
  );
}
