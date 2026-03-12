import { useState } from "react";
import { Tag, X, Plus } from "lucide-react";

interface TagEditorProps {
  initialTags: string[];
  onTagsChange?: (tags: string[]) => void;
}

export function TagEditor({ initialTags, onTagsChange }: TagEditorProps) {
  const [tags, setTags] = useState<string[]>(initialTags);
  const [isEditing, setIsEditing] = useState(false);
  const [tagInput, setTagInput] = useState("");

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      const newTags = [...tags, tagInput.trim()];
      setTags(newTags);
      onTagsChange?.(newTags);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = tags.filter((tag) => tag !== tagToRemove);
    setTags(newTags);
    onTagsChange?.(newTags);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
    if (e.key === "Escape") {
      setIsEditing(false);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {tags.map((tag) => (
        <div
          key={tag}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--graphite-800)] text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <Tag className="w-3.5 h-3.5" />
          <span>#{tag}</span>
          {isEditing && (
            <button
              onClick={() => handleRemoveTag(tag)}
              className="p-0.5 rounded-full hover:bg-[var(--graphite-900)] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ))}

      {isEditing ? (
        <div className="inline-flex items-center gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="태그 추가..."
            className="w-32 px-3 py-1.5 rounded-full bg-[var(--graphite-800)] border border-[var(--line-soft)] focus:border-[var(--mint-500)] focus:outline-none transition-colors text-sm"
            autoFocus
          />
          <button
            onClick={handleAddTag}
            className="p-1.5 rounded-full bg-[var(--mint-500)]/10 text-[var(--mint-500)] hover:bg-[var(--mint-500)]/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsEditing(false)}
            className="px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            완료
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsEditing(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-dashed border-[var(--line-soft)] text-sm text-[var(--text-secondary)] hover:border-[var(--mint-500)] hover:text-[var(--mint-500)] transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>태그 추가</span>
        </button>
      )}
    </div>
  );
}