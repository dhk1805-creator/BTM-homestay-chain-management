'use client';

import { useState, useRef, useEffect } from 'react';
import { apiFetch } from '@/lib/api';

export default function AiAgentPage() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Xin chào! Mình là Lena — AI Concierge của BTM Homestay. Mình có thể giúp gì cho bạn? 😊' }
  ]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async () => {
    if (!message.trim() || loading) return;
    const userMsg = message;
    const newMessages = [...messages, { role: 'user', text: userMsg }];
    setMessages(newMessages);
    setMessage('');
    setLoading(true);
    try {
      const res = await apiFetch('/agent/chat', {
        method: 'POST',
        body: JSON.stringify({ message: userMsg, deviceType: 'webchat', lang: 'vi', history: messages.slice(1) }),
      });
      setMessages(prev => [...prev, { role: 'ai', text: res.response }]);
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: 'Lỗi kết nối API.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 h-full flex flex-col" style={{color:'#E2E8F0'}}>
      <div className="mb-4">
        <h1 className="text-2xl font-extrabold text-white">🤖 AI Agent — Lena</h1>
        <p className="text-sm mt-1" style={{color:'#3D5A80'}}>Trợ lý AI Concierge — Powered by Claude + Web Search</p>
      </div>

      <div className="flex-1 rounded-2xl flex flex-col overflow-hidden" style={{background:'#0F1629',border:'1px solid rgba(255,255,255,0.06)',minHeight:500}}>
        {/* Chat header */}
        <div className="px-5 py-3 flex items-center gap-3 flex-shrink-0" style={{borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
          <img src="/lena.png" alt="Lena" className="w-9 h-9 rounded-full" />
          <div>
            <p className="text-sm font-bold text-white">Lena · AI Concierge</p>
            <p className="text-xs" style={{color:'#10B981'}}>● Online 24/7 · Web Search enabled</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 p-5 space-y-3 overflow-auto">
          {messages.map((m, i) => (
            <div key={i} className={'flex gap-3 ' + (m.role === 'user' ? 'justify-end' : '')}>
              {m.role === 'ai' && <img src="/lena.png" alt="Lena" className="w-8 h-8 rounded-full flex-shrink-0 mt-1" />}
              <div className={'max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ' + (m.role === 'user' ? 'rounded-br-md' : 'rounded-bl-md')}
                style={m.role === 'user'
                  ? {background:'linear-gradient(135deg,#3B82F6,#2563EB)',color:'white'}
                  : {background:'rgba(255,255,255,0.04)',color:'#CBD5E1',border:'1px solid rgba(255,255,255,0.06)'}}>
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <img src="/lena.png" alt="Lena" className="w-8 h-8 rounded-full flex-shrink-0" />
              <div className="px-4 py-3 rounded-2xl rounded-bl-md text-sm animate-pulse" style={{background:'rgba(255,255,255,0.04)',color:'#3D5A80'}}>
                Lena đang suy nghĩ...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-4 flex gap-3 flex-shrink-0" style={{borderTop:'1px solid rgba(255,255,255,0.04)'}}>
          <input value={message} onChange={e => setMessage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Nhắn tin cho Lena..."
            className="flex-1 rounded-xl px-4 py-3 text-sm outline-none"
            style={{background:'rgba(255,255,255,0.03)',color:'#E2E8F0',border:'1px solid rgba(255,255,255,0.06)'}} />
          <button onClick={send} disabled={loading}
            className="px-6 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-30"
            style={{background:'linear-gradient(135deg,#3B82F6,#06B6D4)'}}>
            Gửi
          </button>
        </div>
      </div>
    </div>
  );
}
