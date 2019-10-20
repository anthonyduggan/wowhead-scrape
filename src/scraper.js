const puppeteer = require('puppeteer');
const professions = require('./data/professions');

async function scrape_all_professions() {
    // Open the browser and a page
    const browser = await puppeteer.launch({
        headless: true
    });
    const page = await browser.newPage();

    let all_reagents = {};
    let all_spells = {};

    // Loop through all of the professions to get all of the relevant spells
    for (const [profession_id, profession] of Object.entries(professions)) {
        await scrape_profession(page, profession, all_reagents, all_spells);
    }

    // Shut down
    await browser.close();

    return [all_reagents, all_spells];
}

async function scrape_profession(page, profession, all_reagents, all_spells) {
    // Given a url, return its type (spell, item, etc) and its id
    function get_type_and_id_from_url(url) {
        const re = /(\w+)=(\d+)/;
        const result = re.exec(url);
        if (result) {
            return {
                type: result[1],
                id: result[2]
            }
        }
        return null;
    }

    console.group(profession.name)
    console.group(`Initial page load`)
    let profession_start_time = new Date();
    let profession_spells_created = 0;
    await page.goto(profession.url);
    console.info(`Page load took ${new Date() - profession_start_time}ms`);
    console.groupEnd();

    let page_number = 0;

    /*
        This is the table that the recipes sit in, clicking 'next' replaces the
        contents of this element so no need to regrab it
    */
    const recipes_table = await page.$('#tab-recipes table');
    while (true) {
        page_number++;
        let page_spells_created = 0;
        console.group(`Doing page ${page_number}`);
        let page_start_time = new Date();

        // Get all the recipe entries on the page and loop over them
        let recipe_entries = await recipes_table.$$('tbody tr');
        console.info(`Found ${recipe_entries.length} spells`);
        for (const recipe of recipe_entries) {
            try {
                // Get the spell info
                const spell_link = await recipe.$eval('td:nth-child(3) a',
                    node => node.href);
                const spell = get_type_and_id_from_url(spell_link);
                spell.name = await recipe.$eval('td:nth-child(3) a',
                    node => node.innerText);
                // Get levels
                let levels = {1: null,2: null,3: null,4: null,};
                for (let key of Object.keys(levels)) {
                    const level_element
                        = await recipe.$(`td:nth-child(6) .r${key}`);
                    if (level_element) {
                        const level = await level_element.evaluate(
                                node => parseInt(node.innerText));
                        levels[key] = level;
                    }
                }
                // Smear the levels to cover missing ones
                let last_known_level = null;
                for (let i = 4; i >= 1; i--) {
                    if (levels[i] != null) {
                        last_known_level = levels[i];
                    } else if (levels[i] == null && last_known_level != null) {
                        levels[i] = last_known_level;
                    }
                }
                spell.levels = levels;
                spell.profession_id = profession.id;

                // Store the spell
                all_spells[spell.id] = spell;

                // Get reagents from the page
                const reagent_links = await recipe.$$eval('td:nth-child(4) a',
                    nodes => nodes.map(node => node.href));
                const reagents = reagent_links.map((reagent_link) => {
                    const reagent = get_type_and_id_from_url(reagent_link);
                    if (reagent && reagent.type !== 'item') {
                        return null;
                    }
                    return reagent.id;
                });

                // Store the reagents and link them to the current spell
                for (const reagent of reagents) {
                    if (!all_reagents.hasOwnProperty(reagent)) {
                        all_reagents[reagent] = [];
                    }
                    all_reagents[reagent].push(spell.id);
                }

                page_spells_created++;
            } catch (err) {
                /*
                    Take a screenshot of the spell we failed to load and just
                    move on to the next iteration
                */
                await recipe.screenshot({
                    path: `../bad_spells/${profession.name}-${Date.now()}.png`
                });
                continue;
            }
        }
        console.log(`Inserted ${page_spells_created} spells`,
            `in ${new Date() - page_start_time}ms`);
        profession_spells_created += page_spells_created;
        console.groupEnd();
        const next_page_query
            = '#tab-recipes .listview-nav a:nth-child(4)[data-visible="yes"]';
        const next_page_link =await page.$(next_page_query);
        if (next_page_link) {
            await next_page_link.click();
        } else {
            break;
        }
    }
    console.info(`Gathered a total of ${profession_spells_created} spells`,
        `on ${page_number} pages in ${new Date() - profession_start_time}ms`,
        `for ${profession.name}`)
    console.groupEnd();
}

exports.scrape_all_professions = scrape_all_professions;
exports.scrape_profession = scrape_profession;
