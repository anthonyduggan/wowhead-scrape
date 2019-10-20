/*
    Simplisitically turn an object into the string version of a lua table that
    can be dumped to a file.
    This only supports a pretty small subset of the lua table definition,
    just enough for what I need for now
*/
function object_to_table_string(object) {
    if (Number.isInteger(object) || typeof object === 'boolean') {
        return object.toString();
    } else if (typeof object === 'string') {
        return `"${object}"`;
    } else if (Array.isArray(object)) {
        let value_string
            = object.map(value => object_to_table_string(value)).join(',');
        return `{${value_string}}`;
    } else if (typeof object === 'object' && object !== null) {
        let key_strings = [];
        for (const [key, value] of Object.entries(object)) {
            let key_string = key;
            if (Number.isInteger(parseInt(key_string))) {
                key_string = `[${key}]`;
            }
            key_strings.push(`${key_string}=${object_to_table_string(value)}`);
        }
        return `{${key_strings.join(',')}}`;
    } else {
        // Not sure what to do here yet, if anything
    }
}

module.exports = object_to_table_string;
