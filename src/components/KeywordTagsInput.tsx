import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { X, Plus, Sparkles } from 'lucide-react-native';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/store/useThemeStore';
import * as Haptics from 'expo-haptics';

interface KeywordTagsInputProps {
  tags: string[];
  onChangeTags: (tags: string[]) => void;
  suggestions?: string[];
}

export const KeywordTagsInput: React.FC<KeywordTagsInputProps> = ({
  tags,
  onChangeTags,
  suggestions = [],
}) => {
  const { colors, isDark } = useTheme();
  const [inputValue, setInputValue] = useState('');

  // Process text into keywords (handles single words, comma separation, and pastes)
  const processAndAddTokens = (text: string) => {
    const rawTokens = text.split(',');
    const newKeywords: string[] = [];

    for (const raw of rawTokens) {
      const trimmed = raw.trim().toLowerCase();
      if (trimmed.length > 0 && !tags.some((t) => t.toLowerCase() === trimmed) && !newKeywords.includes(trimmed)) {
        newKeywords.push(trimmed);
      }
    }

    if (newKeywords.length > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChangeTags([...tags, ...newKeywords]);
    }
  };

  const handleAddTag = (tagToAdd: string) => {
    processAndAddTokens(tagToAdd);
    setInputValue('');
  };

  const handleTextChange = (text: string) => {
    // If user typed or pasted a comma, immediately convert preceding text to a keyword
    if (text.includes(',')) {
      processAndAddTokens(text);
      setInputValue('');
    } else {
      setInputValue(text);
    }
  };

  const handleRemoveTag = (indexToRemove: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChangeTags(tags.filter((_, i) => i !== indexToRemove));
  };

  const handleInputSubmit = () => {
    if (inputValue.trim().length > 0) {
      processAndAddTokens(inputValue);
      setInputValue('');
    }
  };

  const availableSuggestions = suggestions.filter(
    (s) => !tags.some((t) => t.toLowerCase() === s.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Current Tags Chips */}
      <View style={styles.tagWrap}>
        {tags.map((tag, index) => (
          <View key={`${tag}-${index}`} style={[styles.tagChip, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
            <Text style={[styles.tagText, { color: colors.textPrimary }]}>{tag}</Text>
            <TouchableOpacity
              onPress={() => handleRemoveTag(index)}
              style={styles.removeBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={12} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Input row */}
      <View style={[styles.inputRow, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
        <TextInput
          style={[styles.textInput, { color: colors.textPrimary }]}
          value={inputValue}
          onChangeText={handleTextChange}
          placeholder="Add keyword (e.g. 12 ft, snooker, royal)..."
          placeholderTextColor={colors.textMuted}
          returnKeyType="done"
          blurOnSubmit={false}
          onSubmitEditing={handleInputSubmit}
          autoCapitalize="none"
        />
        {inputValue.trim().length > 0 && (
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: isDark ? colors.surfaceElevated : colors.primary }]}
            onPress={handleInputSubmit}
          >
            <Plus size={16} color={isDark ? colors.textPrimary : '#FFFFFF'} />
          </TouchableOpacity>
        )}
      </View>

      {/* Smart Keyword Suggestions */}
      {availableSuggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <View style={styles.suggestionHeader}>
            <Sparkles size={12} color={colors.accentDark} style={{ marginRight: 4 }} />
            <Text style={[styles.suggestionTitle, { color: colors.accentDark }]}>Suggested keywords:</Text>
          </View>
          <View style={styles.suggestionWrap}>
            {availableSuggestions.slice(0, 8).map((sug) => (
              <TouchableOpacity
                key={sug}
                style={[styles.suggestionChip, { backgroundColor: colors.accentLight }]}
                onPress={() => handleAddTag(sug)}
              >
                <Plus size={12} color={colors.accentDark} style={{ marginRight: 3 }} />
                <Text style={[styles.suggestionText, { color: colors.accentDark }]}>{sug}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.full,
    paddingVertical: 5,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.xs,
    borderWidth: 1,
  },
  tagText: {
    ...Typography.bodySmall,
    fontWeight: '500',
  },
  removeBtn: {
    padding: 4,
    marginLeft: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    height: 44,
  },
  textInput: {
    flex: 1,
    ...Typography.bodyMedium,
    paddingVertical: 0,
  },
  addBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionsContainer: {
    marginTop: Spacing.sm,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  suggestionTitle: {
    ...Typography.caption,
    fontSize: 11,
  },
  suggestionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(5, 150, 105, 0.2)',
  },
  suggestionText: {
    ...Typography.bodySmall,
    fontWeight: '500',
  },
});
