import { useEffect, useState } from "react";
import { Tag, X, Plus } from "lucide-react";

interface TagEditorProps {
  initialTags: string[];
  onTagsChange?: (tags: string[]) => void;
  disabled?: boolean;
}

export function TagEditor({
  initialTags,
  onTagsChange,
  disabled = false,
}: TagEditorProps) {
  const [tags, setTags] = useState<string[]>(initialTags);
  const [isEditing, setIsEditing] = useState(false);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    setTags(initialTags);
  }, [initialTags]);

  const handleAddTag = () => {
    if (disabled) {
      return;
    }

    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      const newTags = [...tags, tagInput.trim()];
      setTags(newTags);
      onTagsChange?.(newTags);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (disabled) {
      return;
    }

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
              disabled={disabled}
              className="p-0.5 rounded-full hover:bg-[var(--graphite-900)] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
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
            disabled={disabled}
            placeholder="태그 추가..."
            className="w-32 px-3 py-1.5 rounded-full bg-[var(--graphite-800)] border border-[var(--line-soft)] focus:border-[var(--mint-500)] focus:outline-none transition-colors text-sm disabled:cursor-not-allowed disabled:opacity-60"
            autoFocus
          />
          <button
            onClick={handleAddTag}
            disabled={disabled}
            className="p-1.5 rounded-full bg-[var(--mint-500)]/10 text-[var(--mint-500)] hover:bg-[var(--mint-500)]/20 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsEditing(false)}
            disabled={disabled}
            className="px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          >
            완료
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsEditing(true)}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-dashed border-[var(--line-soft)] text-sm text-[var(--text-secondary)] hover:border-[var(--mint-500)] hover:text-[var(--mint-500)] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>태그 추가</span>
        </button>
      )}
    </div>
  );
}
