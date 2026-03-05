import { initializeDB, runAsync, getAsync, allAsync } from '../db.js';
import { hashPassword, generateId, getCurrentTimestamp } from '../utils.js';

const unsplashSportsUrls = [
  'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=800&q=80', // Basketball
  'https://images.unsplash.com/photo-1624526267942-ab67550c46dd?auto=format&fit=crop&w=800&q=80', // Sports training
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=800&q=80', // Soccer/Football
  'https://images.unsplash.com/photo-1517836357463-d25ddfcbf042?auto=format&fit=crop&w=800&q=80', // Gym/Fitness
  'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?auto=format&fit=crop&w=800&q=80', // Running
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80', // Cycling
  'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=800&q=80', // Basketball arch
  'https://images.unsplash.com/photo-1611339555312-e607c90352fd?auto=format&fit=crop&w=800&q=80', // Sports momentum
  'https://images.unsplash.com/photo-1545241706-b7ee12b73e59?auto=format&fit=crop&w=800&q=80', // Fitness tracking
  'https://images.unsplash.com/photo-1552674852-33e185e0842f?auto=format&fit=crop&w=800&q=80', // Yoga/Wellness
];

const contentBodies = [
  `Day 23 of training: Nailed my personal best on the vertical jump. Been working on explosiveness all season. The key is consistency and focusing on your form. Every rep counts. Here's what worked for me: explosive stretching in warm-ups, plyometric drills 3x per week, and making sure to get adequate recovery between sessions. Remember, the grind pays off!`,

  `A deep dive into nutrition for athletes: Your diet is 80% of your performance. I've been experimenting with different macro ratios and found that 45% carbs, 30% protein, 25% fats works best for my training intensity. Pre-workout meals matter too - I now eat 2 hours before sessions with a banana and almond butter. Post-workout is critical: protein shake within 30 minutes. Track everything!`,

  `Mental health in sports is overlooked. The pressure to perform constantly can weigh on you. I started meditation 6 months ago and it completely changed my perspective. 10 minutes a day of focused breathing has reduced my anxiety by 40%. Remember: champions work on their minds as much as their bodies.`,

  `How I stay injury-free: Prevention > Treatment. My routine includes daily mobility work (20 min), foam rolling (15 min), and strategic rest days (1-2 per week). I also invested in proper footwear and a good physical therapist. Small investments in your health now save you from major rehab later.`,

  `Summer training camp highlights: Met incredible athletes from around the world, pushed my limits in 40-degree heat, and learned new techniques from coaches with Olympic experience. The intensity was real, but the camaraderie made it unforgettable. Grateful for opportunities like this.`,

  `Why I switched my training split from PPL to Upper/Lower: Been lifting for 8 years and finally found what works best for longevity. This split gives me better recovery and higher frequency on compound movements. Week 1: Upper A (benching focus), Upper B (rowing focus), Lower A (squat focus), Lower B (deadlift focus). Results have been consistent.`,

  `The best advice I'd give to young athletes: Play multiple sports growing up. Don't specialize too early. I did basketball, track, and swimming in high school—each taught me different aspects of athleticism. Cross-training builds a more complete athlete and keeps things fun.`,

  `Post-game analysis: Lost by 3 points but still proud of our performance. We executed our game plan, moved the ball well, and fought defensively for 48 minutes. The loss stings, but this is a learning opportunity. Film review tomorrow and back to work Wednesday.`,

  `Recovery week wisdom: Sometimes the best training is taking it easy. A full week of lighter workouts, stretching, ice baths, and quality sleep has me feeling refreshed. Your body grows during rest, not during the grind. Don't neglect recovery protocols.`,

  `Women in sports: The landscape is changing and I'm excited to be part of it. More investment, more visibility, more sponsorships. We're breaking barriers but there's still work to do. To girls aspiring to be athletes: the path is there, it's just different than before. Find your community and lift each other up.`
];

