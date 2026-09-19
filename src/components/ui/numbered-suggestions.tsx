import ReactMarkdown from 'react-markdown';

function parseSuggestions(text: string): { title?: string; body: string }[] {
  if (!text || !text.trim()) return [];

  const parts = text
    .split(/\d+\.\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const items = parts.length > 0 ? parts : text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  return items.map((item) => {
    const titleMatch = item.match(/^(?:\*\*)?([^*:\n]+)(?:\*\*)?\s*[:\-\—]\s*([\s\S]*)$/);
    if (titleMatch && titleMatch[1].length < 60) {
      return {
        title: titleMatch[1].trim(),
        body: titleMatch[2].trim(),
      };
    }
    return { body: item };
  });
}

export function NumberedSuggestionsList({ text }: { text: string }) {
  const suggestions = parseSuggestions(text);

  if (suggestions.length === 0) {
    return (
      <div className="text-xs text-[#6E6E73] leading-relaxed mt-2">
        <ReactMarkdown>{text}</ReactMarkdown>
      </div>
    );
  }

  return (
    <div className="space-y-3 mt-2">
      {suggestions.map((item, index) => (
        <div
          key={index}
          className="bg-[#F5F5F7] rounded-xl p-4 border border-[#E5E5EA] flex gap-3 items-start"
        >
          <span className="bg-[#FF6B00] text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
            {index + 1}
          </span>
          <div className="flex-1 min-w-0 text-xs text-[#1D1D1F] leading-relaxed">
            {item.title && (
              <h4 className="font-bold text-[#1D1D1F] text-xs mb-1">{item.title}</h4>
            )}
            <div className="text-[#6E6E73]">
              <ReactMarkdown>{item.body}</ReactMarkdown>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
