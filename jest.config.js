export default {
    verbose: true,
    "transformIgnorePatterns": [
        "node_modules/(?!jose)"
    ],
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
}
