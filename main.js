const fs = require('fs');
const {scrape_all_professions} = require('./src/scraper');

// Loop through the 'bad_spells' directory and delete all pngs
function clean_bad_spell_screenshots() {
    let paths = fs.readdirSync('./bad_spells');
    paths = paths.filter(path => path.endsWith('.png'));
    for (let path of paths) {
        fs.unlinkSync(`./bad_spells/${path}`);
    }
}

(async () => {
    clean_bad_spell_screenshots();

    const [all_reagents, all_spells] = await scrape_all_professions();
    console.log('Reagents', Object.keys(all_reagents).length);
    console.log('Spells', Object.keys(all_spells).length);
})();