const opportunities = [
  {
    title: 'Brand Ambassador Opportunity - Fitness Equipment',
    role_type: 'Ambassador',
    body: 'We\'re looking for fitness influencers to represent our latest line of equipment. Must have 10k+ followers.',
    requirements: '10k+ followers, active engagement, fitness niche',
    benefits: 'Free product, commission on referrals, featured placement'
  },
  {
    title: 'Sponsored Training Program Development',
    role_type: 'Consultant',
    body: 'Partner with us to create a signature training program for a major sports brand.',
    requirements: 'Proven coaching credentials, 5+ years experience, social proof',
    benefits: 'Flat fee + royalties, long-term partnership, global reach'
  },
  {
    title: 'Nutritionist Collaboration',
    role_type: 'Partnership',
    body: 'Work with us on athlete nutrition guides and meal plans.',
    requirements: 'Registered Dietitian or equivalent, sports nutrition focus',
    benefits: 'Direct compensation, content co-creation, credential boost'
  },
  {
    title: 'Podcast Guest Appearance',
    role_type: 'Guest',
    body: 'Join our top sports podcast to discuss training philosophies and career path.',
    requirements: 'Public speaking comfort, interesting story to tell',
    benefits: 'Exposure to 100k+ listeners, backlinks, clips for your portfolio'
  },
  {
    title: 'Athlete Mentorship Program',
    role_type: 'Mentor',
    body: 'Mentor up-and-coming athletes through our platform. 1:1 sessions and content creation.',
    requirements: 'Established athlete, excellent communication, patience',
    benefits: 'Monthly stipend, platform exposure, community impact'
  }
];

