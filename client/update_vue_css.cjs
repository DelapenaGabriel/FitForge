const fs = require('fs');
const path = require('path');

const vuePath = path.join(__dirname, 'src', 'views', 'GroupDetailView.vue');
const cssPath = path.join(__dirname, 'src', 'views', 'GroupDetailView_new_styles.css');

let vueContent = fs.readFileSync(vuePath, 'utf8');
const cssContent = fs.readFileSync(cssPath, 'utf8');

const styleRegex = /<style scoped>[\s\S]*?<\/style>/;
if (styleRegex.test(vueContent)) {
  vueContent = vueContent.replace(styleRegex, '<style scoped>\n' + cssContent + '\n</style>');
  fs.writeFileSync(vuePath, vueContent, 'utf8');
  console.log('Successfully replaced styles in GroupDetailView.vue');
} else {
  console.error('Could not find <style scoped> block in GroupDetailView.vue');
}
