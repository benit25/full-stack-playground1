import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput as RNTextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  ImageBackground,
  ActivityIndicator,
  RefreshControl,
  Modal
} from 'react-native';
import { AuthProvider, useAuth } from './src/AuthContext.js';
import { contentAPI, creatorAPI } from './src/api.js';
import { ContentCard } from './src/components/ContentCard.js';
import { Button, Toast, ConfirmModal, Card, EmptyState, ErrorBanner } from './src/components/UI.js';

const colors = {
  primary: '#2563eb',
  success: '#10b981',
  error: '#ef4444',
  bg: '#f8fafc',
  text: '#1e293b',
  border: '#e2e8f0'
};

// ===== LANDING SCREEN =====
function LandingScreen({ navigation }) {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero */}
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1200&q=80' }}
        style={styles.hero}
        imageStyle={{ opacity: 0.6 }}
      >
        <View style={styles.heroOverlay}>
          <Text style={styles.heroTitle}>PLXYGROUND</Text>
          <Text style={styles.heroSubtitle}>Where creators and brands connect in sports</Text>
          
          <View style={styles.heroButtons}>
            <Button
              title="Get Started"
              onPress={() => navigation.navigate('Signup')}
            />
            <Button
              title="I'm a Business"
              onPress={() => navigation.navigate('BusinessSignup')}
              variant="secondary"
            />
          </View>
        </View>
      </ImageBackground>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Features</Text>
        <View style={styles.featureGrid}>
          <View style={styles.featureCard}>
            <Text style={styles.featureIcon}>🛡️</Text>
            <Text style={styles.featureName}>Moderation</Text>
          </View>
          <View style={styles.featureCard}>
            <Text style={styles.featureIcon}>📊</Text>
            <Text style={styles.featureName}>Analytics</Text>
          </View>
          <View style={styles.featureCard}>
            <Text style={styles.featureIcon}>💼</Text>
            <Text style={styles.featureName}>Opportunities</Text>
          </View>
          <View style={styles.featureCard}>
            <Text style={styles.featureIcon}>🔒</Text>
            <Text style={styles.featureName}>Secure Admin</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trusted by Leading Brands</Text>
        <View style={styles.brandRow}>
          <Text style={styles.brandName}>NIKE</Text>
          <Text style={styles.brandName}>ADIDAS</Text>
          <Text style={styles.brandName}>ESPN</Text>
        </View>
      </View>

      <View style={styles.footerSection}>
        <TouchableOpacity onPress={() => {}} style={styles.footerLink}>
          <Text style={styles.footerText}>📋 Terms of Service</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => {}} style={styles.footerLink}>
          <Text style={styles.footerText}>🔐 Privacy Policy</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => {}} style={styles.footerLink}>
          <Text style={styles.footerText}>❓ Help Center</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ===== SIGNUP SCREEN =====
