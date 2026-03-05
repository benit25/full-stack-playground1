import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { formatDistanceToNow } from 'date-fns';

export function ContentCard({ content, onPress, onEdit, onDelete, showActions = false }) {
  const formattedDate = content.published_at
    ? formatDistanceToNow(new Date(content.published_at), { addSuffix: true })
    : 'Draft';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* Media */}
      {content.media_url && (
        <Image
          source={{ uri: content.media_url }}
          style={styles.media}
          onError={() => {
            // Fallback placeholder
          }}
        />
      )}

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>{content.title}</Text>
        
        <Text style={styles.body} numberOfLines={3}>
          {content.body}
        </Text>

        {/* Meta */}
        <View style={styles.meta}>
          <View style={styles.typeAndAuthor}>
            <View style={[styles.typePill, styles[`type_${content.content_type}`]]}>
              <Text style={styles.typeText}>
                {content.content_type === 'article' ? '📄' : content.content_type === 'video_embed' ? '🎥' : '🖼️'}
              </Text>
            </View>
            {content.creator_name && (
              <Text style={styles.author}>{content.creator_name}</Text>
            )}
          </View>

          <Text style={styles.date}>{formattedDate}</Text>
        </View>
      </View>

      {/* Actions (if owner) */}
      {showActions && (
        <View style={styles.actions}>
          <TouchableOpacity onPress={onEdit} style={styles.actionBtn}>
            <Text style={{ fontSize: 18 }}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={styles.actionBtn}>
            <Text style={{ fontSize: 18 }}>🗑️</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1
  },
  media: {
    width: '100%',
    height: 200,
    backgroundColor: '#f1f5f9'
  },
  content: {
    padding: 16
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8
  },
  body: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 12
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  typeAndAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  typePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#f0f4f8'
  },
  type_article: { backgroundColor: '#dbeafe' },
  type_video_embed: { backgroundColor: '#fed7aa' },
  type_image_story: { backgroundColor: '#f3e8ff' },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569'
  },
  author: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb'
  },
  date: {
    fontSize: 12,
    color: '#94a3b8'
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8
  },
  actionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4
  }
});

export default ContentCard;
