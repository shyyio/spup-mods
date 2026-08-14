// The listing model: what a registry.json may say, and what it must not.

import {test} from "node:test";
import assert from "node:assert/strict";
import {RegistryManifest, compareVersions} from "./RegistryManifest.js";

const COMMIT = "a".repeat(40);

function listing(overrides = {}) {
    return {
        name: "market",
        repo: "https://github.com/shyyio/game",
        path: "src/mods/Market",
        description: "Trading terminals.",
        versions: [{version: "1.0.0", commit: COMMIT, toolchain: "1.0.0", sdkVersion: 1}],
        ...overrides,
    };
}

test("a listing parses and round-trips", () => {
    const manifest = RegistryManifest.parse(listing());

    assert.equal(manifest.name, "market");
    assert.equal(manifest.latest, null, "an unbuilt version is not published");
    assert.deepEqual(manifest.toJSON(), listing());
});

test("malformed listings are rejected", () => {
    const cases = {
        "reserved name": {name: "engine"},
        "upper-case name": {name: "Market"},
        "non-https repo": {repo: "git@github.com:shyyio/game"},
        "repo with a .git suffix": {repo: "https://github.com/shyyio/game.git"},
        "short commit": {versions: [{version: "1.0.0", commit: "abc", toolchain: "1.0.0", sdkVersion: 1}]},
        "no versions": {versions: []},
        "unknown key": {extra: true},
        "versions out of order": {versions: [
            {version: "1.1.0", commit: COMMIT, toolchain: "1.0.0", sdkVersion: 1},
            {version: "1.0.0", commit: COMMIT, toolchain: "1.0.0", sdkVersion: 1},
        ]},
    };
    for (const [what, overrides] of Object.entries(cases)) {
        assert.throws(() => RegistryManifest.parse(listing(overrides)), what);
    }
});

test("the optional author is display only", () => {
    assert.equal(RegistryManifest.parse(listing()).author, null);
    assert.equal(RegistryManifest.parse(listing({author: "Bob"})).author, "Bob");
    assert.deepEqual(RegistryManifest.parse(listing({author: "Bob"})).toJSON(), listing({author: "Bob"}));
    assert.throws(() => RegistryManifest.parse(listing({author: ""})), /author/);
    assert.throws(() => RegistryManifest.parse(listing({author: "b".repeat(41)})), /author/);
});

test("source may live on any https git host", () => {
    for (const repo of ["https://gitlab.com/someone/mod", "https://codeberg.org/someone/mod", "https://git.example.com:8443/someone/mod"]) {
        assert.equal(RegistryManifest.parse(listing({repo})).repo, repo);
    }
});

test("a path may not walk out of the mod's own checkout", () => {
    // The publisher joins this onto a source checkout, so a `..` segment would build a directory the
    // listing never named.
    for (const path of ["..", "../../../etc", "src/../../elsewhere", "./src"]) {
        assert.throws(() => RegistryManifest.parse(listing({path})), /invalid path/, path);
    }
    for (const path of [".", "src/mods/Market", "packages/my-mod"]) {
        assert.equal(RegistryManifest.parse(listing({path})).path, path);
    }
});

test("published artifacts make a version installable", () => {
    const manifest = RegistryManifest.parse(listing({versions: [
        {version: "1.0.0", commit: COMMIT, toolchain: "1.0.0", sdkVersion: 1, artifacts: {"mod.js": `sha256-${"1".repeat(64)}`}, publishedAt: "2026-08-14"},
        {version: "1.1.0", commit: COMMIT, toolchain: "1.0.0", sdkVersion: 1},
    ]}));

    assert.equal(manifest.latest.version, "1.0.0", "the unbuilt 1.1.0 is not yet installable");
    assert.equal(manifest.find("1.1.0").published, false);
});

test("version ordering compares numerically", () => {
    assert.ok(compareVersions("1.2.0", "1.10.0") < 0);
    assert.ok(compareVersions("2.0.0", "1.9.9") > 0);
    assert.equal(compareVersions("1.0.0", "1.0.0"), 0);
});
