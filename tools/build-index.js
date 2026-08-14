// Generates the published catalog
//
// This is the site build — Cloudflare Pages runs it and serves `public/`.
//
//   node tools/build-index.js [--out public/index.json] [--base-url https://mods.spupgame.com]

import {mkdirSync, writeFileSync} from "node:fs";
import {join, dirname, resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {parseArgs} from "node:util";
import {readManifests} from "./validate.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_BASE_URL = "https://mods.spupgame.com";
const CLIENT_URL = "https://spupgame.com";
const SOURCE_URL = "https://github.com/shyyio/spup-mods";

/**
 * @param {string} baseUrl
 * @param {string} name
 * @param {string} version
 * @returns {string}
 */
export function packageUrl(baseUrl, name, version) {
    return `${baseUrl}/p/${name}/${version}/`;
}

/**
 * @param {string} baseUrl
 * @returns {object} the index payload
 */
export function buildIndex(baseUrl) {
    const mods = [];
    for (const manifest of readManifests()) {
        const versions = manifest.versions
            .filter(entry => entry.published)
            .map(entry => ({
                version: entry.version,
                sdkVersion: entry.sdkVersion,
                commit: entry.commit,
                url: packageUrl(baseUrl, manifest.name, entry.version),
                artifacts: Object.fromEntries(entry.artifacts),
                publishedAt: entry.publishedAt,
            }));
        if (versions.length === 0) {
            continue;
        }
        mods.push({
            name: manifest.name,
            author: manifest.author,
            repo: manifest.repo,
            description: manifest.description,
            homepage: manifest.homepage,
            // Versions are ordered oldest first, so the newest published one is the last.
            latest: versions[versions.length - 1].version,
            versions,
        });
    }
    return {baseUrl, mods};
}

/**
 * @param {string} title
 * @param {string[]} fields "  label : value" lines
 * @returns {string}
 */
function infoScreen(title, fields) {
    const width = 46;
    const padTotal = width - title.length;
    const padLeft = Math.floor(padTotal / 2);
    const padRight = padTotal - padLeft;
    return [
        "+==============================================+",
        "|            SHY'S POWER-UP FACTORY            |",
        `|${" ".repeat(padLeft)}${title}${" ".repeat(padRight)}|`,
        "+==============================================+",
        "",
        ...fields,
        "",
    ].join("\n");
}

/**
 * @param {string} baseUrl
 * @returns {string}
 */
function notFound(baseUrl) {
    const screen = infoScreen("Not Found", [
        "  There is no such file in this registry.",
        "",
        `  index      : ${baseUrl}/index.json`,
        `  browse     : ${CLIENT_URL}/mods`,
    ]);
    return `<!doctype html>
<meta charset="utf-8">
<title>Not Found</title>
<pre>${screen}</pre>
`;
}

/**
 * @param {object} index
 * @param {string} baseUrl
 * @returns {string}
 */
function homepage(index, baseUrl) {
    const versions = index.mods.reduce((count, mod) => count + mod.versions.length, 0);
    return infoScreen("Mod Registry", [
        `  mods       : ${index.mods.length} listed`,
        `  versions   : ${versions} published`,
        `  index      : ${baseUrl}/index.json`,
        `  browse     : ${CLIENT_URL}/mods`,
        `  source     : ${SOURCE_URL}`,
    ]);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const {values: args} = parseArgs({
        options: {
            "out": {type: "string", default: join(ROOT, "public", "index.json")},
            "base-url": {type: "string", default: DEFAULT_BASE_URL},
        },
    });
    const index = buildIndex(args["base-url"]);
    mkdirSync(dirname(args.out), {recursive: true});
    writeFileSync(args.out, `${JSON.stringify(index, null, 4)}\n`);
    writeFileSync(join(dirname(args.out), "index.html"), homepage(index, args["base-url"]));
    writeFileSync(join(dirname(args.out), "404.html"), notFound(args["base-url"]));
    console.log(`${args.out}: ${index.mods.length} mods`);
}
