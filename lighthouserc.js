module.exports = {
  ci: {
    collect: {
      numberOfRuns: 1,
      url: ['https://patrickwake.github.io/recon-tools/']
    },
    upload: {
      target: 'temporary-public-storage'
    },
    assert: {
      preset: 'lighthouse:recommended'
    }
  }
};
