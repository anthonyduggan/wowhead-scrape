const fs = require('fs');
const {scrape_all_professions} = require('./src/scraper');
const builder = require('./src/data-builder');
const object_to_table_string = require('./src/object-to-table-string');

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

    const output_structure = builder(all_reagents, all_spells);
    fs.writeFileSync('./output.json', JSON.stringify(output_structure, null, 2));

    const output = object_to_table_string(output_structure);
    fs.writeFileSync('./output.lua', output);
})();
