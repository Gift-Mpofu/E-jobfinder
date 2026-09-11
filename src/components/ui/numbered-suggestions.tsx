import ReactMarkdown from 'react-markdown';

function parseSuggestions(text: string): string[] {
  if (!text || !text.trim()) return [];

  const numbered = text
    .split(/\d+\.\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (numbered.length > 0) return numbered;

  return text
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function NumberedSuggestionsList({ text }: { text: string }) {
  const suggestions = parseSuggestions(text);

  if (suggestions.length === 0) {
    return (
      <div className="text-[12px] text-[#6E6E73] leading-relaxed mt-2">
        <ReactMarkdown>{text}</ReactMarkdown>
      </div>
    );
  }

  return (
    <div className="space-y-3 mt-2">
      {suggestions.map((suggestion, index) => (
        <div
          key={index}
          className="bg-[#F5F5F7] rounded-xl p-4 border border-[#E5E5EA]"
        >
          <div className="flex gap-3 items-start">
            <span className="bg-[#FF6B00] text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
              {index + 1}
            </span>
            <div className="flex-1 min-w-0 text-[12px] text-[#6E6E73] leading-relaxed">
              <ReactMarkdown>{suggestion}</ReactMarkdown>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
