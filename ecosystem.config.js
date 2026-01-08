module.exports = {
  apps : [{
    name: "website",
    script: "npx",
    args: "serve . -p 5500",
    watch: false,
    env: {
      NODE_ENV: "production",
    }
  }]
}