async function seedDatabase() {
  const db = await initializeDB();

  const now = getCurrentTimestamp();

  console.log('🌱 Starting database seed...\n');

  // 1. Seed Admin
  const adminId = generateId();
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@plxyground.local';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Internet2026@';

  try {
    const adminExists = await getAsync(db, 'SELECT id FROM admins WHERE email = ?', [adminEmail]);
    if (!adminExists) {
      await runAsync(db, 
        `INSERT INTO admins (id, email, password_hash, role, is_active, created_at, updated_at)
        VALUES (?, ?, ?, 'ADMIN', 1, ?, ?)`,
        [adminId, adminEmail, hashPassword(adminPassword), now, now]
      );
      console.log(`✓ Admin created: ${adminEmail}`);
    } else {
      console.log(`✓ Admin already exists: ${adminEmail}`);
    }
  } catch (err) {
    console.error('Error creating admin:', err);
  }

  // 2. Seed Creators
  const creators = [
    { name: 'Sarah Johnson', email: 'sarahjohnson@plxyground.local', slug: 'sarahjohnson', bio: 'Basketball trainer & fitness coach' },
    { name: 'Marcus Elite', email: 'marcuselite@plxyground.local', slug: 'marcuselite', bio: 'NBA aspirant, strength coach' },
    { name: 'Alex Rivera', email: 'alexrivera@plxyground.local', slug: 'alexrivera', bio: 'Yoga instructor and wellness expert' },
    { name: 'Jordan Chen', email: 'jordanchen@plxyground.local', slug: 'jordanchen', bio: 'Competitive cyclist and nutritionist' },
    { name: 'Emma Stone', email: 'emmastone@plxyground.local', slug: 'emmastone', bio: 'Cross-training athlete and coach' },
    { name: 'David Kim', email: 'davidkim@plxyground.local', slug: 'davidkim', bio: 'Powerlifting champion, form expert' },
    { name: 'Lisa Anderson', email: 'lisaanderson@plxyground.local', slug: 'lisaanderson', bio: 'Mental health coach for athletes' },
    { name: 'Ryan Cooper', email: 'ryancooper@plxyground.local', slug: 'ryancooper', bio: 'Personal trainer and influencer' },
    { name: 'Jessica Lee', email: 'jessicalee@plxyground.local', slug: 'jessicalee', bio: 'Running coach and ultramarathoner' },
    { name: 'Chris Martinez', email: 'chrismartinez@plxyground.local', slug: 'chrismartinez', bio: 'Sports nutritionist specialist' }
  ];

  const creatorIds = [];

  for (const creator of creators) {
    try {
      const existing = await getAsync(db, 'SELECT id FROM creator_accounts WHERE email = ?', [creator.email]);
      if (!existing) {
        const crId = generateId();
        const acId = generateId();

        await runAsync(db,
          `INSERT INTO creators (id, name, role, bio, profile_slug, is_active, created_at, updated_at)
          VALUES (?, ?, 'CREATOR', ?, ?, 1, ?, ?)`,
          [crId, creator.name, creator.bio, creator.slug, now, now]
        );

        await runAsync(db,
          `INSERT INTO creator_accounts (id, creator_id, email, password_hash, is_approved, is_suspended, created_at, updated_at)
          VALUES (?, ?, ?, ?, 1, 0, ?, ?)`,
          [acId, crId, creator.email, hashPassword('Password1!'), now, now]
        );

        creatorIds.push(crId);
        console.log(`✓ Creator created: ${creator.name}`);
      } else {
        console.log(`✓ Creator already exists: ${creator.name}`);
        const cr = await getAsync(db, 'SELECT creator_id FROM creator_accounts WHERE email = ?', [creator.email]);
        creatorIds.push(cr.creator_id);
      }
    } catch (err) {
      console.error(`Error creating creator ${creator.name}:`, err);
    }
  }

  // 3. Seed Business/Brand
  const businessEmail = process.env.BUSINESS_EMAIL || 'nike@plxyground.local';
  try {
    const businessExists = await getAsync(db, 'SELECT id FROM creator_accounts WHERE email = ?', [businessEmail]);
    
    if (!businessExists) {
      const businessId = generateId();
      const businessAcctId = generateId();

      await runAsync(db,
        `INSERT INTO creators (id, name, role, bio, profile_slug, is_active, created_at, updated_at)
        VALUES (?, 'Nike Sports', 'BUSINESS', 'Leading sports brand connecting athletes and opportunities', 'nike', 1, ?, ?)`,
        [businessId, now, now]
      );

      await runAsync(db,
        `INSERT INTO creator_accounts (id, creator_id, email, password_hash, is_approved, is_suspended, created_at, updated_at)
        VALUES (?, ?, ?, ?, 1, 0, ?, ?)`,
        [businessAcctId, businessId, businessEmail, hashPassword(process.env.BUSINESS_PASSWORD || 'Password1!'), now, now]
      );

      console.log(`✓ Business created: Nike Sports`);
    } else {
      console.log(`✓ Business already exists: Nike Sports`);
    }
  } catch (err) {
    console.error('Error creating business:', err);
  }

  // 4. Seed Content
  console.log('\n📝 Creating content...\n');

  let contentCount = 0;

  for (const creatorId of creatorIds) {
    for (let i = 0; i < 10; i++) {
      try {
        const contentType = ['article', 'video_embed', 'image_story'][Math.floor(Math.random() * 3)];
        const isPublished = Math.random() > 0.3; // 70% published, 30% pending
        const publishedAt = isPublished ? now : null;
        const mediaUrl = unsplashSportsUrls[Math.floor(Math.random() * unsplashSportsUrls.length)];
        const bodyIdx = (creatorIds.indexOf(creatorId) * 10 + i) % contentBodies.length;
        const title = contentBodies[bodyIdx].split('\n')[0].substring(0, 80);

        const cExists = await getAsync(db, 'SELECT id FROM content WHERE creator_id = ? AND title = ?', [creatorId, title]);
        if (!cExists) {
          const contentId = generateId();
          await runAsync(db,
            `INSERT INTO content (id, creator_id, content_type, title, body, media_url, is_published, published_at, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [contentId, creatorId, contentType, title, contentBodies[bodyIdx], mediaUrl, isPublished ? 1 : 0, publishedAt, now, now]
          );

          // If not published, add to moderation queue
          if (!isPublished) {
            const queueId = generateId();
            await runAsync(db,
              `INSERT INTO moderation_queue (id, type, status, title_or_name, submitted_by, entity_id, created_at, updated_at)
              VALUES (?, 'content', 'pending', ?, ?, ?, ?, ?)`,
              [queueId, title, 'creator', contentId, now, now]
            );
          }

          contentCount++;
        }
      } catch (err) {
        console.error('Error creating content:', err);
      }
    }
  }

  console.log(`✓ ${contentCount} content pieces created\n`);

  // 5. Seed Opportunities
  console.log('🎯 Creating opportunities...\n');

  let oppCount = 0;
  for (const opp of opportunities) {
    try {
      const oppExists = await getAsync(db, 'SELECT id FROM opportunities WHERE title = ?', [opp.title]);
      
      if (!oppExists) {
        const oppId = generateId();
        const businessId = await getAsync(db, 'SELECT creator_id FROM creator_accounts WHERE email = ?', [businessEmail]);
        
        await runAsync(db,
          `INSERT INTO opportunities (id, creator_id, title, role_type, body, requirements, benefits, is_published, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
          [oppId, businessId?.creator_id || null, opp.title, opp.role_type, opp.body, opp.requirements, opp.benefits, now, now]
        );

        oppCount++;
      }
    } catch (err) {
      console.error('Error creating opportunity:', err);
    }
  }

  console.log(`✓ ${oppCount} opportunities created\n`);

  // Summary
  console.log('✅ Database seeded successfully!');
  console.log(`\n📊 Summary:
  - Admins: 1
  - Creators: ${creatorIds.length}
  - Businesses: 1
  - Content pieces: ${contentCount}
  - Opportunities: ${oppCount}
  
🔐 Credentials:
  - Admin: ${adminEmail} / ${adminPassword}
  - Creator: sarahjohnson@plxyground.local / Password1!
  - Business: ${businessEmail} / Password1!
  `);

  process.exit(0);
}

// Run seed if executed directly
seedDatabase().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
