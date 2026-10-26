import React, { useState, useEffect } from 'react';
import { HelpCircle, FileText, MessageSquare, Send, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function SupportCenter() {
  const { apiFetch, user } = useAuth();
  const { t } = useLanguage();

  const [tickets, setTickets] = useState([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [ticketSuccess, setTicketSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // FAQ states
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  // Live support chat
  const [chatLog, setChatLog] = useState([
    { sender: 'agent', text: "Hello! Welcome to AgriRent Help Center. I'm Jeevan, your support executive. How can I help you today?" }
  ]);
  const [typedMsg, setTypedMsg] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const faqs = [
    {
      q: "How do I book equipment?",
      a: "Go to your Farmer Dashboard. You can search by machinery type, select your crop suitability via the AI Advisor, or view nearby listings on the map. Click 'Book Now' and enter your start and end times."
    },
    {
      q: "When will my booking be verified?",
      a: "Once you submit a booking request, the equipment owner receives a notification. They will review and approve or reject it. You will receive an immediate notification when their status updates."
    },
    {
      q: "How does the AI Price Prediction work?",
      a: "For equipment owners listing machinery, the price predictor calculates minimum, recommended, and maximum rental curves based on regional demand indices, sowing/harvesting seasons, and coordinates."
    },
    {
      q: "What documentation does the Owner need?",
      a: "Owners must upload machine RC details, tractor registration papers, or harvester certificates. Once submitted, our Admin team verifies listings within 24 hours to secure safe bookings."
    }
  ];

  const loadTickets = async () => {
    try {
      const logs = await apiFetch('/api/support/tickets/');
      setTickets(logs);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (user) loadTickets();
  }, []);

  const handleTicketSubmit = async (e) => {
    e.preventDefault();
    if (!subject || !message) return;
    setLoading(true);
    try {
      await apiFetch('/api/support/tickets/', {
        method: 'POST',
        body: JSON.stringify({ subject, message, priority })
      });
      setTicketSuccess(true);
      setSubject('');
      setMessage('');
      loadTickets();
      setTimeout(() => setTicketSuccess(false), 3000);
    } catch (err) {
      alert("Ticket failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLiveSendMessage = (e) => {
    e.preventDefault();
    if (!typedMsg.trim()) return;

    setChatLog(prev => [...prev, { sender: 'user', text: typedMsg }]);
    setTypedMsg('');
    setIsTyping(true);

    // Simulated support response scripts
    setTimeout(() => {
      let reply = "I understand the issue. Let me fetch your active booking details and double-check with the admin logs. Could you please provide the Booking ID?";
      if (typedMsg.toLowerCase().includes("pay") || typedMsg.toLowerCase().includes("money")) {
        reply = "For payment disputes, our finance team typically resolves transaction pending flags within 2 hours. Your wallet balance is safe.";
      } else if (typedMsg.toLowerCase().includes("owner") || typedMsg.toLowerCase().includes("chat")) {
        reply = "You can message owners directly from your Dashboard booking logs. Let me know if their chat remains inactive.";
      }

      setChatLog(prev => [...prev, { sender: 'agent', text: reply }]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 font-sans">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white flex items-center gap-2">
          Support Center 🤝
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Frequently asked questions, ticket management systems, and live customer service chat support.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: FAQs and Ticket Form */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* FAQ panel */}
          <div className="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-md font-bold text-slate-850 dark:text-slate-100 flex items-center gap-1.5">
              <HelpCircle className="w-5 h-5 text-emerald-600" />
              Frequently Asked Questions (FAQ)
            </h3>
            
            <div className="space-y-2.5">
              {faqs.map((faq, idx) => (
                <div key={idx} className="border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
                  <button
                    onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                    className="w-full flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-200 text-left py-2 hover:text-emerald-600 transition-colors"
                  >
                    <span>{faq.q}</span>
                    {openFaqIndex === idx ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </button>
                  {openFaqIndex === idx && (
                    <p className="text-xs text-slate-400 leading-relaxed mt-1.5 animate-fade-in">
                      {faq.a}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Ticket Submission Form */}
          <div className="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-md font-bold text-slate-850 dark:text-slate-100 flex items-center gap-1.5">
              <FileText className="w-5 h-5 text-emerald-600" />
              {t('raiseTicket')}
            </h3>

            <form onSubmit={handleTicketSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block font-bold text-slate-450 mb-1.5">{t('subject')}</label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Harvester engine oil leak"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block font-bold text-slate-450 mb-1.5">Priority Level</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none"
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-450 mb-1.5">{t('message')}</label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Detail the issue, include booking IDs if applicable..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none"
                />
              </div>

              {ticketSuccess ? (
                <div className="py-2 text-emerald-600 font-bold flex items-center justify-center gap-1.5 bg-emerald-50 dark:bg-slate-800 rounded-lg">
                  <CheckCircle2 className="w-4 h-4" /> Support Ticket Raised Successfully!
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md transition-all text-xs"
                >
                  {t('submitTicket')}
                </button>
              )}
            </form>
          </div>

        </div>

        {/* Right Side: Live Chat Support & Filed Tickets logs */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* Live Chat Support */}
          <div className="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md flex flex-col justify-between h-[420px]">
            <div>
              <h3 className="text-md font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-1.5">
                <MessageSquare className="w-5 h-5 text-emerald-600" />
                {t('liveChat')}
              </h3>
            </div>

            {/* Messages feed */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-2 mb-4 text-xs no-scrollbar">
              {chatLog.map((msg, i) => (
                <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-3.5 py-2 rounded-xl leading-relaxed ${
                    msg.sender === 'user' 
                      ? 'bg-emerald-600 text-white rounded-br-none' 
                      : 'bg-white dark:bg-slate-850 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-800 rounded-bl-none shadow-sm'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="px-3 py-1.5 bg-white dark:bg-slate-850 rounded-xl rounded-bl-none border border-slate-100 dark:border-slate-800 flex items-center gap-1 text-[10px] text-slate-400">
                    Agent is typing...
                  </div>
                </div>
              )}
            </div>

            {/* Input box */}
            <form onSubmit={handleLiveSendMessage} className="flex gap-2">
              <input
                type="text"
                value={typedMsg}
                onChange={(e) => setTypedMsg(e.target.value)}
                placeholder="Ask about payments, listings..."
                className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-805 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!typedMsg.trim()}
                className="p-2 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

          {/* Support Ticket Status Log */}
          <div className="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-md font-bold text-slate-800 dark:text-slate-100">{t('openTickets')}</h3>
            <div className="space-y-2.5 max-h-[200px] overflow-y-auto pr-2 no-scrollbar">
              {tickets.map(t => (
                <div key={t.id} className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-xl flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <h4 className="font-bold text-slate-800 dark:text-slate-100">#{t.id}: {t.subject}</h4>
                    <p className="text-slate-450 text-[10px]">Priority: {t.priority}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                    t.status === 'Open' ? 'bg-red-100 text-red-700 dark:bg-red-950/20' :
                    t.status === 'In Progress' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/20' :
                    'bg-slate-100 text-slate-700 dark:bg-slate-850/40'
                  }`}>
                    {t.status}
                  </span>
                </div>
              ))}

              {tickets.length === 0 && (
                <p className="text-xs text-slate-400 italic text-center py-4">No tickets filed yet.</p>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
