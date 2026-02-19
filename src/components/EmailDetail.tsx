"use client";

import { useEffect, useState, useRef } from "react";
import { EmailThread } from "@/lib/useEmails";
import { safeString } from "@/lib/safeRender";

interface EmailDetailProps {
  email: EmailThread;
  account: string;
  onClose: () => void;
  onMarkAsDeal: (e: React.MouseEvent) => void;
  onMarkAsRequest: (e: React.MouseEvent) => void;
  onIgnore: () => void;
  onDone: () => void;
  isMarking: boolean;
}

interface EmailMessage {
  id: string;
  from: string;
  to: string;
  date: string;
  subject: string;
  body: string;
  bodyHtml?: string;
  isMe?: boolean; // True if sent by current account
}

export default function EmailDetail({
  email,
  account,
  onClose,
  onMarkAsDeal,
  onMarkAsRequest,
  onIgnore,
  onDone,
  isMarking,
}: EmailDetailProps) {
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [rewriting, setRewriting] = useState(false);
  const [rewriteError, setRewriteError] = useState<string | null>(null);
  
  // AI Assistant state
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  
  // Ref for scrolling to latest message
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom when messages load
  useEffect(() => {
    if (messages.length > 0 && !loading) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  useEffect(() => {
    async function fetchThread() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/emails/thread?id=${encodeURIComponent(email.id)}&account=${encodeURIComponent(account)}`
        );
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.details || errData.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        setMessages(data.messages || []);
      } catch (err) {
        console.error("Thread fetch error:", err);
        setError(err instanceof Error ? err.message : "Failed to load email");
      } finally {
        setLoading(false);
      }
    }
    fetchThread();
  }, [email.id, account]);
  
  // Retry function
  const retryFetch = () => {
    setError(null);
    setLoading(true);
    fetch(`/api/emails/thread?id=${encodeURIComponent(email.id)}&account=${encodeURIComponent(account)}`)
      .then(res => res.ok ? res.json() : Promise.reject(new Error("Failed")))
      .then(data => setMessages(data.messages || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    
    // Try parsing the date string
    let date = new Date(dateStr);
    
    // If invalid, try replacing space with T for ISO format
    if (isNaN(date.getTime())) {
      date = new Date(dateStr.replace(" ", "T"));
    }
    
    // If still invalid, try parsing common email date formats
    if (isNaN(date.getTime())) {
      // Try removing timezone abbreviation like "(PST)"
      const cleaned = dateStr.replace(/\s*\([^)]+\)\s*$/, "").trim();
      date = new Date(cleaned);
    }
    
    // If still invalid, return the original string
    if (isNaN(date.getTime())) {
      return dateStr;
    }
    
    return date.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const extractName = (from: unknown) => {
    const str = safeString(from);
    const match = str.match(/^([^<]+)/);
    return match ? match[1].trim() : str;
  };

  const extractEmail = (from: unknown) => {
    const str = safeString(from);
    const match = str.match(/<([^>]+)>/);
    return match ? match[1] : str;
  };

  const [sendSuccess, setSendSuccess] = useState(false);
  
  // Fetch thread function (for refresh after send)
  const fetchThread = async () => {
    try {
      const res = await fetch(
        `/api/emails/thread?id=${encodeURIComponent(email.id)}&account=${encodeURIComponent(account)}`
      );
      if (!res.ok) throw new Error("Failed to fetch thread");
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (err) {
      console.error("Failed to refresh thread:", err);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || sending) return;
    
    setSending(true);
    setSendSuccess(false);
    try {
      const lastMessage = messages[messages.length - 1];
      const replyTo = lastMessage ? extractEmail(lastMessage.from) : extractEmail(email.from);
      
      const res = await fetch("/api/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account,
          to: replyTo,
          subject: safeString(email.subject).startsWith("Re:") ? safeString(email.subject) : `Re: ${safeString(email.subject)}`,
          body: replyText,
          threadId: email.id,
        }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send");
      }
      
      // Clear input and show success
      setReplyText("");
      setSendSuccess(true);
      
      // Refresh thread to show the new message (after brief delay for Gmail to process)
      setTimeout(() => {
        fetchThread();
      }, 1500);
      
      // Clear success message after 3s
      setTimeout(() => setSendSuccess(false), 3000);
    } catch (err) {
      console.error("Send error:", err);
      alert(err instanceof Error ? err.message : "Failed to send reply");
    } finally {
      setSending(false);
    }
  };

  const handleRewrite = async () => {
    if (!replyText.trim() || rewriting) return;

    setRewriting(true);
    setRewriteError(null);
    try {
      const lastMessage = messages[messages.length - 1];
      const res = await fetch("/api/emails/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draft: replyText,
          account, // Pass account for signature lookup
          context: {
            subject: safeString(email.subject),
            from: safeString(lastMessage?.from || email.from),
            originalBody: safeString(lastMessage?.body || ""),
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to rewrite");
      }

      if (!data.rewritten || typeof data.rewritten !== "string") {
        throw new Error("No rewritten text returned");
      }

      setReplyText(data.rewritten);
    } catch (err) {
      console.error("Rewrite error:", err);
      setRewriteError(err instanceof Error ? err.message : "Failed to rewrite");
    } finally {
      setRewriting(false);
    }
  };

  // AI Assistant - ask questions about the thread
  const handleAskAI = async () => {
    if (!aiQuestion.trim() || aiLoading) return;
    
    setAiLoading(true);
    setAiAnswer("");
    try {
      // Build thread context for AI
      const threadContext = messages.map(m => 
        `From: ${extractName(m.from)}\nDate: ${formatDate(m.date)}\n${stripQuotedContent(safeString(m.body))}`
      ).join('\n\n---\n\n');
      
      const res = await fetch("/api/emails/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: aiQuestion,
          threadContext,
          subject: safeString(email.subject),
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to get answer");
      }
      
      setAiAnswer(data.answer || "No answer received");
    } catch (err) {
      console.error("AI Ask error:", err);
      setAiAnswer(`Error: ${err instanceof Error ? err.message : "Failed to get answer"}`);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 md:p-4 border-b border-zinc-800">
        <div className="flex items-start gap-3">
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-white flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-base md:text-lg font-semibold line-clamp-2">{safeString(email.subject) || "(no subject)"}</h2>
            <p className="text-sm text-zinc-400 truncate mt-0.5">{extractName(email.from)}</p>
            <p className="text-xs text-zinc-500 mt-1">
              {safeString(email.messageCount)} message{email.messageCount !== 1 ? "s" : ""} in thread
            </p>
          </div>
        </div>
        {/* Action buttons - wrap on mobile */}
        <div className="flex flex-wrap gap-2 mt-3">
          <button
            onClick={onMarkAsDeal}
            disabled={isMarking}
            className="px-3 py-1.5 text-sm bg-green-600/20 hover:bg-green-600/40 text-green-400 rounded-lg transition-colors disabled:opacity-50"
          >
            💰 Deal
          </button>
          <button
            onClick={onMarkAsRequest}
            disabled={isMarking}
            className="px-3 py-1.5 text-sm bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded-lg transition-colors disabled:opacity-50"
          >
            📋 Request
          </button>
          <button
            onClick={onDone}
            disabled={isMarking}
            className="px-3 py-1.5 text-sm bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 rounded-lg transition-colors disabled:opacity-50"
          >
            ✓ Done
          </button>
          <button
            onClick={onIgnore}
            disabled={isMarking}
            className="px-3 py-1.5 text-sm bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg transition-colors disabled:opacity-50"
          >
            🗑️ Archive
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading && (
          <div className="flex items-center justify-center h-32">
            <div className="text-zinc-500 animate-pulse">Loading email...</div>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-800/50 bg-red-900/20 p-4">
            <p className="text-red-400 text-sm mb-2">{error}</p>
            <button
              onClick={retryFetch}
              className="px-3 py-1.5 text-xs bg-red-800/30 hover:bg-red-700/40 text-red-300 rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && messages.length === 0 && (
          <div className="text-zinc-500 text-center py-8">
            No messages found
          </div>
        )}

        {/* Messages */}
        <div className="space-y-4" id="thread-messages">
          {messages.map((msg, idx) => (
            <div
              key={msg.id || idx}
              className={`rounded-xl border overflow-hidden ${
                msg.isMe 
                  ? "border-indigo-600/50 bg-indigo-950/30 ml-4" 
                  : "border-zinc-800 bg-zinc-900/50 mr-4"
              }`}
            >
              {/* Message Header */}
              <div className={`p-3 border-b ${
                msg.isMe 
                  ? "border-indigo-600/30 bg-indigo-950/50" 
                  : "border-zinc-800 bg-zinc-900/80"
              }`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate flex items-center gap-2">
                      {msg.isMe && <span className="text-xs bg-indigo-600 px-1.5 py-0.5 rounded text-white">You</span>}
                      {extractName(msg.from)}
                    </p>
                    <p className="text-xs text-zinc-500 truncate">to {safeString(msg.to)}</p>
                  </div>
                  <span className="text-xs text-zinc-500 flex-shrink-0">
                    {formatDate(safeString(msg.date))}
                  </span>
                </div>
              </div>

              {/* Message Body - stripped of quoted chains */}
              <div className="p-4">
                {msg.bodyHtml ? (
                  <div
                    className="prose prose-invert prose-sm max-w-none 
                      prose-p:my-2 prose-p:leading-relaxed
                      prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:underline
                      prose-img:max-w-full prose-img:rounded-lg
                      prose-blockquote:border-zinc-700 prose-blockquote:text-zinc-400
                      [&_*]:text-sm
                      [&_*]:!text-zinc-200
                      [&_a]:!text-indigo-400
                      [&_h1]:!text-white [&_h2]:!text-white [&_h3]:!text-white
                      [&_td]:!bg-transparent [&_th]:!bg-transparent [&_table]:!bg-transparent
                      [&_div]:!bg-transparent"
                    dangerouslySetInnerHTML={{ __html: stripQuotedHtml(sanitizeHtml(safeString(msg.bodyHtml))) }}
                  />
                ) : (
                  <pre className="whitespace-pre-wrap text-sm text-zinc-300 font-sans leading-relaxed">
                    {stripQuotedContent(safeString(msg.body))}
                  </pre>
                )}
              </div>
            </div>
          ))}
          {/* Scroll anchor for auto-scroll to latest */}
          <div ref={messagesEndRef} />
        </div>
        
        {/* AI Assistant Section */}
        {!loading && messages.length > 0 && (
          <div className="mt-6 border-t border-zinc-800 pt-4">
            <button
              onClick={() => setShowAiAssistant(!showAiAssistant)}
              className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              <span className="text-base">🤖</span>
              <span>Ask AI about this thread</span>
              <svg 
                className={`w-4 h-4 transition-transform ${showAiAssistant ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showAiAssistant && (
              <div className="mt-3 p-3 bg-zinc-900/80 border border-zinc-700 rounded-lg">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiQuestion}
                    onChange={(e) => setAiQuestion(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAskAI()}
                    placeholder="What are the key points? What do they want? Summarize..."
                    className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                  <button
                    onClick={handleAskAI}
                    disabled={aiLoading || !aiQuestion.trim()}
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg text-sm transition-colors whitespace-nowrap"
                  >
                    {aiLoading ? "..." : "Ask"}
                  </button>
                </div>
                
                {/* Quick suggestion chips */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {["Summarize", "What do they want?", "Key dates/deadlines", "Action items"].map((q) => (
                    <button
                      key={q}
                      onClick={() => { setAiQuestion(q); }}
                      className="px-2 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
                
                {aiAnswer && (
                  <div className="mt-3 p-3 bg-zinc-800/50 rounded-lg">
                    <p className="text-sm text-zinc-300 whitespace-pre-wrap">{aiAnswer}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Reply Footer */}
      <div className="p-3 md:p-4 border-t border-zinc-800 bg-zinc-900/50">
        <div className="flex flex-col gap-2">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => (e.key === "Enter" && (e.metaKey || e.ctrlKey)) && handleReply()}
            placeholder="Type a quick reply..."
            rows={6}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-indigo-500 transition-colors resize-y min-h-[120px]"
          />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleRewrite}
              disabled={rewriting || !replyText.trim()}
              className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 rounded-lg text-sm transition-colors"
            >
              {rewriting ? "Rewriting..." : "Rewrite with AI"}
            </button>
            <button
              onClick={handleReply}
              disabled={sending || !replyText.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg text-sm transition-colors"
            >
              {sending ? "Sending..." : "Reply"}
            </button>
          </div>
          {rewriteError && (
            <p className="text-xs text-red-400">{rewriteError}</p>
          )}
          {sendSuccess && (
            <p className="text-xs text-emerald-400 flex items-center gap-1">
              ✓ Reply sent! Refreshing thread...
            </p>
          )}
        </div>
        <p className="text-[10px] text-zinc-600 mt-1 text-center">
          Sends from {account}
        </p>
      </div>
    </div>
  );
}

// Basic HTML sanitization (remove scripts, on* attributes)
function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");
}

// Strip quoted content from email body (the repeated thread chains)
function stripQuotedContent(body: string): string {
  const lines = body.split('\n');
  const result: string[] = [];
  let hitQuotedSection = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Detect "On [date], [name] wrote:" patterns
    if (/^On .+(wrote|said|writes):?\s*$/i.test(trimmed)) {
      hitQuotedSection = true;
      break;
    }
    
    // Detect "From: ... Sent: ... To: ... Subject:" forwarded blocks
    if (/^-{2,}\s*(Original Message|Forwarded message)/i.test(trimmed)) {
      hitQuotedSection = true;
      break;
    }
    
    // Detect "From:" header that starts a quoted chain
    if (/^From:\s+.+@/.test(trimmed) && i > 3) {
      // Check if next lines look like email headers
      const nextLines = lines.slice(i, i + 4).join('\n');
      if (/Sent:|To:|Subject:/i.test(nextLines)) {
        hitQuotedSection = true;
        break;
      }
    }
    
    // Detect Gmail's collapsed quotes
    if (/^\[image:.*\]/.test(trimmed) && /wrote:/.test(lines[i - 1] || '')) {
      break;
    }
    
    // Stop if we hit a long section of ">" quoted lines
    if (trimmed.startsWith('>')) {
      // Look ahead - if next 3+ lines also start with >, this is a quote block
      let quoteCount = 1;
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        if (lines[j].trim().startsWith('>')) quoteCount++;
      }
      if (quoteCount >= 3) {
        hitQuotedSection = true;
        break;
      }
    }
    
    result.push(line);
  }
  
  // Trim trailing empty lines and signature separators
  while (result.length > 0) {
    const last = result[result.length - 1].trim();
    if (last === '' || last === '--' || last === '—') {
      result.pop();
    } else {
      break;
    }
  }
  
  return result.join('\n').trim();
}

// Strip quoted content from HTML emails
function stripQuotedHtml(html: string): string {
  // Remove Gmail quote blocks
  let cleaned = html
    .replace(/<div class="gmail_quote"[\s\S]*$/i, '')
    .replace(/<blockquote[^>]*type="cite"[\s\S]*$/i, '')
    .replace(/<div class="moz-cite-prefix">[\s\S]*$/i, '');
  
  // Remove Outlook quote blocks
  cleaned = cleaned
    .replace(/<div style="border:none;border-top:solid #[A-Fa-f0-9]+ 1\.0pt[\s\S]*$/i, '')
    .replace(/<hr[^>]*>[\s\S]*<p class="MsoNormal"><b>From:<\/b>[\s\S]*$/i, '');
  
  // Remove generic quoted content divs
  cleaned = cleaned
    .replace(/<div[^>]*class="[^"]*quote[^"]*"[^>]*>[\s\S]*$/gi, '');
  
  return cleaned.trim();
}
