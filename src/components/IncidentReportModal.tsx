'use client';

import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';

interface IncidentReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (category: string, location: string, description: string) => Promise<void>;
  formSubmitting: boolean;
  formMessage: { type: 'success' | 'error'; text: string } | null;
}

export default function IncidentReportModal({
  isOpen,
  onClose,
  onSubmit,
  formSubmitting,
  formMessage,
}: IncidentReportModalProps) {
  const [issueCategory, setIssueCategory] = useState('access_block');
  const [issueLocation, setIssueLocation] = useState('');
  const [issueDesc, setIssueDesc] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueLocation.trim() || !issueDesc.trim()) return;
    onSubmit(issueCategory, issueLocation, issueDesc);
    // Reset inputs on success trigger handled by caller or locally
    setIssueLocation('');
    setIssueDesc('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl overflow-hidden shadow-2xl p-5 space-y-4 animate-scale-up">
        
        <div className="flex justify-between items-center border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning animate-pulse" />
            <h2 className="text-sm font-black text-foreground uppercase tracking-wider">Report Access Issue</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-xs font-bold text-muted-foreground hover:text-foreground px-2 py-1 rounded bg-muted border border-border/80 hover:border-border transition-all"
          >
            Close
          </button>
        </div>

        {formMessage && (
          <div 
            className={`p-3 rounded-lg text-xs font-semibold ${
              formMessage.type === 'success' 
                ? 'bg-success/15 text-success border border-success/20' 
                : 'bg-danger/15 text-danger border border-danger/20'
            }`}
          >
            {formMessage.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label htmlFor="issue-category" className="block text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">
              Issue Category
            </label>
            <select
              id="issue-category"
              value={issueCategory}
              onChange={(e) => setIssueCategory(e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-border bg-muted text-xs font-semibold focus:ring-1 focus:ring-primary focus:border-transparent outline-none cursor-pointer text-foreground"
            >
              <option value="access_block">♿ Blocked Wheelchair Access/Ramp</option>
              <option value="broken_facility">🛗 Broken Elevator/Escalator</option>
              <option value="safety">⚠️ Safety Hazard/Spill</option>
              <option value="cleanliness">🚻 Restroom Maintenance Needed</option>
              <option value="other">❓ Other Operational Issue</option>
            </select>
          </div>

          <div>
            <label htmlFor="issue-location" className="block text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">
              Stadium Location Node
            </label>
            <input
              id="issue-location"
              type="text"
              placeholder="e.g. Section 215 Concourse near Elevator A"
              value={issueLocation}
              onChange={(e) => setIssueLocation(e.target.value)}
              required
              className="w-full h-11 px-3 rounded-lg border border-border bg-muted text-xs font-semibold placeholder:text-muted-foreground focus:ring-1 focus:ring-primary focus:border-transparent outline-none text-foreground"
            />
          </div>

          <div>
            <label htmlFor="issue-desc" className="block text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">
              Issue Details
            </label>
            <textarea
              id="issue-desc"
              rows={3}
              placeholder="Describe the issue in detail (e.g. wet floor spill, ticket barrier malfunction)"
              value={issueDesc}
              onChange={(e) => setIssueDesc(e.target.value)}
              required
              className="w-full p-3 rounded-lg border border-border bg-muted text-xs font-semibold placeholder:text-muted-foreground focus:ring-1 focus:ring-primary focus:border-transparent outline-none resize-none text-foreground"
            />
          </div>

          <button
            type="submit"
            disabled={formSubmitting}
            className="w-full h-11 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground font-black text-xs shadow-md flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {formSubmitting ? 'Transmitting assistance request...' : 'Transmit Alert to Dispatch'}
          </button>
        </form>
      </div>
    </div>
  );
}
