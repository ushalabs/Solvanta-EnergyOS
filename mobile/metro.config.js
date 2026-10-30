const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
// Preview captures and exports are generated output, not application source.
const previous = config.resolver.blockList;
config.resolver.blockList = [
  ...(Array.isArray(previous) ? previous : previous ? [previous] : []),
  /[/\\]\.expo[/\\]/,
  /[/\\]mobile[/\\]dist(?:-no-firebase)?[/\\]/,
];
module.exports = config;
