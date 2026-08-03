import db from './db.js';

async function seedSampleSpots() {
  try {
    console.log('🌱 Seeding sample spatial discovery spots into PostgreSQL...');
    
    // Clear existing test spots if any
    await db('spots').delete();

    const sampleSpots = [
      {
        name: 'Blue Bottle Coffee',
        category: 'Cafe Workspace',
        latitude: 37.7752,
        longitude: -122.4180,
        rating: 4.8,
        address: '315 Bryant St, San Francisco, CA',
        is_active: true
      },
      {
        name: 'Equinox Fitness Hub',
        category: 'Gym',
        latitude: 37.7735,
        longitude: -122.4210,
        rating: 4.6,
        address: '747 Market St, San Francisco, CA',
        is_active: true
      },
      {
        name: 'Sightglass Coffee Roaster',
        category: 'Cafe Workspace',
        latitude: 37.7760,
        longitude: -122.4150,
        rating: 4.9,
        address: '270 7th St, San Francisco, CA',
        is_active: true
      },
      {
        name: 'South Park Work Commons',
        category: 'Work Pods',
        latitude: 37.7780,
        longitude: -122.4110,
        rating: 4.7,
        address: '540 3rd St, San Francisco, CA',
        is_active: true
      },
      {
        name: 'Fitness SF SoMa Center',
        category: 'Gym',
        latitude: 37.7720,
        longitude: -122.4160,
        rating: 4.5,
        address: '1001 Brannan St, San Francisco, CA',
        is_active: true
      },
      {
        name: 'Yerba Buena Gardens Park',
        category: 'Park',
        latitude: 37.7850,
        longitude: -122.4010,
        rating: 4.8,
        address: '750 Howard St, San Francisco, CA',
        is_active: true
      },
      {
        name: 'Philz Coffee Berry St',
        category: 'Cafe Workspace',
        latitude: 37.7770,
        longitude: -122.4130,
        rating: 4.7,
        address: '201 Berry St, San Francisco, CA',
        is_active: true
      },
      {
        name: 'Barry Bootcamp SoMa',
        category: 'Gym',
        latitude: 37.7740,
        longitude: -122.4100,
        rating: 4.6,
        address: '30 King St, San Francisco, CA',
        is_active: true
      }
    ];

    for (const spot of sampleSpots) {
      await db('spots').insert({
        ...spot,
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      });
    }

    console.log(`✅ Successfully seeded ${sampleSpots.length} spatial discovery spots into nearby_locator DB!`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding sample spots:', err);
    process.exit(1);
  }
}

seedSampleSpots();
