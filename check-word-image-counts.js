const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables. Please check your .env.local file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkWordImageCounts() {
  try {
    console.log('🔍 Checking word counts with images per tier...\n');

    // Get all words grouped by tier
    const { data: words, error } = await supabase
      .from('words')
      .select('tier, image_urls')
      .order('tier');

    if (error) {
      console.error('Error fetching words:', error);
      return;
    }

    if (!words || words.length === 0) {
      console.log('No words found in database.');
      return;
    }

    // Group by tier and count
    const tierStats = {};
    
    words.forEach(word => {
      const tier = word.tier;
      if (!tierStats[tier]) {
        tierStats[tier] = {
          total: 0,
          withImages: 0,
          withoutImages: 0
        };
      }
      
      tierStats[tier].total++;
      
      // Check if word has images
      if (word.image_urls && word.image_urls.length > 0 && word.image_urls[0]) {
        tierStats[tier].withImages++;
      } else {
        tierStats[tier].withoutImages++;
      }
    });

    // Display results
    console.log('📊 Word Count with Images per Tier:\n');
    console.log('Tier'.padEnd(15) + 'Total'.padEnd(8) + 'With Images'.padEnd(15) + 'Without Images'.padEnd(15) + 'Image %'.padEnd(10));
    console.log('-'.repeat(70));
    
    let grandTotal = 0;
    let grandWithImages = 0;
    let grandWithoutImages = 0;

    Object.keys(tierStats).sort().forEach(tier => {
      const stats = tierStats[tier];
      const imagePercentage = ((stats.withImages / stats.total) * 100).toFixed(1);
      
      console.log(
        tier.padEnd(15) + 
        stats.total.toString().padEnd(8) + 
        stats.withImages.toString().padEnd(15) + 
        stats.withoutImages.toString().padEnd(15) + 
        (imagePercentage + '%').padEnd(10)
      );
      
      grandTotal += stats.total;
      grandWithImages += stats.withImages;
      grandWithoutImages += stats.withoutImages;
    });

    console.log('-'.repeat(70));
    const overallImagePercentage = ((grandWithImages / grandTotal) * 100).toFixed(1);
    console.log(
      'TOTAL'.padEnd(15) + 
      grandTotal.toString().padEnd(8) + 
      grandWithImages.toString().padEnd(15) + 
      grandWithoutImages.toString().padEnd(15) + 
      (overallImagePercentage + '%').padEnd(10)
    );

    console.log(`\n📈 Summary:`);
    console.log(`   Total words: ${grandTotal}`);
    console.log(`   Words with images: ${grandWithImages} (${overallImagePercentage}%)`);
    console.log(`   Words without images: ${grandWithoutImages} (${(100 - overallImagePercentage).toFixed(1)}%)`);

    // Show tiers that need more images
    console.log(`\n🎯 Tiers needing more images:`);
    Object.keys(tierStats).sort().forEach(tier => {
      const stats = tierStats[tier];
      const imagePercentage = (stats.withImages / stats.total) * 100;
      if (imagePercentage < 100) {
        console.log(`   ${tier}: ${stats.withoutImages}/${stats.total} missing images (${(100 - imagePercentage).toFixed(1)}%)`);
      }
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

checkWordImageCounts();
