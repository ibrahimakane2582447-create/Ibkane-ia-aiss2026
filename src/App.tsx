/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, Camera, Image as ImageIcon, X, User, Bot, Loader2, Sparkles, Trash2, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { cn } from './lib/utils';
import { generateResponse, GeminiResponse } from './services/geminiService';
import { AdBanner } from './components/AdBanner';
import { GeneratedImage } from './components/GeneratedImage';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  image?: string;
  generatedImages?: string[];
  timestamp: Date;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Bonjour ! Je suis Ibkane IA, ton assistant personnel pour les devoirs et exercices. Comment puis-je t'aider aujourd'hui ? Tu peux me poser une question ou m'envoyer une photo de ton exercice.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      image: selectedImage || undefined,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setSelectedImage(null);
    setIsLoading(true);

    try {
      // Prepare history for the API (last 10 messages for context)
      const history = messages.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Create a placeholder message for the assistant
      const assistantMessageId = (Date.now() + 1).toString();
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, assistantMessage]);

      const response: GeminiResponse = await generateResponse(
        userMessage.content, 
        userMessage.image, 
        history,
        (chunkText) => {
          // Update the assistant message content in real-time
          setMessages((prev) => prev.map(msg => 
            msg.id === assistantMessageId ? { ...msg, content: chunkText } : msg
          ));
        }
      );
      
      // Final update with images if any
      setMessages((prev) => prev.map(msg => 
        msg.id === assistantMessageId ? { 
          ...msg, 
          content: response.text || msg.content,
          generatedImages: response.generatedImages 
        } : msg
      ));
    } catch (error: any) {
      console.error(error);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "⚠️ Une erreur critique est survenue. Veuillez vérifier votre connexion internet et la configuration de votre clé API (VITE_GEMINI_API_KEY).",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    if (window.confirm("Voulez-vous vraiment effacer toute la discussion ?")) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: "Bonjour ! Je suis Ibkane IA, ton assistant personnel pour les devoirs et exercices. Comment puis-je t'aider aujourd'hui ? Tu peux me poser une question ou m'envoyer une photo de ton exercice.",
          timestamp: new Date(),
        },
      ]);
    }
  };

  return (
    <div className={cn(
      "flex flex-col h-screen max-h-screen overflow-hidden font-sans transition-colors duration-300",
      isDarkMode ? "bg-zinc-950 text-zinc-100" : "bg-zinc-50 text-zinc-900"
    )}>
      {/* Header */}
      <header className={cn(
        "flex items-center justify-between px-6 py-4 border-b backdrop-blur-md sticky top-0 z-10 transition-colors",
        isDarkMode ? "bg-zinc-950/80 border-zinc-800" : "bg-white/80 border-zinc-200"
      )}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className={cn("text-lg font-bold tracking-tight leading-none", isDarkMode ? "text-white" : "text-zinc-900")}>Ibkane IA</h1>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Par Ibrahima Kane</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={cn(
              "p-2 rounded-xl transition-all",
              isDarkMode ? "text-zinc-400 hover:bg-zinc-800 hover:text-yellow-400" : "text-zinc-500 hover:bg-zinc-100 hover:text-indigo-600"
            )}
            title={isDarkMode ? "Passer au mode clair" : "Passer au mode sombre"}
          >
            {isDarkMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
            )}
          </button>

          <button 
            onClick={clearChat}
            className={cn(
              "p-2 rounded-xl transition-all",
              isDarkMode ? "text-zinc-500 hover:text-red-400 hover:bg-red-400/10" : "text-zinc-400 hover:text-red-500 hover:bg-red-50"
            )}
            title="Effacer la discussion"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto px-4 py-6 space-y-6 scrollbar-hide">
        {/* Publicité en haut */}
        <AdBanner slot="1234567890" />
        
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={cn(
                "flex w-full gap-3",
                message.role === 'user' ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-1",
                message.role === 'user' 
                  ? (isDarkMode ? "bg-zinc-800" : "bg-zinc-200") 
                  : "bg-emerald-500/10"
              )}>
                {message.role === 'user' ? (
                  <User className={cn("w-4 h-4", isDarkMode ? "text-zinc-400" : "text-zinc-600")} />
                ) : (
                  <Bot className="w-4 h-4 text-emerald-500" />
                )}
              </div>
              
                <div className={cn(
                  "flex flex-col max-w-[85%] gap-2",
                  message.role === 'user' ? "items-end" : "items-start"
                )}>
                  {message.image && (
                    <div className={cn(
                      "rounded-2xl overflow-hidden border shadow-xl",
                      isDarkMode ? "border-zinc-800" : "border-zinc-200"
                    )}>
                      <img 
                        src={message.image} 
                        alt="Exercice" 
                        className={cn("max-w-full max-h-64 object-contain", isDarkMode ? "bg-zinc-900" : "bg-white")} 
                      />
                    </div>
                  )}

                  {message.generatedImages && message.generatedImages.map((img, idx) => (
                    <GeneratedImage key={idx} src={img} isDarkMode={isDarkMode} />
                  ))}
                  
                  {message.content && (
                    <div className={cn(
                      "px-4 py-3 rounded-2xl text-sm shadow-sm transition-colors",
                      message.role === 'user' 
                        ? "bg-emerald-600 text-white rounded-tr-none" 
                        : (isDarkMode 
                            ? "bg-zinc-900 text-zinc-100 border border-zinc-800 rounded-tl-none" 
                            : "bg-white text-zinc-900 border border-zinc-200 rounded-tl-none")
                    )}>
                      <div className={cn("markdown-body", !isDarkMode && "light-markdown")}>
                        <Markdown>{message.content}</Markdown>
                      </div>
                    </div>
                  )}
                
                <span className="text-[10px] text-zinc-600 mt-1 px-1">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0 mt-1">
              <Bot className="w-4 h-4 text-emerald-500" />
            </div>
            <div className={cn(
              "border px-4 py-3 rounded-2xl rounded-tl-none flex items-center gap-2 transition-colors",
              isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"
            )}>
              <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
              <span className={cn("text-xs", isDarkMode ? "text-zinc-400" : "text-zinc-500")}>Ibkane IA réfléchit...</span>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Input Area */}
      <footer className={cn(
        "p-4 border-t transition-colors",
        isDarkMode ? "bg-zinc-950 border-zinc-800" : "bg-zinc-50 border-zinc-200"
      )}>
        <div className="max-w-3xl mx-auto space-y-3">
          {/* Image Preview */}
          <AnimatePresence>
            {selectedImage && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                className="relative inline-block"
              >
                <img 
                  src={selectedImage} 
                  alt="Preview" 
                  className="w-20 h-20 object-cover rounded-xl border-2 border-emerald-500 shadow-lg" 
                />
                <button
                  onClick={() => setSelectedImage(null)}
                  className={cn(
                    "absolute -top-2 -right-2 w-6 h-6 border rounded-full flex items-center justify-center transition-colors shadow-md",
                    isDarkMode ? "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white" : "bg-white border-zinc-200 text-zinc-500 hover:text-zinc-900"
                  )}
                >
                  <X className="w-3 h-3" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-end gap-2">
            <div className={cn(
              "flex-1 border rounded-2xl p-1.5 transition-all focus-within:ring-2 focus-within:ring-emerald-500/20",
              isDarkMode 
                ? "bg-zinc-900 border-zinc-800 focus-within:border-emerald-500/50" 
                : "bg-white border-zinc-200 focus-within:border-emerald-500/50 shadow-sm"
            )}>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Pose ta question ou décris ton exercice..."
                className={cn(
                  "w-full bg-transparent border-none focus:ring-0 text-sm py-2 px-3 resize-none max-h-32 min-h-[40px] transition-colors",
                  isDarkMode ? "text-zinc-100 placeholder:text-zinc-600" : "text-zinc-900 placeholder:text-zinc-400"
                )}
                rows={1}
                style={{ height: 'auto' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${target.scrollHeight}px`;
                }}
              />
              
              <div className="flex items-center justify-between px-2 pb-1">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "p-2 rounded-xl transition-all",
                      isDarkMode ? "text-zinc-500 hover:text-emerald-500 hover:bg-emerald-500/10" : "text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50"
                    )}
                    title="Ajouter une photo"
                  >
                    <ImageIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => {
                      fileInputRef.current?.setAttribute('capture', 'environment');
                      fileInputRef.current?.click();
                    }}
                    className={cn(
                      "p-2 rounded-xl transition-all",
                      isDarkMode ? "text-zinc-500 hover:text-emerald-500 hover:bg-emerald-500/10" : "text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50"
                    )}
                    title="Prendre une photo"
                  >
                    <Camera className="w-5 h-5" />
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
                
                <button
                  onClick={handleSend}
                  disabled={(!input.trim() && !selectedImage) || isLoading}
                  className={cn(
                    "p-2 rounded-xl transition-all shadow-lg",
                    (!input.trim() && !selectedImage) || isLoading
                      ? (isDarkMode ? "bg-zinc-800 text-zinc-600 cursor-not-allowed" : "bg-zinc-100 text-zinc-300 cursor-not-allowed")
                      : "bg-emerald-500 text-white hover:bg-emerald-400 shadow-emerald-500/20"
                  )}
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
          <p className={cn("text-[10px] text-center transition-colors", isDarkMode ? "text-zinc-700" : "text-zinc-400")}>
            Ibkane IA peut faire des erreurs. Vérifie les informations importantes.
          </p>
        </div>
      </footer>
    </div>
  );
}
