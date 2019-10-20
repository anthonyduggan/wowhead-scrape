const professions = require('./data/professions');

// Bad deep copy, works for now
function deep_copy(object) {
    return JSON.parse(JSON.stringify(object));
}

function builder(reagents, spells) {
    // Make a deep copy of reagents
    let output = {};

    // Format the data out the addon is going to want it
    for (const [reagent_id, spell_ids] of Object.entries(reagents)) {
        const mapped_spells = spell_ids
            .map((spell_id) => spells[spell_id]) // Map to referenced spell
            .filter((spell) => spell != undefined) // Filter spells with no match
            .map((spell) => { // Map to new structure
                const levels_array = Object.values(deep_copy(spell.levels))
                    .sort()

                return {
                    name: spell.name,
                    profession_id: spell.profession_id,
                    learned: spell.learned,
                    levels: levels_array
                };
            })
            .reduce((groups, spell) => {
                const profession_id = spell.profession_id;
                delete spell.profession_id;
                groups[profession_id] = groups[profession_id] || {
                    name: professions[profession_id].name,
                    spells: []
                };
                groups[profession_id].spells.push(spell);
                return groups;
            }, {});

        output[reagent_id] = Object.values(mapped_spells);
    }

    return output;
}

module.exports = builder;
