// google-services.json is gitignored, so an EAS build receives it as a file variable.
// Local builds keep using the path in app.json.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? config.android?.googleServicesFile,
  },
});
