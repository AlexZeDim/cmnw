module.exports = {
  apps : [{
    name: "getToken",
    script: "./bin/getTokens.js",
    instances: 1,
    autorestart: true,
    watch: true,
    max_memory_restart: '100M',
    cron_restart: '*/2 * * * *',
    time: true
  },{
    name: 'indexCharacters',
    script: './voluspa/indexing/indexCharacters.js',
    //args: '--b 12',
    instances: 1,
    autorestart: true,
    watch: true,
    max_memory_restart: '1G',
    cron_restart: '0 13,01 * * *',
    time: true
  },{
    name: "indexGuilds",
    script: "./voluspa/indexing/indexGuilds.js",
    instances: 1,
    autorestart: true,
    watch: true,
    max_memory_restart: '1G',
    cron_restart: '0 */2 * * *',
    time: true
  }],

  deploy : {
    production : {
      user : 'node',
      host : '212.83.163.1',
      ref  : 'origin/master',
      repo : 'git@github.com:repo.git',
      path : '/var/www/production',
      'post-deploy' : 'npm install && pm2 reload ecosystem.config.js --env production'
    }
  }
};
