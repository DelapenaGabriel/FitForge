const fs = require('fs');

const file = 'src/views/GroupDetailView.vue';
let content = fs.readFileSync(file, 'utf8');

// 1. TIMELINE FEED WRAPPER
let sectionStart = content.indexOf('<div v-for="section in groupedFeed" :key="section.date" class="feed-section mb-10">');
if (sectionStart !== -1) {
  content = content.replace(
    '<div v-if="groupedFeed.length === 0" class="empty-state">',
    `<div v-if="groupedFeed.length > 0" class="absolute left-[19px] top-6 bottom-0 w-[2px] bg-gradient-to-b from-[#DFFF00]/30 via-[rgba(255,255,255,0.05)] to-transparent pointer-events-none hidden sm:block"></div>
            <div v-if="groupedFeed.length === 0" class="empty-state">`
  );

  content = content.replace(
    '<div v-for="section in groupedFeed" :key="section.date" class="feed-section mb-10">',
    `<div v-for="section in groupedFeed" :key="section.date" class="feed-section relative sm:pl-12 mb-10">`
  );
}

// 2. TIMELINE FEED ITEM WRAPPER
content = content.split('<div class="post-card-premium">').join(
  `<div class="absolute -left-3 top-0 w-3 h-3 rounded-full bg-[#0e0e0e] border border-[#DFFF00]/40 z-10 hidden sm:block"></div>
                  <div class="post-card-premium border-l-2 border-transparent hover:border-[#DFFF00]/20">`
);

// 3. EDIT POST STYLING
content = content.replace(
  'style="box-shadow: 0 0 40px rgba(223, 255, 0,0.15);"',
  'style="box-shadow: 0 0 40px rgba(223, 255, 0,0.15); border-left: 2px solid #DFFF00;"'
);

// 4. Update the Leaderboard row to include similar visual cues from HTML
content = content.split('class="leaderboard-row"').join('class="leaderboard-row bg-[#131313] border-l-2 border-transparent hover:border-[#DFFF00]/20"');
content = content.split('class="leaderboard-row self-row"').join('class="leaderboard-row self-row bg-[#201f1f] border-l-[3px] border-[#DFFF00]"');

fs.writeFileSync(file, content);
console.log('GroupDetailView modified safely');