function SignupScreen({ navigation }) {
  const { signup, error } = useAuth();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [name, setName] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [termsAccepted, setTermsAccepted] = React.useState(false);
  const [successMsg, setSuccessMsg] = React.useState('');

  const handleSignup = async () => {
    if (!email || !password || !name) {
      alert('Please fill all fields');
      return;
    }
    if (!termsAccepted) {
      alert('Please accept terms and conditions');
      return;
    }

    setLoading(true);
    try {
      await signup(email, password, name);
      setSuccessMsg('Account created! Redirecting...');
      setTimeout(() => navigation.navigate('Feed'), 1500);
    } catch (err) {
      setSuccessMsg('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.formSection}>
        <Text style={styles.formTitle}>Create Your Account</Text>
        <Text style={styles.formSubtitle}>Join PLXYGROUND and start your journey</Text>

        {error && <ErrorBanner message={error} />}
        {successMsg && <Toast message={successMsg} type="success" visible={true} />}

        <RNTextInput
          placeholder="Full Name"
          value={name}
          onChangeText={setName}
          style={styles.input}
          placeholderTextColor="#94a3b8"
        />

        <RNTextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          keyboardType="email-address"
          placeholderTextColor="#94a3b8"
        />

        <RNTextInput
          placeholder="Password (min 8 characters)"
          value={password}
          onChangeText={setPassword}
          style={styles.input}
          secureTextEntry
          placeholderTextColor="#94a3b8"
        />

        <View style={styles.checkbox}>
          <TouchableOpacity
            style={[
              styles.checkboxBox,
              termsAccepted && styles.checkboxBoxChecked
            ]}
            onPress={() => setTermsAccepted(!termsAccepted)}
          >
            {termsAccepted && <Text style={styles.checkmark}>✓</Text>}
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.checkboxLabel}>
              I agree to the{' '}
              <Text style={styles.link} onPress={() => {}}>
                Terms of Service
              </Text>
              {' '}and{' '}
              <Text style={styles.link} onPress={() => {}}>
                Privacy Policy
              </Text>
            </Text>
          </View>
        </View>

        <Button
          title="Sign Up"
          onPress={handleSignup}
          loading={loading}
          disabled={loading}
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?{' '}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.link}>Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

// ===== LOGIN SCREEN =====
function LoginScreen({ navigation }) {
  const { login, error } = useAuth();
  const [email, setEmail] = React.useState('sarahjohnson@plxyground.local');
  const [password, setPassword] = React.useState('Password1!');
  const [loading, setLoading] = React.useState(false);
  const [suspended, setSuspended] = React.useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      alert('Please fill all fields');
      return;
    }

    setLoading(true);
    setSuspended(false);

    try {
      await login(email, password);
      navigation.navigate('Feed');
    } catch (err) {
      if (err.message === 'ACCOUNT_SUSPENDED') {
        setSuspended(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.formSection}>
        <Text style={styles.formTitle}>Welcome Back</Text>

        {suspended && (
          <View style={styles.suspendedBanner}>
            <Text style={styles.suspendedText}>
              Your account has been suspended. Please contact support.
            </Text>
          </View>
        )}

        {error && <ErrorBanner message={error} />}

        <RNTextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          keyboardType="email-address"
          placeholderTextColor="#94a3b8"
        />

        <RNTextInput
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          style={styles.input}
          secureTextEntry
          placeholderTextColor="#94a3b8"
        />

        <Button
          title="Login"
          onPress={handleLogin}
          loading={loading}
          disabled={loading}
        />

        <View style={styles.footer}>
          <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
            <Text style={styles.link}>Create account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

// ===== FEED SCREEN =====
function FeedScreen({ navigation }) {
  const { user } = useAuth();
  const [content, setContent] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [searching, setSearching] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [refreshing, setRefreshing] = React.useState(false);

  const fetchContent = React.useCallback(async (query = '') => {
    try {
      setError('');
      const response = await contentAPI.getAll(50, 0, query);
      setContent(response.data.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load content');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const handleSearch = React.useMemo(
    () => {
      const timeout = setTimeout(() => {
        fetchContent(search);
      }, 300);
      return () => clearTimeout(timeout);
    },
    [search, fetchContent]
  );

  React.useEffect(() => {
    handleSearch();
  }, [search, handleSearch]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>PLXYGROUND Feed</Text>
        <View style={styles.searchBar}>
          <Text style={{ marginRight: 8 }}>🔍</Text>
          <RNTextInput
            placeholder="Search posts..."
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
            placeholderTextColor="#94a3b8"
          />
          {search && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {error && <ErrorBanner message={error} />}

      {content.length === 0 ? (
        <View style={styles.emptyView}>
          <EmptyState message="No posts yet. Check back soon!" />
        </View>
      ) : (
        <FlatList
          data={content}
          renderItem={({ item }) => (
            <ContentCard
              content={item}
              onPress={() => navigation.navigate('ContentDetail', { id: item.id })}
            />
          )}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchContent(search);
              }}
            />
          }
        />
      )}

      {/* Floating button to create post */}
      {user && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('CreatePost')}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ===== CREATE POST SCREEN =====
function CreatePostScreen({ navigation }) {
  const { user } = useAuth();
  const [contentType, setContentType] = React.useState('article');
  const [title, setTitle] = React.useState('');
  const [body, setBody] = React.useState('');
  const [mediaUrl, setMediaUrl] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');

  const handleCreate = async () => {
    if (!title.trim() || !body.trim() || !mediaUrl.trim()) {
      setError('All fields are required (title, body, media URL)');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await contentAPI.create(contentType, title, body, mediaUrl);
      setSuccess('Post created successfully!');
      setTimeout(() => {
        navigation.navigate('Feed');
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.formSection}>
        <Text style={styles.formTitle}>Create a Post</Text>

        {error && <ErrorBanner message={error} />}
        {success && <Toast message={success} type="success" visible={true} />}

        {/* Content Type */}
        <Text style={styles.label}>Content Type</Text>
        <View style={styles.typeButtons}>
          {['article', 'video_embed', 'image_story'].map(type => (
            <TouchableOpacity
              key={type}
              style={[
                styles.typeButton,
                contentType === type && styles.typeButtonActive
              ]}
              onPress={() => setContentType(type)}
            >
              <Text style={contentType === type ? styles.typeButtonActiveText : styles.typeButtonText}>
                {type === 'article' ? '📄' : type === 'video_embed' ? '🎥' : '🖼️'} {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Title</Text>
        <RNTextInput
          placeholder="Give your post a catchy title"
          value={title}
          onChangeText={setTitle}
          style={styles.input}
          placeholderTextColor="#94a3b8"
        />

        <Text style={styles.label}>Body</Text>
        <RNTextInput
          placeholder="Write your full content here... (show full body in feed)"
          value={body}
          onChangeText={setBody}
          style={[styles.input, { height: 120, textAlignVertical: 'top' }]}
          multiline
          placeholderTextColor="#94a3b8"
        />

        <Text style={styles.label}>Media URL (Required)</Text>
        <RNTextInput
          placeholder="https://example.com/image.jpg"
          value={mediaUrl}
          onChangeText={setMediaUrl}
          style={styles.input}
          placeholderTextColor="#94a3b8"
        />

        <Text style={styles.helperText}>
          Paste a valid image URL. Example:{' '}
          <Text style={styles.link}>
            https://images.unsplash.com/photo-1461896836934-ffe607ba8211
          </Text>
        </Text>

        <Button
          title="Publish"
          onPress={handleCreate}
          loading={loading}
          disabled={loading}
        />

        <Button
          title="Cancel"
          onPress={() => navigation.goBack()}
          variant="secondary"
        />
      </View>
    </ScrollView>
  );
}

// ===== CONTENT DETAIL SCREEN =====
function ContentDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const [content, setContent] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await contentAPI.getById(id);
        setContent(response.data);
      } catch (err) {
        setError(err.message || 'Failed to load content');
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !content) {
    return (
      <View style={styles.container}>
        <ErrorBanner message={error || 'Content not found'} />
        <Button title="Go Back" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {content.media_url && (
        <Image
          source={{ uri: content.media_url }}
          style={styles.detailImage}
        />
      )}

      <View style={styles.detailContent}>
        <Text style={styles.detailTitle}>{content.title}</Text>

        <View style={styles.detailMeta}>
          <Text style={styles.detailAuthor}>{content.creator_name}</Text>
          <Text style={styles.detailType}>{content.content_type}</Text>
        </View>

        <View style={styles.divider} />

        <Text style={styles.detailBody}>{content.body}</Text>

        <View style={styles.detailActions}>
          <Button title="Share" variant="secondary" onPress={() => {}} />
          <Button title="Back" onPress={() => navigation.goBack()} variant="secondary" />
        </View>
      </View>
    </ScrollView>
  );
}

// ===== SETTINGS SCREEN =====
function SettingsScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>

        <Card>
          <Text style={styles.settingsLabel}>Email</Text>
          <Text style={styles.settingsValue}>{user?.email}</Text>
        </Card>

        <Card>
          <Text style={styles.settingsLabel}>Name</Text>
          <Text style={styles.settingsValue}>{user?.name}</Text>
        </Card>

        <Card>
          <Text style={styles.settingsLabel}>Role</Text>
          <Text style={styles.settingsValue}>{user?.role}</Text>
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Help & Legal</Text>

        <TouchableOpacity style={styles.settingRow}>
          <Text style={styles.settingText}>❓ Help Center</Text>
          <Text style={{ fontSize: 16 }}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingRow} onPress={() => {}}>
          <Text style={styles.settingText}>📋 Terms of Service</Text>
          <Text style={{ fontSize: 16 }}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingRow} onPress={() => {}}>
          <Text style={styles.settingText}>🔐 Privacy Policy</Text>
          <Text style={{ fontSize: 16 }}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Button
          title="🚪 Logout"
          onPress={() => setShowLogoutConfirm(true)}
          variant="secondary"
        />
      </View>

      <ConfirmModal
        visible={showLogoutConfirm}
        title="Logout?"
        message="Are you sure you want to logout? You'll need to login again."
        onConfirm={async () => {
          setShowLogoutConfirm(false);
          await logout();
          navigation.navigate('Landing');
        }}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </ScrollView>
  );
}

// ===== MAIN APP NAVIGATOR =====
function AppNavigator() {
  const { user, isLoading } = useAuth();
  const [currentScreen, setCurrentScreen] = React.useState('Landing');
  const navigationRef = React.useRef();

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const navigate = (screen, params = {}) => {
    setCurrentScreen(screen);
  };

  const screenProps = {
    navigate,
    goBack: () => setCurrentScreen(user ? 'Feed' : 'Landing')
  };

  let Screen;
  const params = {};

  switch (currentScreen) {
    case 'Landing':
      Screen = LandingScreen;
      break;
    case 'Signup':
      Screen = SignupScreen;
      break;
    case 'Login':
      Screen = LoginScreen;
      break;
    case 'Feed':
      Screen = FeedScreen;
      break;
    case 'CreatePost':
      Screen = CreatePostScreen;
      break;
    case 'Settings':
      Screen = SettingsScreen;
      break;
    case 'ContentDetail':
      Screen = ContentDetailScreen;
      params.route = { params: navigationRef.current?.contentDetailParams };
      break;
    default:
      Screen = user ? FeedScreen : LandingScreen;
  }

  return (
    <View style={styles.mainContainer}>
      {/* Header with nav */}
      {user && (
        <View style={styles.navbar}>
          <TouchableOpacity onPress={() => navigate('Feed')}>
            <Text style={[styles.navItem, currentScreen === 'Feed' && styles.navItemActive]}>
              🏠 Feed
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigate('Settings')}>
            <Text style={[styles.navItem, currentScreen === 'Settings' && styles.navItemActive]}>
              ⚙️ Settings
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <Screen
        navigation={{
          navigate,
          goBack: screenProps.goBack,
          push: navigatePush => {
            if (navigatePush === 'ContentDetail') {
              navigationRef.current = { contentDetailParams: params };
            }
            navigate(navigatePush, params);
          }
        }}
        route={params.route}
      />
    </View>
  );
}

// ===== ROOT APP =====
export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: colors.bg
  },
  container: {
    flex: 1,
    backgroundColor: colors.bg
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  navbar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12
  },
  navItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b'
  },
  navItemActive: {
    color: colors.primary
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text
  },
  listContent: {
    padding: 12
  },
  hero: {
    minHeight: 300,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary
  },
  heroOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center'
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#f1f5f9',
    marginBottom: 24,
    textAlign: 'center'
  },
  heroButtons: {
    gap: 12,
    width: '100%',
    maxWidth: 300
  },
  section: {
    padding: 16,
    backgroundColor: '#fff',
    marginTop: 1,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  featureCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.bg,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  featureIcon: {
    fontSize: 32,
    marginBottom: 8
  },
  featureName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center'
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center'
  },
  brandName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary
  },
  footerSection: {
    padding: 16,
    backgroundColor: '#fff',
    gap: 12,
    marginTop: 1,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  footerLink: {
    paddingVertical: 8
  },
  footerText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500'
  },
  formSection: {
    padding: 20,
    backgroundColor: '#fff',
    margin: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4
  },
  formSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 20
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8
  },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 16,
    color: colors.text
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 12
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2
  },
  checkboxBoxChecked: {
    backgroundColor: colors.primary
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold'
  },
  checkboxLabel: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20
  },
  link: {
    color: colors.primary,
    fontWeight: '600'
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    marginTop: 16
  },
  footerText: {
    fontSize: 14,
    color: '#64748b'
  },
  suspendedBanner: {
    backgroundColor: '#fee2e2',
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
    padding: 12,
    marginBottom: 16,
    borderRadius: 4
  },
  suspendedText: {
    color: '#7f1d1d',
    fontSize: 14,
    fontWeight: '500'
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
    flexWrap: 'wrap'
  },
  typeButton: {
    flex: 1,
    minWidth: 100,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    alignItems: 'center'
  },
  typeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  typeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text
  },
  typeButtonActiveText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12
  },
  helperText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: -12,
    marginBottom: 16
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5
  },
  fabText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold'
  },
  detailImage: {
    width: '100%',
    height: 300,
    backgroundColor: colors.bg
  },
  detailContent: {
    padding: 16
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12
  },
  detailMeta: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16
  },
  detailAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary
  },
  detailType: {
    fontSize: 12,
    backgroundColor: colors.bg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    color: colors.text
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 16
  },
  detailBody: {
    fontSize: 15,
    lineHeight: 24,
    color: colors.text,
    marginBottom: 20
  },
  detailActions: {
    flexDirection: 'row',
    gap: 8
  },
  emptyView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  settingText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500'
  },
  settingsLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600'
  },
  settingsValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
    marginTop: 4
  },
  ConfirmModal: {
    visible: false
  }
});
