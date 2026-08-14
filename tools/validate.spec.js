// The checks a listing PR passes before a maintainer even reads it.

import {test} from "node:test";
import assert from "node:assert/strict";
import {readManifests, crossChecks} from "./validate.js";
import {buildIndex} from "./build-index.js";

test("the checked-in listings are valid", () => {
    const manifests = readManifests();

    assert.deepEqual(crossChecks(manifests), []);
    assert.ok(manifests.length > 0, "no mods listed");
    for (const manifest of manifests) {
        assert.match(manifest.repo, /^https:\/\//);
    }
});

test("the index carries only versions CI has published", () => {
    const index = buildIndex("https://mods.example.com");

    for (const mod of index.mods) {
        for (const version of mod.versions) {
            assert.ok(Object.keys(version.artifacts).length > 0, `${mod.name} ${version.version} has no artifacts`);
        }
    }
});
