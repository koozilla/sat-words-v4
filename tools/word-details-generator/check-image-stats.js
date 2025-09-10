const { DatabaseClient } = require('./dist/database-client.js');

async function getImageStats() {
  const client = new DatabaseClient();
  
  try {
    const words = await client.getAllWords();
    console.log('Total words:', words.length);
    
    const tierStats = {};
    
    words.forEach(word => {
      if (!tierStats[word.tier]) {
        tierStats[word.tier] = { total: 0, withImages: 0 };
      }
      
      tierStats[word.tier].total++;
      
      const hasImage = word.image_urls && 
                      Array.isArray(word.image_urls) && 
                      word.image_urls.length > 0 && 
                      word.image_urls[0] && 
                      word.image_urls[0].trim() !== '';
      
      if (hasImage) {
        tierStats[word.tier].withImages++;
      }
    });
    
    console.log('\n📊 Image Statistics by Tier:');
    console.log('=============================');
    
    Object.keys(tierStats).sort().forEach(tier => {
      const stats = tierStats[tier];
      const percentage = ((stats.withImages / stats.total) * 100).toFixed(1);
      console.log(`${tier}:`);
      console.log(`  Total words: ${stats.total}`);
      console.log(`  With images: ${stats.withImages} (${percentage}%)`);
      console.log(`  Without images: ${stats.total - stats.withImages}`);
      console.log('');
    });
    
    const totalWithImages = words.filter(w => {
      return w.image_urls && 
             Array.isArray(w.image_urls) && 
             w.image_urls.length > 0 && 
             w.image_urls[0] && 
             w.image_urls[0].trim() !== '';
    }).length;
    
    const totalPercentage = ((totalWithImages / words.length) * 100).toFixed(1);
    
    console.log('📈 Overall Statistics:');
    console.log('======================');
    console.log(`Total words: ${words.length}`);
    console.log(`With images: ${totalWithImages} (${totalPercentage}%)`);
    console.log(`Without images: ${words.length - totalWithImages}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

getImageStats();
