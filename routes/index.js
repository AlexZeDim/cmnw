const express = require('express');
const router = express.Router();

/* GET home page. */

router.get('/', async function(req, res) {
  try {
    console.log(req)
    if (req.isAuthenticated()) {
      let output = '<h1>Express OAuth Test</h1>' + req.user.id + '<br>';
      if(req.user.battletag) {
        output += req.user.battletag + '<br>';
      }
      output += '<a href="/logout">Logout</a>';
      res.send(output);
    } else {
      res.send('<h1>Express OAuth Test</h1>' +
          '<a href="/auth/bnet">Login with Bnet</a>');
    }
  } catch (e) {
    await res.status(500).json(e);
  }
});

module.exports = router;
