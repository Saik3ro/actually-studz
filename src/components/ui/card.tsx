import * as React from "react";

import { cn } from "@/lib/utils";

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("rounded-xl border bg-card text-card-foreground shadow", className)}
      {...props}
    />
  ),
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  ),
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

interface FlashcardProps {
  question: string;
  choices: string[];
  selectedAnswer?: string | null;
  onAnswerSelect?: (answer: string) => void;
  cardNumber?: number;
  totalCards?: number;
  showDontKnow?: boolean;
  onDontKnow?: () => void;
}

const Flashcard = React.forwardRef<HTMLDivElement, FlashcardProps>(
  ({ 
    question, 
    choices, 
    selectedAnswer, 
    onAnswerSelect, 
    cardNumber, 
    totalCards,
    showDontKnow = true,
    onDontKnow,
    className,
    ...props 
  }, ref) => (
    <div
      ref={ref}
      className={cn("rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 p-8 shadow-lg border border-slate-700", className)}
      {...props}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-widest text-slate-300">Term</span>
          <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </div>
        {cardNumber && totalCards && (
          <span className="text-sm text-slate-400">{cardNumber} of {totalCards}</span>
        )}
      </div>

      <p className="text-2xl sm:text-3xl font-bold text-white mb-8 leading-relaxed">
        {question}
      </p>

      <div className="space-y-4">
        <p className="text-sm font-medium text-slate-300">Choose an answer</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {choices.map((choice, idx) => (
            <button
              key={idx}
              onClick={() => onAnswerSelect?.(choice)}
              className={`p-4 rounded-2xl border-2 text-left transition-all ${
                selectedAnswer === choice
                  ? 'border-blue-400 bg-blue-500/20 text-white'
                  : 'border-slate-600 bg-slate-700/50 text-slate-200 hover:border-slate-500'
              }`}
            >
              {choice}
            </button>
          ))}
        </div>
      </div>

      {showDontKnow && (
        <div className="mt-8 flex items-center justify-center">
          <button 
            onClick={onDontKnow}
            className="text-sm text-slate-400 hover:text-slate-300 transition-colors"
          >
            Don't know?
          </button>
        </div>
      )}
    </div>
  ),
);
Flashcard.displayName = "Flashcard";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, Flashcard };
