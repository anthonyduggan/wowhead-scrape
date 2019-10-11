const puppeteer = require('puppeteer');
const sqlite = require('sqlite');
const SQL = require('sql-template-strings');
const fs = require('fs');

// Do everything for a given profession
async function load_profession_page(db, page, profession) {
    // Given a url, return its type (spell, item, etc) and its id
    function get_type_and_id_from_url(url) {
        const re = /(\w+)=(\d+)$/;
        const result = re.exec(url);
        if (result) {
            return {
                type: result[1],
                id: result[2]
            }
        }
        return null;
    }

    // Given all of the data about a spell, insert as much info about it as possible
    async function insert_spell(profession_id, id, name, reagents, levels) {
        // Build the spell query, needs proper escaping since some of the names have weird characters
        const spellQuery = SQL `insert or ignore into spells (id, name, profession_id, l1, l2, l3, l4) values (${id}, ${name}, ${profession_id}, ${levels[1]}, ${levels[2]}, ${levels[3]}, ${levels[4]})`;

        // Build the item and reagent queries
        let itemQuery = `insert or ignore into items (id) values`;
        let reagentQuery = `insert or ignore into reagents (spell_id, item_id) values`;
        let prefix = ' ';
        for (let reagent of reagents) {
            itemQuery += `${prefix}(${reagent})`;
            reagentQuery += `${prefix}(${id}, ${reagent})`;
            prefix = ', ';
        }

        await db.run(spellQuery);
        await db.run(itemQuery);
        await db.run(reagentQuery);
    }

    console.group(profession.name)
    console.group(`Initial page load`)
    let profession_start_time = new Date();
    let profession_spells_created = 0;
    await page.goto(profession.url);
    console.info(`Took ${new Date() - profession_start_time}ms`);
    console.groupEnd();

    let page_number = 0;

    // This is the table that the recipes sit in, clicking 'next' replaces the contents of this element so no need to regrab it
    const recipes_table = await page.$('#tab-recipes table');
    while (true) {
        page_number++;
        let page_spells_created = 0;
        console.group(`Doing page ${page_number}`);
        let page_start_time = new Date();

        // Get all the recipe entries on the page and loop over them
        let recipe_entries = await recipes_table.$$('tbody tr');
        console.log(`Found ${recipe_entries.length} spells`);
        for (const recipe of recipe_entries) {
            try {
                // Get the spell info
                const spell_name = await recipe.$eval('td:nth-child(3) a', node => node.innerText);
                const spell_link = await recipe.$eval('td:nth-child(3) a', node => node.href);
                const spell = get_type_and_id_from_url(spell_link);

                // Get reagents from the page
                const reagent_links = await recipe.$$eval('td:nth-child(4) a', nodes => nodes.map(node => node.href));
                const reagents = reagent_links.map((reagent_link) => {
                    const reagent = get_type_and_id_from_url(reagent_link);
                    if (reagent && reagent.type !== 'item') {
                        return null;
                    }
                    return reagent.id;
                });

                // Get levels
                let levels = {
                    1: null,
                    2: null,
                    3: null,
                    4: null,
                };
                for (let key of Object.keys(levels)) {
                    const level_element = await recipe.$(`td:nth-child(6) .r${key}`);
                    if (level_element) {
                        const level = await level_element.evaluate(node => parseInt(node.innerText));
                        levels[key] = level;
                    }
                }
                // For now this is not needed, but it might be helpful later
                // Since levels are listed weird in wowhead start at grey and keep track of the last good level duplicate that for all the missing keys
                // let last_good_level = null;
                // for (let key of Object.keys(levels)) {
                //     if (levels[key] !== null) {
                //         last_good_level = levels[key];
                //     } else if (last_good_level !== null) {
                //         levels[key] = last_good_level;
                //     }
                // }

                // Finally insert the spell
                await insert_spell(profession.id, spell.id, spell_name, reagents, levels);
                page_spells_created++;
            } catch (err) {
                // Take a screenshot of the spell we failed to load and just move on to the next iteration
                await recipe.screenshot({
                    path: `./bad_spells/${profession.name}-${page_number}-${Date.now()}.png`
                });
                continue;
            }
        }
        console.log(`Inserted ${page_spells_created} spells in ${new Date() - page_start_time}ms`);
        profession_spells_created += page_spells_created;
        console.groupEnd();
        const next_page_link = await page.$('#tab-recipes .listview-nav a:nth-child(4)[data-visible="yes"]');
        if (next_page_link) {
            await next_page_link.click();
        } else {
            break;
        }
    }
    console.info(`Gathered a total of ${profession_spells_created} spells across ${page_number} pages in ${new Date() - profession_start_time}ms for ${profession.name}`)
    console.groupEnd();
}

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

    // Open the browser and a page
    const browser = await puppeteer.launch({
        headless: true
    });
    const page = await browser.newPage();

    // Open the db and migrate
    const db = await sqlite.open('./database.sqlite');
    await db.migrate();

    // Loop through all of the professions to get all of the relevant spells
    const professions = await db.all(`select id, name, url from professions`);
    for (const profession of professions) {
        await load_profession_page(db, page, profession);
    }

    // Shut down
    await db.close();
    await browser.close();
})();
